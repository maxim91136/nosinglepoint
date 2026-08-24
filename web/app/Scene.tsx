"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instances, Instance, OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { Object3D } from "three";
import { COLOR_BITCOIN, COLOR_TOR, COLOR_BOTH } from "./colors";

interface NetworkNode {
  asn: string;
  category: string;
  x: number;
  y: number;
  z: number;
  bitcoinCount: number;
  torCount: number;
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
}

const RADIUS = 3.4;

function colorFor(node: NetworkNode): string {
  const hasBtc = node.bitcoinCount > 0;
  const hasTor = node.torCount > 0;
  if (hasBtc && hasTor) return COLOR_BOTH;
  return hasBtc ? COLOR_BITCOIN : COLOR_TOR;
}

function sizeFor(node: NetworkNode): number {
  const total = node.bitcoinCount + node.torCount;
  return 0.02 + 0.018 * Math.log2(1 + total);
}

/**
 * Cheap, stable per-ASN hash for desynced pulse phases — purely a visual
 * seed, doesn't need to match the server-side MurmurHash used for layout.
 */
function phaseFor(asn: string): number {
  let h = 0;
  for (let i = 0; i < asn.length; i++) {
    h = (h * 31 + asn.charCodeAt(i)) | 0;
  }
  return ((Math.abs(h) % 1000) / 1000) * Math.PI * 2;
}

function PulsingNode({ node }: { node: NetworkNode }) {
  const ref = useRef<Object3D>(null!);
  const baseScale = useMemo(() => sizeFor(node), [node]);
  const phase = useMemo(() => phaseFor(node.asn), [node.asn]);
  const color = useMemo(() => colorFor(node), [node]);

  useFrame(({ clock }) => {
    const pulse = 1 + 0.16 * Math.sin(clock.elapsedTime * 0.6 + phase);
    ref.current.scale.setScalar(baseScale * pulse);
  });

  return (
    <Instance
      ref={ref}
      position={[node.x * RADIUS, node.y * RADIUS, node.z * RADIUS]}
      color={color}
    />
  );
}

function NodeCloud({ nodes }: { nodes: NetworkNode[] }) {
  return (
    <Instances limit={nodes.length} range={nodes.length}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
      {nodes.map((n) => (
        <PulsingNode key={n.asn} node={n} />
      ))}
    </Instances>
  );
}

function SceneContents({ nodes, highQuality }: { nodes: NetworkNode[]; highQuality: boolean }) {
  return (
    <>
      <Stars radius={60} depth={30} count={1500} factor={2} fade speed={0.3} />
      <NodeCloud nodes={nodes} />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={16}
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
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={highQuality ? [1, 2] : 1}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#05050c"]} />
        <Suspense fallback={null}>
          {data && <SceneContents nodes={data.nodes} highQuality={highQuality} />}
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
