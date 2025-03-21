import React from 'react';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, Ray } from 'three';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { useCharacterControls } from '../hooks/useCharacterControls';
import { calculateMovement, createJumpImpulse, createMovementVelocity } from '../utils/physics';
import { useMobileControls } from '../contexts/MobileControlsContext';
import { CharacterModel } from './CharacterModel';

export type CharacterState = {
  moveSpeed: number;
  jumpForce: number;
  airControl: number;
  isGrounded: boolean;
  velocity: { x: number; y: number; z: number };
};

export const CharacterController = React.forwardRef<any>((_, ref) => {
  const rigidBody = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const { isJumping: isMobileJumping, movement: mobileMovement } = useMobileControls();
  const [, getKeys] = useKeyboardControls();
  const [isSprinting, setIsSprinting] = useState(false);
  const prevPosition = useRef(new Vector3());
  const [isMoving, setIsMoving] = useState(false);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const groundRay = useRef(new Ray(new Vector3(), new Vector3(0, -1, 0)));
  const [state, setState] = useState<CharacterState>({
    moveSpeed: 0,
    jumpForce: 0,
    airControl: 0,
    isGrounded: false,
    velocity: { x: 0, y: 0, z: 0 },
  });

  const controls = useCharacterControls();

  useFrame(() => {
    if (!rigidBody.current) return;

    // Get current translation and velocity
    const translation = rigidBody.current.translation();
    const linvel = rigidBody.current.linvel();
    
    // Simplified ground detection - just check if we're close to the ground
    // and have minimal vertical velocity
    const height = translation.y;
    const verticalVelocity = Math.abs(linvel.y);
    
    // Consider grounded if close to a surface and not moving quickly upward
    const isGrounded = height < 1.8 && verticalVelocity < 3;
    
    const input = getKeys();
    const shouldJump = input.jump || isMobileJumping;
    const currentPos = new Vector3(
      translation.x,
      translation.y,
      translation.z
    );

    // Update movement state
    const horizontalSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
    setIsMoving(horizontalSpeed > 0.5);
    setIsSprinting(input.sprint && horizontalSpeed > 0.5);

    // Update rotation based on velocity
    if (Math.abs(linvel.x) > 0.1 || Math.abs(linvel.z) > 0.1) {
      targetRotation.current = Math.atan2(linvel.x, linvel.z);
      
      // Normalize angle difference to ensure shortest rotation path
      let angleDiff = targetRotation.current - currentRotation.current;
      if (angleDiff > Math.PI) {
        angleDiff -= Math.PI * 2;
      } else if (angleDiff < -Math.PI) {
        angleDiff += Math.PI * 2;
      }
      targetRotation.current = currentRotation.current + angleDiff;
    }
    
    // Smooth rotation
    if (modelRef.current) {
      currentRotation.current = MathUtils.lerp(
        currentRotation.current,
        targetRotation.current,
        0.2
      );
      modelRef.current.rotation.y = currentRotation.current;
    }

    // Handle movement
    const movement = {
      forward: input.forward || false,
      backward: input.backward || false,
      left: input.left || false,
      right: input.right || false,
      sprint: input.sprint || false
    };
    
    // Override keyboard movement with mobile joystick if active
    if (Math.abs(mobileMovement.x) > 0 || Math.abs(mobileMovement.y) > 0) {
      movement.forward = mobileMovement.y < 0;
      movement.backward = mobileMovement.y > 0;
      movement.left = mobileMovement.x < 0;
      movement.right = mobileMovement.x > 0;
    }
    
    const calculatedMovement = calculateMovement(movement, controls.moveSpeed);
    
    if (calculatedMovement) {
      const sprintMultiplier = calculatedMovement.sprint ? controls.sprintMultiplier : 1;
      const moveForce = controls.moveSpeed * (isGrounded ? 1 : controls.airControl);
      let velocity = createMovementVelocity(
        calculatedMovement.normalizedX,
        calculatedMovement.normalizedZ,
        moveForce * sprintMultiplier,
        linvel.y
      );
      
      // Smooth out the velocity changes
      if (isGrounded) {
        const smoothing = 0.25;
        velocity.x = velocity.x * smoothing + linvel.x * (1 - smoothing);
        velocity.z = velocity.z * smoothing + linvel.z * (1 - smoothing);
      }

      rigidBody.current.setLinvel(velocity, true);
    }

    // Handle jumping
    if (shouldJump && isGrounded) {
      // Reset vertical velocity before jumping
      rigidBody.current.setLinvel(
        { x: linvel.x, y: 0, z: linvel.z },
        true
      );
      rigidBody.current.applyImpulse(
        createJumpImpulse(controls.jumpForce, { y: linvel.y }),
        true
      );
    }
    
    // Store position for next frame
    if (isGrounded) {
      prevPosition.current.copy(currentPos);
    }

    setState({ 
      moveSpeed: controls.moveSpeed, 
      jumpForce: controls.jumpForce, 
      airControl: controls.airControl, 
      isGrounded, 
      velocity: linvel 
    });
  });

  // Update ref for camera
  React.useImperativeHandle(ref, () => ({
    position: {
      clone: () => {
        const translation = rigidBody.current?.translation();
        return new Vector3(
          translation?.x || 0,
          translation?.y || 0,
          translation?.z || 0
        );
      }
    }
  }), [rigidBody.current]);

  return (
    <RigidBody
      ref={rigidBody}
      colliders={false}
      mass={10}
      position={[0, 8, 10]}
      enabledRotations={[false, false, false]}
      lockRotations
      gravityScale={3}
      friction={controls.friction}
      linearDamping={controls.linearDamping}
      angularDamping={controls.angularDamping}
      restitution={0}
      ccd={true}
      type="dynamic"
      userData={{ isPlayer: true }}
    >
      <CapsuleCollider args={[0.8, 0.6]} position={[0, 1.4, 0]} />
      <group ref={modelRef} position={[0, -0.8, 0]} scale={1.5}>
        <CharacterModel 
          isMoving={isMoving} 
          isSprinting={isSprinting} 
          isGrounded={state.isGrounded} 
        />
      </group>
    </RigidBody>
  );
});