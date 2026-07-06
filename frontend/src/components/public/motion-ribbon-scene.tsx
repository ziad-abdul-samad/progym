'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { useSceneVisibility } from '@/components/public/use-scene-visibility';

const texturePaths = [
  '/images/gym/optimized/gym-07.webp',
  '/images/gym/optimized/gym-01.webp',
  '/images/gym/optimized/gym-03.webp',
  '/images/gym/optimized/gym-05.webp',
  '/images/gym/optimized/gym-10.webp',
  '/images/gym/optimized/gym-06.webp',
  '/images/gym/optimized/gym-09.webp',
];

type ScrollProgress = { current: number };

type PanelPose = {
  rotationY: number;
  rotationZ: number;
  scale: number;
  x: number;
  y: number;
  z: number;
};

const fallbackEntryPose: PanelPose = {
  rotationY: -0.04,
  rotationZ: 0.025,
  scale: 0.68,
  x: 0,
  y: 0.1,
  z: -1.4,
};

const fallbackTransitionPose: PanelPose = {
  rotationY: -0.04,
  rotationZ: -0.025,
  scale: 1.02,
  x: -0.05,
  y: -0.34,
  z: 0.65,
};

const entryLayout: PanelPose[] = [
  { rotationY: 0.68, rotationZ: -0.24, scale: 0.4, x: -7.2, y: 2.85, z: -4.8 },
  { rotationY: 0.48, rotationZ: 0.14, scale: 0.5, x: -4.9, y: 0.55, z: -3.4 },
  { rotationY: 0.26, rotationZ: -0.12, scale: 0.58, x: -2.75, y: -2.15, z: -2.25 },
  fallbackEntryPose,
  { rotationY: -0.3, rotationZ: 0.13, scale: 0.56, x: 3.05, y: 2.45, z: -2.35 },
  { rotationY: -0.5, rotationZ: -0.15, scale: 0.48, x: 5.2, y: -1.35, z: -3.6 },
  { rotationY: -0.7, rotationZ: 0.22, scale: 0.38, x: 7.35, y: 1.7, z: -5 },
];

const entranceDelays = [0.16, 0.07, 0.12, 0, 0.05, 0.18, 0.13];

const transitionLayout: PanelPose[] = [
  { rotationY: 0.22, rotationZ: -0.06, scale: 0.82, x: -4.4, y: 1.95, z: -0.6 },
  { rotationY: 0.08, rotationZ: 0.04, scale: 0.9, x: -1.65, y: 2.18, z: 0.05 },
  { rotationY: -0.12, rotationZ: -0.04, scale: 0.86, x: 1.22, y: 1.72, z: -0.15 },
  { rotationY: 0.12, rotationZ: 0.055, scale: 0.96, x: -3.25, y: -0.62, z: 0.35 },
  fallbackTransitionPose,
  { rotationY: -0.16, rotationZ: 0.045, scale: 0.91, x: 3.12, y: -0.55, z: 0.05 },
  { rotationY: -0.28, rotationZ: -0.07, scale: 0.74, x: 4.55, y: 1.42, z: -0.75 },
];

