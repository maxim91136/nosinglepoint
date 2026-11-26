// Web-Audit für nosinglepoint.com (QS).
// Keine Abhängigkeiten. Prüft öffentlich erreichbare Eigenschaften einer Domain
// und schreibt je Domain eine Zusammenfassung nach data/audit/<domain>.json.
//
// Aufruf: node audit/run.mjs [--domain nosinglepoint.com]

import { promises as dns } from "node:dns";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const DOH = "https://cloudflare-dns.com/dns-query";
const HSTS_MIN_MAX_AGE = 2592000; // 30 Tage, Mindestwert
const UA = "Mozilla/5.0 (compatible; NSP-Audit/1.0; +https://nosinglepoint.com)";

const args = process.argv.slice(2);
const only = args.includes("--domain") ? args[args.indexOf("--domain") + 1] : null;

async function dohQuery(name, type) {
  const url = `${DOH}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH ${type} ${name}: HTTP ${res.status}`);
  return res.json();
}

async function checkDnssec(domain) {
  // Signiert, wenn ein DS-Eintrag existiert.
  const j = await dohQuery(domain, "DS");
  const ds = (j.Answer || []).filter((a) => a.type === 43);
  return { ok: ds.length > 0, detail: ds.length ? "DS-Eintrag vorhanden" : "kein DS-Eintrag" };
}

async function checkCaa(domain) {
  const j = await dohQuery(domain, "CAA");
  const records = (j.Answer || []).filter((a) => a.type === 257).map((a) => a.data);
  const issuers = records.filter((r) => /\bissue\b/.test(r));
  return { ok: issuers.length > 0, detail: issuers.join(" | ") || "kein CAA" };
}

async function txt(name) {
  try {
    const rows = await dns.resolveTxt(name);
    return rows.map((r) => r.join(""));
  } catch {
    return [];
  }
}

async function checkMail(domain) {
  const spf = (await txt(domain)).find((t) => t.toLowerCase().startsWith("v=spf1")) || "";
  const dmarc = (await txt(`_dmarc.${domain}`)).find((t) => t.toLowerCase().startsWith("v=dmarc1")) || "";
  let nullMx = false;
  try {
    const mx = await dns.resolveMx(domain);
    nullMx = mx.length === 1 && (mx[0].exchange === "" || mx[0].exchange === ".") && mx[0].priority === 0;
  } catch {
    nullMx = false;
  }
  const spfOk = spf !== "" && /-all\s*$/.test(spf);
  const dmarcOk = /p=(reject|quarantine)/i.test(dmarc);
  return {
    spf: { ok: spfOk, detail: spf || "kein SPF" },
    dmarc: { ok: dmarcOk, detail: dmarc || "kein DMARC" },
    nullMx: { ok: nullMx, detail: nullMx ? "Null-MX" : "MX-Einträge vorhanden oder fehlend" },
  };
}

async function checkHttp(domain) {
  const out = {};
  // HTTP -> HTTPS Weiterleitung
  try {
    const r = await fetch(`http://${domain}/`, { redirect: "manual", headers: { "user-agent": UA } });
    const loc = r.headers.get("location") || "";
    out.redirect = {
      ok: r.status >= 300 && r.status < 400 && loc.startsWith("https://"),
      detail: `${r.status} ${loc}`,
    };
  } catch (e) {
    out.redirect = { ok: false, detail: `Fehler: ${e.cause?.code || e.message}` };
  }
  // HTTPS erreichbar + Header
  try {
    const r = await fetch(`https://${domain}/`, { redirect: "follow", headers: { "user-agent": UA } });
    out.https = { ok: r.ok, detail: `HTTP ${r.status}` };
    const h = (n) => r.headers.get(n);
    const hsts = h("strict-transport-security") || "";
    const maxAge = Number((hsts.match(/max-age=(\d+)/) || [])[1] || 0);
    out.hsts = { ok: maxAge >= HSTS_MIN_MAX_AGE, detail: hsts || "fehlt" };
    const csp = h("content-security-policy") || "";
    out.csp = { ok: csp !== "", detail: csp ? "gesetzt" : "fehlt" };
    out.xcto = { ok: /nosniff/i.test(h("x-content-type-options") || ""), detail: h("x-content-type-options") || "fehlt" };
    const frameOk = /frame-ancestors/i.test(csp) || /DENY|SAMEORIGIN/i.test(h("x-frame-options") || "");
    out.frame = { ok: frameOk, detail: h("x-frame-options") || (frameOk ? "via CSP" : "fehlt") };
    out.referrer = { ok: h("referrer-policy") !== null, detail: h("referrer-policy") || "fehlt" };
    out.permissions = { ok: h("permissions-policy") !== null, detail: h("permissions-policy") || "fehlt" };
  } catch (e) {
    out.https = { ok: false, detail: `Fehler: ${e.cause?.code || e.message}` };
  }
  return out;
}

const WEIGHTS = {
  https: 10,
  redirect: 5,
  hsts: 10,
  csp: 10,
  xcto: 5,
  frame: 5,
  referrer: 5,
  permissions: 5,
  caa: 10,
  dnssec: 10,
  spf: 5,
  dmarc: 10,
  nullMx: 5,
};

const fehler = (e) => ({ ok: false, detail: `Prüfung fehlgeschlagen: ${e.cause?.code || e.message}` });

async function auditDomain(domain) {
  const checks = { ...(await checkHttp(domain)) };
  checks.caa = await checkCaa(domain).catch(fehler);
  checks.dnssec = await checkDnssec(domain).catch(fehler);
  Object.assign(checks, await checkMail(domain).catch((e) => ({
    spf: fehler(e), dmarc: fehler(e), nullMx: fehler(e),
  })));

  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  let got = 0;
  const befunde = [];
  for (const [key, w] of Object.entries(WEIGHTS)) {
    const c = checks[key] || { ok: false, detail: "nicht geprüft" };
    if (c.ok) got += w;
    else befunde.push({ pruefung: key, gewicht: w, detail: c.detail });
  }
  return {
    domain,
    geprueft_am: new Date().toISOString(),
    score: Math.round((got / total) * 100),
    befunde,
    pruefungen: checks,
  };
}

const list = JSON.parse(await readFile(join(here, "domains.json"), "utf8")).domains;
const targets = list.filter((d) => !only || d.domain === only);
await mkdir(join(root, "data", "audit"), { recursive: true });

for (const t of targets) {
  const result = await auditDomain(t.domain);
  const file = join(root, "data", "audit", `${t.domain}.json`);
  await writeFile(file, JSON.stringify(result, null, 2) + "\n");
  console.log(`${t.domain}: Score ${result.score}, Befunde ${result.befunde.length}, öffentlich=${t.oeffentlich}`);
  for (const b of result.befunde) console.log(`  - ${b.pruefung}: ${b.detail}`);
}
