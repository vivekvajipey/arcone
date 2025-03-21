import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { MeshStandardMaterial, Group, Vector3, Quaternion } from 'three';
import { useGLTF, Trail, useAnimations, MeshDistortMaterial } from '@react-three/drei';

type EtherealAutomatonProps = {
  position?: [number, number, number];
  scale?: number;
  target?: any; // The player target to track
};

export function EtherealAutomaton({ position = [0, 0, 0], scale = 2, target }: EtherealAutomatonProps) {
  // We'll use a placeholder model and enhance it with effects
  // In a full implementation, you would import a custom model
  const automaton = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const targetPosition = useRef(new Vector3());
  const currentRotation = useRef(0);
  
  // Animation parameters
  const floatHeight = useRef(0);
  const attackCooldown = useRef(0);
  const isAttacking = useRef(false);
  
  // Handle movement and attacks
  useFrame((state, delta) => {
    if (!automaton.current || !bodyRef.current) return;
    
    // Levitation effect
    floatHeight.current += delta * 1.5;
    automaton.current.position.y = position[1] + Math.sin(floatHeight.current) * 0.3 + 1;
    
    // Rotation effect
    bodyRef.current.rotation.y += delta * 0.3;
    
    // Track the player if target is provided
    if (target && target.current) {
      targetPosition.current.copy(target.current.position);
      
      // Calculate direction to player
      const direction = new Vector3()
        .subVectors(targetPosition.current, automaton.current.position)
        .normalize();
      
      // Gradually rotate to face the player
      const targetAngle = Math.atan2(direction.x, direction.z);
      currentRotation.current = currentRotation.current + (targetAngle - currentRotation.current) * 0.05;
      
      automaton.current.rotation.y = currentRotation.current;
      
      // Attack behavior
      if (attackCooldown.current <= 0) {
        const distanceToPlayer = automaton.current.position.distanceTo(targetPosition.current);
        
        if (distanceToPlayer < 10 && !isAttacking.current) {
          isAttacking.current = true;
          attackCooldown.current = 3; // 3 seconds cooldown
          
          // Attack animation
          const originalScale = bodyRef.current.scale.clone();
          
          // Pulse effect for attack
          const attackSequence = async () => {
            for (let i = 0; i < 3; i++) {
              if (bodyRef.current) {
                bodyRef.current.scale.multiplyScalar(1.2);
                await new Promise(r => setTimeout(r, 100));
                bodyRef.current.scale.copy(originalScale);
                await new Promise(r => setTimeout(r, 100));
              }
            }
            isAttacking.current = false;
          };
          
          attackSequence();
        }
      } else {
        attackCooldown.current -= delta;
      }
    }
  });
  
  return (
    <RigidBody 
      type="kinematicPosition"
      colliders="ball"
      position={[position[0], position[1] + 1, position[2]]}
      mass={50}
    >
      <group ref={automaton}>
        {/* Core body with glowing effect */}
        <group ref={bodyRef}>
          <Trail
            width={1.5}
            length={8}
            color="#80A0FF"
            attenuation={(t) => t * t}
          >
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.8, 32, 32]} />
              <MeshDistortMaterial
                color="#FFFFFF"
                emissive="#6080FF"
                emissiveIntensity={2}
                roughness={0.1}
                metalness={0.9}
                distort={0.3}
                speed={2}
              />
            </mesh>
          </Trail>
          
          {/* Outer armor plating */}
          <mesh>
            <torusGeometry args={[1.2, 0.1, 8, 16]} />
            <meshStandardMaterial
              color="#303030"
              emissive="#505050"
              roughness={0.1}
              metalness={1}
            />
          </mesh>
          
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[1.2, 0.1, 8, 16]} />
            <meshStandardMaterial
              color="#303030"
              emissive="#505050"
              roughness={0.1}
              metalness={1}
            />
          </mesh>
          
          {/* Energy orbs */}
          {[0, 1, 2, 3].map(i => {
            const angle = (i / 4) * Math.PI * 2;
            return (
              <mesh 
                key={i} 
                position={[
                  Math.sin(angle) * 1.5,
                  Math.cos(angle) * 1.5,
                  0
                ]}
              >
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                  color="#80A0FF"
                  emissive="#80A0FF"
                  emissiveIntensity={3}
                  transparent={true}
                  opacity={0.7}
                />
              </mesh>
            );
          })}
          
          {/* Head */}
          <group position={[0, 2, 0]}>
            <mesh>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color="#202020"
                roughness={0.2}
                metalness={0.9}
              />
            </mesh>
            
            {/* Eye */}
            <mesh position={[0, 0, 0.4]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color="#FF3030"
                emissive="#FF0000"
                emissiveIntensity={3}
              />
            </mesh>
          </group>
          
          {/* Arms */}
          {[-1, 1].map(side => (
            <group 
              key={`arm-${side}`} 
              position={[side * 1, 1, 0]}
              rotation={[0, 0, side * Math.PI * 0.15]}
            >
              <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                <meshStandardMaterial
                  color="#303030"
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>
              
              <mesh position={[side * 0.3, -1.3, 0]}>
                <boxGeometry args={[0.6, 0.6, 0.2]} />
                <meshStandardMaterial
                  color="#505050"
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </RigidBody>
  );
} 