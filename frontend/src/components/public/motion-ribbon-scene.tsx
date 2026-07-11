'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
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

const CARD_WIDTH = 7.2;
const CARD_HEIGHT = 4.5;
const CARD_SEGMENTS_X = 32;
const CARD_SEGMENTS_Y = 18;
const HELIX_TURNS = 2;

type ScrollProgress = { current: number };

type SceneTiming = {
  gridEnd: number;
  gridStart: number;
};

type PanelPose = {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  x: number;
  y: number;
  z: number;
};

const desktopTiming: SceneTiming = { gridEnd: 0.74, gridStart: 0.35 };
const mobileTiming: SceneTiming = { gridEnd: 0.62, gridStart: 0.29 };

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 3);
}

function createHelixCurve(mobile: boolean) {
  const radiusX = mobile ? 7 : 8.8;
  const radiusZ = mobile ? 5.25 : 5.9;
  const height = mobile ? 10.8 : 12.4;
  const points = Array.from({ length: 161 }, (_, index) => {
    const progress = index / 160;
    const angle = Math.PI / 2 - progress * Math.PI * 2 * HELIX_TURNS;

    return new THREE.Vector3(
      Math.sin(angle) * radiusX,
      THREE.MathUtils.lerp(-height / 2, height / 2, progress),
      Math.cos(angle) * radiusZ,
    );
  });

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

function getHelixPose(curve: THREE.CatmullRomCurve3, progress: number): PanelPose {
  const point = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress).normalize();
  const horizontalLength = Math.hypot(tangent.x, tangent.z);

  return {
    rotationX: -Math.sin(progress * Math.PI * 4) * 0.045,
    rotationY: Math.atan2(-tangent.z, tangent.x) * 0.78,
    rotationZ: Math.atan2(tangent.y, horizontalLength) * 0.52,
    scale: 1,
    x: point.x,
    y: point.y,
    z: point.z,
  };
}

function getGridPose(index: number, mobile: boolean): PanelPose {
  if (mobile) {
    const column = index % 2;
    const row = Math.floor(index / 2);

    return {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scale: 0.78,
      x: column === 0 ? -3.25 : 3.25,
      y: 4.55 - row * 4.55,
      z: 0.8,
    };
  }

  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 0.78,
    x: [-7, 0, 7][column] ?? 0,
    y: row === 0 ? 2.45 : -2.45,
    z: 0.8,
  };
}

function configureTexture(texture: THREE.Texture, anisotropy: number) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  const source = texture.image as { height?: number; width?: number } | undefined;
  const sourceWidth = source?.width ?? 0;
  const sourceHeight = source?.height ?? 0;
  if (sourceWidth > 0 && sourceHeight > 0) {
    const sourceAspect = sourceWidth / sourceHeight;
    const cardAspect = CARD_WIDTH / CARD_HEIGHT;
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);

    if (sourceAspect > cardAspect) {
      texture.repeat.x = cardAspect / sourceAspect;
      texture.offset.x = (1 - texture.repeat.x) / 2;
    } else if (sourceAspect < cardAspect) {
      texture.repeat.y = sourceAspect / cardAspect;
      texture.offset.y = (1 - texture.repeat.y) / 2;
    }
  }

  texture.needsUpdate = true;
}

