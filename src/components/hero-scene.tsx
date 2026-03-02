"use client";

import { useState, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import * as THREE from "three";

// ─── Gradient Glow Sun (夕焼け) ───

const GRADIENT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldY = worldPos.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const GRADIENT_FRAGMENT = /* glsl */ `
  uniform vec3 c1, c2, c3, c4, c5;
  uniform float uTime;
  uniform float uPeak;
  uniform float uClipY;
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    float dist = length(vUv - 0.5) * 2.0;
    float pulse = 1.0 + sin(uTime * 0.4) * 0.06;
    float d = dist * pulse;
    vec3 color = mix(c1, c2, smoothstep(0.0, 0.25, d));
    color = mix(color, c3, smoothstep(0.15, 0.45, d));
    color = mix(color, c4, smoothstep(0.35, 0.70, d));
    color = mix(color, c5, smoothstep(0.55, 0.95, d));
    float alpha = pow(max(1.0 - d * d, 0.0), 2.0) * uPeak;
    alpha *= smoothstep(uClipY - 0.1, uClipY + 0.05, vWorldY);
    gl_FragColor = vec4(color, alpha);
  }
`;

// 夕焼け palette: red → orange → yellow → teal → cyan
const SUNSET_STOPS: [number, number, number, number, number] = [0xdc2626, 0xea580c, 0xeab308, 0x0d9488, 0x0e7490];

// 朝焼け (sunrise): rose → coral → gold → sky → cyan
const SUNRISE_STOPS: [number, number, number, number, number] = [0xfda4af, 0xfb923c, 0xfde047, 0x93c5fd, 0x67e8f9];

const SUNRISE_LAYERS = [
  { r: 2.5, peak: 0.50, y: -0.25, z: -0.2 },
  { r: 0.5, peak: 0.55, y: -0.38, z: -0.05 },
];

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const GRADIENT_LAYERS = [
  { r: 2.5, peak: 0.60, y: -0.25, z: -0.2 },
  { r: 0.5, peak: 0.50, y: -0.38, z: -0.05 },
];

function GradientGlowSun({ isDark }: { isDark: boolean }) {
  const refs = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const stops = isDark ? SUNSET_STOPS : SUNRISE_STOPS;
  const layers = isDark ? GRADIENT_LAYERS : SUNRISE_LAYERS;
  const [s0, s1, s2, s3, s4] = stops;

  const uniforms = useMemo(
    () =>
      layers.map((cfg) => ({
        c1: { value: new THREE.Color(s0) },
        c2: { value: new THREE.Color(s1) },
        c3: { value: new THREE.Color(s2) },
        c4: { value: new THREE.Color(s3) },
        c5: { value: new THREE.Color(s4) },
        uTime: { value: 0 },
        uPeak: { value: cfg.peak },
        uClipY: { value: -0.5 },
      })),
    [s0, s1, s2, s3, s4, isDark],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((mat) => {
      if (mat) mat.uniforms.uTime.value = t;
    });
  });

  return (
    <group position={[0, 0, -1.2]}>
      {layers.map((cfg, i) => (
        <mesh key={i} position={[0, cfg.y, cfg.z]}>
          <circleGeometry args={[cfg.r, 64]} />
          <shaderMaterial
            ref={(el) => {
              refs.current[i] = el;
            }}
            vertexShader={GRADIENT_VERTEX}
            fragmentShader={GRADIENT_FRAGMENT}
            uniforms={uniforms[i]}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Clouds (Scatter) ───

const CLOUD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CLOUD_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCloudColor;
  uniform float uMaxAlpha;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    uv.x += uTime * 0.015;
    float n = fbm(uv * 12.0);
    float cloud = smoothstep(0.35, 0.7, n);
    float vFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    float hFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    float alpha = cloud * vFade * hFade * uMaxAlpha;
    vec3 color = uCloudColor;
    gl_FragColor = vec4(color, alpha);
  }
`;

function Clouds({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCloudColor: { value: isDark ? new THREE.Vector3(0.75, 0.55, 0.35) : new THREE.Vector3(0.75, 0.60, 0.65) },
    uMaxAlpha: { value: isDark ? 0.08 : 0.16 },
  }), [isDark]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh position={[0, 0.5, -1.0]}>
      <planeGeometry args={[8, 2]} />
      <shaderMaterial
        ref={ref}
        vertexShader={CLOUD_VERTEX}
        fragmentShader={CLOUD_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Water Surface ───

const WATER_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWarm;
  uniform vec3 uHot;
  uniform vec3 uCold;
  varying vec2 vUv;
  void main() {
    float y = vUv.y;
    float x = vUv.x;
    float ripple1 = sin((y * 60.0) + uTime * 0.8 + x * 3.0) * 0.5 + 0.5;
    float ripple2 = sin((y * 30.0) - uTime * 0.5 + 1.5) * 0.5 + 0.5;
    float ripple3 = sin((y * 100.0) + uTime * 1.2 - x * 5.0) * 0.5 + 0.5;
    float ripple = ripple1 * 0.4 + ripple2 * 0.35 + ripple3 * 0.25;
    float shimmer = sin(x * 8.0 + uTime * 0.3) * sin(y * 12.0 - uTime * 0.4);
    shimmer = max(shimmer, 0.0) * 0.4;
    float fadeTop = pow(1.0 - y, 1.5);
    float fadeBottom = smoothstep(0.0, 0.35, y);
    float fade = fadeTop * fadeBottom;
    vec3 warm = uWarm;
    vec3 hot  = uHot;
    vec3 cold = uCold;
    vec3 base = mix(warm, cold, y);
    vec3 color = mix(base, hot, shimmer * (1.0 - y));
    float alpha = (ripple + shimmer * 0.3) * fade * 1.0;
    gl_FragColor = vec4(color, alpha);
  }
`;

function WaterSurface({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWarm: { value: isDark ? new THREE.Vector3(0.40, 0.14, 0.04) : new THREE.Vector3(0.85, 0.55, 0.35) },
    uHot: { value: isDark ? new THREE.Vector3(0.55, 0.20, 0.06) : new THREE.Vector3(0.95, 0.60, 0.30) },
    uCold: { value: isDark ? new THREE.Vector3(0.03, 0.04, 0.06) : new THREE.Vector3(0.45, 0.60, 0.80) },
  }), [isDark]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh position={[0, -0.55, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[14, 4]} />
      <shaderMaterial
        ref={ref}
        vertexShader={WATER_VERTEX}
        fragmentShader={WATER_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Sea Creatures ───

interface Swimmer {
  label: string;
  color: string;
  speed: number;
  y: number;
  z: number;
  scale: number;
  shape: THREE.Shape;
}

function makeFish(): THREE.Shape {
  const s = new THREE.Shape();
  // Tail fork
  s.moveTo(-0.10, 0.07);
  s.lineTo(-0.07, 0.05);
  s.lineTo(-0.10, 0.03);
  s.lineTo(-0.07, 0.035);
  // Body bottom
  s.lineTo(-0.04, 0.02);
  s.lineTo(0, 0.01);
  s.lineTo(0.04, 0.01);
  s.lineTo(0.08, 0.015);
  // Mouth
  s.lineTo(0.12, 0.03);
  s.lineTo(0.13, 0.04);
  s.lineTo(0.14, 0.05);
  // Head top
  s.lineTo(0.12, 0.065);
  s.lineTo(0.10, 0.075);
  // Eye indent
  s.lineTo(0.09, 0.07);
  s.lineTo(0.08, 0.075);
  // Dorsal line
  s.lineTo(0.05, 0.085);
  s.lineTo(0.02, 0.09);
  // Dorsal fin
  s.lineTo(-0.01, 0.11);
  s.lineTo(-0.02, 0.10);
  s.lineTo(-0.03, 0.085);
  // Back to tail
  s.lineTo(-0.05, 0.075);
  s.lineTo(-0.07, 0.065);
  s.closePath();
  // Pectoral fin
  s.moveTo(0.04, 0.03);
  s.lineTo(0.02, -0.01);
  s.lineTo(0.06, 0.02);
  return s;
}

function makeJellyfish(): THREE.Shape {
  const s = new THREE.Shape();
  // Bell dome (angular)
  s.moveTo(-0.07, 0.01);
  s.lineTo(-0.08, 0.03);
  s.lineTo(-0.075, 0.06);
  s.lineTo(-0.06, 0.08);
  s.lineTo(-0.04, 0.10);
  s.lineTo(-0.02, 0.11);
  s.lineTo(0, 0.115);
  s.lineTo(0.02, 0.11);
  s.lineTo(0.04, 0.10);
  s.lineTo(0.06, 0.08);
  s.lineTo(0.075, 0.06);
  s.lineTo(0.08, 0.03);
  s.lineTo(0.07, 0.01);
  // Bell rim
  s.lineTo(0.06, 0.005);
  s.lineTo(0.04, 0.01);
  s.lineTo(0.02, 0.005);
  s.lineTo(0, 0.01);
  s.lineTo(-0.02, 0.005);
  s.lineTo(-0.04, 0.01);
  s.lineTo(-0.06, 0.005);
  s.closePath();
  // Tentacles (separate paths)
  s.moveTo(-0.05, 0.005);
  s.lineTo(-0.055, -0.04);
  s.lineTo(-0.045, -0.02);
  s.lineTo(-0.04, -0.06);
  s.lineTo(-0.035, -0.03);
  s.moveTo(-0.01, 0.005);
  s.lineTo(-0.015, -0.05);
  s.lineTo(-0.005, -0.03);
  s.lineTo(0, -0.07);
  s.lineTo(0.005, -0.03);
  s.lineTo(0.015, -0.05);
  s.moveTo(0.04, 0.005);
  s.lineTo(0.035, -0.03);
  s.lineTo(0.04, -0.06);
  s.lineTo(0.045, -0.02);
  s.lineTo(0.055, -0.04);
  return s;
}

function makeTurtle(): THREE.Shape {
  const s = new THREE.Shape();
  // Head
  s.moveTo(0.14, 0.04);
  s.lineTo(0.16, 0.045);
  s.lineTo(0.17, 0.04);
  s.lineTo(0.16, 0.035);
  s.lineTo(0.14, 0.035);
  // Neck
  s.lineTo(0.11, 0.03);
  // Front flipper top
  s.lineTo(0.09, 0.015);
  s.lineTo(0.07, -0.01);
  s.lineTo(0.10, 0.005);
  // Shell bottom front
  s.lineTo(0.08, 0.02);
  s.lineTo(0.04, 0.015);
  s.lineTo(0, 0.015);
  // Rear flipper
  s.lineTo(-0.04, 0.01);
  s.lineTo(-0.07, -0.005);
  s.lineTo(-0.05, 0.015);
  // Tail
  s.lineTo(-0.08, 0.025);
  s.lineTo(-0.10, 0.03);
  s.lineTo(-0.08, 0.035);
  // Shell top
  s.lineTo(-0.06, 0.04);
  s.lineTo(-0.04, 0.055);
  s.lineTo(-0.02, 0.065);
  s.lineTo(0, 0.07);
  s.lineTo(0.02, 0.07);
  s.lineTo(0.04, 0.065);
  s.lineTo(0.06, 0.06);
  s.lineTo(0.08, 0.055);
  // Shell pattern lines
  s.lineTo(0.10, 0.048);
  // Neck top
  s.lineTo(0.12, 0.045);
  s.closePath();
  return s;
}

function makeWhale(): THREE.Shape {
  const s = new THREE.Shape();
  // Tail flukes
  s.moveTo(-0.22, 0.06);
  s.lineTo(-0.18, 0.04);
  s.lineTo(-0.22, 0.02);
  s.lineTo(-0.19, 0.035);
  // Tail narrow
  s.lineTo(-0.16, 0.03);
  s.lineTo(-0.13, 0.025);
  // Belly
  s.lineTo(-0.08, 0.015);
  s.lineTo(-0.03, 0.01);
  s.lineTo(0.02, 0.01);
  s.lineTo(0.07, 0.015);
  // Jaw line
  s.lineTo(0.12, 0.025);
  s.lineTo(0.16, 0.035);
  // Mouth
  s.lineTo(0.18, 0.04);
  s.lineTo(0.17, 0.045);
  // Upper jaw
  s.lineTo(0.15, 0.05);
  s.lineTo(0.12, 0.055);
  // Eye area
  s.lineTo(0.10, 0.06);
  s.lineTo(0.09, 0.058);
  s.lineTo(0.08, 0.06);
  // Forehead
  s.lineTo(0.06, 0.07);
  s.lineTo(0.03, 0.08);
  // Back
  s.lineTo(0, 0.085);
  s.lineTo(-0.04, 0.08);
  s.lineTo(-0.08, 0.075);
  // Dorsal fin
  s.lineTo(-0.10, 0.075);
  s.lineTo(-0.11, 0.095);
  s.lineTo(-0.13, 0.075);
  // Tail section
  s.lineTo(-0.15, 0.065);
  s.lineTo(-0.17, 0.055);
  s.lineTo(-0.19, 0.045);
  s.closePath();
  // Pectoral fin
  s.moveTo(0.04, 0.02);
  s.lineTo(0.02, -0.01);
  s.lineTo(0.06, 0.01);
  return s;
}

// Diver uses PNG sprite instead of Shape path

const SWIMMERS: Swimmer[] = [];

function SwimmingCreature({ swimmer }: { swimmer: Swimmer }) {
  const ref = useRef<Mesh>(null);
  const geo = useMemo(() => new THREE.ShapeGeometry(swimmer.shape), [swimmer.shape]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Swim left to right, loop across screen
    const x = ((t * swimmer.speed + swimmer.z * 2) % 5) - 2.5;
    // Gentle bob up and down
    const bob = Math.sin(t * 1.5 + swimmer.z * 10) * 0.008;
    ref.current.position.x = x;
    ref.current.position.y = swimmer.y + bob;
  });

  return (
    <mesh ref={ref} position={[0, swimmer.y, swimmer.z]} scale={swimmer.scale}>
      <primitive object={geo} attach="geometry" />
      <meshBasicMaterial color={swimmer.color} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Free-swimming sprite: Lissajous curves for organic 2D movement
function useSwim(cfg: { cx: number; cy: number; rx: number; ry: number; freqX: number; freqY: number; phaseX: number; phaseY: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const x = cfg.cx + Math.sin(t * cfg.freqX + cfg.phaseX) * cfg.rx;
    const y = cfg.cy + Math.sin(t * cfg.freqY + cfg.phaseY) * cfg.ry;
    // Face movement direction
    const dx = Math.cos(t * cfg.freqX + cfg.phaseX) * cfg.freqX * cfg.rx;
    const dy = Math.cos(t * cfg.freqY + cfg.phaseY) * cfg.freqY * cfg.ry;
    ref.current.position.x = x;
    ref.current.position.y = y;
    ref.current.rotation.z = Math.atan2(dy, dx) * 0.3;
  });
  return ref;
}

function JellyfishSprite({ isDark }: { isDark: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/images/jellyfish.png");
  const ref = useSwim({ cx: -0.8, cy: -0.62, rx: 0.6, ry: 0.12, freqX: 0.12, freqY: 0.25, phaseX: 0, phaseY: 1.5 });
  return (
    <mesh ref={ref} position={[0, -0.63, -0.4]} scale={0.16}>
      <planeGeometry args={[0.85, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={isDark ? 0.35 : 0.65} side={THREE.DoubleSide} />
    </mesh>
  );
}

function FishSprite({ isDark }: { isDark: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/images/fish.png");
  const ref = useSwim({ cx: 0.3, cy: -0.60, rx: 1.2, ry: 0.10, freqX: 0.3, freqY: 0.7, phaseX: 2.0, phaseY: 0 });
  return (
    <mesh ref={ref} position={[0, -0.58, -0.3]} scale={0.22}>
      <planeGeometry args={[1, 0.65]} />
      <meshBasicMaterial map={texture} transparent opacity={isDark ? 0.4 : 0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WhaleSprite({ isDark }: { isDark: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/images/whale.png");
  const ref = useSwim({ cx: 0, cy: -0.65, rx: 1.0, ry: 0.15, freqX: 0.06, freqY: 0.1, phaseX: 3.0, phaseY: 0.5 });
  return (
    <mesh ref={ref} position={[0, -0.65, -0.5]} scale={0.5}>
      <planeGeometry args={[1, 0.7]} />
      <meshBasicMaterial map={texture} transparent opacity={isDark ? 0.35 : 0.65} side={THREE.DoubleSide} />
    </mesh>
  );
}

function TurtleSprite({ isDark }: { isDark: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/images/turtle.png");
  const ref = useSwim({ cx: 0.5, cy: -0.60, rx: 0.8, ry: 0.12, freqX: 0.15, freqY: 0.35, phaseX: 1.0, phaseY: 3.0 });
  return (
    <mesh ref={ref} position={[0, -0.56, -0.2]} scale={0.20}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={isDark ? 0.4 : 0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DiverSprite({ isDark }: { isDark: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/images/diver.png");
  const ref = useSwim({ cx: -0.3, cy: -0.60, rx: 1.0, ry: 0.13, freqX: 0.18, freqY: 0.22, phaseX: 4.0, phaseY: 1.0 });
  return (
    <mesh ref={ref} position={[0, -0.60, -0.15]} scale={0.22}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={isDark ? 0.35 : 0.65} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SeaLife({ isDark }: { isDark: boolean }) {
  return (
    <group>
      {SWIMMERS.map((sw) => (
        <SwimmingCreature key={sw.label} swimmer={sw} />
      ))}
      <JellyfishSprite isDark={isDark} />
      <FishSprite isDark={isDark} />
      <WhaleSprite isDark={isDark} />
      <TurtleSprite isDark={isDark} />
      <DiverSprite isDark={isDark} />
    </group>
  );
}

// ─── BaseLine ───

function BaseLine() {
  return (
    <mesh position={[0, -0.51, -0.98]}>
      <boxGeometry args={[16, 0.012, 0.01]} />
      <meshBasicMaterial color="#050505" />
    </mesh>
  );
}

// ─── Mountain Silhouettes ───

function MountainSilhouette() {
  const islandsGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2.5, 0);
    // Small rock (far left)
    shape.lineTo(-1.8, 0);
    shape.lineTo(-1.7, 0.08);
    shape.lineTo(-1.6, 0.15);
    shape.lineTo(-1.5, 0.08);
    shape.lineTo(-1.4, 0);
    // Gap
    shape.lineTo(-1.2, 0);
    // Island with 3 peaks — tallest left, descending right
    shape.lineTo(-1.1, 0.05);
    shape.lineTo(-1.05, 0.20);
    shape.lineTo(-1.0, 0.40);
    shape.lineTo(-0.95, 0.45);
    shape.lineTo(-0.88, 0.40);
    shape.lineTo(-0.80, 0.28);
    shape.lineTo(-0.70, 0.30);
    shape.lineTo(-0.62, 0.22);
    shape.lineTo(-0.52, 0.24);
    shape.lineTo(-0.42, 0.15);
    shape.lineTo(-0.30, 0.05);
    shape.lineTo(-0.2, 0);
    // Center gap — sun space
    shape.lineTo(0.2, 0);
    // Large rounded mountain (right)
    shape.lineTo(0.3, 0.05);
    shape.lineTo(0.5, 0.18);
    shape.lineTo(0.7, 0.35);
    shape.lineTo(0.9, 0.48);
    shape.lineTo(1.1, 0.52);
    shape.lineTo(1.3, 0.48);
    shape.lineTo(1.5, 0.38);
    shape.lineTo(1.7, 0.25);
    shape.lineTo(1.9, 0.12);
    shape.lineTo(2.1, 0.05);
    shape.lineTo(2.5, 0);
    // Close bottom
    shape.lineTo(2.5, -0.02);
    shape.lineTo(-2.5, -0.02);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group position={[0, -0.5, -1]}>
      <mesh geometry={islandsGeo}>
        <meshBasicMaterial color="#050505" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={islandsGeo} position={[0, 0.003, 0.01]}>
        <meshBasicMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
      {/* Pavilion on right mountain */}
      <group position={[0.95, 0.48, 0.02]} scale={0.8}>
        <mesh position={[-0.05, 0.025, 0]}>
          <boxGeometry args={[0.006, 0.05, 0.01]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[0.05, 0.025, 0]}>
          <boxGeometry args={[0.006, 0.05, 0.01]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[0, 0.053, 0]}>
          <boxGeometry args={[0.14, 0.006, 0.01]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[0, 0.058, 0]}>
          <boxGeometry args={[0.16, 0.004, 0.01]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Main Scene ───

// Screenshot helper — captures the WebGL canvas
function ScreenshotHelper({ onCapture }: { onCapture: ((fn: () => void) => void) }) {
  const { gl, scene, camera } = useThree();
  const capture = useCallback(() => {
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "hero-scene.png";
    link.href = dataUrl;
    link.click();
  }, [gl, scene, camera]);

  // Register the capture function
  useMemo(() => onCapture(capture), [onCapture, capture]);
  return null;
}

const LAYERS = ["Glow", "Mountain", "BaseLine", "Water", "Clouds", "SeaLife"] as const;

export function HeroScene() {
  const { resolvedTheme } = useTheme();
  const mounted = useIsMounted();
  const isDark = !mounted || resolvedTheme !== "light";

  const [layers, setLayers] = useState({
    Glow: true,
    Mountain: true,
    BaseLine: true,
    Water: true,
    Clouds: true,
    SeaLife: true,
  });
  const captureRef = useRef<(() => void) | null>(null);
  const canvasStyle = useMemo(() => ({ width: "100%", height: "100%" }) as const, []);
  const toggle = (key: string) => setLayers((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  const on = (key: string) => layers[key as keyof typeof layers];

  return (
    <div className="relative h-[400px] w-full overflow-hidden md:h-[550px]">
      <div className="pointer-events-auto h-full w-full">
        <Canvas
          style={canvasStyle}
          camera={{ position: [0, 0.25, 3.0], fov: 50 }}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        >
          <ScreenshotHelper onCapture={(fn) => { captureRef.current = fn; }} />
          {on("Water") && <WaterSurface isDark={isDark} />}
          {on("Glow") && <GradientGlowSun isDark={isDark} />}
          {on("Clouds") && <Clouds isDark={isDark} />}
          {on("Mountain") && <MountainSilhouette />}
          {on("BaseLine") && <BaseLine />}
          {on("SeaLife") && <SeaLife isDark={isDark} />}
        </Canvas>
      </div>

      {/* Layer toggles — dev only */}
      {process.env.NODE_ENV === "development" && <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1">
        <button
          onClick={() => captureRef.current?.()}
          className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors hover:bg-muted"
        >
          📷
        </button>
        <span className="w-px self-stretch bg-muted/30" />
        {LAYERS.map((key) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-md px-2 py-0.5 font-mono text-[9px] transition-colors ${
              on(key)
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {key}
          </button>
        ))}
      </div>}
    </div>
  );
}
