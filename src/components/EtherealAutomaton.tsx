import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Group, Vector3, MeshStandardMaterial, Clock, Object3D, Color } from 'three';
import { useGLTF } from '@react-three/drei';
import { useHealth } from '../contexts/HealthContext';
import { Projectile } from './Projectile';

type EtherealAutomatonProps = {
  position?: [number, number, number];
  scale?: number;
  target?: any;
};

// Pre-load the model
useGLTF.preload('/models/automaton.glb');

export const EtherealAutomaton = forwardRef<any, EtherealAutomatonProps>(
  ({ position = [0, 0, 0], scale = 2, target }, ref) => {
    const group = useRef<Group>(null);
    const rigidBody = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const { automatonHealth } = useHealth();
    const clock = useRef(new Clock());
    
    // Projectile state
    const [projectiles, setProjectiles] = useState<Array<{
      id: number;
      position: [number, number, number];
      target: Vector3;
    }>>([]);
    const nextProjectileId = useRef(0);
    const lastShotTime = useRef(0);
    const shotCooldown = 1.0; // Reduced cooldown between shots
    const projectilesPerShot = 3; // Number of projectiles to fire in a spread pattern
    const gameStartTime = useRef(Date.now());
    const startupDelay = 2000; // Reduced startup delay
    
    // Damage effect state
    const [isDamaged, setIsDamaged] = useState(false);
    const damageEffectTimeout = useRef<number | null>(null);
    const prevHealthRef = useRef(automatonHealth);
    const originalMaterials = useRef<Map<MeshStandardMaterial, {color: Color, emissive: Color}>>
      (new Map());
    
    // Fixed position in the center
    const centerPosition = new Vector3(position[0], position[1] + 1, position[2]);
    
    // Load the model
    const model = useGLTF('/models/automaton.glb');
    
    // Forward the ref to the rigid body
    React.useImperativeHandle(ref, () => rigidBody.current);
    
    // React to health changes
    React.useEffect(() => {
      // If health decreased, show damage effect
      if (automatonHealth < prevHealthRef.current) {
        // Clear any existing timeout
        if (damageEffectTimeout.current) {
          window.clearTimeout(damageEffectTimeout.current);
        }
        
        // Set damage effect
        setIsDamaged(true);
        
        // Clear damage effect after 300ms
        damageEffectTimeout.current = window.setTimeout(() => {
          setIsDamaged(false);
          damageEffectTimeout.current = null;
        }, 300);
      }
      
      // Handle any effects when health changes
      if (automatonHealth <= 0) {
        // Handle automaton death
        console.log('Automaton defeated!');
      }
      
      // Update previous health reference
      prevHealthRef.current = automatonHealth;
    }, [automatonHealth]);
    
    // Apply effects and setup on mount
    useEffect(() => {
      if (model.scene && !modelLoaded) {
        console.log("Loading automaton.glb model");
        
        // Function to prepare the model
        const prepareModel = () => {
          // Clone the scene to avoid modifying the original
          const clonedScene = model.scene.clone();
          
          // Store original materials and enable shadows
          clonedScene.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Store original material properties
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => {
                    if (mat && mat instanceof MeshStandardMaterial && !originalMaterials.current.has(mat)) {
                      originalMaterials.current.set(mat, {
                        color: mat.color.clone(),
                        emissive: mat.emissive.clone()
                      });
                      mat.needsUpdate = true;
                    }
                  });
                } else if (child.material instanceof MeshStandardMaterial && 
                           !originalMaterials.current.has(child.material)) {
                  originalMaterials.current.set(child.material, {
                    color: child.material.color.clone(),
                    emissive: child.material.emissive.clone()
                  });
                  child.material.needsUpdate = true;
                }
              }
            }
          });
          
          return clonedScene;
        };
        
        // Prepare and add the model to the scene
        if (group.current) {
          const preparedModel = prepareModel();
          
          // Clear the group first
          while (group.current.children.length > 0) {
            group.current.remove(group.current.children[0]);
          }
          
          // Add the prepared model to the group
          group.current.add(preparedModel);
          setModelLoaded(true);
        }
      }
    }, [model.scene, modelLoaded]);
    
    // Handle damage visual effect
    useEffect(() => {
      if (!group.current) return;
      
      group.current.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach((material: any) => {
            if (material instanceof MeshStandardMaterial) {
              if (isDamaged) {
                // Apply damage effect (red glow)
                material.emissive.set('#ff0000');
                material.emissiveIntensity = 1.0;
              } else {
                // Restore original material
                const original = originalMaterials.current.get(material);
                if (original) {
                  material.emissive.copy(original.emissive);
                  material.emissiveIntensity = 0.5; // Maintain the ethereal glow
                }
              }
              material.needsUpdate = true;
            }
          });
        }
      });
    }, [isDamaged]);
    
    // Function to shoot a projectile
    const shootProjectile = () => {
      if (!target?.current?.position) return;
      
      // Calculate spawn position (slightly in front of automaton)
      const targetPos = target.current.position.clone();
      const dirToPlayer = new Vector3(
        targetPos.x - centerPosition.x,
        0,
        targetPos.z - centerPosition.z
      );
      
      // Safety check - if direction length is too small, use a default direction
      if (dirToPlayer.length() < 0.01) {
        dirToPlayer.set(0, 0, 1); // Default to shooting forward if player is directly above/below
      }
      
      // Now normalize the valid direction vector
      dirToPlayer.normalize();
      
      const spawnOffset = 2; // Distance in front to spawn projectile
      const spawnY = 2; // Height offset from center position
      
      // Create an array to hold all the new projectiles
      const newProjectiles: Array<{
        id: number;
        position: [number, number, number];
        target: Vector3;
      }> = [];
      
      // Fire multiple projectiles in a spread pattern
      for (let i = 0; i < projectilesPerShot; i++) {
        // Create a slight angle variation for spread (-15 to +15 degrees)
        const angle = (i - (projectilesPerShot - 1) / 2) * (Math.PI / 12);
        const rotatedDir = new Vector3(
          dirToPlayer.x * Math.cos(angle) - dirToPlayer.z * Math.sin(angle),
          0,
          dirToPlayer.x * Math.sin(angle) + dirToPlayer.z * Math.cos(angle)
        ).normalize();
        
        // Calculate spawn position with safety checks
        const spawnPosition: [number, number, number] = [
          centerPosition.x + rotatedDir.x * spawnOffset,
          position[1] + spawnY, // Use the component's base position for consistency
          centerPosition.z + rotatedDir.z * spawnOffset
        ];
        
        // Double check for NaN values
        if (isNaN(spawnPosition[0]) || isNaN(spawnPosition[2])) {
          console.error("Invalid projectile position detected, using fallback", spawnPosition);
          spawnPosition[0] = centerPosition.x;
          spawnPosition[2] = centerPosition.z;
        }
        
        // Get target position with proper y height to avoid ground shots
        const projTargetPos = targetPos.clone();
        projTargetPos.y = projTargetPos.y + 1.2; // Target at player's body height, not feet
        
        // Add variation to the target position for spread
        const targetDistance = 20; // Target point is 20 units away in the direction
        const spreadTargetPos = new Vector3(
          centerPosition.x + rotatedDir.x * targetDistance,
          projTargetPos.y,
          centerPosition.z + rotatedDir.z * targetDistance
        );
        
        // Add new projectile to the array
        const projectileId = nextProjectileId.current++;
        newProjectiles.push({
          id: projectileId,
          position: spawnPosition,
          target: spreadTargetPos
        });
        
        console.log("Spawning projectile:", {
          from: spawnPosition,
          to: spreadTargetPos,
          direction: rotatedDir
        });
      }
      
      // Add all new projectiles at once
      setProjectiles(prev => [...prev, ...newProjectiles]);
      
      // Update last shot time
      lastShotTime.current = clock.current.getElapsedTime();
      
      // Play shoot animation or effect
      console.log('Automaton shoots projectile burst!');
    };
    
    // Clean up projectile when it hits something
    const handleProjectileHit = (id: number) => {
      setProjectiles(prev => prev.filter(p => p.id !== id));
    };
    
    // Face the player and handle shooting
    useFrame(() => {
      if (!rigidBody.current || !target?.current?.position) return;
      
      const elapsedTime = clock.current.getElapsedTime();
      
      // Set position to center (fixed position)
      // @ts-ignore - using the setTranslation method which might not be in the type definitions
      rigidBody.current.setTranslation(centerPosition, true);
      
      // Get player position
      const playerPosition = target.current.position.clone();
      
      // Calculate direction to player
      const direction = new Vector3(
        playerPosition.x - centerPosition.x,
        0, // Keep Y rotation level
        playerPosition.z - centerPosition.z
      );
      
      // Skip if direction is too small
      if (direction.length() < 0.1) return;
      
      // Calculate the target rotation - atan2 gives the angle in radians
      const targetRotation = Math.atan2(direction.x, direction.z);
      
      // Gradually rotate the model to face the player
      if (group.current) {
        const currentY = group.current.rotation.y;
        let angleDiff = targetRotation - currentY;
        
        // Handle angle wrapping (ensure shortest rotation path)
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply smooth rotation (lerp)
        group.current.rotation.y += angleDiff * 0.1; // Adjust speed as needed
        
        // Check if startup delay has passed
        const gameRunTime = Date.now() - gameStartTime.current;
        if (gameRunTime < startupDelay) return;
        
        // Shoot when cooldown expired
        if (elapsedTime - lastShotTime.current > shotCooldown) {
          shootProjectile();
        }
      }
    });
    
    // Calculate collider size based on scale - for a human-sized character
    const colliderHeight = 1.8 * scale;
    const colliderWidth = 0.7 * scale;
    const colliderDepth = 0.7 * scale;
    
    return (
      <>
        <RigidBody 
          ref={rigidBody}
          type="kinematicPosition" // Changed to kinematic for manual positioning
          position={position}
          colliders={false}
          gravityScale={0} // No gravity
          userData={{ isAutomaton: true }}
        >
          {/* Add explicit collider with proper dimensions */}
          <CuboidCollider 
            args={[colliderWidth/2, colliderHeight/2, colliderDepth/2]} 
            position={[0, colliderHeight/2, 0]}
            sensor // Make it a sensor so it detects but doesn't push things
          />
          
          <group 
            ref={group} 
            scale={[scale * 10, scale * 10, scale * 10]}
          >
            {/* Fallback box (will be replaced by model when loaded) */}
            {!modelLoaded && (
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 2, 1]} />
                <meshStandardMaterial 
                  color="#ff0000" 
                  emissive="#ff0000"
                  emissiveIntensity={2}
                />
              </mesh>
            )}
          </group>
        </RigidBody>
        
        {/* Render active projectiles */}
        {projectiles.map((projectile) => (
          <Projectile
            key={projectile.id}
            position={projectile.position}
            target={projectile.target}
            onHit={() => handleProjectileHit(projectile.id)}
            damage={10}
            speed={12}
            size={0.5}
            color="#ff5500"
          />
        ))}
      </>
    );
  }
); 