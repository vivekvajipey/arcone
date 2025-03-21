import { useGLTF, useAnimations } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { Group } from 'three';

type CharacterModelProps = {
  isMoving: boolean;
  isSprinting: boolean;
  isGrounded: boolean;
};

export function CharacterModel({ isMoving, isSprinting, isGrounded }: CharacterModelProps) {
  const group = useRef<Group>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const prevGroundedRef = useRef(isGrounded);
  const { scene, animations } = useGLTF('/models/character.glb', true);
  const { actions } = useAnimations(animations, group);

  scene.traverse((child) => {
    if ('material' in child) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  useEffect(() => {
    let targetAnimation = 'IDLE';
    
    // Determine target animation based on character state
    if (!isGrounded) {
      targetAnimation = 'FALL';
    } else if (isMoving) {
      targetAnimation = isSprinting ? 'RUN' : 'WALK'; // Use WALK when not sprinting
    }
    
    // Fall back to RUN if WALK isn't available
    if (targetAnimation === 'WALK' && !actions['WALK']) {
      targetAnimation = 'RUN';
      // Slow down the run animation when walking
      if (actions['RUN']) {
        actions['RUN'].timeScale = 0.7;
      }
    } else if (targetAnimation === 'RUN' && actions['RUN']) {
      // Normal speed for running
      actions['RUN'].timeScale = 1.25;
    }
    
    // If returning to ground from air, force animation change
    const returningToGround = !prevGroundedRef.current && isGrounded;
    prevGroundedRef.current = isGrounded;
    
    // If it's the first animation, same animation, or if force needed, play it directly
    if (!currentAnimation || currentAnimation === targetAnimation || returningToGround) {
      const action = actions[targetAnimation];
      if (action) {
        action.reset().play();
        setCurrentAnimation(targetAnimation);
      }
      return;
    }
    
    // Crossfade to new animation
    const prevAction = actions[currentAnimation];
    const nextAction = actions[targetAnimation];
    
    if (prevAction && nextAction) {
      // Start new animation
      nextAction.reset().play();
      
      // Faster transitions from airborne to grounded animations
      const transitionTime = !isGrounded || targetAnimation === 'FALL' ? 0.1 : 0.3;
      
      // Crossfade with the previous animation
      prevAction.crossFadeTo(nextAction, transitionTime, true);
      
      setCurrentAnimation(targetAnimation);
    }
    
  }, [actions, isMoving, isSprinting, isGrounded, currentAnimation]);
  
  return <primitive ref={group} object={scene} />;
}