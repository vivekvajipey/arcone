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
    const clock = useRef(new Clock());
    const { automatonHealth } = useHealth();
    
    // Flight path parameters
    const centerPosition = useRef(new Vector3(position[0], position[1] + 2, position[2]));
    const radius = 8; // Radius of circular flight path
    const heightVariation = 1; // How much it moves up and down
    const rotationSpeed = 0.1; // How fast it rotates around the area
    const bobSpeed = 0.5; // Speed of up/down movement
    
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
    
    // Flying animation - adjust behavior based on health
    useFrame(() => {
      if (!rigidBody.current) return;
      
      const elapsedTime = clock.current.getElapsedTime();
      
      // Calculate new position in a circular path with bobbing
      const angle = elapsedTime * rotationSpeed;
      const x = centerPosition.current.x + Math.sin(angle) * radius;
      const z = centerPosition.current.z + Math.cos(angle) * radius;
      const y = centerPosition.current.y + Math.sin(elapsedTime * bobSpeed) * heightVariation;
      
      // Apply the new position to the rigid body
      // @ts-ignore - using the setTranslation method which might not be in the type definitions
      rigidBody.current.setTranslation({ x, y, z }, true);
      
      // Gradually rotate the model to face the direction it's moving
      if (group.current) {
        const targetRotation = Math.atan2(
          Math.cos(angle), // direction Z
          -Math.sin(angle) // direction X (negative because of coordinate system)
        );
        
        // Smoothly interpolate the current rotation to the target
        const currentY = group.current.rotation.y;
        const angleDiff = targetRotation - currentY;
        
        // Handle angle wrapping
        const shortestAngle = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        
        // Apply smooth rotation
        group.current.rotation.y += shortestAngle * 0.05; // Smooth turning
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