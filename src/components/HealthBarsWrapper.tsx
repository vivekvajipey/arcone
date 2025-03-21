import React from 'react';
import { HealthProvider } from '../contexts/HealthContext';
import { HealthBars } from './HealthBars';

type HealthBarsWrapperProps = {
  children: React.ReactNode;
  initialPlayerHealth?: number;
  initialAutomatonHealth?: number;
};

export const HealthBarsWrapper: React.FC<HealthBarsWrapperProps> = ({
  children,
  initialPlayerHealth = 100,
  initialAutomatonHealth = 500,
}) => {
  return (
    <HealthProvider
      initialPlayerHealth={initialPlayerHealth}
      initialAutomatonHealth={initialAutomatonHealth}
    >
      <HealthBars />
      {children}
    </HealthProvider>
  );
}; 