"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instances, Instance, OrbitControls, Stars, Line, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { QuadraticBezierCurve3, Vector3 } from "three";
import type { Object3D } from "three";
import { COLOR_BITCOIN, COLOR_TOR, COLOR_LINK } from "./colors";

interface NetworkNode {
  asn: string;
  category: string;
  x: number;
  y: number;
  z: number;
  bitcoinCount: number;
  torCount: number;
}

interface Connection {
  asn: string;
  dominance: number;
}

interface NetworkData {
  generated_at: string;
  snapshot_date: string;
  bitcoin: {
    node_count: number;
    nakamoto_network: number;
    nakamoto_infra: number;
    hhi_infra: number;
  };
  tor: {
    relay_count: number;
    nakamoto_network: number;
    nakamoto_infra: number;
    hhi_infra: number;
  };
  nodes: NetworkNode[];
  connections: Connection[];
}

type Side = "bitcoin" | "tor";

const RADIUS = 2.6;
const CLUSTER_OFFSET = 4.2;

function clusterPosition(
  node: { x: number; y: number; z: number },
  side: Side,
): [number, number, number] {
  const offset = side === "bitcoin" ? -CLUSTER_OFFSET : CLUSTER_OFFSET;
  return [node.x * RADIUS + offset, node.y * RADIUS, node.z * RADIUS];
}

function sizeFor(count: number): number {
  return 0.02 + 0.018 * Math.log2(1 + count);
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
}

function PulsingNode({ entry }: { entry: ClusterEntry }) {
  const ref = useRef<Object3D>(null!);

  useFrame(({ clock }) => {
    const pulse = 1 + 0.16 * Math.sin(clock.elapsedTime * 0.6 + entry.phase);
    ref.current.scale.setScalar(entry.baseScale * pulse);
  });

  return <Instance ref={ref} position={entry.position} color={entry.color} />;
}

function NodeCloud({ entries }: { entries: ClusterEntry[] }) {
  return (
    <Instances limit={entries.length} range={entries.length}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
      {entries.map((e) => (
        <PulsingNode key={e.key} entry={e} />
      ))}
    </Instances>
  );
}

interface LinkEntry {
  asn: string;
  points: [number, number, number][];
  width: number;
  opacity: number;
}

/**
 * Cross-layer highlight: an organic bezier thread between an ASN's Bitcoin
 * cluster position and its Tor cluster position, for ASNs that host both.
 * Thickness/brightness scale with the ASN's combined dominance so the
 * infrastructure that actually matters (e.g. one host running a big slice
 * of both networks) stands out instead of every incidental overlap.
 */
function CrossLayerLinks({ nodes, connections }: { nodes: NetworkNode[]; connections: Connection[] }) {
  const links = useMemo<LinkEntry[]>(() => {
    const byAsn = new Map(nodes.map((n) => [n.asn, n]));
    const maxDominance = Math.max(...connections.map((c) => c.dominance), 0.0001);

    return connections.flatMap((c): LinkEntry[] => {
      const node = byAsn.get(c.asn);
      if (!node) return [];

      const from = new Vector3(...clusterPosition(node, "bitcoin"));
      const to = new Vector3(...clusterPosition(node, "tor"));
      const strength = c.dominance / maxDominance;

      const mid = from.clone().lerp(to, 0.5);
      mid.y += 0.6 + 1.1 * strength;

      const curve = new QuadraticBezierCurve3(from, mid, to);
      const points = curve.getPoints(24).map((p) => [p.x, p.y, p.z] as [number, number, number]);

      return [
        {
          asn: c.asn,
          points,
          width: 0.6 + strength * 3.5,
          opacity: 0.12 + strength * 0.55,
        },
      ];
    });
  }, [nodes, connections]);

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
    </>
  );
}

function ClusterLabel({ side }: { side: Side }) {
  const x = side === "bitcoin" ? -CLUSTER_OFFSET : CLUSTER_OFFSET;
  return (
    <Html position={[x, RADIUS + 0.9, 0]} center style={{ pointerEvents: "none" }}>
      <div
        style={{
          color: side === "bitcoin" ? COLOR_BITCOIN : COLOR_TOR,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textShadow: "0 0 8px rgba(5,5,12,0.9), 0 0 3px rgba(5,5,12,0.9)",
          whiteSpace: "nowrap",
        }}
      >
        {side === "bitcoin" ? "BITCOIN" : "TOR"}
      </div>
    </Html>
  );
}

function SceneContents({ data, highQuality }: { data: NetworkData; highQuality: boolean }) {
  const entries = useMemo<ClusterEntry[]>(() => {
    const out: ClusterEntry[] = [];
    for (const n of data.nodes) {
      if (n.bitcoinCount > 0) {
        out.push({
          key: `${n.asn}-btc`,
          position: clusterPosition(n, "bitcoin"),
          color: COLOR_BITCOIN,
          baseScale: sizeFor(n.bitcoinCount),
          phase: phaseFor(n.asn, 1),
        });
      }
      if (n.torCount > 0) {
        out.push({
          key: `${n.asn}-tor`,
          position: clusterPosition(n, "tor"),
          color: COLOR_TOR,
          baseScale: sizeFor(n.torCount),
          phase: phaseFor(n.asn, 2),
        });
      }
    }
    return out;
  }, [data.nodes]);

  return (
    <>
      <Stars radius={60} depth={30} count={1500} factor={2} fade speed={0.3} />
      <NodeCloud entries={entries} />
      <CrossLayerLinks nodes={data.nodes} connections={data.connections} />
      <ClusterLabel side="bitcoin" />
      <ClusterLabel side="tor" />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.05}
        minDistance={6}
        maxDistance={22}
      />
      {highQuality && (
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

export default function Scene() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [highQuality, setHighQuality] = useState(true);

  useEffect(() => {
    fetch("/data/network.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 1.5, 13], fov: 52 }}
        dpr={highQuality ? [1, 2] : 1}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#05050c"]} />
        <Suspense fallback={null}>
          {data && <SceneContents data={data} highQuality={highQuality} />}
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
