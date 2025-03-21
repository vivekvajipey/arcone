import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
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
};

export const Projectile: React.FC<ProjectileProps> = ({
  position,
  target,
  onHit,
  damage = 10,
  speed = 15,
  size = 0.3,
  color = '#ff5500',
}) => {
  const rigidBody = useRef<any>(null);
  const { world } = useRapier();
  
  // Log projectile creation for debugging
  console.log("Creating projectile at", position, "targeting", target);
  
  const [direction] = useState(() => {
    // Calculate direction vector from position to target
    const dir = new Vector3(
      target.x - position[0],
      target.y - position[1],
      target.z - position[2]
    ).normalize();
    
    return dir;
  });
  
  const { damagePlayer } = useHealth();
  const [isActive, setIsActive] = useState(true);
  const lifespan = useRef(3000); // 3 seconds lifespan
  const startTime = useRef(Date.now());
  const hasHit = useRef(false);
  
  useFrame(() => {
    if (!rigidBody.current || !isActive) return;
    
    // Check if lifespan exceeded
    if (Date.now() - startTime.current > lifespan.current) {
      setIsActive(false);
      return;
    }
    
    // Move projectile in direction
    const currentPos = rigidBody.current.translation();
    const newPos = {
      x: currentPos.x + direction.x * speed * 0.01,
      y: currentPos.y + direction.y * speed * 0.01,
      z: currentPos.z + direction.z * speed * 0.01,
    };
    
    // Update position
    rigidBody.current.setTranslation(newPos, true);
    
    // Check for collisions with physics bodies
    if (!hasHit.current && world) {
      // Get all rigid bodies in the world
      world.bodies.forEach(body => {
        // Skip self-collision and already hit
        if (body === rigidBody.current || hasHit.current) return;
        
        // Check if this is the player body
        const userData = body.userData as any;
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
          // Using a smaller hitThreshold to make it more forgiving
          const hitThreshold = size + 0.8; // Increased hit detection radius
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
  
  const actualSize = size * 2.5; // Significantly larger projectile
  
  return (
    <RigidBody
      ref={rigidBody}
      position={position}
      type="kinematicPosition"
      sensor
      userData={{ isProjectile: true }}
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
        intensity={15}
        distance={10}
      />
    </RigidBody>
  );
}; 