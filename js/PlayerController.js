/**
 * PlayerController - Handles Cat Quest-style player movement and input
 * Implements the exact movement feel of Cat Quest
 */
class PlayerController {
    constructor(sprite, camera) {
        this.sprite = sprite;
        this.camera = camera;
        
        // Movement properties (tuned to match Cat Quest)
        this.moveSpeed = 3.75;
        this.acceleration = 15.0;
        this.deceleration = 10.0;
        
        // Current movement state
        this.velocity = new THREE.Vector3();
        this.targetVelocity = new THREE.Vector3();
        this.isMoving = false;
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            attack: false,
            dash: false
        };
        
        // Animation state
        this.currentAnimation = 'idle';
        this.lastDirection = new THREE.Vector3(0, 0, 1);
        
        // Combat system reference (will be set later)
        this.combatSystem = null;
        
        // Dust particle system reference
        this.dustParticleSystem = null;
        
        // Footstep properties
        this.footstepTimer = 0;
        this.footstepInterval = 0.15; // seconds between footsteps
        this.lastFootPosition = new THREE.Vector3();
        this.minFootstepDistance = 0.5; // minimum distance to spawn footstep
        
        // Dash properties
        this.isDashing = false;
        this.dashDuration = 0.2; // seconds
        this.dashTimer = 0;
        this.dashCooldown = 3.0; // seconds between dashes (increased from 0.5)
        this.dashCooldownTimer = 0;
        this.dashMultiplier = 3.0; // dash speed relative to moveSpeed
        this.dashDirection = new THREE.Vector3();
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Setup attack completion callback
        if (this.sprite.setOnAttackComplete) {
            this.sprite.setOnAttackComplete(() => {
                // Reset animation state before updating
                if (this.sprite.resetAnimationState) {
                    this.sprite.resetAnimationState();
                }
                // Return to appropriate animation after attack
                this.updateAnimation();
            });
        }
        
