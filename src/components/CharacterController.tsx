import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, Ray } from 'three';
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { useCharacterControls } from '../hooks/useCharacterControls';
import { calculateMovement, createJumpImpulse, createMovementVelocity } from '../utils/physics';
import { useMobileControls } from '../contexts/MobileControlsContext';
import { CharacterModel } from './CharacterModel';
import { useHealth } from '../contexts/HealthContext';

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
  const { rapier, world } = useRapier();
  const { isJumping: isMobileJumping, movement: mobileMovement } = useMobileControls();
  const [, getKeys] = useKeyboardControls();
  const [isSprinting, setIsSprinting] = useState(false);
  const prevPosition = useRef(new Vector3());
  const [isMoving, setIsMoving] = useState(false);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const groundRay = useRef(new Ray(new Vector3(), new Vector3(0, -1, 0)));
  const { damageAutomaton, playerHealth } = useHealth();
  
  // Combat state
  const [isAttacking, setIsAttacking] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const attackStartTime = useRef(0);
  const attackCooldown = 0.5; // Time between attacks in seconds
  const lastAttackTime = useRef(0);
  const attackRadius = 2.5; // Attack radius in units
  const attackDamage = 15; // Base attack damage
  const maxChargeTime = 1.5; // Time to reach max charge (seconds)
  const maxChargeDamageMultiplier = 3; // Multiplier for fully charged attacks
  
  // Attack effect state
  const [showAttackEffect, setShowAttackEffect] = useState(false);
  const attackEffectTimeout = useRef<number | null>(null);
  
  // Damage effect state
  const [isDamaged, setIsDamaged] = useState(false);
  const damageEffectTimeout = useRef<number | null>(null);
  
  const [state, setState] = useState<CharacterState>({
    moveSpeed: 0,
    jumpForce: 0,
    airControl: 0,
    isGrounded: false,
    velocity: { x: 0, y: 0, z: 0 },
  });

  const controls = useCharacterControls();
  
  // Get health context to monitor damage
  const prevHealthRef = useRef(playerHealth);
  
  // Function to perform a melee attack
  const performAttack = (charged: boolean = false) => {
    if (!rigidBody.current) return;
    
    const now = performance.now() / 1000; // Convert to seconds
    
    // Check cooldown
    if (now - lastAttackTime.current < attackCooldown) return;
    
    const translation = rigidBody.current.translation();
    
    // Calculate attack direction (forward direction of character)
    const attackDirection = new Vector3(
      Math.sin(currentRotation.current),
      0,
      Math.cos(currentRotation.current)
    ).normalize();
    
    // Calculate actual damage based on charge level
    const chargeFactor = charged ? chargeLevel : 0;
    const finalDamage = attackDamage * (1 + chargeFactor * (maxChargeDamageMultiplier - 1));
    const finalRadius = attackRadius * (1 + chargeFactor * 0.5); // Larger radius for charged attacks
    
    console.log(`Player performs ${charged ? `charged (${Math.floor(chargeLevel * 100)}%)` : 'quick'} attack! Damage: ${finalDamage.toFixed(1)}`);
    
    // Get all rigid bodies in the world for hit detection
    if (world) {
      let hitSomething = false;
      
      world.bodies.forEach(body => {
        // Skip player's own body
        if (body === rigidBody.current) return;
        
        // Check if this is the automaton
        const userData = body.userData as any;
        if (userData?.isAutomaton) {
          // Get automaton position
          const bodyPos = body.translation();
          
          // Calculate vector from player to automaton
          const playerPos = new Vector3(translation.x, translation.y, translation.z);
          const automatonPos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
          
          // Calculate distance
          const distance = playerPos.distanceTo(automatonPos);
          
          // Check if automaton is in front of player (dot product with attack direction)
          const toAutomaton = automatonPos.clone().sub(playerPos).normalize();
          const facingFactor = attackDirection.dot(toAutomaton);
          
          // If automaton is in attack range and in front of player
          if (distance < finalRadius && facingFactor > 0.3) {
            console.log(`Hit automaton! Distance: ${distance.toFixed(2)}, Facing: ${facingFactor.toFixed(2)}`);
            
            // Apply damage
            damageAutomaton(finalDamage);
            hitSomething = true;
            
            // Apply "knockback" by moving player slightly back
            if (charged && chargeLevel > 0.5) {
              const knockbackForce = -2 * chargeLevel; // Negative to move back
              const newPos = {
                x: translation.x + attackDirection.x * knockbackForce,
                y: translation.y,
                z: translation.z + attackDirection.z * knockbackForce
              };
              rigidBody.current.setTranslation(newPos, true);
            }
          }
        }
      });
      
      // Show attack effect
      setShowAttackEffect(true);
      
      // Clear previous timeout if exists
      if (attackEffectTimeout.current) {
        clearTimeout(attackEffectTimeout.current);
      }
      
      // Hide attack effect after 200ms
      attackEffectTimeout.current = setTimeout(() => {
        setShowAttackEffect(false);
      }, charged ? 300 : 200);
      
      // Update last attack time
      lastAttackTime.current = now;
      
      // Reset charge
      setChargeLevel(0);
      setIsCharging(false);
    }
  };
  
  // Start charging attack
  const startCharging = () => {
    if (isCharging) return;
    
    setIsCharging(true);
    attackStartTime.current = performance.now() / 1000;
    setChargeLevel(0);
  };
  
  // Release charged attack
  const releaseChargedAttack = () => {
    if (!isCharging) return;
    
    performAttack(true);
  };

  // Handle damage effect
  useEffect(() => {
    // If health decreased, show damage effect
    if (playerHealth < prevHealthRef.current) {
      // Clear any existing timeout
      if (damageEffectTimeout.current) {
        window.clearTimeout(damageEffectTimeout.current);
      }
      
      // Set damage effect
      setIsDamaged(true);
      
      // Clear damage effect after 300ms
      damageEffectTimeout.current = window.setTimeout(() => {
        setIsDamaged(false);
        damageEffectTimeout.current = null;
      }, 300);
    }
    
    // Update previous health reference
    prevHealthRef.current = playerHealth;
  }, [playerHealth]);

  useFrame(() => {
    if (!rigidBody.current) return;

    // Get current translation and velocity
    const translation = rigidBody.current.translation();
    const linvel = rigidBody.current.linvel();
    
    // Cast a simple ray for ground detection
    const rayLength = 1.5;
    const rayDir = { x: 0, y: -1, z: 0 };
    
    let isGrounded = false;
    let groundY = 0;
    
    const ray = new rapier.Ray(
      { x: translation.x, y: translation.y, z: translation.z },
      rayDir
    );
    
    const hit = world.castRay(
      ray,
      rayLength,
      true, // Solid = true to detect the ground plane
      undefined,
      undefined,
      undefined,
      rigidBody.current
    );
    
    if (hit) {
      // Cast to any to access properties not in type definition
      const hitResult = hit as any;
      const hitDistance = hitResult.toi;
      isGrounded = hitDistance < 1.5;
      
      // Get ground height
      if (hitResult.point) {
        groundY = hitResult.point.y;
      }
    }
    
    // Fallback to simplified height check if ray cast fails
    if (!isGrounded) {
      isGrounded = translation.y < 1.0 && Math.abs(linvel.y) < 3;
    }
    
    const input = getKeys();
    const shouldJump = input.jump || isMobileJumping;
    const shouldAttack = input.attack;
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
    
    // Handle attack
    if (shouldAttack) {
      if (!isCharging) {
        startCharging();
      } else {
        // Update charge level
        const chargeTime = (performance.now() / 1000) - attackStartTime.current;
        const newChargeLevel = Math.min(chargeTime / maxChargeTime, 1.0);
        setChargeLevel(newChargeLevel);
      }
    } else if (isCharging) {
      // Release charged attack when button is released
      releaseChargedAttack();
    }
    
    // Simple ground snapping when grounded and not jumping
    if (isGrounded && hit && !shouldJump && Math.abs(linvel.y) < 2) {
      const hitResult = hit as any;
      if (hitResult.point) {
        // Calculate target Y with offset for proper foot placement
        const targetY = hitResult.point.y + 1.2;
        
        // Only adjust Y, keeping X and Z movement free
        rigidBody.current.setTranslation(
          { x: translation.x, y: targetY, z: translation.z },
          true
        );
      }
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
    <>
      <RigidBody
        ref={rigidBody}
        colliders={false}
        mass={10}
        position={[0, 3, 10]}
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
        <group ref={modelRef} position={[0, -1.15, 0]} scale={1.5}>
          <CharacterModel 
            isMoving={isMoving} 
            isSprinting={isSprinting} 
            isGrounded={state.isGrounded}
            isAttacking={showAttackEffect}
            isCharging={isCharging}
            chargeLevel={chargeLevel}
            isDamaged={isDamaged}
          />
        </group>
      </RigidBody>
      
      {/* Attack visualization/effect */}
      {showAttackEffect && (
        <mesh
          position={[
            rigidBody.current.translation().x + Math.sin(currentRotation.current) * 1.5,
            rigidBody.current.translation().y + 1,
            rigidBody.current.translation().z + Math.cos(currentRotation.current) * 1.5
          ]}
          rotation={[0, currentRotation.current, 0]}
        >
          <coneGeometry args={[isCharging && chargeLevel > 0.5 ? 1.5 : 1, 3, 16]} />
          <meshStandardMaterial 
            color={isCharging && chargeLevel > 0.5 ? "#ff3300" : "#4488ff"} 
            emissive={isCharging && chargeLevel > 0.5 ? "#ff3300" : "#4488ff"}
            emissiveIntensity={3} 
            transparent={true} 
            opacity={0.6} 
          />
        </mesh>
      )}
      
      {/* Charge indicator */}
      {isCharging && (
        <mesh
          position={[
            rigidBody.current.translation().x,
            rigidBody.current.translation().y + 3,
            rigidBody.current.translation().z
          ]}
        >
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial color="#ffffff" />
          <mesh position={[0, 0, 0.01]} rotation={[0, 0, Math.PI * (-0.5 + chargeLevel)]}>
            <ringGeometry args={[0.6, 0.8, 32, 1, 0, Math.PI * 2 * chargeLevel]} />
            <meshBasicMaterial
              color={
                chargeLevel < 0.3 ? "#44ff44" :
                chargeLevel < 0.7 ? "#ffff00" :
                "#ff4400"
              }
            />
          </mesh>
        </mesh>
      )}
    </>
  );
});