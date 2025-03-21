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

  const damagePlayer = (amount: number) => {
    setPlayerHealth((prev) => Math.max(0, prev - amount));
  };

  const damageAutomaton = (amount: number) => {
    setAutomatonHealth((prev) => Math.max(0, prev - amount));
  };

  const healPlayer = (amount: number) => {
    setPlayerHealth((prev) => Math.min(playerMaxHealth, prev + amount));
  };

  const healAutomaton = (amount: number) => {
    setAutomatonHealth((prev) => Math.min(automatonMaxHealth, prev + amount));
  };

  const resetHealth = () => {
    setPlayerHealth(playerMaxHealth);
    setAutomatonHealth(automatonMaxHealth);
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