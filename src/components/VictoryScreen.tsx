import React, { useEffect, useRef } from 'react';
import { useHealth } from '../contexts/HealthContext';

export const VictoryScreen: React.FC = () => {
  const { isVictory, score, resetHealth, resetGameState } = useHealth();
  const victorySoundRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    // Create the audio element for victory sound
    victorySoundRef.current = new Audio('/sounds/victory.mp3');
    victorySoundRef.current.volume = 0.7;
    
    return () => {
      // Clean up
      if (victorySoundRef.current) {
        victorySoundRef.current.pause();
        victorySoundRef.current = null;
      }
      hasPlayedSound.current = false;
    };
  }, []);
  
  // Play victory sound when the player wins
  useEffect(() => {
    if (isVictory && victorySoundRef.current && !hasPlayedSound.current) {
      victorySoundRef.current.currentTime = 0;
      victorySoundRef.current.play().catch(e => console.log("Error playing victory sound:", e));
      hasPlayedSound.current = true;
    }
  }, [isVictory]);

  const handlePlayAgain = () => {
    resetHealth();
    // Keep the score when playing again
    hasPlayedSound.current = false;
  };

  const handleNewGame = () => {
    resetGameState();
    // Reset everything for a fresh start
    hasPlayedSound.current = false;
  };

  if (!isVictory) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
      <div className="text-white font-mono text-center">
        <h1 className="text-6xl mb-4 text-yellow-400 pixel-font">VICTORY!</h1>
        <h2 className="text-4xl mb-8 text-blue-300">Automaton Defeated</h2>
        <p className="text-3xl mb-6 text-yellow-400">Score: {score}</p>
        <p className="text-xl mb-12">You've proven your worth in battle!</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={handlePlayAgain}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 px-6 w-64 mx-auto text-2xl"
          >
            Play Again
          </button>
          
          <button 
            onClick={handleNewGame}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 w-64 mx-auto text-2xl"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}; 