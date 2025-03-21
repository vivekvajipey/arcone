import React from 'react';

type HealthBarProps = {
  current: number;
  max: number;
  position?: 'top' | 'bottom';
  label?: string;
  size?: 'small' | 'normal' | 'large';
  darkSouls?: boolean;
};

export const HealthBar: React.FC<HealthBarProps> = ({
  current,
  max,
  position = 'bottom',
  label,
  size = 'normal',
  darkSouls = false,
}) => {
  const healthPercentage = (current / max) * 100;
  
  // Visual effect delay for dark souls style health bars (delayed health reduction)
  const [delayedHealth, setDelayedHealth] = React.useState(healthPercentage);
  
  React.useEffect(() => {
    // If health decreased, set a timeout to gradually decrease the delayed health
    if (healthPercentage < delayedHealth) {
      const timeout = setTimeout(() => {
        setDelayedHealth(prev => Math.max(healthPercentage, prev - 1));
      }, 30);
      
      return () => clearTimeout(timeout);
    } else {
      // If health increased, update immediately
      setDelayedHealth(healthPercentage);
    }
  }, [healthPercentage, delayedHealth]);
  
  // Determine size
  const getHeightClass = () => {
    switch (size) {
      case 'small': return 'h-2';
      case 'large': return 'h-6';
      default: return 'h-4';
    }
  };
  
  const positionClass = position === 'top' 
    ? 'top-4' 
    : 'bottom-8';
  
  const heightClass = getHeightClass();
  
  // Health color based on percentage
  const getHealthColor = (percent: number) => {
    if (percent > 60) return darkSouls ? '#b71c1c' : '#22c55e'; // Green or dark red
    if (percent > 30) return darkSouls ? '#e65100' : '#eab308'; // Yellow or orange
    return darkSouls ? '#ff9800' : '#ef4444'; // Red or yellow-orange
  };

  // Styles for the Dark Souls bar
  const darkSoulsStyle = darkSouls ? {
    boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
    border: '1px solid #631515',
    borderRadius: '4px'
  } : {};

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 w-80 ${positionClass} z-50`}>
      {label && (
        <div className="text-white text-sm font-semibold mb-1 text-center">
          {label}
        </div>
      )}
      <div className={`w-full ${heightClass} bg-gray-900 rounded-md overflow-hidden border border-gray-700 relative`} style={darkSoulsStyle}>
        {darkSouls && (
          // Delayed health bar (dark souls style - shows red remaining health that slowly depletes)
          <div 
            className={`${heightClass} absolute top-0 left-0 transition-all duration-100 ease-linear`}
            style={{ 
              width: `${delayedHealth}%`, 
              backgroundColor: '#701010',
              opacity: 0.7
            }}
          />
        )}
        <div 
          className={`${heightClass} absolute top-0 left-0 transition-all duration-200 ease-out`}
          style={{ 
            width: `${healthPercentage}%`,
            backgroundColor: getHealthColor(healthPercentage)
          }}
        />
      </div>
      {darkSouls && (
        <div className="flex justify-between text-white text-xs mt-1">
          <span>{current}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}; 