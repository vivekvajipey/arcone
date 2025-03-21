import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Group, Vector3, MeshStandardMaterial, Clock, Object3D, Color, MathUtils } from 'three';
import { useGLTF } from '@react-three/drei';
import { useHealth } from '../contexts/HealthContext';
import { Projectile } from './Projectile';

type EtherealAutomatonProps = {
  position?: [number, number, number];
  scale?: number;
  target?: any;
  arenaSize?: number;
};

// Pre-load the model
useGLTF.preload('/models/automaton.glb');

export const EtherealAutomaton = forwardRef<any, EtherealAutomatonProps>(
  ({ position = [0, 0, 0], scale = 2, target, arenaSize = 20 }, ref) => {
    const group = useRef<Group>(null);
    const rigidBody = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const { automatonHealth, isVictory } = useHealth();
    const clock = useRef(new Clock());
    
    // Load the model
    const model = useGLTF('/models/automaton.glb');
    
    // Movement state
    const currentPosition = useRef(new Vector3(position[0], position[1] + 1, position[2]));
    const targetPosition = useRef(new Vector3(position[0], position[1] + 1, position[2]));
    const movementSpeed = useRef(0.05); // Base speed
    const movementPattern = useRef('orbit'); // 'orbit', 'chase', 'zigzag'
    const orbitCenter = useRef(new Vector3(0, position[1] + 1, 0));
    const orbitRadius = useRef(8);
    const orbitAngle = useRef(0);
    const changePatternTime = useRef(0);
    const patternDuration = 8; // seconds before changing pattern
    const movementHeightVariation = 0.5; // How much height varies during movement
    
    // Track defeated animation
    const [isDefeated, setIsDefeated] = useState(false);
    const defeatAnimationStart = useRef(0);
    const defeatAnimationDuration = 2.0; // seconds
    
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
      if (automatonHealth <= 0 && !isDefeated) {
        // Handle automaton death
        console.log('Automaton defeated!');
        setIsDefeated(true);
        defeatAnimationStart.current = clock.current.getElapsedTime();
      }
      
      // Update previous health reference
      prevHealthRef.current = automatonHealth;
    }, [automatonHealth]);
    
    // Calculate new target position
    const updateTargetPosition = (elapsedTime: number) => {
      // Don't update target position if defeated or victory
      if (isDefeated || isVictory) return;
      
      // Change movement pattern every few seconds
      if (elapsedTime - changePatternTime.current > patternDuration) {
        const patterns = ['orbit', 'chase', 'zigzag'];
        // Pick a new pattern, different from the current one
        let newPattern;
        do {
          newPattern = patterns[Math.floor(Math.random() * patterns.length)];
        } while (newPattern === movementPattern.current);
        
        movementPattern.current = newPattern;
        changePatternTime.current = elapsedTime;
        
        // Adjust speed based on pattern
        if (movementPattern.current === 'chase') {
          movementSpeed.current = 0.12; // Faster when chasing
        } else if (movementPattern.current === 'zigzag') {
          movementSpeed.current = 0.1; // Medium speed
        } else {
          movementSpeed.current = 0.05; // Slower during orbit
        }
        
        console.log(`Automaton changed movement pattern to: ${movementPattern.current}`);
      }
      
      // Calculate target position based on current pattern
      switch (movementPattern.current) {
        case 'orbit':
          // Orbit around the center of the arena
          orbitAngle.current += 0.01;
          targetPosition.current.set(
            orbitCenter.current.x + Math.sin(orbitAngle.current) * orbitRadius.current,
            position[1] + 1 + Math.sin(elapsedTime * 0.5) * movementHeightVariation,
            orbitCenter.current.z + Math.cos(orbitAngle.current) * orbitRadius.current
          );
          break;
          
        case 'chase':
          // Chase the player but maintain some distance
          if (target?.current?.position) {
            const playerPos = target.current.position.clone();
            const dirToPlayer = playerPos.clone().sub(currentPosition.current).normalize();
            const idealDistance = 6; // Distance to maintain from player
            const currentDistance = currentPosition.current.distanceTo(playerPos);
            
            // If too close, move away slightly
            if (currentDistance < idealDistance * 0.7) {
              dirToPlayer.multiplyScalar(-1); // Move away
            }
            
            // Set target slightly offset from player's position
            targetPosition.current.set(
              playerPos.x + dirToPlayer.x * idealDistance,
              position[1] + 1 + Math.sin(elapsedTime * 0.7) * movementHeightVariation,
              playerPos.z + dirToPlayer.z * idealDistance
            );
          }
          break;
          
        case 'zigzag':
          // Zigzag around the arena
          const zigzagFrequency = 1;
          const zigzagAmplitude = 8;
          targetPosition.current.set(
            Math.sin(elapsedTime * zigzagFrequency) * zigzagAmplitude,
            position[1] + 1 + Math.sin(elapsedTime * 0.3) * movementHeightVariation,
            Math.cos(elapsedTime * zigzagFrequency * 0.7) * zigzagAmplitude
          );
          break;
      }
      
      // Ensure the automaton stays within the arena boundaries
      const boundaryLimit = arenaSize / 2 - 2; // Keep a little distance from edge
      targetPosition.current.x = MathUtils.clamp(targetPosition.current.x, -boundaryLimit, boundaryLimit);
      targetPosition.current.z = MathUtils.clamp(targetPosition.current.z, -boundaryLimit, boundaryLimit);
    };
    
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
        targetPos.x - currentPosition.current.x,
        0,
        targetPos.z - currentPosition.current.z
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
          currentPosition.current.x + rotatedDir.x * spawnOffset,
          position[1] + spawnY, // Use the component's base position for consistency
          currentPosition.current.z + rotatedDir.z * spawnOffset
        ];
        
        // Double check for NaN values
        if (isNaN(spawnPosition[0]) || isNaN(spawnPosition[2])) {
          console.error("Invalid projectile position detected, using fallback", spawnPosition);
          spawnPosition[0] = currentPosition.current.x;
          spawnPosition[2] = currentPosition.current.z;
        }
        
        // Get target position with proper y height to avoid ground shots
        const projTargetPos = targetPos.clone();
        projTargetPos.y = projTargetPos.y + 1.2; // Target at player's body height, not feet
        
        // Add variation to the target position for spread
        const targetDistance = 20; // Target point is 20 units away in the direction
        const spreadTargetPos = new Vector3(
          currentPosition.current.x + rotatedDir.x * targetDistance,
          projTargetPos.y,
          currentPosition.current.z + rotatedDir.z * targetDistance
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
      
      // Handle defeat animation
      if (isDefeated) {
        const defeatTime = elapsedTime - defeatAnimationStart.current;
        
        if (defeatTime < defeatAnimationDuration) {
          // Play defeat animation
          if (group.current) {
            // Rotate and sink into the ground
            group.current.rotation.y += 0.1;
            
            // Sink into ground
            const sinkProgress = Math.min(defeatTime / defeatAnimationDuration, 1);
            const newY = currentPosition.current.y - sinkProgress * 3;
            
            // Update position
            // @ts-ignore
            rigidBody.current.setTranslation(
              new Vector3(currentPosition.current.x, newY, currentPosition.current.z), 
              true
            );
            
            // Scale down
            const scaleDown = 1 - sinkProgress * 0.5;
            group.current.scale.set(
              scale * 10 * scaleDown,
              scale * 10 * scaleDown,
              scale * 10 * scaleDown
            );
            
            // Make it glow red then fade out
            group.current.traverse((child: any) => {
              if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                
                materials.forEach((material: any) => {
                  if (material instanceof MeshStandardMaterial) {
                    // Start with bright red, then fade to black
                    const initialPhase = Math.min(defeatTime * 2, 1); // First half - turn red
                    const fadePhase = Math.max(0, Math.min((defeatTime - 0.5) * 2, 1)); // Second half - fade out
                    
                    material.emissive.set('#ff0000');
                    material.emissiveIntensity = 2 * (1 - fadePhase);
                    material.opacity = 1 - fadePhase;
                    material.transparent = true;
                    material.needsUpdate = true;
                  }
                });
              }
            });
          }
        }
        
        // Don't do normal shooting behavior when defeated
        return;
      }
      
      // Calculate new target position for movement
      updateTargetPosition(elapsedTime);
      
      // Move towards target position
      const lerpFactor = 0.05; // Smoothness of movement
      currentPosition.current.lerp(targetPosition.current, lerpFactor);
      
      // Update position
      // @ts-ignore - using the setTranslation method which might not be in the type definitions
      rigidBody.current.setTranslation(currentPosition.current, true);
      
      // Get player position
      const playerPosition = target.current.position.clone();
      
      // Calculate direction to player
      const direction = new Vector3(
        playerPosition.x - currentPosition.current.x,
        0, // Keep Y rotation level
        playerPosition.z - currentPosition.current.z
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
      }
      
      // Don't shoot if player has won
      if (isVictory) return;
      
      // Check if startup delay has passed
      const gameRunTime = Date.now() - gameStartTime.current;
      if (gameRunTime < startupDelay) return;
      
      // Shoot when cooldown expired
      if (elapsedTime - lastShotTime.current > shotCooldown) {
        shootProjectile();
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