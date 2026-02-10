import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion";

function Cube({ color, position, controls }) {
  const meshRef = useRef();
  const matRef = useRef();

  useFrame((_, delta) => {
    const speed = controls.rotationSpeedRef.current;
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed;
      meshRef.current.rotation.y += delta * (speed * 0.85);
    }
    if (matRef.current) {
      matRef.current.opacity = controls.opacityRef.current;
      matRef.current.emissiveIntensity = controls.glowRef.current;
    }
  });

  return (
    <mesh ref={meshRef} position={position} frustumCulled={false}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.28}
        roughness={0.6}
        metalness={0.0}
        emissive={color}
        emissiveIntensity={0.15}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// Radial glow sprite for soft neon background halos
function GlowSprite({ color = "#00E5FF", position = [0, 0, -4], scale = 5, opacity = 0.6 }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  return (
    <sprite position={position} scale={scale} renderOrder={-1}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

export default function HeroBackground3D() {
  const containerRef = useRef(null);

  // Track scroll progress of the hero section only
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  // Monotonic progress (animation shouldn't replay when scrolling up)
  const [maxProgress, setMaxProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setMaxProgress((p) => (v > p ? v : p)));

  const progress = useSpring(maxProgress, { stiffness: 60, damping: 20, mass: 0.5 });

  // Stage mappings
  const scaleMV = useTransform(progress, [0, 0.2, 0.4, 0.6, 0.8, 1], [1, 1.1, 1.6, 1.6, 1.5, 1.4]);
  const zMV = useTransform(progress, [0, 0.2, 0.4, 0.6, 1], [-3.4, -3.2, -2.6, -2.5, -2.5]);
  const yMV = useTransform(progress, [0, 0.6, 0.8, 1], [0, 0, 0.2, 0.3]);
  const rotSpeedMV = useTransform(progress, [0, 0.4, 0.6, 1], [0.12, 0.28, 0.36, 0.36]);
  const opacityMV = useTransform(progress, [0, 0.6, 0.8, 1], [0.32, 0.32, 0, 0]);
  const glowMV = useTransform(progress, [0, 0.4, 0.6, 1], [0.25, 0.45, 0.7, 0.8]);

  // Bridge MotionValues to refs for useFrame
  const controls = {
    rotationSpeedRef: useRef(0.12),
    opacityRef: useRef(0.32),
    glowRef: useRef(0.15),
  };
  useMotionValueEvent(rotSpeedMV, "change", (v) => (controls.rotationSpeedRef.current = v));
  useMotionValueEvent(opacityMV, "change", (v) => (controls.opacityRef.current = v));
  useMotionValueEvent(glowMV, "change", (v) => (controls.glowRef.current = v));

  // Group ref for transform updates driven by MotionValues
  const groupRef = useRef();
  // Bridge MotionValues for transform props to refs
  const transformRefs = {
    scaleRef: useRef(1),
    zRef: useRef(-3.4),
    yRef: useRef(0),
  };
  useMotionValueEvent(scaleMV, "change", (v) => (transformRefs.scaleRef.current = v));
  useMotionValueEvent(zMV, "change", (v) => (transformRefs.zRef.current = v));
  useMotionValueEvent(yMV, "change", (v) => (transformRefs.yRef.current = v));

  // Animator component to run useFrame inside Canvas subtree
  function GroupAnimator({ group, transforms }) {
    useFrame(() => {
      if (!group.current) return;
      const s = transforms.scaleRef.current;
      group.current.scale.setScalar(s);
      group.current.position.z = transforms.zRef.current;
      group.current.position.y = transforms.yRef.current;
    });
    return null;
  }

  const cubes = useMemo(
    () => [
      { color: "#7C5CFF", position: [-1.4, 0.5, -3.2] },
      { color: "#00E5FF", position: [-0.6, -0.4, -3.0] },
      { color: "#7C5CFF", position: [0.2, 0.8, -3.4] },
      { color: "#00E5FF", position: [1.1, -0.2, -3.5] },
      { color: "#7C5CFF", position: [1.6, 0.4, -3.6] },
      { color: "#00E5FF", position: [0.9, -0.7, -3.1] },
      { color: "#7C5CFF", position: [-0.5, 0.1, -3.3] },
      { color: "#00E5FF", position: [0.6, -0.6, -3.7] },
    ],
    []
  );

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.5], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }} shadows={false}>
        {/* Atmospheric depth + subtle lighting */}
        <fog attach="fog" color="#000000" near={4} far={9} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 3, 4]} intensity={0.35} />
        {/* Slightly tinted lights to accent the neon feel */}
        <pointLight position={[0.6, -0.3, 2.3]} intensity={0.9} color="#00E5FF" />
        <pointLight position={[-0.8, 0.2, 2.6]} intensity={0.7} color="#7C5CFF" />

        {/* Slow float for calm SaaS feel */}
        <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.2}>
          <group ref={groupRef}>
            <GroupAnimator group={groupRef} transforms={transformRefs} />
            {/* Background glow halos */}
            <GlowSprite color="#7C5CFF" position={[-0.9, 0.25, -4.4]} scale={6} opacity={0.55} />
            <GlowSprite color="#00E5FF" position={[0.9, -0.35, -4.5]} scale={7} opacity={0.5} />
            <GlowSprite color="#00E5FF" position={[0.2, -0.9, -4.6]} scale={5} opacity={0.35} />
            {cubes.map((c, i) => (
              <Cube key={i} color={c.color} position={c.position} controls={controls} />
            ))}
          </group>
        </Float>
      </Canvas>
    </div>
  );
}
 
