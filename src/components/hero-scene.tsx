"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";

// ─── Shared ───

function useMouseParallax(intensity = 0.12) {
  const smoothed = useRef({ x: 0, y: 0 });
  useFrame(({ pointer, viewport }) => {
    const mx = (pointer.x * viewport.width) / 2;
    const my = (pointer.y * viewport.height) / 2;
    smoothed.current.x += (mx * intensity - smoothed.current.x) * 0.04;
    smoothed.current.y += (my * intensity - smoothed.current.y) * 0.04;
  });
  return smoothed;
}

function ParallaxWrapper({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  const mouse = useMouseParallax();
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = mouse.current.x * 0.05;
    groupRef.current.rotation.x = mouse.current.y * 0.02;
  });
  return <group ref={groupRef}>{children}</group>;
}

// ─── Camera controller ───

function CameraRig({ camY, camZ, fov }: { camY: number; camZ: number; fov: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, camY, camZ);
    (camera as THREE.PerspectiveCamera).fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, camY, camZ, fov]);
  return null;
}

// ─── Ocean Ground ───

function Ocean() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).envMapIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]}>
      <planeGeometry args={[14, 6]} />
      <meshStandardMaterial color="#060606" metalness={0.97} roughness={0.2} envMapIntensity={0.3} />
    </mesh>
  );
}

// ─── Horizon Line ───

function HorizonLine() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Length pulse — ends visible, always wider than mountain base
    ref.current.scale.x = Math.sin(clock.getElapsedTime() * 0.8) * 0.08 + 0.92;
    // Opacity pulse
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.4 + Math.sin(clock.getElapsedTime() * 0.6) * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, -0.5, 0.1]}>
      <boxGeometry args={[7, 0.008, 0.008]} />
      <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.5} />
    </mesh>
  );
}

// ─── Sun Reflection variants ───

function Reflection({ intensity }: { intensity: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.04 * intensity + Math.sin(t * 0.7) * 0.015 * intensity;
    ref.current.scale.x = 1 + Math.sin(t * 0.4) * 0.05;
  });

  return (
    <>
      {/* Main beam */}
      <mesh ref={ref} position={[0, -0.53, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8 * intensity, 5]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.05 * intensity} side={THREE.DoubleSide} />
      </mesh>
      {/* Wide soft glow */}
      <mesh position={[0, -0.53, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0 * intensity, 4]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.015 * intensity} side={THREE.DoubleSide} />
      </mesh>
      {/* Shimmer strips */}
      {intensity > 1 && [-0.3, 0.15, 0.4].map((x, i) => (
        <mesh key={i} position={[x, -0.53, 0.6 + i * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 2.5]} />
          <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.025 * intensity} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Extra wide ambient for high intensity */}
      {intensity > 2 && (
        <mesh position={[0, -0.53, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4, 5]} />
          <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.008 * intensity} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  );
}

// ─── Setting Sun ───

function SettingSun() {
  const sunRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const glow2Ref = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.position.y = -0.42 + Math.sin(t * 0.15) * 0.03;
    }
    if (glowRef.current) {
      const s = 1 + Math.sin(t * 0.5) * 0.05;
      glowRef.current.scale.set(s, s, 1);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 0.6) * 0.03;
    }
    if (glow2Ref.current) {
      (glow2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.03 + Math.sin(t * 0.3) * 0.01;
    }
  });

  return (
    <group position={[0, 0, -1.2]}>
      <mesh ref={sunRef} position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.7} />
      </mesh>
      <mesh ref={glowRef} position={[0, -0.35, -0.1]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={glow2Ref} position={[0, -0.2, -0.3]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.3, -0.5]}>
        <planeGeometry args={[5, 2]} />
        <meshBasicMaterial color="oklch(0.623 0.214 259)" transparent opacity={0.008} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Mountain Silhouettes ───

function MountainSilhouette() {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-3.5, 0);
    shape.lineTo(-2.0, 0);
    shape.lineTo(-1.6, 0.15);
    shape.lineTo(-1.4, 0.25);
    shape.lineTo(-1.25, 0.22);
    shape.lineTo(-1.1, 0.3);
    shape.lineTo(-0.95, 0.2);
    shape.lineTo(-0.7, 0.05);
    shape.lineTo(-0.5, 0.1);
    shape.lineTo(-0.3, 0.35);
    shape.lineTo(-0.15, 0.28);
    shape.lineTo(-0.05, 0.12);
    shape.lineTo(0.05, 0.12);
    shape.lineTo(0.2, 0.3);
    shape.lineTo(0.4, 0.45);
    shape.lineTo(0.6, 0.55);
    shape.lineTo(0.8, 0.5);
    shape.lineTo(1.0, 0.42);
    shape.lineTo(1.2, 0.3);
    shape.lineTo(1.5, 0.15);
    shape.lineTo(2.0, 0);
    shape.lineTo(3.5, 0);
    shape.lineTo(3.5, -0.3);
    shape.lineTo(-3.5, -0.3);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group position={[0, -0.5, -1]}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#050505" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.003, 0.01]}>
        <meshBasicMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Main Scene ───

export function HeroScene() {
  const canvasStyle = useMemo(() => ({ width: "100%", height: "100%" }) as const, []);

  return (
    <div className="relative h-[400px] w-full md:h-[550px]">
      {/* Bottom fade — blends canvas into page background */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-background to-transparent" />
      <div className="pointer-events-auto h-full w-full">
        <Canvas
          style={canvasStyle}
          camera={{ position: [0, 0.25, 3.0], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <directionalLight position={[0, 2, -3]} intensity={0.3} color="oklch(0.623 0.214 259)" />
          <directionalLight position={[3, 3, 3]} intensity={0.15} />
          <ambientLight intensity={0.03} />

          <ParallaxWrapper>
            <Ocean />
            <HorizonLine />
            <Reflection intensity={2.5} />
            <SettingSun />
            <MountainSilhouette />
          </ParallaxWrapper>

          <Environment preset="city" environmentIntensity={0.15} />
          <fog attach="fog" args={["#000000", 3, 9]} />
        </Canvas>
      </div>
    </div>
  );
}
