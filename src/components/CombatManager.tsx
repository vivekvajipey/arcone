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
  const { damagePlayer, damageAutomaton, isPlayerDead } = useHealth();
  const lastCollisionCheck = useRef(0);
  const collisionCooldown = 200; // ms between collision checks
  
  // Check for collisions between player and automaton
  useFrame(() => {
    // Don't check collisions if player is dead
    if (isPlayerDead) return;
    
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
    // Don't process combat if player is dead
    if (isPlayerDead) return;
    
    // Set a cooldown for damage to prevent rapid hits
    if (!playerRef.current.userData?.lastDamageTime || 
        Date.now() - playerRef.current.userData.lastDamageTime > 1000) {
      
      // Apply damage to player - increases as game progresses
      const baseDamage = 15;
      const timeMultiplier = Math.min(2, 1 + Date.now() % 60000 / 60000); // Gradually increase damage over time
      const finalDamage = Math.floor(baseDamage * timeMultiplier);
      
      // Apply damage to player
      damagePlayer(finalDamage);
      
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