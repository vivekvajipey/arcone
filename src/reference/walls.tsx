{/* Visible walls */}
<RigidBody type="fixed" colliders="cuboid">
{/* North Wall */}
<mesh position={[0, 0.5, -groundSize/2]} castShadow receiveShadow>
  <boxGeometry args={[groundSize, wallHeight, wallThickness]} />
  <meshStandardMaterial 
    map={wallTexture}
    roughness={0.8}
    metalness={0.2}
    side={DoubleSide}
  />
</mesh>
{/* South Wall */}
<mesh position={[0, 0.5, groundSize/2]} castShadow receiveShadow>
  <boxGeometry args={[groundSize, wallHeight, wallThickness]} />
  <meshStandardMaterial 
    map={wallTexture}
    roughness={0.8}
    metalness={0.2}
    side={DoubleSide}
  />
</mesh>
{/* East Wall */}
<mesh position={[groundSize/2, 0.5, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
  <boxGeometry args={[groundSize, wallHeight, wallThickness]} />
  <meshStandardMaterial 
    map={wallTexture}
    roughness={0.8}
    metalness={0.2}
    side={DoubleSide}
  />
</mesh>
{/* West Wall */}
<mesh position={[-groundSize/2, 0.5, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
  <boxGeometry args={[groundSize, wallHeight, wallThickness]} />
  <meshStandardMaterial 
    map={wallTexture}
    roughness={0.8}
    metalness={0.2}
    side={DoubleSide}
  />
</mesh>