function GalleryPanel({
  index,
  progress,
  texture,
}: {
  index: number;
  progress: ScrollProgress;
  texture: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const featured = index === 3;
  const entry = entryLayout[index] ?? fallbackEntryPose;
  const transition = transitionLayout[index] ?? fallbackTransitionPose;
  const gridColumns = [-3.25, 0, 3.25];
  const gridRows = [1.75, -0.35, -2.45];
  const gridColumn = index % 3;
  const gridRow = Math.floor(index / 3);
  const gridX = gridColumns[gridColumn] ?? 0;
  const gridY = gridRows[gridRow] ?? -2.45;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const value = progress.current;
    const wave = Math.sin(clock.elapsedTime * 0.36 + index * 0.72) * 0.035;
    const transitionStart = entranceDelays[index] ?? 0.04;
    const transitionProgress = THREE.MathUtils.smoothstep(
      value,
      transitionStart,
      transitionStart + 0.4,
    );
    const gridProgress = THREE.MathUtils.smoothstep(value, 0.5, 0.9);
    const stageX = THREE.MathUtils.lerp(entry.x, transition.x, transitionProgress);
    const stageY = THREE.MathUtils.lerp(entry.y, transition.y, transitionProgress) + wave;
    const stageZ = THREE.MathUtils.lerp(entry.z, transition.z, transitionProgress);
    const stageScale = THREE.MathUtils.lerp(entry.scale, transition.scale, transitionProgress);
    const stageRotationY = THREE.MathUtils.lerp(
      entry.rotationY,
      transition.rotationY,
      transitionProgress,
    );
    const stageRotationZ = THREE.MathUtils.lerp(
      entry.rotationZ,
      transition.rotationZ,
      transitionProgress,
    );
    const composedX = THREE.MathUtils.lerp(stageX, gridX, gridProgress);
    const composedY = THREE.MathUtils.lerp(stageY, gridY, gridProgress);
    const composedZ = THREE.MathUtils.lerp(stageZ, -0.25 + gridRow * -0.08, gridProgress);
    const composedScale = THREE.MathUtils.lerp(stageScale, 0.92, gridProgress);

    group.position.x = THREE.MathUtils.lerp(group.position.x, composedX, 0.085);
    group.position.y = THREE.MathUtils.lerp(
      group.position.y,
      composedY,
      0.085,
    );
    group.position.z = THREE.MathUtils.lerp(
      group.position.z,
      composedZ,
      0.085,
    );
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      THREE.MathUtils.lerp(stageRotationY, 0, gridProgress),
      0.075,
    );
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      THREE.MathUtils.lerp(Math.abs(stageRotationY) * 0.08, 0, gridProgress),
      0.07,
    );
    group.rotation.z = THREE.MathUtils.lerp(
      group.rotation.z,
      THREE.MathUtils.lerp(stageRotationZ + wave, 0, gridProgress),
      0.07,
    );
    const nextScale = THREE.MathUtils.lerp(group.scale.x, composedScale, 0.075);
    group.scale.setScalar(nextScale);
  });

  return (
    <group
      ref={groupRef}
      position={[entry.x, entry.y, entry.z]}
      rotation={[Math.abs(entry.rotationY) * 0.08, entry.rotationY, entry.rotationZ]}
      scale={entry.scale}
    >
      <mesh position={[0, 0, -0.09]} scale={[1.07, 1.1, 1]}>
        <planeGeometry args={[3, 1.88]} />
        <meshPhysicalMaterial
          clearcoat={1}
          color={featured ? '#39ff14' : '#f2f2ef'}
          opacity={featured ? 0.26 : 0.18}
          roughness={0.08}
          side={THREE.DoubleSide}
          thickness={0.45}
          transmission={0.72}
          transparent
        />
      </mesh>
      <mesh>
        <planeGeometry args={[3, 1.88]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.76, 0.025]}>
        <planeGeometry args={[2.72, 0.27]} />
        <meshBasicMaterial color={featured ? '#151713' : '#ecece8'} opacity={0.94} transparent />
      </mesh>
      <mesh position={[-1.29, -0.76, 0.04]}>
        <planeGeometry args={[0.045, 0.12]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
    </group>
  );
}

function CurveGuide() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.1, 1.55, -1.5),
      new THREE.Vector3(-4.4, 0.7, -0.7),
      new THREE.Vector3(-1.8, 0.12, 0),
      new THREE.Vector3(0, -0.35, 0.55),
      new THREE.Vector3(2.2, 0.18, -0.1),
      new THREE.Vector3(4.8, 0.95, -0.9),
      new THREE.Vector3(7.3, 1.85, -1.7),
    ]);
    return new THREE.TubeGeometry(curve, 90, 0.012, 8, false);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#252522" opacity={0.32} transparent />
    </mesh>
  );
}

function Scene({ onReady, progress }: { onReady: () => void; progress: ScrollProgress }) {
  const textures = useLoader(THREE.TextureLoader, texturePaths);
  const rigRef = useRef<THREE.Group>(null);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    });
    onReady();
  }, [onReady, textures]);

  useFrame(({ camera, pointer }) => {
    const value = progress.current;
    const rig = rigRef.current;
    if (rig) {
      rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, 0.14 - value * 0.24 + pointer.y * 0.035, 0.055);
      rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, -0.22 + value * 0.44 + pointer.x * 0.055, 0.055);
      rig.position.x = THREE.MathUtils.lerp(rig.position.x, 0.52 - value * 1.04, 0.05);
      rig.position.y = THREE.MathUtils.lerp(rig.position.y, 0.2 - value * 0.42, 0.05);
    }
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 10.6 - value * 2.4, 0.045);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(value * Math.PI) * 0.32, 0.045);
    camera.lookAt(0, 0.15, 0);
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight color="#ffffff" intensity={2.8} position={[-3, 5, 7]} />
      <pointLight color="#39ff14" intensity={24} position={[0, -1, 4]} />
      <group ref={rigRef}>
        <CurveGuide />
        {textures.map((texture, index) => (
          <GalleryPanel index={index} key={texturePaths[index]} progress={progress} texture={texture} />
        ))}
      </group>
    </>
  );
}

export function MotionRibbonScene({ progress }: { progress: ScrollProgress }) {
  const { containerRef, visible } = useSceneVisibility('30% 0px');
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 grid grid-cols-3 gap-3 p-[7%] transition-opacity duration-700 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {texturePaths.map((src, index) => (
          <div
            className={`relative overflow-hidden border border-black/10 bg-[#ecece8] shadow-xl ${
              index % 2 === 0 ? '-rotate-2' : 'rotate-2'
            }`}
            key={src}
          >
            <Image alt="" className="object-cover grayscale" fill sizes="33vw" src={src} />
          </div>
        ))}
      </div>
      {visible ? (
        <div className="absolute inset-0 z-10">
          <Canvas
            camera={{ fov: 43, position: [0, 0.2, 10.6] }}
            dpr={[1, 1.25]}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false }}
          >
            <Suspense fallback={null}>
              <Scene onReady={handleReady} progress={progress} />
            </Suspense>
          </Canvas>
        </div>
      ) : null}
    </div>
  );
}
