import React, { useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { KeyboardControls, Environment, useTexture } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Bolt } from 'lucide-react';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration, 
  Vignette, 
  SMAA, 
  BrightnessContrast,
  HueSaturation,
  DepthOfField
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { CharacterController } from './components/CharacterController';
import { Ground } from './components/Ground';
// import { Balls } from './components/Balls'; - Import removed as component is no longer used
import { FollowCamera } from './components/FollowCamera';
import { useCharacterControls } from './hooks/useCharacterControls';
import { useCameraControls } from './hooks/useCameraControls';
import { useLightingControls } from './hooks/useLightingControls';
import { usePostProcessingControls } from './hooks/usePostProcessingControls';
import { Leva } from 'leva';
import { MobileControlsProvider } from './contexts/MobileControlsContext';
import { MobileControls } from './components/MobileControls';
import { EtherealAutomaton } from './components/EtherealAutomaton';
import { HealthBarsWrapper } from './components/HealthBarsWrapper';
import { CombatManager } from './components/CombatManager';
import { DeathScreen } from './components/DeathScreen';

function DynamicDepthOfField({ 
  enabled, 
  target, 
  focalLength, 
  bokehScale 
}: { 
  enabled: boolean; 
  target: React.RefObject<any>; 
  focalLength: number; 
  bokehScale: number;
}) {
  const { camera } = useThree();
  const [focusDistance, setFocusDistance] = React.useState(0);
  
  useFrame(() => {
    if (!enabled || !target.current) return;
    // Calculate distance from camera to character
    const distance = camera.position.distanceTo(target.current.position.clone());
    // Convert world distance to normalized focus distance (0-1 range)
    setFocusDistance(Math.min(distance / 20, 1));
  });

  return enabled ? (
    <DepthOfField
      focusDistance={focusDistance}
      focalLength={focalLength}
      bokehScale={bokehScale}
      height={1080}
    />
  ) : null;
}

function App() {
  // Order matters for GUI - call lighting controls last
  const characterControls = useCharacterControls();
  const cameraControls = useCameraControls();
  const lighting = useLightingControls();
  const postProcessing = usePostProcessingControls();

  // References for combat system
  const characterRef = useRef(null);
  const automatonRef = useRef(null);

  // Create postprocessing effects array
  const renderPostProcessingEffects = () => {
    const effects = [];
    
    if (postProcessing.depthOfFieldEnabled) {
      effects.push(
        <DynamicDepthOfField
          key="dof"
          enabled={postProcessing.depthOfFieldEnabled}
          target={characterRef}
          focalLength={postProcessing.focalLength}
          bokehScale={postProcessing.bokehScale}
        />
      );
    }
    
    if (postProcessing.bloomEnabled) {
      effects.push(
        <Bloom
          key="bloom" 
          intensity={postProcessing.bloomIntensity} 
        />
      );
    }
    
    if (postProcessing.chromaticAberrationEnabled) {
      effects.push(
        <ChromaticAberration
          key="ca"
          offset={new Vector2(postProcessing.chromaticAberrationOffset, postProcessing.chromaticAberrationOffset)}
          radialModulation={true}
          modulationOffset={0.5}
        />
      );
    }
    
    if (postProcessing.vignetteEnabled) {
      effects.push(
        <Vignette
          key="vignette"
          offset={postProcessing.vignetteOffset}
          darkness={postProcessing.vignetteDarkness}
          blendFunction={BlendFunction.NORMAL}
        />
      );
    }
    
    if (postProcessing.brightnessContrastEnabled) {
      effects.push(
        <BrightnessContrast
          key="bc"
          brightness={postProcessing.brightness}
          contrast={postProcessing.contrast}
        />
      );
    }
    
    if (postProcessing.hueSaturationEnabled) {
      effects.push(
        <HueSaturation
          key="hs"
          hue={postProcessing.hue}
          saturation={postProcessing.saturation}
        />
      );
    }
    
    effects.push(<SMAA key="smaa" />);
    
    return effects;
  };

  return (
    <div className="w-full h-screen">
      <Bolt className="fixed top-4 right-4 w-6 h-6 text-white opacity-50" />
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-white font-mono text-sm pointer-events-none select-none bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm z-50">
        WASD to move | SPACE to jump | SHIFT to run | F to attack (hold for charged attack)
      </div>
      <Leva collapsed />
      <HealthBarsWrapper>
        <DeathScreen />
        <MobileControlsProvider>
          <MobileControls />
          <KeyboardControls
            map={[
              { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
              { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
              { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
              { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
              { name: 'jump', keys: ['Space'] },
              { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
              { name: 'attack', keys: ['f', 'F'] },
            ]}
          >
            <Canvas shadows>
            <Environment
              preset="night"
              background
              blur={0.5}
              resolution={256}
            />
            <fog attach="fog" args={['#05071a', 15, 80]} />
            <ambientLight intensity={lighting.ambientIntensity * 0.5} color="#6080FF" />
            <directionalLight
              castShadow
              position={[lighting.directionalDistance, lighting.directionalHeight, lighting.directionalDistance / 2]}
              intensity={lighting.directionalIntensity * 0.7}
              shadow-mapSize={[4096, 4096]}
              shadow-camera-left={-30}
              shadow-camera-right={30}
              shadow-camera-top={30}
              shadow-camera-bottom={-30}
              shadow-camera-far={50}
              shadow-bias={-0.0001}
              shadow-normalBias={0.02}
            />
            <pointLight
              position={[0, 10, 0]}
              intensity={2}
              color="#80A0FF"
              distance={40}
              castShadow
            />
            <Physics 
              interpolate={false}
            >
              <CharacterController ref={characterRef} />
              <Ground />
              <EtherealAutomaton 
                ref={automatonRef}
                position={[0, 2, 0]} 
                target={characterRef}
                scale={1.5}
              />
              <CombatManager 
                playerRef={characterRef}
                automatonRef={automatonRef}
              />
            </Physics>
            <FollowCamera target={characterRef} />
            <EffectComposer>
              {renderPostProcessingEffects()}
            </EffectComposer>
            </Canvas>
          </KeyboardControls>
        </MobileControlsProvider>
      </HealthBarsWrapper>
    </div>
  );
}
export default App;
