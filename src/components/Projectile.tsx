import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, BallCollider, useRapier } from '@react-three/rapier';
import { Vector3, MeshStandardMaterial, SphereGeometry } from 'three';
import { useHealth } from '../contexts/HealthContext';

type ProjectileProps = {
  position: [number, number, number];
  target: Vector3;
  onHit?: () => void;
  damage?: number;
  speed?: number;
  size?: number;
  color?: string;
  isPlayerProjectile?: boolean;
};

export const Projectile: React.FC<ProjectileProps> = ({
  position,
  target,
  onHit,
  damage = 10,
  speed = 15,
  size = 0.3,
  color = '#ff5500',
  isPlayerProjectile = false,
}) => {
  const rigidBody = useRef<any>(null);
  const { world } = useRapier();
  const { clock } = useThree();
  
  // Log projectile creation for debugging
  console.log("Creating projectile at", position, "targeting", target, isPlayerProjectile ? "(player)" : "(automaton)");
  
  const [direction] = useState(() => {
    // Calculate direction vector from position to target
    const dir = new Vector3(
      target.x - position[0],
      target.y - position[1],
      target.z - position[2]
    ).normalize();
    
    return dir;
  });
  
  const { damagePlayer, damageAutomaton } = useHealth();
  const [isActive, setIsActive] = useState(true);
  const lifespan = useRef(isPlayerProjectile ? 2000 : 3000); // 2 seconds lifespan for player projectiles (they're faster)
  const startTime = useRef(Date.now());
  const hasHit = useRef(false);
  const lastFrameTime = useRef(clock.getElapsedTime());
  
  useFrame(() => {
    if (!rigidBody.current || !isActive) return;
    
    // Calculate delta time for smooth movement
    const currentTime = clock.getElapsedTime();
    const deltaTime = currentTime - lastFrameTime.current;
    lastFrameTime.current = currentTime;
    
    // Check if lifespan exceeded
    if (Date.now() - startTime.current > lifespan.current) {
      setIsActive(false);
      return;
    }
    
    // Move projectile in direction using delta time for smooth movement
    const currentPos = rigidBody.current.translation();
    const speedFactor = isPlayerProjectile ? 8 : 5; // Player projectiles are faster
    const newPos = {
      x: currentPos.x + direction.x * speed * deltaTime * speedFactor,
      y: currentPos.y + direction.y * speed * deltaTime * speedFactor,
      z: currentPos.z + direction.z * speed * deltaTime * speedFactor,
    };
    
    // Update position
    rigidBody.current.setTranslation(newPos, true);
    
    // Check for collisions with physics bodies
    if (!hasHit.current && world) {
      // Get all rigid bodies in the world
      world.bodies.forEach(body => {
        // Skip self-collision and already hit
        if (body === rigidBody.current || hasHit.current) return;
        
        // Get user data to check entity type
        const userData = body.userData as any;
        
        if (isPlayerProjectile) {
          // Player projectiles hit the automaton
          const isAutomaton = userData?.isAutomaton === true;
          if (isAutomaton) {
            // Get positions
            const bodyPos = body.translation();
            
            // Calculate distance
            const distance = Math.sqrt(
              Math.pow(currentPos.x - bodyPos.x, 2) +
              Math.pow(currentPos.y - bodyPos.y, 2) +
              Math.pow(currentPos.z - bodyPos.z, 2)
            );
            
            // If close enough, consider it a hit
            const hitThreshold = size + 1.5; // Larger threshold for automaton
            if (distance < hitThreshold) {
              console.log("Player projectile hit automaton! Applying damage:", damage);
              // Apply damage and mark as hit
              damageAutomaton(damage);
              hasHit.current = true;
              setIsActive(false);
              
              // Callback for effects
              if (onHit) onHit();
            }
          }
        } else {
          // Automaton projectiles hit the player
          const isPlayer = userData?.isPlayer === true;
          if (isPlayer) {
            // Get positions
            const bodyPos = body.translation();
            
            // Calculate distance
            const distance = Math.sqrt(
              Math.pow(currentPos.x - bodyPos.x, 2) +
              Math.pow(currentPos.y - bodyPos.y, 2) +
              Math.pow(currentPos.z - bodyPos.z, 2)
            );
            
            // If close enough, consider it a hit
            const hitThreshold = size + 0.8; // Detection radius for player hit
            if (distance < hitThreshold) {
              console.log("Projectile hit player! Applying damage:", damage);
              // Apply damage and mark as hit
              damagePlayer(damage);
              hasHit.current = true;
              setIsActive(false);
              
              // Callback for effects
              if (onHit) onHit();
            }
          }
        }
      });
    }
  });
  
  // Remove from the scene when no longer active
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (onHit && hasHit.current) onHit();
    };
  }, [onHit]);
  
  if (!isActive) return null;
  
  const actualSize = size * (isPlayerProjectile ? 1.5 : 2.5); // Different sizes for player vs automaton projectiles
  
  return (
    <RigidBody
      ref={rigidBody}
      position={position}
      type="kinematicPosition"
      sensor
      userData={{ isProjectile: true, isPlayerProjectile }}
    >
      <BallCollider args={[actualSize * 0.8]} />
      <mesh castShadow>
        <sphereGeometry args={[actualSize, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={5}
          toneMapped={false}
        />
      </mesh>
      
      {/* Much stronger glow effect */}
      <pointLight
        color={color}
        intensity={isPlayerProjectile ? 12 : 15}
        distance={isPlayerProjectile ? 8 : 10}
      />
    </RigidBody>
  );
}; 