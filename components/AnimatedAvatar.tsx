import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { FallbackAvatar } from './FallbackAvatar';

interface AnimatedAvatarProps {
  speaking: boolean;
  emotion?: 'neutral' | 'happy' | 'thinking' | 'surprised';
}

function RobotHead({ speaking, emotion = 'neutral' }: AnimatedAvatarProps) {
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const antennaRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!headRef.current || !jawRef.current || !eyeLeftRef.current || !eyeRightRef.current || !antennaRef.current) return;

    const time = state.clock.getElapsedTime();

    // Head movement
    if (speaking) {
      headRef.current.rotation.y = Math.sin(time * 2) * 0.1;
      headRef.current.rotation.x = Math.cos(time) * 0.05;
    } else {
      headRef.current.rotation.y = Math.sin(time) * 0.05;
      headRef.current.rotation.x = Math.cos(time * 0.5) * 0.02;
    }

    // Jaw movement for speaking
    if (speaking) {
      jawRef.current.rotation.x = Math.sin(time * 15) * 0.1;
    } else {
      jawRef.current.rotation.x = 0;
    }

    // Eye movement
    const blinkSpeed = 0.1;
    const blinkInterval = 3;
    const blink = Math.sin(time * blinkSpeed) > 0.99;
    
    if (blink) {
      eyeLeftRef.current.scale.y = 0.1;
      eyeRightRef.current.scale.y = 0.1;
    } else {
      eyeLeftRef.current.scale.y = 1;
      eyeRightRef.current.scale.y = 1;
    }

    // Antenna bobble
    antennaRef.current.rotation.z = Math.sin(time * 3) * 0.1;

    // Emotion-based animations
    switch (emotion) {
      case 'happy':
        eyeLeftRef.current.scale.y = 0.6 + Math.sin(time * 5) * 0.1;
        eyeRightRef.current.scale.y = 0.6 + Math.sin(time * 5) * 0.1;
        break;
      case 'thinking':
        eyeLeftRef.current.scale.x = 0.7;
        eyeRightRef.current.scale.x = 0.7;
        headRef.current.rotation.z = 0.2;
        break;
      case 'surprised':
        eyeLeftRef.current.scale.x = 1.5;
        eyeLeftRef.current.scale.y = 1.5;
        eyeRightRef.current.scale.x = 1.5;
        eyeRightRef.current.scale.y = 1.5;
        break;
      default:
        eyeLeftRef.current.scale.x = 1;
        eyeRightRef.current.scale.x = 1;
        headRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={headRef}>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1.2, 1]} />
        <meshStandardMaterial color="#8d8d8d" />
      </mesh>

      {/* Jaw */}
      <mesh ref={jawRef} position={[0, -0.7, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#7a7a7a" />
      </mesh>

      {/* Eyes */}
      <mesh ref={eyeLeftRef} position={[-0.2, 0.1, 0.51]}>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={eyeRightRef} position={[0.2, 0.1, 0.51]}>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>

      {/* Antenna */}
      <mesh ref={antennaRef} position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#666666" />
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      </mesh>
    </group>
  );
}

export function AnimatedAvatar({ speaking, emotion }: AnimatedAvatarProps) {
  return (
    <div className="w-full aspect-square bg-gray-800/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg border border-gray-700">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, 10, 5]} intensity={0.8} />
        <RobotHead speaking={speaking} emotion={emotion} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
} 