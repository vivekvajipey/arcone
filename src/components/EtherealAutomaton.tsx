import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Group, Vector3, MeshStandardMaterial, Clock, Object3D } from 'three';
import { useGLTF } from '@react-three/drei';
import { useHealth } from '../contexts/HealthContext';

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
    
    // Fixed position in the center
    const centerPosition = new Vector3(position[0], position[1] + 1, position[2]);
    
    // Load the model
    const model = useGLTF('/models/automaton.glb');
    
    // Forward the ref to the rigid body
    React.useImperativeHandle(ref, () => rigidBody.current);
    
    // React to health changes
    React.useEffect(() => {
      // Handle any effects when health changes
      if (automatonHealth <= 0) {
        // Handle automaton death
        console.log('Automaton defeated!');
      }
    }, [automatonHealth]);
    
    // Apply effects and setup on mount
    useEffect(() => {
      if (model.scene && !modelLoaded) {
        console.log("Loading automaton.glb model");
        
        // Function to prepare the model
        const prepareModel = () => {
          // Clone the scene to avoid modifying the original
          const clonedScene = model.scene.clone();
          
          // Keep original materials but enable shadows
          clonedScene.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Keep original material, don't replace it
              // Just make sure it can cast/receive shadows properly
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => {
                    if (mat) {
                      mat.needsUpdate = true;
                    }
                  });
                } else {
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
    
    // Face the player
    useFrame(() => {
      if (!rigidBody.current || !target?.current?.position) return;
      
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
      }
    });
    
    // Calculate collider size based on scale - for a human-sized character
    const colliderHeight = 1.8 * scale;
    const colliderWidth = 0.7 * scale;
    const colliderDepth = 0.7 * scale;
    
    return (
      <RigidBody 
        ref={rigidBody}
        type="kinematicPosition" // Changed to kinematic for manual positioning
        position={position}
        colliders={false}
        gravityScale={0} // No gravity
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
    );
  }
); 