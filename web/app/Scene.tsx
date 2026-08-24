"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Instances, Instance, OrbitControls, Sparkles, Line, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { QuadraticBezierCurve3, Vector3, IcosahedronGeometry, CanvasTexture } from "three";
import type { Object3D } from "three";
import { COLOR_BITCOIN, COLOR_TOR, COLOR_LINK } from "./colors";
import type { NetworkData, NetworkNode, Connection, NetworkStats } from "./networkData";

type Side = "bitcoin" | "tor";

const GROUND_Y = -2.9;

interface SelectedNode {
  asn: string;
  side: Side;
  category: string;
  providerName: string | null;
  country: string;
  bitcoinCount: number;
  torCount: number;
}

type SelectHandler = (node: SelectedNode | null) => void;

const BASE_RADIUS = 3.0;
const MIN_RADIUS_RATIO = 0.3;
const CLUSTER_OFFSET = 4.2;

interface ClusterRadii {
  bitcoin: number;
  tor: number;
}

/** Cluster size reflects the real node/relay count — Tor's ~10k relays render smaller than Bitcoin's ~25k nodes, not an arbitrary equal split. */
function computeRadii(data: NetworkData): ClusterRadii {
  const maxCount = Math.max(data.bitcoin.node_count, data.tor.relay_count, 1);
  return {
    bitcoin: BASE_RADIUS * Math.max(MIN_RADIUS_RATIO, data.bitcoin.node_count / maxCount),
    tor: BASE_RADIUS * Math.max(MIN_RADIUS_RATIO, data.tor.relay_count / maxCount),
  };
}

function clusterPosition(
  node: { x: number; y: number; z: number },
  side: Side,
  radii: ClusterRadii,
): [number, number, number] {
  const r = side === "bitcoin" ? radii.bitcoin : radii.tor;
  const offset = side === "bitcoin" ? -CLUSTER_OFFSET : CLUSTER_OFFSET;
  return [node.x * r + offset, node.y * r, node.z * r];
}

/** `radiusScale` keeps node grain size proportional to its cluster's radius, so a smaller cluster (e.g. Tor) doesn't turn into an overlapping blur of oversized nodes. */
function sizeFor(count: number, radiusScale: number): number {
  return (0.02 + 0.018 * Math.log2(1 + count)) * radiusScale;
}

/**
 * Cheap, stable per-ASN hash for desynced pulse phases — purely a visual
 * seed, doesn't need to match the server-side MurmurHash used for layout.
 * `salt` gives the two per-network instances of the same ASN different phases.
 */
function phaseFor(asn: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < asn.length; i++) {
    h = (h * 31 + asn.charCodeAt(i)) | 0;
  }
  return ((Math.abs(h) % 1000) / 1000) * Math.PI * 2;
}

interface ClusterEntry {
  key: string;
  position: [number, number, number];
  color: string;
  baseScale: number;
  phase: number;
  selection: SelectedNode;
}

function PulsingNode({ entry, onSelect }: { entry: ClusterEntry; onSelect: SelectHandler }) {
  const ref = useRef<Object3D>(null!);
  const lastT = useRef(0);
  // Touch-shy bloom: a cursor pass triggers a quick contraction that
  // springs back, like Pandora's helicoradian recoiling from contact.
  const flinchAt = useRef(-10);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lastT.current = t;
    const pulse = 1 + 0.16 * Math.sin(t * 0.6 + entry.phase);
    const sinceFlinch = t - flinchAt.current;
    const flinch =
      sinceFlinch >= 0 && sinceFlinch < 1.1
        ? 1 - 0.42 * Math.exp(-sinceFlinch * 5.5) * Math.cos(sinceFlinch * 13)
        : 1;
    ref.current.scale.setScalar(entry.baseScale * pulse * flinch);
  });

  return (
    <Instance
      ref={ref}
      position={entry.position}
      color={entry.color}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(entry.selection);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        flinchAt.current = lastT.current;
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}

/**
 * A single lumpy "spore/bud" shape, shared by every instance, built once by
 * displacing an icosahedron's vertices along their normals with a smooth
 * deterministic ripple. Reads as organic flora instead of a billiard ball,
 * without the cost of per-instance custom geometry.
 */