function GalleryPanel({
  curve,
  index,
  mobile,
  progress,
  rigRotation,
  texture,
  timing,
}: {
  curve: THREE.CatmullRomCurve3;
  index: number;
  mobile: boolean;
  progress: ScrollProgress;
  rigRotation: ScrollProgress;
  texture: THREE.Texture;
  timing: SceneTiming;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const imageMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hoveredRef = useRef(false);
  const pathProgress = 0.08 + (index / (texturePaths.length - 1)) * 0.84;
  const helixPose = useMemo(() => getHelixPose(curve, pathProgress), [curve, pathProgress]);
  const gridPose = useMemo(() => getGridPose(Math.min(index, 5), mobile), [index, mobile]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const geometry = geometryRef.current;
    if (!group || !geometry) return;

    const sectionProgress = progress.current;
    const gridPhase = THREE.MathUtils.clamp(
      (sectionProgress - timing.gridStart) / (timing.gridEnd - timing.gridStart),
      0,
      1,
    );
    const staggerStart = index * 0.08;
    const localGridProgress =
      index < 6 ? THREE.MathUtils.clamp((gridPhase - staggerStart) / 0.58, 0, 1) : 0;
    const gridProgress = easeOutCubic(localGridProgress);

    const rotation = rigRotation.current;
    const worldDepth = -helixPose.x * Math.sin(rotation) + helixPose.z * Math.cos(rotation);
    const depthProgress = THREE.MathUtils.smoothstep(
      worldDepth,
      mobile ? -5.25 : -5.9,
      mobile ? 5.25 : 5.9,
    );
    const orbitScale = THREE.MathUtils.lerp(0.64, 1.28, depthProgress);
    const hoverScale = !mobile && hoveredRef.current && gridPhase < 0.05 ? 1.12 : 1;

    let targetX = THREE.MathUtils.lerp(helixPose.x, gridPose.x, gridProgress);
    let targetY = THREE.MathUtils.lerp(helixPose.y, gridPose.y, gridProgress);
    let targetZ = THREE.MathUtils.lerp(helixPose.z, gridPose.z, gridProgress);

    if (index < 6 && localGridProgress > 0 && localGridProgress < 1) {
      const motionArc = Math.sin(localGridProgress * Math.PI);
      const columnCount = mobile ? 2 : 3;
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);
      const horizontalDirection = column === 0 ? -1 : column === columnCount - 1 ? 1 : 0;
      const verticalDirection = mobile ? (row === 0 ? 1 : -1) : row === 0 ? 1 : -1;
      targetX += horizontalDirection * motionArc * (mobile ? 0.9 : 1.3);
      targetY += verticalDirection * motionArc * (mobile ? 1.15 : 1.55);
      targetZ += motionArc * 0.55;
    }

    if (index === 6) {
      const exitProgress = easeOutCubic(THREE.MathUtils.clamp(gridPhase / 0.34, 0, 1));
      targetX = helixPose.x + 5.5 * exitProgress;
      targetY = helixPose.y + 2.2 * exitProgress;
      targetZ = helixPose.z - 2.8 * exitProgress;
    }

    const targetRotationX = THREE.MathUtils.lerp(
      helixPose.rotationX,
      gridPose.rotationX,
      gridProgress,
    );
    const targetRotationY = THREE.MathUtils.lerp(
      helixPose.rotationY,
      gridPose.rotationY,
      gridProgress,
    );
    const targetRotationZ = THREE.MathUtils.lerp(
      helixPose.rotationZ,
      gridPose.rotationZ,
      gridProgress,
    );
    const targetScale = THREE.MathUtils.lerp(orbitScale * hoverScale, gridPose.scale, gridProgress);

    group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 8.5, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 8.5, delta);
    group.position.z = THREE.MathUtils.damp(group.position.z, targetZ, 8.5, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetRotationX, 9, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotationY, 9, delta);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, targetRotationZ, 9, delta);
    const nextScale = THREE.MathUtils.damp(group.scale.x, targetScale, 8, delta);
    group.scale.setScalar(nextScale);

    const bendAmplitude = (1 - gridProgress) * THREE.MathUtils.lerp(0.16, 0.5, depthProgress);
    const rippleAmplitude = index < 6 ? Math.sin(localGridProgress * Math.PI) * 0.5 : 0;
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;

    for (let vertex = 0; vertex < positionAttribute.count; vertex += 1) {
      const x = positionAttribute.getX(vertex);
      const y = positionAttribute.getY(vertex);
      const normalizedX = x / (CARD_WIDTH / 2);
      const normalizedY = y / (CARD_HEIGHT / 2);
      const bend = -bendAmplitude * normalizedX * normalizedX;
      const waveEnvelope = 0.5 + 0.5 * Math.cos(normalizedY * Math.PI * 0.72);
      const ripple =
        Math.sin(normalizedX * Math.PI * 3 + clock.elapsedTime * 5.2 + index * 0.72) *
        rippleAmplitude *
        waveEnvelope;
      const z = bend + ripple;
      positionAttribute.setZ(vertex, z);
    }
    positionAttribute.needsUpdate = true;

    const exitOpacity =
      index === 6 ? 1 - easeOutCubic(THREE.MathUtils.clamp(gridPhase / 0.34, 0, 1)) : 1;
    if (imageMaterialRef.current) imageMaterialRef.current.opacity = exitOpacity;
    if (index === 6) group.visible = exitOpacity > 0.015;
  });

  return (
    <group
      position={[helixPose.x, helixPose.y, helixPose.z]}
      ref={groupRef}
      rotation={[helixPose.rotationX, helixPose.rotationY, helixPose.rotationZ]}
      scale={0.72}
    >
      <mesh
        onPointerOut={() => {
          hoveredRef.current = false;
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (!mobile) hoveredRef.current = true;
        }}
      >
        <planeGeometry
          args={[CARD_WIDTH, CARD_HEIGHT, CARD_SEGMENTS_X, CARD_SEGMENTS_Y]}
          ref={geometryRef}
        />
        <meshBasicMaterial
          map={texture}
          ref={imageMaterialRef}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent={index === 6}
        />
      </mesh>
      <mesh position={[0, -1.91, 0.06]}>
        <planeGeometry args={[6.78, 0.34]} />
        <meshBasicMaterial color={index === 3 ? '#151713' : '#ecece8'} opacity={0.96} transparent />
      </mesh>
      <mesh position={[-3.22, -1.91, 0.08]}>
        <planeGeometry args={[0.08, 0.18]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
    </group>
  );
}