        // Setup hurt completion callback
        if (this.sprite.setOnHurtComplete) {
            this.sprite.setOnHurtComplete(() => {
                // Reset animation state before updating
                if (this.sprite.resetAnimationState) {
                    this.sprite.resetAnimationState();
                }
                // Return to appropriate animation after hurt
                this.updateAnimation();
            });
        }
    }
    
    /**
     * Setup keyboard input handlers
     */
    setupInputHandlers() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                event.preventDefault(); // Prevent page scroll
                if (!this.keys.attack) {
                    this.keys.attack = true;
                    this.triggerAttack();
                }
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                if (!this.keys.dash) {
                    this.keys.dash = true;
                    this.triggerDash();
                }
                break;
        }
    }
    
    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.attack = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.dash = false;
                break;
        }
    }
    
    /**
     * Update player movement and animation
     */
    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.updateAnimation();
    }
    
    /**
     * Update movement based on input
     */
    updateMovement(deltaTime) {
        // Handle dash first
        if (this.isDashing) {
            const dashSpeed = this.moveSpeed * this.dashMultiplier;
            const movement = this.dashDirection.clone().multiplyScalar(dashSpeed * deltaTime);
            this.sprite.position.add(movement);
            // keep on ground level
            this.sprite.position.y = 0.7;

            this.dashTimer -= deltaTime;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldownTimer = this.dashCooldown;
                
                // Spawn dust puff at landing position
                if (this.dustParticleSystem) {
                    // Pass opposite of dash direction for dust to spray backwards
                    const oppositeDir = this.dashDirection.clone().negate();
                    this.dustParticleSystem.spawnDustPuff(this.sprite.position, oppositeDir, 10);
                }
                
                // Reset animation state
                if (this.sprite.resetAnimationState) {
                    this.sprite.resetAnimationState();
                }
            }

            // Dash overrides regular movement
            return;
        }

        // Update cooldown timer when not dashing
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }

        // Calculate movement direction based on camera orientation
        const moveDirection = new THREE.Vector3();
        
        if (this.keys.forward) {
            const forward = this.camera.getForwardDirection();
            moveDirection.add(forward);
        }
        if (this.keys.backward) {
            const forward = this.camera.getForwardDirection();
            moveDirection.sub(forward);
        }
        if (this.keys.left) {
            const right = this.camera.getRightDirection();
            moveDirection.sub(right);
        }
        if (this.keys.right) {
            const right = this.camera.getRightDirection();
            moveDirection.add(right);
        }
        
        // Normalize diagonal movement
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            this.lastDirection.copy(moveDirection);
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
        
        // Calculate target velocity
        this.targetVelocity.copy(moveDirection).multiplyScalar(this.moveSpeed);
        
        // Smooth acceleration/deceleration (Cat Quest has smooth movement)
        const lerpSpeed = this.isMoving ? this.acceleration : this.deceleration;
        this.velocity.lerp(this.targetVelocity, lerpSpeed * deltaTime);
        
        // Apply movement to sprite position
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        this.sprite.position.add(movement);
        
        // Handle footstep dust while moving
        if (this.isMoving && this.velocity.length() > 1.0 && this.dustParticleSystem) {
            this.footstepTimer += deltaTime;
            
            // Check if enough time passed AND we've moved enough distance
            const distanceMoved = this.sprite.position.distanceTo(this.lastFootPosition);
            
            if (this.footstepTimer >= this.footstepInterval && distanceMoved >= this.minFootstepDistance) {
                // Spawn smaller dust puff at foot position
                const footPos = this.sprite.position.clone();
                footPos.y = 0.05; // Ground level
                
                // Smaller puff, opposite to movement direction
                const moveDir = this.velocity.clone().normalize().multiplyScalar(-0.5);
                this.dustParticleSystem.spawnDustPuff(footPos, moveDir, 3); // Only 3 particles per step
                
                // Reset timer and position
                this.footstepTimer = 0;
                this.lastFootPosition.copy(this.sprite.position);
            }
        } else {
            // Reset when not moving
            this.footstepTimer = 0;
            this.lastFootPosition.copy(this.sprite.position);
        }
        
        // Keep sprite on ground level
        this.sprite.position.y = 0.7; // Adjusted height so feet are on ground
        
        // Ensure sprite base Y is updated for proper billboarding
        if (this.sprite.setBaseY) {
            this.sprite.setBaseY(0.7);
        }
    }
    
    /**
     * Update animation based on movement state
     */
    updateAnimation() {
        // Use dash animation if currently dashing
        if (this.isDashing) {
            // Animation handled in triggerDash(), skip further updates
            return;
        }
        
        // Safety check: if sprite is stuck in attack state but not actually attacking
        if (this.sprite.currentState === 'attack' && !this.sprite.isAttacking && this.sprite.resetAnimationState) {
            console.log('Fixing stuck attack animation');
            this.sprite.resetAnimationState();
        }
        
        // Check if sprite has the new animation system (CharacterSprite)
        if (this.sprite.setMovementAnimation) {
            // Use the new CharacterSprite animation system
            this.sprite.setMovementAnimation(this.isMoving, this.lastDirection);
        }
        
        // Update animation state (no bobbing)
        if (this.isMoving) {
            if (this.currentAnimation !== 'walk') {
                this.currentAnimation = 'walk';
            }
        } else {
            if (this.currentAnimation !== 'idle') {
                this.currentAnimation = 'idle';
            }
        }
    }
    
    /**
     * Get player position
     */
    getPosition() {
        return this.sprite.position;
    }
    
    /**
     * Set player position
     */
    setPosition(x, y, z) {
        this.sprite.position.set(x, y, z);
    }
    
    /**
     * Get movement speed
     */
    getMoveSpeed() {
        return this.moveSpeed;
    }
    
    /**
     * Set movement speed
     */
    setMoveSpeed(speed) {
        this.moveSpeed = speed;
    }
    
    /**
     * Check if player is moving
     */
    getIsMoving() {
        return this.isMoving;
    }
    
    /**
     * Get current velocity
     */
    getVelocity() {
        return this.velocity.clone();
    }
    
    /**
     * Get last movement direction
     */
    getLastDirection() {
        return this.lastDirection.clone();
    }
    
    /**
     * Trigger attack animation
     */
    triggerAttack() {
        // Check if combat system allows attack (cooldown check)
        if (this.combatSystem && !this.combatSystem.canAttack()) {
            console.log('Attack blocked - on cooldown');
            return false;
        }
        
        // Check if sprite has attack capability
        if (this.sprite.attack) {
            const success = this.sprite.attack();
            if (success) {
                console.log('Attack triggered!');
                
                // Trigger combat system attack
                if (this.combatSystem) {
                    this.combatSystem.triggerAttack();
                }
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Set combat system reference
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
    }
    
    /**
     * Set dust particle system reference
     */
    setDustParticleSystem(dustParticleSystem) {
        this.dustParticleSystem = dustParticleSystem;
    }
    
    /**
     * Trigger dash movement
     */
    triggerDash() {
        // Cannot dash while attacking, hurt, or already dashing, or on cooldown
        if (this.isDashing || this.dashCooldownTimer > 0) return false;

        // Determine dash direction: if currently moving use that; else use last facing
        const dir = new THREE.Vector3();
        if (this.isMoving) {
            dir.copy(this.lastDirection);
        } else {
            dir.copy(this.lastDirection);
        }
        if (dir.lengthSq() === 0) {
            // default forward (down)
            dir.set(0, 0, 1);
        }
        dir.normalize();

        this.dashDirection.copy(dir);
        this.isDashing = true;
        this.dashTimer = this.dashDuration;

        // Try to set dash animation if available
        if (this.sprite.setAnimation) {
            // Determine cardinal direction string
            let dashDirStr = 'down';
            const absX = Math.abs(dir.x);
            const absZ = Math.abs(dir.z);
            if (absX > absZ) {
                dashDirStr = dir.x > 0 ? 'right' : 'left';
            } else {
                dashDirStr = dir.z > 0 ? 'down' : 'up';
            }
            this.sprite.setAnimation('dash', dashDirStr, true);
        }

        return true;
    }
} 