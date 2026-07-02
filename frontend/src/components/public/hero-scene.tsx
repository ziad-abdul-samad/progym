'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Shape, type Mesh } from 'three';

function useCanRenderScene() {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCanRender(desktop.matches && !reduced.matches);

    update();
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);

    return () => {
      desktop.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
    };
  }, []);

  return canRender;
}

function BoltMark() {
  const mesh = useRef<Mesh>(null);
  const shape = useMemo(() => {
    const bolt = new Shape();
    bolt.moveTo(-0.18, 0.72);
    bolt.lineTo(0.52, 0.72);
    bolt.lineTo(0.15, 0.08);
    bolt.lineTo(0.62, 0.08);
    bolt.lineTo(-0.38, -0.82);
    bolt.lineTo(-0.06, -0.16);
    bolt.lineTo(-0.58, -0.16);
    bolt.closePath();
    return bolt;
  }, []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.22;
    mesh.current.rotation.z = Math.sin(clock.elapsedTime * 0.36) * 0.045;
  });

  return (
    <mesh ref={mesh} position={[0.08, 0.4, 0.24]} rotation={[0.08, -0.18, -0.08]} scale={3.15}>
      <extrudeGeometry args={[shape, { bevelEnabled: true, bevelSegments: 3, bevelSize: 0.032, depth: 0.18 }]} />
      <meshStandardMaterial color="#22ff00" emissive="#1ad800" emissiveIntensity={1.3} metalness={0.18} roughness={0.18} />
    </mesh>
  );
}

function Dumbbell({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = rotation[2] + Math.sin(clock.elapsedTime * 0.34 + position[0]) * 0.035;
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.5 + position[0]) * 0.035;
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 1.38, 22]} />
        <meshStandardMaterial color="#071006" metalness={0.42} roughness={0.22} />
      </mesh>
      {[-0.78, -0.58, 0.58, 0.78].map((x, index) => (
        <mesh key={`${x}-${index}`} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.16, 32]} />
          <meshStandardMaterial
            color={index === 1 || index === 2 ? '#22ff00' : '#101410'}
            emissive={index === 1 || index === 2 ? '#118600' : '#000000'}
            emissiveIntensity={index === 1 || index === 2 ? 0.3 : 0}
            metalness={0.28}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloorGrid() {
  return (
    <group position={[0, -1.55, -0.95]} rotation={[-0.78, 0, 0]}>
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={`line-x-${index}`} position={[index - 3, 0, 0]}>
          <boxGeometry args={[0.01, 0.01, 4.8]} />
          <meshBasicMaterial color="#22ff00" transparent opacity={0.14} />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, index) => (
        <mesh key={`line-z-${index}`} position={[0, 0, index - 2]}>
          <boxGeometry args={[6.8, 0.01, 0.01]} />
          <meshBasicMaterial color="#071006" transparent opacity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.58) * 0.06;
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight color="#22ff00" intensity={96} position={[2.4, 2.6, 3.2]} />
      <pointLight color="#ffffff" intensity={42} position={[-3.2, 2.4, 3.2]} />
      <group ref={group}>
        <BoltMark />
        <Dumbbell position={[-1.72, -0.96, -0.3]} rotation={[0.22, 0.1, -0.34]} scale={0.92} />
        <Dumbbell position={[1.72, -1.04, -0.42]} rotation={[0.18, -0.08, 0.36]} scale={0.78} />
      </group>
      <FloorGrid />
    </>
  );
}

export function HeroScene() {
  const canRender = useCanRenderScene();

  if (!canRender) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-10 left-[30vw] z-[1] hidden w-[46vw] opacity-85 mix-blend-multiply [mask-image:radial-gradient(circle_at_center,black_0%,black_58%,transparent_76%)] dark:mix-blend-screen lg:block"
    >
      <Canvas
        camera={{ fov: 32, position: [0, 0.08, 6] }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
