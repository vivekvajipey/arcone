{boxes.map((box, index) => (
    <RigidBody
      key={index}
      type="fixed"
      position={box.position}
      colliders="cuboid"
      friction={0.1}
      restitution={0}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={box.size} />
        <meshStandardMaterial
          map={platformTexture}
          side={DoubleSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </RigidBody>
  ))}