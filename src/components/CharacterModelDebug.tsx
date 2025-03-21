import { useGLTF, Box, Text } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { BoxGeometry, MeshBasicMaterial, Mesh } from 'three';

export function CharacterModelDebug() {
  const [debugInfo, setDebugInfo] = useState<string>('Loading model...');
  const [debugColor, setDebugColor] = useState<string>('yellow');
  
  const { scene, animations } = useGLTF('/models/character.glb', true);
  
  useEffect(() => {
    if (!scene) {
      setDebugInfo('Error: No scene loaded');
      setDebugColor('red');
      return;
    }
    
    // Count meshes
    let meshCount = 0;
    let materialCount = 0;
    let boneCount = 0;
    let namesList: string[] = [];
    
    scene.traverse((child) => {
      if (child.name) {
        namesList.push(child.name);
      }
      
      if (child.type === 'Mesh') {
        meshCount++;
      }
      
      if ('material' in child) {
        materialCount++;
      }
      
      if (child.type === 'Bone') {
        boneCount++;
      }
    });
    
    // Create debug info
    const info = [
      `Scene loaded: ${scene ? 'Yes' : 'No'}`,
      `Animations: ${animations.length}`,
      `Animation names: ${animations.map(a => a.name).join(', ')}`,
      `Meshes: ${meshCount}`,
      `Materials: ${materialCount}`,
      `Bones: ${boneCount}`,
      `Names: ${namesList.slice(0, 5).join(', ')}${namesList.length > 5 ? '...' : ''}`
    ].join('\n');
    
    setDebugInfo(info);
    setDebugColor('green');
    
    // Create a debug box to show the model's size and position
    const box = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const debugBox = new Mesh(box, material);
    
    // Add the debug box to the scene
    scene.add(debugBox);
    
  }, [scene, animations]);
  
  return (
    <>
      <Box args={[1, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="blue" wireframe />
      </Box>
      
      <Text
        position={[0, 2, 0]}
        color={debugColor}
        fontSize={0.2}
        maxWidth={5}
        lineHeight={1.5}
        textAlign="left"
        anchorY="top"
      >
        {debugInfo}
      </Text>
    </>
  );
} 