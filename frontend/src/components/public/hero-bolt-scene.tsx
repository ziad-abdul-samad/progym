'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useSceneVisibility } from '@/components/public/use-scene-visibility';

function createBoltGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.38, 1.72);
  shape.lineTo(0.62, 1.72);
  shape.lineTo(0.12, 0.38);
  shape.lineTo(0.82, 0.38);
  shape.lineTo(-0.56, -1.82);
  shape.lineTo(-0.12, -0.4);
  shape.lineTo(-0.82, -0.4);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: 0.085,
    bevelThickness: 0.08,
    curveSegments: 18,
    depth: 0.38,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function ElectricArc({
  color,
  radius,
  seed,
  turns,
}: {
  color: string;
  radius: number;
  seed: number;
  turns: number;
}) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(new Float32Array(30 * 3), 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);
    const material = new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color,
      depthWrite: false,
      opacity: 0.82,
      transparent: true,
    });
    const electricLine = new THREE.Line(geometry, material);
    electricLine.frustumCulled = false;
    return electricLine;
  }, [color]);
  const previousFrame = useRef(-1);

  useFrame(({ clock }) => {
    const frame = Math.floor(clock.elapsedTime * 22);
    if (frame === previousFrame.current) return;
    previousFrame.current = frame;

    const count = 30;
    const positionAttribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    for (let index = 0; index < count; index += 1) {
      const progress = index / (count - 1);
      const angle = progress * Math.PI * 2 * turns + seed;
      const pulse = Math.sin(progress * 18 + frame * 0.38 + seed) * 0.085;
      const jitterX = Math.sin(index * 12.73 + frame * 1.91 + seed) * 0.07;
      const jitterY = Math.cos(index * 8.31 + frame * 1.37 + seed) * 0.06;
      positions[index * 3] = Math.cos(angle) * (radius + pulse) + jitterX;
      positions[index * 3 + 1] = THREE.MathUtils.lerp(-1.78, 1.78, progress) + jitterY;
      positions[index * 3 + 2] = Math.sin(angle) * (radius * 0.48 + pulse);
    }

    positionAttribute.needsUpdate = true;
    const material = line.material as THREE.LineBasicMaterial;
    material.opacity = 0.5 + Math.abs(Math.sin(clock.elapsedTime * 8 + seed)) * 0.5;
  });

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  return <primitive object={line} />;
}

function EnergyParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(360 * 3);
    for (let index = 0; index < 360; index += 1) {
      const angle = index * 2.39996;
      const radius = 0.75 + ((index * 37) % 100) / 56;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = -2.2 + ((index * 71) % 440) / 100;
      values[index * 3 + 2] = Math.sin(angle) * radius * 0.5;
    }
    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.08;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        color="#7dff67"
        depthWrite={false}
        opacity={0.62}
        size={0.018}
        sizeAttenuation
        transparent
      />
    </points>
  );
}

function BoltModel() {
  const groupRef = useRef<THREE.Group>(null);
  const boltGeometry = useMemo(() => createBoltGeometry(), []);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(boltGeometry, 16), [boltGeometry]);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const targetX = pointer.y * 0.18;
    const targetY = pointer.x * 0.34;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.055);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.055);
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.42) * 0.035 - 0.08;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.76) * 0.08;
  });

  useEffect(
    () => () => {
      boltGeometry.dispose();
      edgeGeometry.dispose();
    },
    [boltGeometry, edgeGeometry],
  );

  return (
    <group ref={groupRef} rotation={[0, -0.12, -0.08]} scale={0.96}>
      <mesh geometry={boltGeometry} scale={1.075}>
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#39ff14"
          depthWrite={false}
          opacity={0.16}
          transparent
        />
      </mesh>
      <mesh geometry={boltGeometry}>
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.12}
          color="#111510"
          emissive="#1eff00"
          emissiveIntensity={0.62}
          iridescence={0.5}
          iridescenceIOR={1.8}
          metalness={0.92}
          roughness={0.16}
        />
      </mesh>
      <mesh geometry={boltGeometry} position={[0, 0, 0.24]} scale={0.77}>
        <meshPhysicalMaterial
          attenuationColor="#39ff14"
          attenuationDistance={0.72}
          clearcoat={1}
          clearcoatRoughness={0.04}
          color="#39ff14"
          emissive="#16a600"
          emissiveIntensity={0.3}
          ior={1.46}
          metalness={0.05}
          opacity={0.78}
          roughness={0.06}
          side={THREE.DoubleSide}
          thickness={0.9}
          transmission={0.62}
          transparent
        />
      </mesh>
      <lineSegments geometry={edgeGeometry} scale={1.004}>
        <lineBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#a8ff99"
          opacity={0.88}
          transparent
        />
      </lineSegments>
      <mesh geometry={boltGeometry} position={[0, 0, -0.12]} scale={0.92}>
        <meshStandardMaterial color="#020402" metalness={0.82} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Scene() {
  const rigRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!rigRef.current) return;
    rigRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.06;
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <spotLight angle={0.48} color="#ffffff" intensity={72} penumbra={0.9} position={[-3, 4, 5]} />
      <pointLight color="#39ff14" intensity={88} position={[2.6, 1.5, 3]} />
      <pointLight color="#95ff85" intensity={34} position={[-2.4, -1.8, 2]} />
      <group ref={rigRef}>
        <BoltModel />
        <ElectricArc color="#39ff14" radius={1.08} seed={0.2} turns={1.45} />
        <ElectricArc color="#eaffE6" radius={1.34} seed={2.1} turns={-1.1} />
        <ElectricArc color="#39ff14" radius={1.58} seed={4.4} turns={1.2} />
        <EnergyParticles />
      </group>
      <mesh position={[0, -2.15, -0.65]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 72]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color="#39ff14"
          depthWrite={false}
          opacity={0.055}
          transparent
        />
      </mesh>
    </>
  );
}

export function HeroBoltScene() {
  const { containerRef, visible } = useSceneVisibility('15% 0px');

  return (
    <div className="h-full w-full" ref={containerRef}>
      {visible ? (
        <Canvas
          camera={{ fov: 32, position: [0, 0, 7] }}
          dpr={[1, 1.25]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false }}
        >
          <Scene />
        </Canvas>
      ) : null}
    </div>
  );
}
