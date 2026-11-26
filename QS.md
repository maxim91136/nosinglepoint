# QS nosinglepoint.com

## Web-Audit

- Werkzeug: `audit/run.mjs` (keine Abhängigkeiten), Domainliste: `audit/domains.json`.
- Prüft: HTTPS, HTTP→HTTPS-Weiterleitung, HSTS (max-age ≥ 30 Tage), CSP, nosniff, Clickjacking-Schutz, Referrer-Policy, Permissions-Policy, CAA, DNSSEC (DS-Eintrag), SPF (`-all`), DMARC (`reject`/`quarantine`), Null-MX.
- Ergebnis je Domain: `data/audit/<domain>.json` (Score 0–100, Befunde).
- Lauf: täglich 05:35 UTC über `.github/workflows/audit.yml`, oder manuell über „Run workflow“.
- Sichtbarkeit: `oeffentlich: false` in `audit/domains.json`. Erst auf `true` setzen, wenn die Befunde behoben sind.
- Telegram: noch nicht eingerichtet (offene Entscheidung).
- Öffentliche Audit-Seite: noch nicht gebaut.

## Erledigt (26.11.2026)

- Cloudflare: CAA (`letsencrypt.org`, `pki.goog`), Null-MX, SPF `v=spf1 -all`, DMARC `p=reject`, HSTS (1 Monat, ohne includeSubDomains und Preload), nosniff, DNSSEC aktiviert (DS-Eintrag wird bei Cloudflare automatisch gesetzt, Status prüfen).
- Repo: Security-Header in `web/public/_headers` (CSP, nosniff, DENY, Referrer-Policy, Permissions-Policy).
- Web-Audit-Werkzeug angelegt.

## Offen

- Nach dem nächsten Deploy: CSP im Browser prüfen (Konsole ohne CSP-Fehler), da die Seite Three.js nutzt.
- Ersten Lauf von Hand starten und Befunde prüfen.
- Entscheiden: Telegram ja/nein, öffentliche `/audit`-Seite ja/nein.
- `www` ist nicht eingerichtet. Entscheidung: CNAME auf `nosinglepoint.pages.dev` mit Weiterleitung oder bewusst weglassen.