function useBudGeometry() {
  return useMemo(() => {
    const geo = new IcosahedronGeometry(1, 3);
    const pos = geo.attributes.position;
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      const bump =
        0.22 * Math.sin(n.x * 5.2 + 1.3) * Math.cos(n.y * 4.1) +
        0.15 * Math.sin(n.z * 6.7 + n.x * 3.0) +
        0.08 * Math.sin(n.y * 9.1 + n.z * 4.4);
      v.addScaledVector(n, bump);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function NodeCloud({ entries, onSelect }: { entries: ClusterEntry[]; onSelect: SelectHandler }) {
  const budGeometry = useBudGeometry();

  return (
    <Instances limit={entries.length} range={entries.length}>
      <primitive object={budGeometry} attach="geometry" />
      <meshBasicMaterial toneMapped={false} />
      {entries.map((e) => (
        <PulsingNode key={e.key} entry={e} onSelect={onSelect} />
      ))}
    </Instances>
  );
}

interface LinkEntry {
  asn: string;
  points: [number, number, number][];
  width: number;
  opacity: number;
  speed: number;
  offset: number;
}

/** A small glowing bead traveling along a root's length, like a nerve signal through Eywa. */
function RootPulse({ link }: { link: LinkEntry }) {
  const ref = useRef<Object3D>(null!);

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * link.speed + link.offset) % 1;
    const idx = t * (link.points.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(link.points.length - 1, i0 + 1);
    const f = idx - i0;
    const p0 = link.points[i0]!;
    const p1 = link.points[i1]!;
    ref.current.position.set(
      p0[0] + (p1[0] - p0[0]) * f,
      p0[1] + (p1[1] - p0[1]) * f,
      p0[2] + (p1[2] - p0[2]) * f,
    );
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={COLOR_LINK} toneMapped={false} transparent opacity={0.95} />
    </mesh>
  );
}

/**
 * Cross-layer highlight: a root that dips underground between an ASN's
 * Bitcoin cluster position and its Tor cluster position, for ASNs that
 * host both — surfacing at each end rather than arcing through open air.
 * Thickness/brightness scale with the ASN's combined dominance so the
 * infrastructure that actually matters (e.g. one host running a big slice
 * of both networks) stands out instead of every incidental overlap.
 */
function CrossLayerLinks({
  nodes,
  connections,
  radii,
}: {
  nodes: NetworkNode[];
  connections: Connection[];
  radii: ClusterRadii;
}) {
  const links = useMemo<LinkEntry[]>(() => {
    const byAsn = new Map(nodes.map((n) => [n.asn, n]));
    const maxDominance = Math.max(...connections.map((c) => c.dominance), 0.0001);

    return connections.flatMap((c): LinkEntry[] => {
      const node = byAsn.get(c.asn);
      if (!node) return [];

      const from = new Vector3(...clusterPosition(node, "bitcoin", radii));
      const to = new Vector3(...clusterPosition(node, "tor", radii));
      const strength = c.dominance / maxDominance;

      const mid = from.clone().lerp(to, 0.5);
      mid.y = GROUND_Y + 0.35 + strength * 0.5;

      const curve = new QuadraticBezierCurve3(from, mid, to);
      const points = curve.getPoints(28).map((p) => [p.x, p.y, p.z] as [number, number, number]);

      return [
        {
          asn: c.asn,
          points,
          width: 0.6 + strength * 3.5,
          opacity: 0.14 + strength * 0.55,
          speed: 0.05 + (phaseFor(c.asn, 9) / (Math.PI * 2)) * 0.09,
          offset: phaseFor(c.asn, 5) / (Math.PI * 2),
        },
      ];
    });
  }, [nodes, connections, radii]);

  return (
    <>
      {links.map((link) => (
        <Line
          key={link.asn}
          points={link.points}
          color={COLOR_LINK}
          lineWidth={link.width}
          transparent
          opacity={link.opacity}
          toneMapped={false}
        />
      ))}
      {links.map((link) => (
        <RootPulse key={`${link.asn}-pulse`} link={link} />
      ))}
    </>
  );
}

function ClusterLabel({
  side,
  count,
  stats,
  radii,
}: {
  side: Side;
  count: number;
  stats: NetworkStats;
  radii: ClusterRadii;
}) {
  const x = side === "bitcoin" ? -CLUSTER_OFFSET : CLUSTER_OFFSET;
  const r = side === "bitcoin" ? radii.bitcoin : radii.tor;
  const color = side === "bitcoin" ? COLOR_BITCOIN : COLOR_TOR;
  const unit = side === "bitcoin" ? "nodes" : "relays";
  const shadow = "0 0 8px rgba(5,5,12,0.9), 0 0 3px rgba(5,5,12,0.9)";

  return (
    <Html position={[x, r + 0.9, 0]} center style={{ pointerEvents: "none" }}>
      <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
        <div style={{ color, fontSize: "14px", fontWeight: 600, letterSpacing: "0.08em", textShadow: shadow }}>
          {side === "bitcoin" ? "BITCOIN" : "TOR"}
        </div>
        <div style={{ color: "#c9c4dc", fontSize: "11px", marginTop: "2px", textShadow: shadow }}>
          {count.toLocaleString()} {unit}
        </div>
        <div style={{ color: "#8a84a0", fontSize: "10px", marginTop: "1px", textShadow: shadow }}>
          Nakamoto: {stats.nakamoto_network} network · {stats.nakamoto_infra} infra
        </div>
      </div>
    </Html>
  );
}

/** Recursive side-branch for the ground texture's root veins. */
function genBranch(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  angle: number,
  width: number,
  depth: number,
) {
  if (depth <= 0 || width < 0.3) return;
  let x = x0;
  let y = y0;
  let a = angle;
  let w = width;
  const steps = 4 + Math.floor(Math.random() * 4);
  for (let s = 0; s < steps; s++) {
    a += (Math.random() - 0.5) * 0.5;
    const len = 8 + Math.random() * 10;
    const nx = x + Math.cos(a) * len;
    const ny = y + Math.sin(a) * len;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    x = nx;
    y = ny;
    w *= 0.9;
  }
  genBranch(ctx, x, y, a + (Math.random() > 0.5 ? 1 : -1) * 0.8, w * 0.7, depth - 1);
}

/** Dark soil gradient with faint bioluminescent glow pockets, baked once to a canvas texture. */
function useGroundTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const base = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    base.addColorStop(0, "#1c4a3e");
    base.addColorStop(0.5, "#0d251f");
    base.addColorStop(1, "#030a07");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Branching root veins radiating outward, like Eywa's network glimpsed through soil.
    ctx.strokeStyle = "rgba(93, 232, 212, 0.5)";
    ctx.lineCap = "round";
    const veinOrigins = 7;
    for (let v = 0; v < veinOrigins; v++) {
      let x = size / 2 + (Math.random() - 0.5) * size * 0.3;
      let y = size / 2 + (Math.random() - 0.5) * size * 0.3;
      let angle = Math.random() * Math.PI * 2;
      let width = 2.2 + Math.random() * 1.4;
      const steps = 14 + Math.floor(Math.random() * 10);
      for (let s = 0; s < steps; s++) {
        angle += (Math.random() - 0.5) * 0.6;
        const len = 12 + Math.random() * 16;
        const nx = x + Math.cos(angle) * len;
        const ny = y + Math.sin(angle) * len;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        x = nx;
        y = ny;
        width *= 0.94;
        if (s > 4 && Math.random() < 0.18) {
          genBranch(ctx, x, y, angle + (Math.random() > 0.5 ? 1 : -1) * 0.9, width * 0.7, 3);
        }
      }
    }

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 8 + Math.random() * 26;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, "rgba(93, 232, 212, 0.24)");
      glow.addColorStop(1, "rgba(93, 232, 212, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return new CanvasTexture(canvas);
  }, []);
}