function CurveGuide({
  curve,
  progress,
  timing,
}: {
  curve: THREE.CatmullRomCurve3;
  progress: ScrollProgress;
  timing: SceneTiming;
}) {
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 180, 0.025, 8, false), [curve]);
  const materialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const gridPhase = THREE.MathUtils.clamp(
      (progress.current - timing.gridStart) / (timing.gridEnd - timing.gridStart),
      0,
      1,
    );
    const targetOpacity = (1 - easeOutCubic(THREE.MathUtils.clamp(gridPhase / 0.34, 0, 1))) * 0.26;

    materialRefs.current.forEach((material) => {
      if (!material) return;
      material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 10, delta);
    });
  });

  return (
    <>
      {[-1.45, 1.45].map((offset, index) => (
        <mesh geometry={geometry} key={offset} position={[0, offset, -0.1]}>
          <meshBasicMaterial
            color="#252522"
            depthWrite={false}
            opacity={0.26}
            ref={(material) => {
              materialRefs.current[index] = material;
            }}
            transparent
          />
        </mesh>
      ))}
    </>
  );
}

function GridRules({
  mobile,
  progress,
  timing,
}: {
  mobile: boolean;
  progress: ScrollProgress;
  timing: SceneTiming;
}) {
  const ruleRefs = useRef<Array<THREE.Mesh | null>>([]);
  const yPositions = mobile ? [2.28, -2.28] : [0, -4.9];

  useFrame((_, delta) => {
    const gridPhase = THREE.MathUtils.clamp(
      (progress.current - timing.gridStart) / (timing.gridEnd - timing.gridStart),
      0,
      1,
    );
    const drawProgress = easeOutCubic(THREE.MathUtils.clamp((gridPhase - 0.56) / 0.4, 0, 1));
    ruleRefs.current.forEach((rule) => {
      if (!rule) return;
      rule.scale.x = THREE.MathUtils.damp(rule.scale.x, Math.max(0.001, drawProgress), 9, delta);
    });
  });

  return (
    <>
      {yPositions.map((y, index) => (
        <mesh
          key={y}
          position={[0, y, 0.25]}
          ref={(node) => {
            ruleRefs.current[index] = node;
          }}
          scale={[0.001, 1, 1]}
        >
          <planeGeometry args={[mobile ? 13 : 21.5, 0.035]} />
          <meshBasicMaterial color="#4b4b48" opacity={0.48} transparent />
        </mesh>
      ))}
    </>
  );
}

