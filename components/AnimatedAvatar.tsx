import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { FallbackAvatar } from './FallbackAvatar';

interface AnimatedAvatarProps {
  speaking: boolean;
  emotion?: 'neutral' | 'happy' | 'thinking' | 'surprised' | 'sad' | 'confused';
}

// Phoneme mouth shapes
const PHONEME_SHAPES = {
  A: { width: 1.2, height: 1.3, roundness: 0.8 },    // as in "father"
  E: { width: 1.4, height: 0.8, roundness: 0.4 },    // as in "bee"
  I: { width: 1.3, height: 0.6, roundness: 0.3 },    // as in "hit"
  O: { width: 0.9, height: 0.9, roundness: 1 },      // as in "go"
  U: { width: 0.8, height: 0.8, roundness: 1 },      // as in "boot"
  M: { width: 0.7, height: 0.4, roundness: 0.9 },    // closed lips
  F: { width: 1.1, height: 0.5, roundness: 0.6 },    // teeth on lip
  L: { width: 1.0, height: 0.7, roundness: 0.5 },    // tongue up
  REST: { width: 1.0, height: 0.6, roundness: 0.7 }  // neutral position
};

function HumanHead({ speaking, emotion = 'neutral' }: AnimatedAvatarProps) {
  const headRef = useRef<THREE.Group>(null);
  const faceRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Group>(null);
  const eyeRightRef = useRef<THREE.Group>(null);
  const eyebrowLeftRef = useRef<THREE.Mesh>(null);
  const eyebrowRightRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const beardRef = useRef<THREE.Group>(null);
  const hairRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  // Enhanced animation states
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0, z: 0 });
  const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0, z: 0 });
  const [blinkState, setBlinkState] = useState({ isBlinking: false, lastBlink: 0 });
  const [microExpression, setMicroExpression] = useState({ type: 'none', intensity: 0 });
  const [facialTension, setFacialTension] = useState({ 
    brow: 0, 
    mouth: 0, 
    cheeks: 0 
  });

  // Enhanced mouth animation states
  const [currentPhoneme, setCurrentPhoneme] = useState(PHONEME_SHAPES.REST);
  const [nextPhoneme, setNextPhoneme] = useState(PHONEME_SHAPES.REST);
  const [phonemeTransition, setPhonemeTransition] = useState(0);
  const lastPhonemeChange = useRef(0);

  useFrame((state, delta) => {
    if (!headRef.current || !faceRef.current || !eyeLeftRef.current || !eyeRightRef.current || 
        !mouthRef.current || !glowRef.current || !eyebrowLeftRef.current || !eyebrowRightRef.current ||
        !beardRef.current || !hairRef.current) return;

    const time = state.clock.getElapsedTime();

    // Natural head sway (more subtle than before)
    const naturalSway = {
      x: Math.cos(time * 0.5) * 0.008,
      y: Math.sin(time * 0.3) * 0.008,
      z: Math.cos(time * 0.4) * 0.004
    };

    // Micro-movements for beard and hair
    const hairMovement = {
      x: Math.sin(time * 1.5) * 0.002,
      y: Math.cos(time * 1.2) * 0.002,
      z: Math.sin(time * 1.7) * 0.001
    };

    beardRef.current.rotation.x = hairMovement.x;
    beardRef.current.rotation.y = hairMovement.y;
    beardRef.current.position.z = Math.sin(time * 0.5) * 0.001;

    hairRef.current.rotation.x = hairMovement.x * 1.2;
    hairRef.current.rotation.y = hairMovement.y * 1.2;
    hairRef.current.position.y = Math.sin(time * 0.7) * 0.002;

    // Smooth head movement with natural sway
    const lerpFactor = 0.05; // Slower, more natural movement
    currentRotation.x += (targetRotation.x - currentRotation.x) * lerpFactor;
    currentRotation.y += (targetRotation.y - currentRotation.y) * lerpFactor;
    currentRotation.z += (targetRotation.z - currentRotation.z) * lerpFactor;

    headRef.current.rotation.x = currentRotation.x + naturalSway.x + hairMovement.x;
    headRef.current.rotation.y = currentRotation.y + naturalSway.y + hairMovement.y;
    headRef.current.rotation.z = currentRotation.z + naturalSway.z + hairMovement.z;

    // Enhanced mouse tracking (more natural limits)
    const mouseX = Math.min(Math.max((state.mouse.x * Math.PI) / 8, -0.5), 0.5);
    const mouseY = Math.min(Math.max((state.mouse.y * Math.PI) / 8, -0.3), 0.3);
    setTargetRotation(prev => ({
      x: mouseY,
      y: mouseX,
      z: currentRotation.z
    }));

    // Natural blinking system
    const timeSinceLastBlink = time - blinkState.lastBlink;
    const shouldBlink = Math.random() > 0.997 || timeSinceLastBlink > 4;
    
    if (shouldBlink && !blinkState.isBlinking) {
      setBlinkState({ isBlinking: true, lastBlink: time });
    }

    if (blinkState.isBlinking) {
      const blinkDuration = 0.15;
      const blinkPhase = (time - blinkState.lastBlink) / blinkDuration;
      
      if (blinkPhase <= 1) {
        const eyeScaleY = Math.cos(blinkPhase * Math.PI) * 0.5 + 0.5;
        eyeLeftRef.current.scale.y = eyeScaleY;
        eyeRightRef.current.scale.y = eyeScaleY;
      } else {
        setBlinkState(prev => ({ ...prev, isBlinking: false }));
        eyeLeftRef.current.scale.y = 1;
        eyeRightRef.current.scale.y = 1;
      }
    }

    // Emotional expressions with micro-expressions
    const emotionIntensity = speaking ? 0.7 : 0.4;
    switch (emotion) {
      case 'happy':
        eyebrowLeftRef.current.rotation.z = -0.1 * emotionIntensity;
        eyebrowRightRef.current.rotation.z = 0.1 * emotionIntensity;
        mouthRef.current.scale.x = 1.2 + Math.sin(time * 2) * 0.05;
        mouthRef.current.position.y = -0.2 + Math.sin(time * 2) * 0.01;
        setFacialTension({ brow: -0.2, mouth: 0.3, cheeks: 0.4 });
        break;
      case 'sad':
        eyebrowLeftRef.current.rotation.z = 0.2 * emotionIntensity;
        eyebrowRightRef.current.rotation.z = -0.2 * emotionIntensity;
        mouthRef.current.scale.x = 0.8;
        mouthRef.current.position.y = -0.25;
        setFacialTension({ brow: 0.3, mouth: -0.2, cheeks: -0.1 });
        break;
      case 'thinking':
        eyebrowLeftRef.current.rotation.z = -0.3 * emotionIntensity;
        eyebrowRightRef.current.rotation.z = 0;
        mouthRef.current.scale.x = 0.9;
        mouthRef.current.position.y = -0.22;
        setFacialTension({ brow: 0.4, mouth: 0, cheeks: 0.1 });
        break;
      case 'surprised':
        eyebrowLeftRef.current.rotation.z = -0.3 * emotionIntensity;
        eyebrowRightRef.current.rotation.z = 0.3 * emotionIntensity;
        mouthRef.current.scale.x = 1.1;
        mouthRef.current.scale.y = 1.3;
        setFacialTension({ brow: 0.5, mouth: 0.4, cheeks: 0.2 });
        break;
      case 'confused':
        eyebrowLeftRef.current.rotation.z = -0.2 * emotionIntensity;
        eyebrowRightRef.current.rotation.z = 0.3 * emotionIntensity;
        mouthRef.current.scale.x = 0.9;
        mouthRef.current.rotation.z = 0.1;
        setFacialTension({ brow: 0.3, mouth: -0.1, cheeks: 0 });
        break;
      default:
        eyebrowLeftRef.current.rotation.z = 0;
        eyebrowRightRef.current.rotation.z = 0;
        mouthRef.current.scale.x = 1;
        mouthRef.current.scale.y = 1;
        mouthRef.current.rotation.z = 0;
        setFacialTension({ brow: 0, mouth: 0, cheeks: 0 });
    }

    // Micro-expressions (subtle random facial movements)
    const microExpressionIntensity = Math.sin(time * 0.7) * 0.1;
    eyebrowLeftRef.current.position.y += microExpressionIntensity * 0.01;
    eyebrowRightRef.current.position.y += microExpressionIntensity * 0.01;
    
    // Natural eye movement (smoother, with focus points)
    const eyeTargetX = mouseX * 0.2;
    const eyeTargetY = mouseY * 0.15;
    
    // Add subtle random eye movements
    const randomEyeMove = {
      x: Math.sin(time * 1.3) * 0.01,
      y: Math.cos(time * 1.5) * 0.01
    };

    const eyeLerpSpeed = speaking ? 0.1 : 0.07;
    eyeLeftRef.current.position.x = THREE.MathUtils.lerp(
      eyeLeftRef.current.position.x,
      eyeTargetX + randomEyeMove.x,
      eyeLerpSpeed
    );
    eyeLeftRef.current.position.y = THREE.MathUtils.lerp(
      eyeLeftRef.current.position.y,
      eyeTargetY + randomEyeMove.y,
      eyeLerpSpeed
    );
    eyeRightRef.current.position.x = THREE.MathUtils.lerp(
      eyeRightRef.current.position.x,
      eyeTargetX + randomEyeMove.x,
      eyeLerpSpeed
    );
    eyeRightRef.current.position.y = THREE.MathUtils.lerp(
      eyeRightRef.current.position.y,
      eyeTargetY + randomEyeMove.y,
      eyeLerpSpeed
    );

    // Subtle breathing effect
    const breathingEffect = Math.sin(time * 0.5) * 0.02;
    headRef.current.position.y = breathingEffect;

    // Enhanced speaking animation with phonemes
    if (speaking) {
      const phonemeDuration = 0.15; // Duration for each phoneme
      
      // Check if we should change phoneme
      if (time - lastPhonemeChange.current > phonemeDuration) {
        lastPhonemeChange.current = time;
        
        // Randomly select next phoneme
        const phonemes = Object.values(PHONEME_SHAPES);
        const nextShape = phonemes[Math.floor(Math.random() * (phonemes.length - 1))]; // Exclude REST
        
        setCurrentPhoneme(nextPhoneme);
        setNextPhoneme(nextShape);
        setPhonemeTransition(0);
      }

      // Smooth transition between phonemes
      setPhonemeTransition(prev => Math.min(1, prev + delta / phonemeDuration));
      
      // Interpolate between current and next phoneme
      const lerpValue = (1 - Math.cos(phonemeTransition * Math.PI)) / 2; // Smooth easing
      
      const currentShape = {
        width: THREE.MathUtils.lerp(currentPhoneme.width, nextPhoneme.width, lerpValue),
        height: THREE.MathUtils.lerp(currentPhoneme.height, nextPhoneme.height, lerpValue),
        roundness: THREE.MathUtils.lerp(currentPhoneme.roundness, nextPhoneme.roundness, lerpValue)
      };

      // Apply shape to mouth
      if (mouthRef.current) {
        // Main mouth shape
        mouthRef.current.scale.x = currentShape.width;
        mouthRef.current.scale.y = currentShape.height;
        
        // Adjust mouth roundness by modifying z-scale
        mouthRef.current.scale.z = currentShape.roundness;
        
        // Add micro-movements
        const microMove = Math.sin(time * 15) * 0.05;
        mouthRef.current.position.y = -0.25 + microMove;
        
        // Subtle lip movements
        const children = mouthRef.current.children;
        if (children.length >= 2) {
          // Upper lip
          (children[0] as THREE.Mesh).scale.y = 1 + Math.sin(time * 12) * 0.1;
          // Lower lip
          (children[1] as THREE.Mesh).scale.y = 1 + Math.cos(time * 12) * 0.15;
        }
      }

      // Add subtle head movements while speaking
      headRef.current.rotation.x += Math.sin(time * 4) * 0.01;
      headRef.current.rotation.y += Math.cos(time * 3) * 0.01;
    } else {
      // Return to rest position when not speaking
      setCurrentPhoneme(PHONEME_SHAPES.REST);
      setNextPhoneme(PHONEME_SHAPES.REST);
      setPhonemeTransition(1);
      
      if (mouthRef.current) {
        mouthRef.current.scale.x = PHONEME_SHAPES.REST.width;
        mouthRef.current.scale.y = PHONEME_SHAPES.REST.height;
        mouthRef.current.scale.z = PHONEME_SHAPES.REST.roundness;
        mouthRef.current.position.y = -0.25;
      }
    }
  });

  return (
    <group ref={headRef}>
      {/* Ambient face lighting */}
      <pointLight ref={glowRef} position={[0, 0, 2]} intensity={0.8} distance={5} decay={2} />
      <pointLight position={[-2, 2, 2]} intensity={0.4} distance={7} decay={2} />
      
      {/* Head base with more realistic shape */}
      <mesh ref={faceRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 64, 64]} />
        <meshStandardMaterial
          color="#e1b892"
          metalness={0.1}
          roughness={0.85}
          envMapIntensity={1}
        />
      </mesh>

      {/* Hair */}
      <group ref={hairRef} position={[0, 0.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.62, 32, 32]} />
          <meshStandardMaterial
            color="#362f2d"
            metalness={0.1}
            roughness={0.9}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Additional hair strands */}
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={i} position={[
            Math.sin(i * 0.5) * 0.4,
            0.2 + Math.cos(i * 0.5) * 0.2,
            Math.cos(i * 0.7) * 0.3
          ]}>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial
              color="#362f2d"
              metalness={0.1}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Enhanced facial features */}
      <group position={[0, 0, 0.35]}>
        {/* Thicker eyebrows */}
        <mesh ref={eyebrowLeftRef} position={[-0.2, 0.2, 0.2]}>
          <boxGeometry args={[0.2, 0.04, 0.06]} />
          <meshStandardMaterial color="#2a2422" />
        </mesh>
        <mesh ref={eyebrowRightRef} position={[0.2, 0.2, 0.2]}>
          <boxGeometry args={[0.2, 0.04, 0.06]} />
          <meshStandardMaterial color="#2a2422" />
        </mesh>

        {/* Enhanced eyes */}
        <group position={[0, 0.1, 0.2]}>
          {/* Left eye */}
          <group ref={eyeLeftRef} position={[-0.2, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.11, 32, 32]} />
              <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.08]}>
              <sphereGeometry args={[0.055, 32, 32]} />
              <meshStandardMaterial
                color="#3d3226"
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
              <sphereGeometry args={[0.03, 32, 32]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.02, 0.02, 0.13]} rotation={[0, 0, Math.PI / 4]}>
              <planeGeometry args={[0.02, 0.02]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
          </group>

          {/* Right eye - mirror of left */}
          <group ref={eyeRightRef} position={[0.2, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.11, 32, 32]} />
              <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.08]}>
              <sphereGeometry args={[0.055, 32, 32]} />
              <meshStandardMaterial
                color="#3d3226"
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
              <sphereGeometry args={[0.03, 32, 32]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.02, 0.02, 0.13]} rotation={[0, 0, Math.PI / 4]}>
              <planeGeometry args={[0.02, 0.02]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
          </group>
        </group>

        {/* Enhanced mouth */}
        <group ref={mouthRef} position={[0, -0.25, 0.15]}>
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.15, 0.08, 0.1]} />
            <meshStandardMaterial
              color="#8e5c5c"
              metalness={0.2}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, -0.02, -0.05]}>
            <sphereGeometry args={[0.12, 0.1, 0.1]} />
            <meshStandardMaterial
              color="#4a1010"
              metalness={0.1}
              roughness={1}
            />
          </mesh>
        </group>

        {/* Beard */}
        <group ref={beardRef} position={[0, -0.3, 0.1]}>
          {/* Main beard volume */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial
              color="#2a2422"
              metalness={0.1}
              roughness={0.9}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Beard details - strands */}
          {Array.from({ length: 30 }).map((_, i) => (
            <mesh key={i} position={[
              Math.sin(i * 0.4) * 0.3,
              -0.2 + Math.cos(i * 0.4) * 0.2,
              Math.cos(i * 0.6) * 0.2
            ]}>
              <boxGeometry args={[0.05, 0.15, 0.05]} />
              <meshStandardMaterial
                color="#2a2422"
                metalness={0.1}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export function AnimatedAvatar({ speaking, emotion }: AnimatedAvatarProps) {
  return (
    <div className={`w-full aspect-square ${speaking ? 'animate-pulse' : ''} bg-gray-800/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg border border-gray-700`}>
      <Canvas
        camera={{ position: [0, -3, 2.5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <HumanHead speaking={speaking} emotion={emotion} />
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