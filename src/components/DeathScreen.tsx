import React, { useEffect, useRef } from 'react';
import { useHealth } from '../contexts/HealthContext';

export const DeathScreen: React.FC = () => {
  const { isPlayerDead, score, resetHealth, resetScore } = useHealth();
  const deathSoundRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    // Create the audio element for death sound
    deathSoundRef.current = new Audio('/sounds/death.mp3');
    deathSoundRef.current.volume = 0.7;
    
    return () => {
      // Clean up
      if (deathSoundRef.current) {
        deathSoundRef.current.pause();
        deathSoundRef.current = null;
      }
      hasPlayedSound.current = false;
    };
  }, []);
  
  // Play death sound when the player dies
  useEffect(() => {
    if (isPlayerDead && deathSoundRef.current && !hasPlayedSound.current) {
      deathSoundRef.current.currentTime = 0;
      deathSoundRef.current.play().catch(e => console.log("Error playing death sound:", e));
      hasPlayedSound.current = true;
    }
  }, [isPlayerDead]);

  const handleRespawn = () => {
    resetHealth();
    // Don't reset score on respawn
    hasPlayedSound.current = false;
  };

  const handleTitleScreen = () => {
    resetHealth();
    resetScore();
    // In a real game we'd redirect to title screen here
    // For now just respawn
    hasPlayedSound.current = false;
  };

  if (!isPlayerDead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="text-white font-mono text-center">
        <h1 className="text-6xl mb-8 pixel-font">You Died!</h1>
        <p className="text-3xl mb-12 text-yellow-400">Score: {score}</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleRespawn}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 w-64 mx-auto text-2xl"
          >
            Respawn
          </button>
          
          <button 
            onClick={handleTitleScreen}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 w-64 mx-auto text-2xl"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}; 