function Scene({ onReady, progress }: { onReady: () => void; progress: ScrollProgress }) {
  const textures = useLoader(THREE.TextureLoader, texturePaths);
  const rigRef = useRef<THREE.Group>(null);
  const rigRotation = useRef(0);
  const { camera, gl, size } = useThree();
  const mobile = size.width < 768;
  const timing = mobile ? mobileTiming : desktopTiming;
  const curve = useMemo(() => createHelixCurve(mobile), [mobile]);

  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    perspectiveCamera.fov = mobile ? 58 : 52;
    perspectiveCamera.position.set(0, mobile ? 0.25 : 0.15, mobile ? 28 : 22);
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, mobile]);

  useEffect(() => {
    const anisotropy = Math.min(12, gl.capabilities.getMaxAnisotropy());
    textures.forEach((texture) => configureTexture(texture, anisotropy));
    onReady();
  }, [gl, onReady, textures]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const orbitProgress = THREE.MathUtils.smoothstep(progress.current, 0, timing.gridStart);
    const gridPhase = THREE.MathUtils.clamp(
      (progress.current - timing.gridStart) / (timing.gridEnd - timing.gridStart),
      0,
      1,
    );
    const targetRotation = -orbitProgress * Math.PI * 2 * HELIX_TURNS;
    rig.rotation.y = THREE.MathUtils.damp(rig.rotation.y, targetRotation, 6.4, delta);
    rig.position.y = THREE.MathUtils.damp(
      rig.position.y,
      THREE.MathUtils.lerp(mobile ? 0.65 : 0.35, mobile ? -0.65 : -0.35, orbitProgress),
      6.4,
      delta,
    );
    rigRotation.current = rig.rotation.y;
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      THREE.MathUtils.lerp(mobile ? 28 : 22, mobile ? 25 : 17.5, easeOutCubic(gridPhase)),
      6.5,
      delta,
    );
    camera.lookAt(0, 0, 0);
  }, -1);

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight color="#ffffff" intensity={2.1} position={[-3, 5, 9]} />
      <group ref={rigRef}>
        <CurveGuide curve={curve} progress={progress} timing={timing} />
        <GridRules mobile={mobile} progress={progress} timing={timing} />
        {textures.map((texture, index) => (
          <GalleryPanel
            curve={curve}
            index={index}
            key={texturePaths[index]}
            mobile={mobile}
            progress={progress}
            rigRotation={rigRotation}
            texture={texture}
            timing={timing}
          />
        ))}
      </group>
    </>
  );
}

export function MotionRibbonScene({ progress }: { progress: ScrollProgress }) {
  const { containerRef, visible } = useSceneVisibility('35% 0px');
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="absolute left-1/2 top-1/2 aspect-[1.6] w-[78%] max-w-5xl -translate-x-1/2 -translate-y-1/2 -rotate-2 overflow-hidden border-4 border-[#efefe9] bg-[#ecece8] shadow-2xl md:w-[46%]">
          <Image
            alt=""
            className="h-full w-full object-cover grayscale"
            height={800}
            sizes="(max-width: 768px) 78vw, 46vw"
            src="/images/gym/optimized/gym-05.webp"
            width={1280}
          />
        </div>
      </div>
      {visible ? (
        <div className="absolute inset-0 z-10">
          <Canvas
            camera={{ fov: 52, position: [0, 0.15, 22] }}
            dpr={[1, 2]}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
              stencil: false,
            }}
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
