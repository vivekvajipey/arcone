import { useGLTF, useAnimations } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { Group } from 'three';

type CharacterModelProps = {
  isMoving: boolean;
  isSprinting: boolean;
  isGrounded: boolean;
  isAttacking?: boolean;
  isCharging?: boolean;
  chargeLevel?: number;
};

export function CharacterModel({ 
  isMoving, 
  isSprinting, 
  isGrounded, 
  isAttacking = false,
  isCharging = false,
  chargeLevel = 0
}: CharacterModelProps) {
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
    
    // Attack animations take priority
    if (isAttacking) {
      targetAnimation = chargeLevel > 0.5 ? 'ATTACK_HEAVY' : 'ATTACK';
    }
    // Then check if character is in air
    else if (!isGrounded) {
      targetAnimation = 'FALL';
    }
    // Then check movement state
    else if (isMoving) {
      targetAnimation = isSprinting ? 'RUN' : 'WALK'; // Use WALK when not sprinting
    }
    else if (isCharging) {
      targetAnimation = 'CHARGE'; // Charging up attack
    }
    
    // Fall back to appropriate animations if specific ones aren't available
    if ((targetAnimation === 'ATTACK' || targetAnimation === 'ATTACK_HEAVY') && !actions[targetAnimation]) {
      // If attack animation isn't available, use RUN as fallback
      targetAnimation = 'RUN';
      // Make run animation faster to simulate attack motion
      if (actions['RUN']) {
        actions['RUN'].timeScale = 1.5;
      }
    }
    
    if (targetAnimation === 'CHARGE' && !actions['CHARGE']) {
      // If charge animation isn't available, use IDLE with special handling
      targetAnimation = 'IDLE';
      // Make idle animation pulse based on charge level
      if (actions['IDLE']) {
        actions['IDLE'].timeScale = 0.5 + chargeLevel;
      }
    }
    
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
    if (!currentAnimation || currentAnimation === targetAnimation || returningToGround || isAttacking) {
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
    
  }, [actions, isMoving, isSprinting, isGrounded, isAttacking, isCharging, chargeLevel, currentAnimation]);
  
  return <primitive ref={group} object={scene} />;
}