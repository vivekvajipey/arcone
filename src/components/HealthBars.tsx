import React from 'react';
import { useHealth } from '../contexts/HealthContext';
import { HealthBar } from './HealthBar';

export const HealthBars: React.FC = () => {
  const { 
    playerHealth, 
    playerMaxHealth, 
    automatonHealth, 
    automatonMaxHealth 
  } = useHealth();

  return (
    <>
      {/* Player health bar at bottom */}
      <HealthBar 
        current={playerHealth}
        max={playerMaxHealth}
        position="bottom"
        label="Player"
        size="normal"
      />
      
      {/* Automaton health bar at top (Dark Souls style) */}
      <HealthBar 
        current={automatonHealth}
        max={automatonMaxHealth}
        position="top"
        label="Ethereal Automaton"
        size="normal"
        darkSouls={true}
      />
    </>
  );
}; 