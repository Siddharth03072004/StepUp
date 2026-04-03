import { Float, Sparkles, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import * as THREE from 'three';

function CameraRig({ reduceMotion }: { reduceMotion: boolean }) {
  useFrame((state) => {
    if (reduceMotion) {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.03);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, 0.03);
    } else {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 0.55, 0.035);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.pointer.y * 0.25, 0.03);
    }

    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

function DriftingShape({
  color,
  position,
  rotation,
  scale,
}: {
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.x += delta * 0.08;
    meshRef.current.rotation.y += delta * 0.14;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.35 + position[0]) * 0.22;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          metalness={0.1}
          roughness={0.18}
          transparent
          opacity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
    </Float>
  );
}

export function ThreeBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-[-2] overflow-hidden bg-[#030712]">
      <div className="ambient-ring left-[-8rem] top-[-8rem] h-80 w-80 bg-cyan-400/20" />
      <div className="ambient-ring right-[-6rem] top-[10%] h-72 w-72 bg-amber-300/15" />
      <div className="ambient-ring bottom-[-10rem] left-[15%] h-96 w-96 bg-sky-400/10" />
      <div className="grid-fade absolute inset-0 opacity-35" />
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <fog attach="fog" args={['#030712', 5, 18]} />
        <CameraRig reduceMotion={!!prefersReducedMotion} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[4, 3, 5]} intensity={1.25} color="#7dd3fc" />
        <pointLight position={[-5, -2, 2]} intensity={0.9} color="#fbbf24" />
        <Stars
          radius={80}
          depth={40}
          count={prefersReducedMotion ? 1400 : 2600}
          factor={prefersReducedMotion ? 2.5 : 3.8}
          saturation={0}
          fade
          speed={prefersReducedMotion ? 0.12 : 0.35}
        />
        <Sparkles
          count={prefersReducedMotion ? 80 : 160}
          scale={12}
          size={4}
          speed={prefersReducedMotion ? 0.15 : 0.45}
          opacity={0.65}
          color="#67e8f9"
        />
        <Sparkles
          count={prefersReducedMotion ? 30 : 65}
          scale={9}
          size={6}
          speed={prefersReducedMotion ? 0.08 : 0.2}
          opacity={0.4}
          color="#fcd34d"
        />
        <DriftingShape color="#67e8f9" position={[-2.6, 1.25, -1.8]} rotation={[0.4, 0.2, 0.1]} scale={0.92} />
        <DriftingShape color="#38bdf8" position={[2.8, -0.65, -2.4]} rotation={[0.2, 0.7, 0.2]} scale={1.2} />
        <DriftingShape color="#fbbf24" position={[0.8, 1.8, -3.4]} rotation={[0.8, 0.1, 0.6]} scale={0.7} />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.18),rgba(3,7,18,0.82)_85%)]" />
    </div>
  );
}
