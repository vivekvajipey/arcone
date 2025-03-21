import React, { useEffect, useRef } from 'react';
import { useRapier } from '@react-three/rapier';
import { useHealth } from '../contexts/HealthContext';
import { useFrame } from '@react-three/fiber';

type CombatManagerProps = {
  playerRef: React.RefObject<any>;
  automatonRef: React.RefObject<any>;
};

export const CombatManager: React.FC<CombatManagerProps> = ({
  playerRef,
  automatonRef,
}) => {
  const { damagePlayer, damageAutomaton } = useHealth();
  const lastCollisionCheck = useRef(0);
  const collisionCooldown = 200; // ms between collision checks
  
  // Check for collisions between player and automaton
  useFrame(() => {
    const now = Date.now();
    
    // Limit how often we check for collisions
    if (now - lastCollisionCheck.current < collisionCooldown) return;
    lastCollisionCheck.current = now;
    
    if (!playerRef.current || !automatonRef.current) return;
    
    // Get positions
    const playerPosition = playerRef.current.position?.clone?.();
    const automatonPosition = automatonRef.current.translation?.();
    
    if (!playerPosition || !automatonPosition) return;
    
    // Calculate distance between player and automaton
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - automatonPosition.x, 2) +
      Math.pow(playerPosition.y - automatonPosition.y, 2) +
      Math.pow(playerPosition.z - automatonPosition.z, 2)
    );
    
    // If they're close enough, consider it a collision
    const collisionThreshold = 2.5; // Adjust based on character sizes
    if (distance < collisionThreshold) {
      handleCombat();
    }
  });
  
  const handleCombat = () => {
    // Set a cooldown for damage to prevent rapid hits
    if (!playerRef.current.userData?.lastDamageTime || 
        Date.now() - playerRef.current.userData.lastDamageTime > 1000) {
      
      // Apply damage to player
      damagePlayer(10);
      
      // Set the last damage time for cooldown
      if (playerRef.current) {
        playerRef.current.userData = {
          ...playerRef.current.userData,
          lastDamageTime: Date.now()
        };
      }
    }
    
    // Check if player is attacking (you might want to implement attack button later)
    const isPlayerAttacking = false; // Replace with actual attack detection
    
    if (isPlayerAttacking && 
        (!automatonRef.current.userData?.lastDamageTime || 
         Date.now() - automatonRef.current.userData.lastDamageTime > 500)) {
         
      // Apply damage to automaton when player attacks
      damageAutomaton(20);
      
      // Set the last damage time for cooldown
      if (automatonRef.current) {
        automatonRef.current.userData = {
          ...automatonRef.current.userData,
          lastDamageTime: Date.now()
        };
      }
    }
  };
  
  // This component doesn't render anything
  return null;
}; 