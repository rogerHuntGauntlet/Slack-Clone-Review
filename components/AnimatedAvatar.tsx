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
  const jawRef = useRef<THREE.Group>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const antennaRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  // Core animation states
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0, z: 0 });
  const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0, z: 0 });
  const [mouthShape, setMouthShape] = useState({ width: 1, height: 1, open: 0 });
  const [eyeShape, setEyeShape] = useState({ squint: 0, wideness: 1 });
  const [facialTension, setFacialTension] = useState(0);

  useFrame((state, delta) => {
    if (!headRef.current || !jawRef.current || !eyeLeftRef.current || !eyeRightRef.current || 
        !antennaRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();

    // Smooth head movement
    const lerpFactor = 0.1;
    currentRotation.x += (targetRotation.x - currentRotation.x) * lerpFactor;
    currentRotation.y += (targetRotation.y - currentRotation.y) * lerpFactor;
    currentRotation.z += (targetRotation.z - currentRotation.z) * lerpFactor;

    headRef.current.rotation.x = currentRotation.x + Math.cos(time) * 0.02;
    headRef.current.rotation.y = currentRotation.y + Math.sin(time * 0.5) * 0.03;
    headRef.current.rotation.z = currentRotation.z;

    // Mouse tracking
    const mouseX = (state.mouse.x * Math.PI) / 6;
    const mouseY = (state.mouse.y * Math.PI) / 6;
    setTargetRotation(prev => ({
      ...prev,
      x: mouseY,
      y: mouseX
    }));

    // Mouth animation
    if (speaking) {
      const openness = Math.sin(time * 8) * 0.5 + 0.5;
      setMouthShape({
        width: 1 + Math.sin(time * 5) * 0.1,
        height: 0.5 + openness * 0.5,
        open: openness
      });
      setFacialTension(0.3 + Math.sin(time * 3) * 0.1);
    } else {
      setMouthShape(prev => ({
        width: THREE.MathUtils.lerp(prev.width, 1, 0.1),
        height: THREE.MathUtils.lerp(prev.height, 1, 0.1),
        open: THREE.MathUtils.lerp(prev.open, 0, 0.1)
      }));
      setFacialTension(THREE.MathUtils.lerp(facialTension, 0, 0.1));
    }

    // Eye behavior
    const targetEyeX = mouseX * 0.3;
    const targetEyeY = mouseY * 0.2;
    
    // Smooth eye movement
    const eyeSpeed = speaking ? 0.15 : 0.1;
    eyeLeftRef.current.position.x = THREE.MathUtils.lerp(
      eyeLeftRef.current.position.x,
      targetEyeX,
      eyeSpeed
    );
    eyeLeftRef.current.position.y = THREE.MathUtils.lerp(
      eyeLeftRef.current.position.y,
      targetEyeY,
      eyeSpeed
    );
    eyeRightRef.current.position.x = THREE.MathUtils.lerp(
      eyeRightRef.current.position.x,
      targetEyeX,
      eyeSpeed
    );
    eyeRightRef.current.position.y = THREE.MathUtils.lerp(
      eyeRightRef.current.position.y,
      targetEyeY,
      eyeSpeed
    );

    // Natural blinking
    const shouldBlink = Math.random() > 0.997 || (speaking && Math.random() > 0.99);
    if (shouldBlink) {
      const blinkPhase = (time % 0.2) / 0.2;
      const eyeScaleY = blinkPhase < 0.3 ? 0.1 : THREE.MathUtils.lerp(0.1, 1, (blinkPhase - 0.3) / 0.7);
      eyeLeftRef.current.scale.y = eyeScaleY;
      eyeRightRef.current.scale.y = eyeScaleY;
    }

    // Emotion expressions
    switch (emotion) {
      case 'happy':
        setMouthShape(prev => ({
          ...prev,
          width: 1.2 + Math.sin(time * 3) * 0.1
        }));
        setEyeShape({
          squint: 0.3,
          wideness: 0.8
        });
        break;
      case 'thinking':
        setMouthShape(prev => ({
          ...prev,
          width: 0.9
        }));
        setEyeShape({
          squint: 0.4,
          wideness: 0.7
        });
        break;
      case 'surprised':
        setMouthShape(prev => ({
          ...prev,
          open: 0.3 + Math.sin(time * 4) * 0.1,
          width: 1.1
        }));
        setEyeShape({
          squint: 0,
          wideness: 1.3
        });
        break;
      default:
        setEyeShape({
          squint: 0,
          wideness: 1
        });
    }

    // Glow effect
    glowRef.current.intensity = speaking ? 1.5 + Math.sin(time * 10) * 0.3 : 1;
  });

  return (
    <group ref={headRef}>
      {/* Ambient glow */}
      <pointLight ref={glowRef} position={[0, 0, 2]} intensity={1} distance={5} decay={2} />

      {/* Head base */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#e0c8a0"
          metalness={0.2}
          roughness={0.8}
          envMapIntensity={1}
        />
      </mesh>

      {/* Face features */}
      <group position={[0, 0, 0.35]}>
        {/* Eyes */}
        <group position={[0, 0.1, 0.2]}>
          {/* Left eye */}
          <group position={[-0.2, 0, 0]} scale={[1, 1 - eyeShape.squint, 1]}>
            <mesh>
              <sphereGeometry args={[0.12 * eyeShape.wideness, 32, 32]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh ref={eyeLeftRef} position={[0, 0, 0.08]}>
              <sphereGeometry args={[0.06, 32, 32]} />
              <meshStandardMaterial
                color="#4a9eff"
                emissive="#4a9eff"
                emissiveIntensity={0.5}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
              <sphereGeometry args={[0.03, 32, 32]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </group>

          {/* Right eye - mirror of left */}
          <group position={[0.2, 0, 0]} scale={[1, 1 - eyeShape.squint, 1]}>
            <mesh>
              <sphereGeometry args={[0.12 * eyeShape.wideness, 32, 32]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh ref={eyeRightRef} position={[0, 0, 0.08]}>
              <sphereGeometry args={[0.06, 32, 32]} />
              <meshStandardMaterial
                color="#4a9eff"
                emissive="#4a9eff"
                emissiveIntensity={0.5}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
              <sphereGeometry args={[0.03, 32, 32]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </group>
        </group>

        {/* Mouth */}
        <group ref={jawRef} position={[0, -0.25, 0.15]}>
          {/* Upper lip */}
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry 
              args={[
                0.15 * mouthShape.width,
                0.06 * mouthShape.height * (1 + facialTension * 0.2),
                0.1
              ]} 
            />
            <meshStandardMaterial
              color="#c17070"
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>

          {/* Lower lip */}
          <group position={[0, -0.02 - mouthShape.open * 0.1, 0]}>
            <mesh>
              <sphereGeometry 
                args={[
                  0.15 * mouthShape.width,
                  0.08 * mouthShape.height * (1 + facialTension * 0.2),
                  0.1
                ]} 
              />
              <meshStandardMaterial
                color="#c17070"
                metalness={0.3}
                roughness={0.7}
              />
            </mesh>
            {/* Inner mouth */}
            <mesh position={[0, 0, -0.05]} scale={[1, mouthShape.open, 1]}>
              <sphereGeometry args={[0.12, 0.1, 0.1]} />
              <meshStandardMaterial
                color="#701010"
                metalness={0.2}
                roughness={1}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export function AnimatedAvatar({ speaking, emotion }: AnimatedAvatarProps) {
  return (
    <div className={`w-full aspect-square ${speaking ? 'animate-pulse' : ''} bg-gray-800/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg border border-gray-700`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <RobotHead speaking={speaking} emotion={emotion} />
        </Suspense>
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