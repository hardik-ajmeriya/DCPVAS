import React, { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";

function FloatingCube({ color = "#7C5CFF", position = [0, 0, -3.2], size = 0.8, speed = 0.25, opacity = 0.32, progressRef }) {
  const ref = useRef();
  const matRef = useRef();
  const [phase, setPhase] = useState(0);
  // Initialize random phase after mount to satisfy React purity rules
  useEffect(() => {
    setPhase(Math.random() * Math.PI * 2);
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.12;
    ref.current.rotation.y += delta * 0.1;
    const t = state.clock.elapsedTime * speed + phase;
    ref.current.position.y = position[1] + Math.sin(t) * 0.15;

    // Scroll-based animation: scale, z-shift, fade-out
    const p = Math.min(1, Math.max(0, progressRef?.current ?? 0));
    const scale = 1 + p * 0.2; // subtle zoom
    ref.current.scale.setScalar(scale);
    ref.current.position.z = position[2] + p * 0.8; // move slightly forward

    // Fade out after 70% scroll progress
    const fadeStart = 0.7;
    const fade = p <= fadeStart ? 0 : Math.min(1, (p - fadeStart) / (1 - fadeStart));
    if (matRef.current) {
      matRef.current.opacity = opacity * (1 - fade);
    }
  });

  return (
    <mesh ref={ref} position={position} frustumCulled={false}>
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

export default function HeroBackground3D() {
  // Keep it subtle: small count, wireframe, low opacity
  const progressRef = useRef(0);
  const cubes = useMemo(() => (
    [
      { color: "#7C5CFF", position: [-1.4, 0.5, -3.2] },
      { color: "#00E5FF", position: [-0.6, -0.4, -3.0] },
      { color: "#7C5CFF", position: [0.2, 0.8, -3.4] },
      { color: "#00E5FF", position: [1.1, -0.2, -3.5] },
      { color: "#7C5CFF", position: [1.6, 0.4, -3.6] },
      { color: "#00E5FF", position: [0.9, -0.7, -3.1] },
      { color: "#7C5CFF", position: [-0.5, 0.1, -3.3] },
      { color: "#00E5FF", position: [0.6, -0.6, -3.7] },
    ]
  ), []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3.5], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        shadows={false}
      >
        {/* Scroll progress controller (monotonic) */}
        {(() => {
          function ScrollController({ progressRef, threshold = 700 }) {
            useFrame(() => {
              const y = typeof window !== "undefined" ? window.scrollY : 0;
              const norm = Math.min(1, y / threshold);
              // Only increase; do not replay when scrolling up
              progressRef.current = Math.max(progressRef.current || 0, norm);
            });
            return null;
          }
          return <ScrollController progressRef={progressRef} />;
        })()}

        {/* Atmospheric depth */}
        <fog attach="fog" color="#0B0E14" near={4} far={9} />
        {/* Subtle lighting for visibility on dark background */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[2, 3, 4]} intensity={0.35} />
        {/* Camera-adjacent fill light for immediate visibility */}
        <pointLight position={[0, 0, 2.5]} intensity={1.0} />

        {/* Gentle float for the whole group */}
        <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.2}>
          {cubes.map((c, i) => (
            <FloatingCube key={i} color={c.color} position={c.position} progressRef={progressRef} />
          ))}
        </Float>
      </Canvas>
    </div>
  );
}
 
