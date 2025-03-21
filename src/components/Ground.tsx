import { RigidBody } from '@react-three/rapier';
import { useTexture } from '@react-three/drei'; 
import { RepeatWrapping, DoubleSide, Color, MeshStandardMaterial, Group, Mesh, Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';

type PlatformConfig = {
  position: readonly [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  color: string;
  glow?: boolean;
  hazard?: boolean;
};

export function Ground() {
  const texture = useTexture('/final-texture.png');
  const arenaRef = useRef<Group>(null);
  const glowRefs = useRef<Mesh[]>([]);
  
  // Configure texture
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 8);
  
  const groundSize = 60; // Expanded ground size
  
  // Create a circular arena with platforms
  const platforms: PlatformConfig[] = useMemo(() => [
    // Main central platform (elevated)
    { position: [0, 0, 0], size: [15, 1, 15], color: '#303050' },
    
    // Outer ring platforms
    { position: [18, -1, 0], size: [7, 0.5, 7], color: '#303050', rotation: [0, Math.PI/4, 0] },
    { position: [-18, -1, 0], size: [7, 0.5, 7], color: '#303050', rotation: [0, Math.PI/4, 0] },
    { position: [0, -1, 18], size: [7, 0.5, 7], color: '#303050', rotation: [0, Math.PI/4, 0] },
    { position: [0, -1, -18], size: [7, 0.5, 7], color: '#303050', rotation: [0, Math.PI/4, 0] },
    
    // Connecting bridges
    { position: [9, -0.5, 0], size: [10, 0.3, 2], color: '#404060', glow: true },
    { position: [-9, -0.5, 0], size: [10, 0.3, 2], color: '#404060', glow: true },
    { position: [0, -0.5, 9], size: [2, 0.3, 10], color: '#404060', glow: true },
    { position: [0, -0.5, -9], size: [2, 0.3, 10], color: '#404060', glow: true },
    
    // Hazard elements (lava/energy pits)
    { position: [9, -2, 9], size: [8, 0.2, 8], color: '#FF6030', glow: true, hazard: true },
    { position: [-9, -2, 9], size: [8, 0.2, 8], color: '#FF6030', glow: true, hazard: true },
    { position: [9, -2, -9], size: [8, 0.2, 8], color: '#FF6030', glow: true, hazard: true },
    { position: [-9, -2, -9], size: [8, 0.2, 8], color: '#FF6030', glow: true, hazard: true },

    // Decorative elements
    { position: [25, -1.5, 0], size: [0.5, 3, 0.5], color: '#80A0FF', glow: true },
    { position: [-25, -1.5, 0], size: [0.5, 3, 0.5], color: '#80A0FF', glow: true },
    { position: [0, -1.5, 25], size: [0.5, 3, 0.5], color: '#80A0FF', glow: true },
    { position: [0, -1.5, -25], size: [0.5, 3, 0.5], color: '#80A0FF', glow: true },
  ], []);

  // Animation for glow effects
  useFrame((state) => {
    if (arenaRef.current) {
      // Subtle rotation for the entire arena
      arenaRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.02;
    }
    
    // Animate glow intensity
    glowRefs.current.forEach((mesh, i) => {
      if (mesh.material instanceof MeshStandardMaterial) {
        const glow = 0.6 + Math.sin(state.clock.getElapsedTime() * 0.5 + i * 0.2) * 0.4;
        mesh.material.emissiveIntensity = glow;
      }
    });
  });

  return (
    <group ref={arenaRef}>
      {/* Base Ground (dark area beneath the arena) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[groundSize * 2, groundSize * 2]} />
          <meshStandardMaterial 
            color="#101018"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      </RigidBody>

      {/* Platforms */}
      {platforms.map((platform, i) => (
        <RigidBody key={i} type="fixed" colliders={platform.hazard ? "cuboid" : "cuboid"}>
          <mesh 
            castShadow 
            receiveShadow 
            position={platform.position as [number, number, number]} 
            rotation={platform.rotation ? platform.rotation : [0, 0, 0]}
            ref={platform.glow ? (el) => el && (glowRefs.current[i] = el) : undefined}
          >
            <boxGeometry args={platform.size} />
            <meshStandardMaterial 
              color={platform.color}
              roughness={platform.glow ? 0.2 : 0.8}
              metalness={platform.glow ? 0.8 : 0.2}
              emissive={platform.glow ? platform.color : "#000000"}
              emissiveIntensity={platform.glow ? 0.8 : 0}
              transparent={platform.hazard}
              opacity={platform.hazard ? 0.8 : 1}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Decorative center element */}
      <mesh position={[0, 0.6, 0]}>
        <torusGeometry args={[7, 0.2, 16, 32]} />
        <meshStandardMaterial 
          color="#80A0FF"
          roughness={0.3}
          metalness={0.8}
          emissive="#5080FF"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Ethereal boundary markers */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <mesh key={`boundary-${i}`} position={[Math.cos(angle) * 30, 0, Math.sin(angle) * 30]}>
            <cylinderGeometry args={[0.2, 0.2, 10, 8]} />
            <meshStandardMaterial 
              color="#303050"
              emissive="#8090B0"
              emissiveIntensity={0.5}
              transparent={true}
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}