function GroundPlane() {
  const texture = useGroundTexture();
  return (
    <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[42, 24]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={0.92} />
    </mesh>
  );
}

function SceneContents({
  data,
  highQuality,
  onSelect,
}: {
  data: NetworkData;
  highQuality: boolean;
  onSelect: SelectHandler;
}) {
  const radii = useMemo<ClusterRadii>(
    () => computeRadii(data),
    [data.bitcoin.node_count, data.tor.relay_count],
  );

  const entries = useMemo<ClusterEntry[]>(() => {
    const out: ClusterEntry[] = [];
    for (const n of data.nodes) {
      const base: SelectedNode = {
        asn: n.asn,
        side: "bitcoin",
        category: n.category,
        providerName: n.providerName,
        country: n.country,
        bitcoinCount: n.bitcoinCount,
        torCount: n.torCount,
      };

      if (n.bitcoinCount > 0) {
        out.push({
          key: `${n.asn}-btc`,
          position: clusterPosition(n, "bitcoin", radii),
          color: COLOR_BITCOIN,
          baseScale: sizeFor(n.bitcoinCount, radii.bitcoin / BASE_RADIUS),
          phase: phaseFor(n.asn, 1),
          selection: { ...base, side: "bitcoin" },
        });
      }
      if (n.torCount > 0) {
        out.push({
          key: `${n.asn}-tor`,
          position: clusterPosition(n, "tor", radii),
          color: COLOR_TOR,
          baseScale: sizeFor(n.torCount, radii.tor / BASE_RADIUS),
          phase: phaseFor(n.asn, 2),
          selection: { ...base, side: "tor" },
        });
      }
    }
    return out;
  }, [data.nodes, radii]);

  return (
    <>
      <Sparkles count={180} scale={[17, 6, 11]} size={3} speed={0.3} color="#8fefe0" opacity={0.7} />
      <GroundPlane />
      <NodeCloud entries={entries} onSelect={onSelect} />
      <CrossLayerLinks nodes={data.nodes} connections={data.connections} radii={radii} />
      <ClusterLabel side="bitcoin" count={data.bitcoin.node_count} stats={data.bitcoin} radii={radii} />
      <ClusterLabel side="tor" count={data.tor.relay_count} stats={data.tor} radii={radii} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.2}
        enableDamping
        dampingFactor={0.05}
        minDistance={6}
        maxDistance={22}
        minPolarAngle={Math.PI * 0.32}
        maxPolarAngle={Math.PI * 0.58}
      />
      {highQuality && (
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.22} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

function DetailPanel({
  node,
  totals,
  onClose,
}: {
  node: SelectedNode;
  totals: { bitcoin: number; tor: number };
  onClose: () => void;
}) {
  const color = node.side === "bitcoin" ? COLOR_BITCOIN : COLOR_TOR;
  const ownCount = node.side === "bitcoin" ? node.bitcoinCount : node.torCount;
  const ownTotal = node.side === "bitcoin" ? totals.bitcoin : totals.tor;
  const share = ownTotal > 0 ? (ownCount / ownTotal) * 100 : 0;
  const hasOverlap = node.bitcoinCount > 0 && node.torCount > 0;

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        width: "17rem",
        background: "rgba(20,18,32,0.85)",
        border: `1px solid ${color}66`,
        borderRadius: "0.5rem",
        padding: "0.85rem 1rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e8e6f0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>{node.asn}</div>
          <div style={{ fontSize: "0.78rem", color: "#9a94b0", marginTop: "0.1rem" }}>
            {node.providerName ?? node.category}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            color: "#9a94b0",
            cursor: "pointer",
            fontSize: "1.1rem",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div>Location: {node.country}</div>
        <div style={{ color }}>
          {ownCount.toLocaleString()} {node.side === "bitcoin" ? "nodes" : "relays"} · {share.toFixed(2)}%
          of {node.side === "bitcoin" ? "Bitcoin" : "Tor"}
        </div>
        {hasOverlap && (
          <div style={{ color: COLOR_LINK, fontSize: "0.75rem", marginTop: "0.1rem" }}>
            Also hosts{" "}
            {node.side === "bitcoin"
              ? `${node.torCount.toLocaleString()} Tor relays`
              : `${node.bitcoinCount.toLocaleString()} Bitcoin nodes`}{" "}
            — shared infrastructure
          </div>
        )}
      </div>
    </div>
  );
}

// Stable across renders: passing fresh object/array literals as Canvas
// props on every parent re-render (e.g. after a click updates `selected`)
// makes R3F treat them as changed config and reinitialize the renderer,
// which can leave a blank frame under software rendering.
const CAMERA_CONFIG = { position: [0, 4.2, 11] as [number, number, number], fov: 48 };
const GL_CONFIG = { antialias: false, powerPreference: "high-performance" as const };
const DPR_HIGH: [number, number] = [1, 2];
const DPR_LOW = 1;

export default function Scene({ data }: { data: NetworkData | null }) {
  const [highQuality, setHighQuality] = useState(true);
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={CAMERA_CONFIG}
        dpr={highQuality ? DPR_HIGH : DPR_LOW}
        gl={GL_CONFIG}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={["#040805"]} />
        <Suspense fallback={null}>
          {data && <SceneContents data={data} highQuality={highQuality} onSelect={setSelected} />}
        </Suspense>
      </Canvas>

      <button
        onClick={() => setHighQuality((q) => !q)}
        style={{
          position: "absolute",
          bottom: "1rem",
          right: "1rem",
          background: "rgba(20,18,32,0.7)",
          color: "#c9c4dc",
          border: "1px solid #3a3450",
          borderRadius: "0.4rem",
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          cursor: "pointer",
        }}
      >
        {highQuality ? "Effects: High" : "Effects: Low"}
      </button>

      {selected && data && (
        <DetailPanel
          node={selected}
          totals={{ bitcoin: data.bitcoin.node_count, tor: data.tor.relay_count }}
          onClose={() => setSelected(null)}
        />
      )}

      {!data && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9a94b0",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Loading network data…
        </div>
      )}
    </div>
  );
}
