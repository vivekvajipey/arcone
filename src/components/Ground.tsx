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
  const colosseumRef = useRef<Group>(null);
  
  // Configure texture
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 8);
  
  const groundSize = 60; // Expanded ground size
  const colosseumRadius = 120; // Large radius for colosseum
  const colosseumHeight = 60; // Height of the colosseum walls
  const colosseumSegments = 48; // Number of segments for smoother appearance
  
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
    
    // Subtle floating effect for colosseum
    if (colosseumRef.current) {
      colosseumRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.5;
      // Very slow rotation
      colosseumRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  const colosseumPillars = useMemo(() => {
    const pillars = [];
    const pillarCount = 24; // Number of pillars around the arena
    const pillarThickness = 16;
    const pillarDepth = 16;
    
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * colosseumRadius;
      const z = Math.sin(angle) * colosseumRadius;
      
      pillars.push({
        position: [x, 0, z],
        rotation: [0, angle + Math.PI / 2, 0],
        size: [pillarDepth, colosseumHeight, pillarThickness]
      });
    }
    
    return pillars;
  }, [colosseumRadius]);

  // Generate the arch elements that connect pillars
  const colosseumArches = useMemo(() => {
    const arches = [];
    const archCount = 24; // Same as pillar count for alignment
    const archHeight = 15;
    const archThickness = 4;
    const archTopHeight = colosseumHeight - 8;
    
    // Top ring connecting all pillars
    for (let i = 0; i < archCount; i++) {
      const angle = (i / archCount) * Math.PI * 2;
      const nextAngle = ((i + 1) / archCount) * Math.PI * 2;
      
      const x = Math.cos(angle) * colosseumRadius;
      const z = Math.sin(angle) * colosseumRadius;
      const nextX = Math.cos(nextAngle) * colosseumRadius;
      const nextZ = Math.sin(nextAngle) * colosseumRadius;
      
      // Calculate midpoint and length between pillars
      const midX = (x + nextX) / 2;
      const midZ = (z + nextZ) / 2;
      const length = Math.sqrt(Math.pow(nextX - x, 2) + Math.pow(nextZ - z, 2));
      
      // Calculate angle between pillars
      const connectionAngle = Math.atan2(nextZ - z, nextX - x);
      
      // Top arch connection
      arches.push({
        position: [midX, archTopHeight, midZ],
        rotation: [0, connectionAngle, 0],
        size: [length, archHeight, archThickness],
        isArch: true
      });
      
      // Mid-level decorative arch
      arches.push({
        position: [midX, colosseumHeight/2, midZ],
        rotation: [0, connectionAngle, 0],
        size: [length, archThickness*2, archThickness],
        isArch: true
      });
    }
    
    return arches;
  }, [colosseumRadius]);

  return (
    <>
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
      
      {/* Colosseum Structure */}
      <group ref={colosseumRef}>
        {/* Pillars */}
        {colosseumPillars.map((pillar, i) => (
          <mesh 
            key={`pillar-${i}`} 
            position={pillar.position as [number, number, number]} 
            rotation={pillar.rotation as [number, number, number]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={pillar.size as [number, number, number]} />
            <meshStandardMaterial 
              color="#303045"
              roughness={0.7}
              metalness={0.3}
              emissive="#404060"
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}
        
        {/* Arches and connecting elements */}
        {colosseumArches.map((arch, i) => (
          <mesh 
            key={`arch-${i}`} 
            position={arch.position as [number, number, number]} 
            rotation={arch.rotation as [number, number, number]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={arch.size as [number, number, number]} />
            <meshStandardMaterial 
              color="#404060"
              roughness={0.6}
              metalness={0.4}
              emissive="#505080"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}
        
        {/* Floor ring around the arena */}
        <mesh position={[0, -2.9, 0]} receiveShadow>
          <ringGeometry args={[colosseumRadius - 15, colosseumRadius + 15, colosseumSegments]} />
          <meshStandardMaterial 
            color="#202030"
            roughness={0.8}
            metalness={0.2}
            emissive="#303050"
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Decorative top ring */}
        <mesh position={[0, colosseumHeight, 0]}>
          <ringGeometry args={[colosseumRadius - 8, colosseumRadius + 8, colosseumSegments]} />
          <meshStandardMaterial 
            color="#505080"
            roughness={0.4}
            metalness={0.6}
            emissive="#6070B0"
            emissiveIntensity={0.8}
          />
        </mesh>
        
        {/* Add a secondary decorative ring below the top one */}
        <mesh position={[0, colosseumHeight - 4, 0]}>
          <ringGeometry args={[colosseumRadius - 6, colosseumRadius + 6, colosseumSegments]} />
          <meshStandardMaterial 
            color="#405070"
            roughness={0.5}
            metalness={0.5}
            emissive="#5060A0"
            emissiveIntensity={0.7}
          />
        </mesh>
      </group>
    </>
  );
}