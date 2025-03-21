import React, { createContext, useContext, useState, ReactNode } from 'react';

type HealthContextType = {
  playerHealth: number;
  playerMaxHealth: number;
  automatonHealth: number;
  automatonMaxHealth: number;
  damagePlayer: (amount: number) => void;
  damageAutomaton: (amount: number) => void;
  healPlayer: (amount: number) => void;
  healAutomaton: (amount: number) => void;
  resetHealth: () => void;
  isPlayerDead: boolean;
  isVictory: boolean;
  score: number;
  incrementScore: (points: number) => void;
  resetScore: () => void;
  resetGameState: () => void;
};

const HealthContext = createContext<HealthContextType | null>(null);

type HealthProviderProps = {
  children: ReactNode;
  initialPlayerHealth?: number;
  initialAutomatonHealth?: number;
};

export const HealthProvider: React.FC<HealthProviderProps> = ({
  children,
  initialPlayerHealth = 100,
  initialAutomatonHealth = 500,
}) => {
  const [playerHealth, setPlayerHealth] = useState(initialPlayerHealth);
  const [playerMaxHealth] = useState(initialPlayerHealth);
  const [automatonHealth, setAutomatonHealth] = useState(initialAutomatonHealth);
  const [automatonMaxHealth] = useState(initialAutomatonHealth);
  const [isPlayerDead, setIsPlayerDead] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [score, setScore] = useState(0);

  const damagePlayer = (amount: number) => {
    if (isVictory) return; // Don't take damage after victory
    
    setPlayerHealth((prev) => {
      const newHealth = Math.max(0, prev - amount);
      if (newHealth === 0) {
        setIsPlayerDead(true);
      }
      return newHealth;
    });
  };

  const damageAutomaton = (amount: number) => {
    if (isPlayerDead) return; // Don't deal damage if player is dead
    
    setAutomatonHealth((prev) => {
      const newHealth = Math.max(0, prev - amount);
      // Give player points when they damage the automaton
      if (amount > 0) {
        incrementScore(Math.ceil(amount));
      }
      
      // Check for victory
      if (newHealth === 0 && prev > 0) {
        setIsVictory(true);
        // Add victory bonus points
        incrementScore(500);
      }
      
      return newHealth;
    });
  };

  const healPlayer = (amount: number) => {
    setPlayerHealth((prev) => Math.min(playerMaxHealth, prev + amount));
    if (isPlayerDead && amount > 0) {
      setIsPlayerDead(false);
    }
  };

  const healAutomaton = (amount: number) => {
    setAutomatonHealth((prev) => Math.min(automatonMaxHealth, prev + amount));
    if (isVictory && amount > 0) {
      setIsVictory(false);
    }
  };

  const resetHealth = () => {
    setPlayerHealth(playerMaxHealth);
    setAutomatonHealth(automatonMaxHealth);
    setIsPlayerDead(false);
    setIsVictory(false);
  };

  const incrementScore = (points: number) => {
    setScore(prev => prev + points);
  };

  const resetScore = () => {
    setScore(0);
  };
  
  const resetGameState = () => {
    resetHealth();
    resetScore();
  };

  return (
    <HealthContext.Provider
      value={{
        playerHealth,
        playerMaxHealth,
        automatonHealth,
        automatonMaxHealth,
        damagePlayer,
        damageAutomaton,
        healPlayer,
        healAutomaton,
        resetHealth,
        isPlayerDead,
        isVictory,
        score,
        incrementScore,
        resetScore,
        resetGameState,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}; 