import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Group, Vector3, MeshStandardMaterial, Clock, Object3D } from 'three';
import { useGLTF } from '@react-three/drei';

type EtherealAutomatonProps = {
  position?: [number, number, number];
  scale?: number;
  target?: any;
};

// Pre-load the model
useGLTF.preload('/models/automaton.glb');

export function EtherealAutomaton({ position = [0, 0, 0], scale = 2, target }: EtherealAutomatonProps) {
  const group = useRef<Group>(null);
  const rigidBody = useRef(null);
  const clock = useRef(new Clock());
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Load the model
  const model = useGLTF('/models/automaton.glb');
  
  // Apply effects and setup on mount
  useEffect(() => {
    if (model.scene && !modelLoaded) {
      console.log("Loading automaton.glb model");
      
      // Examine model structure for debugging
      console.log("Model structure:", {
        childrenCount: model.scene.children.length,
        children: model.scene.children.map(child => ({
          name: child.name,
          type: child.type,
          scale: child.scale ? child.scale.toArray() : null
        }))
      });
      
      // Function to prepare the model
      const prepareModel = () => {
        // Clone the scene to avoid modifying the original
        const clonedScene = model.scene.clone();
        
        // Keep original materials but enable shadows
        clonedScene.traverse((child: any) => {
          if (child.isMesh) {
            console.log("Preserving original material for mesh:", child.name);
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
  
  // Simple rotation animation
  useFrame((state) => {
    const delta = clock.current.getDelta();
    
    // Rotate the model slowly
    if (group.current) {
      group.current.rotation.y += delta * 0.5;
    }
    
    // Add a hovering effect
    const elapsedTime = state.clock.getElapsedTime();
    const hoverOffset = Math.sin(elapsedTime * 1.5) * 0.2;
    if (group.current) {
      group.current.position.y = hoverOffset;
    }
  });
  
  return (
    <RigidBody 
      ref={rigidBody}
      type="fixed"
      position={position}
    >
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