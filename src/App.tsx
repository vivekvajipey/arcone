import React from 'react';
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

const characterRef = { current: null };

function DynamicDepthOfField({ enabled, target, focalLength, bokehScale }) {
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

  return (
    <div className="w-full h-screen">
      <Bolt className="fixed top-4 right-4 w-6 h-6 text-white opacity-50" />
      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-white font-mono text-sm pointer-events-none select-none bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm z-50">
        WASD to move | SPACE to jump | SHIFT to run
      </div>
      <Leva collapsed />
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
            positionIterations={5}
            velocityIterations={4}
          >
            <CharacterController ref={characterRef} />
            <Ground />
            <EtherealAutomaton 
              position={[0, 1, 0]} 
              target={characterRef}
              scale={3}
            />
            {/* <Balls /> - Removed blue spheres from startup, component still available in src/components/Balls.tsx */}
          </Physics>
          <FollowCamera target={characterRef} />
          <EffectComposer>
            <DynamicDepthOfField
              enabled={postProcessing.depthOfFieldEnabled}
              target={characterRef}
              focalLength={postProcessing.focalLength}
              bokehScale={postProcessing.bokehScale}
            />
            {postProcessing.bloomEnabled && (
              <Bloom 
                intensity={postProcessing.bloomIntensity} 
              />
            )}
            {postProcessing.chromaticAberrationEnabled && (
              <ChromaticAberration
                offset={[postProcessing.chromaticAberrationOffset, postProcessing.chromaticAberrationOffset]}
                radialModulation={true}
                modulationOffset={0.5}
              />
            )}
            {postProcessing.vignetteEnabled && (
              <Vignette
                offset={postProcessing.vignetteOffset}
                darkness={postProcessing.vignetteDarkness}
                blendFunction={BlendFunction.NORMAL}
              />
            )}
            {postProcessing.brightnessContrastEnabled && (
              <BrightnessContrast
                brightness={postProcessing.brightness}
                contrast={postProcessing.contrast}
              />
            )}
            {postProcessing.hueSaturationEnabled && (
              <HueSaturation
                hue={postProcessing.hue}
                saturation={postProcessing.saturation}
              />
            )}
            <SMAA />
          </EffectComposer>
          </Canvas>
        </KeyboardControls>
      </MobileControlsProvider>
    </div>
  );
}
export default App;
