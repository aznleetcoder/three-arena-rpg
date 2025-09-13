/**
 * Enemy - Enemy character that walks around the scene
 * Uses billboarding technique like the player
 */
class Enemy extends BillboardSprite {
    constructor(walkTexture, attackTextures, hitTexture, deathTexture, width = 5.2, height = 5.2, frameWidth = 200, frameHeight = 200, fps = 16) {
        super(walkTexture, width, height);
        
        this.walkTexture = walkTexture;
        // Array of attack sprite sheets (multiple attack variations)
        this.attackTextures = attackTextures; // [tex1, tex2, tex3]
        // Pre-compute attack frames for each sheet based on width / frameWidth
        this.attackFramesList = this.attackTextures.map(tex => {
            if (tex && tex.image) {
                return Math.floor(tex.image.width / frameWidth);
            }
            return 1;
        });
        // Index of the current attack variant being used
        this.currentAttackIndex = 0;
        this.hitTexture = hitTexture;
        this.deathTexture = deathTexture;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.fps = fps;
        this.frameTime = 1 / fps;
        
        // Animation state
        this.currentFrame = 0;
        this.elapsedTime = 0;
        // Calculate total frames based on texture width
        this.totalFrames = walkTexture && walkTexture.image ? 
            Math.floor(walkTexture.image.width / frameWidth) : 8;
        this.isPlaying = true;
        this.currentAnimation = 'walk'; // 'walk', 'attack', 'hit', or 'death'
        
        // Movement properties
        this.moveSpeed = 2.0; // Slower than player
        this.currentDirection = 1; // 1 = right, -1 = left
        this.movementTimer = 0;
        this.changeDirectionInterval = 3.0; // Change direction every 3 seconds
        
        // Patrol properties
        this.patrolCenter = new THREE.Vector3();
        this.patrolRadius = 5.0;
        this.patrolAngle = Math.random() * Math.PI * 2; // Random starting angle

        // === NEW AI STATE SYSTEM ===
        // AI States
        this.AIState = {
            PATROL: 'patrol',
            CHASE: 'chase', 
            SEARCH: 'search',
            ATTACK: 'attack',
            STUNNED: 'stunned',
            RETURN: 'return'
        };
        
        // Current AI state
        this.currentState = this.AIState.PATROL;
        
        // Detection properties
        this.detectionRange = 8.0; // Units - how far enemy can detect player
        this.loseTargetRange = 12.0; // Units - lose target if player gets this far
        this.visionAngle = 120; // Degrees - field of view
        this.detectionTimer = 0; // Timer for detection checks
        this.detectionInterval = 0.2; // Check for player every 0.2 seconds
        
        // Chase properties
        this.chaseSpeed = 2.5; // Faster when chasing
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.hasSeenPlayer = false;
        
        // Search properties
        this.searchTimer = 0;
        this.searchDuration = 5.0; // Search for 5 seconds before returning to patrol
        this.searchRadius = 3.0; // How far to search around last known position
        this.searchAngle = 0; // Current search direction
        
        // Return properties
        this.returnSpeed = 1.5; // Speed when returning to patrol area
        this.returnTolerance = 1.0; // How close to get to patrol center before resuming patrol
        
        // Health/combat properties
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.isDead = false;
        
        // Create health bar
        this.healthBar = new HealthBar(0.675, 0.081); // Height increased by 20% (0.0675 * 1.2)
        this.healthBar.position.y = 1.3; // Position above enemy (shifted up by another 0.3)
        this.add(this.healthBar);
        this.healthBar.setHealth(this.health, this.maxHealth, false); // Don't show on initial creation
        
        // Store reference to manage UI scene placement later
        this.healthBarNeedsUIScene = true;
        
        // Attack properties
        this.attackRange = 2.0; // Range to start attacking
        this.attackDamage = 1;
        this.attackCooldown = 0;
        this.attackCooldownDuration = 2.0; // 2 seconds between attacks
        this.isAttacking = false;
        this.attackFrames = 9; // 1800x200 = 9 frames for attack
        this.target = null; // Reference to player
        this.combatSystem = null; // Reference to combat system
        
        // Telegraph system
        this.telegraphManager = null; // Will be set by game
        this.currentTelegraph = null;
        this.telegraphCreated = false; // Track if telegraph has been created for current attack
        
        // Fireball system
        this.fireballManager = null; // Will be set by game
        
        // === Visual Feedback Constants ===
        // Visual feedback colour when enemy takes damage (soft red tint)
        this.hurtFlashColor = 0xff8e8e;
        
        // Hit properties
        this.isHit = false;
        // Calculate hit frames based on texture width
        this.hitFrames = this.hitTexture && this.hitTexture.image ?
            Math.floor(this.hitTexture.image.width / this.frameWidth) : 3;
        this.hitAnimationSpeed = 24; // Faster animation for hit reaction (doubled from 12)
        
        // Death properties
        // Determine frame count from texture width (assuming 200px frame width)
        this.deathFrames = this.deathTexture && this.deathTexture.image ?
            Math.floor(this.deathTexture.image.width / this.frameWidth) : 10;
        this.deathAnimationSpeed = 20;
        this.deathAnimationComplete = false;
        this.deathFadeFrames = 3; // number of frames at end of death animation to fade out
        
        // Knockback properties
        this.isKnockedBack = false;
        this.knockbackTimer = 0;
        this.knockbackDuration = 0.3; // seconds
        this.knockbackDistance = 0.6; // units - reduced for subtler effect
        this.knockbackOrigin = new THREE.Vector3();
        this.knockbackTarget = new THREE.Vector3();
        
        // Scale punch properties
        this.scalePunchTimer = 0;
        this.scalePunchDuration = 0.2; // seconds
        this.originalScale = new THREE.Vector3(1, 1, 1);
        this.maxScalePunch = 1.2;
        
        // Setup UV coordinates for first frame
        this.setupUVCoordinates();
    }
    
    /**
     * Setup UV coordinates for sprite sheet animation
     */
    setupUVCoordinates() {
        // The sprite sheet is 1600x200 (8 frames of 200x200) for walk
        // or 1800x200 (9 frames of 200x200) for attack
        this.updateUVCoordinates();
    }
    
    /**
     * Set the target (player) for this enemy
     */
    setTarget(target) {
        this.target = target;
    }
    
    /**
     * Set the combat system reference
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
    }
    
    /**
     * Set telegraph manager for attack warnings
     */
    setTelegraphManager(telegraphManager) {
        this.telegraphManager = telegraphManager;
    }
    
    /**
     * Set fireball manager for fireball attacks
     */
    setFireballManager(fireballManager) {
        this.fireballManager = fireballManager;
    }
    
    /**
     * Switch between walk, attack, hit, and death animations
     */
    switchAnimation(animationType) {
        if (this.currentAnimation === animationType) return;
        if (this.currentAnimation === 'death') return; // Don't switch if dying
        
        this.currentAnimation = animationType;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        
        if (animationType === 'attack') {
            // Pick a random attack variant each time
            this.currentAttackIndex = Math.floor(Math.random() * this.attackTextures.length);
            this.material.map = this.attackTextures[this.currentAttackIndex];
            this.totalFrames = this.attackFramesList[this.currentAttackIndex];
            this.isAttacking = true;
            this.isHit = false;
            this.frameTime = 1 / this.fps;
            
            // Telegraph will be created later in the attack animation (not immediately)
            this.telegraphCreated = false;
        } else if (animationType === 'hit') {
            this.material.map = this.hitTexture;
            // Recalculate hit frames in case texture wasn't loaded during construction
            this.hitFrames = this.hitTexture && this.hitTexture.image ?
                Math.floor(this.hitTexture.image.width / this.frameWidth) : this.hitFrames;
            this.totalFrames = this.hitFrames;
            this.isAttacking = false;
            this.isHit = true;
            this.frameTime = 1 / this.hitAnimationSpeed; // Faster animation
            this.telegraphCreated = false; // Reset telegraph flag when hit
        } else if (animationType === 'death') {
            console.log('Switching to death animation, texture:', this.deathTexture);
            this.material.map = this.deathTexture;
            // Recalculate in case different enemy types have different widths
            this.deathFrames = this.deathTexture && this.deathTexture.image ?
                Math.floor(this.deathTexture.image.width / this.frameWidth) : this.deathFrames;
            this.totalFrames = this.deathFrames;
            this.isAttacking = false;
            this.isHit = false;
            this.frameTime = 1 / this.deathAnimationSpeed;
            this.deathAnimationComplete = false;
            this.telegraphCreated = false; // Reset telegraph flag when dying
            // Reset opacity to fully visible at start of death
            if (this.material) this.material.opacity = 1.0;
            console.log(`Death animation setup - Frames: ${this.totalFrames}, FrameTime: ${this.frameTime}`);
        } else {
            this.material.map = this.walkTexture;
            // Recalculate walk frames based on texture width
            this.totalFrames = this.walkTexture && this.walkTexture.image ? 
                Math.floor(this.walkTexture.image.width / this.frameWidth) : 8;
            this.isAttacking = false;
            this.isHit = false;
            this.frameTime = 1 / this.fps;
            this.telegraphCreated = false; // Reset telegraph flag when leaving attack
        }
        
        this.material.needsUpdate = true;
        this.updateUVCoordinates();
    }
    
    /**
     * Update UV coordinates for current frame
     */
    updateUVCoordinates() {
        let framesX;
        if (this.currentAnimation === 'attack') {
            framesX = this.attackFramesList[this.currentAttackIndex] || 1;
        } else if (this.currentAnimation === 'hit') {
            framesX = this.hitFrames; // Use calculated hit frames
        } else if (this.currentAnimation === 'death') {
            framesX = this.deathFrames;
        } else {
            // Use calculated walk frames
            framesX = this.walkTexture && this.walkTexture.image ? 
                Math.floor(this.walkTexture.image.width / this.frameWidth) : 8;
        }
        const frameX = this.currentFrame % framesX;
        
        // Debug logging for death animation
        if (this.currentAnimation === 'death') {
            console.log(`Death UV update - Frame: ${frameX}/${framesX}, CurrentFrame: ${this.currentFrame}`);
        }
        
        let uLeft = frameX / framesX;
        let uRight = (frameX + 1) / framesX;
        const vTop = 0;
        const vBottom = 1;
        
        // Flip horizontally if moving left
        if (this.currentDirection === -1) {
            // Swap left and right UVs to flip the sprite
            const temp = uLeft;
            uLeft = uRight;
            uRight = temp;
        }
        
        // Update geometry UV coordinates
        const uvAttribute = this.geometry.attributes.uv;
        if (!uvAttribute) return;
        
        const uvArray = uvAttribute.array;
        
        // Update UV coordinates for the plane geometry
        uvArray[0] = uLeft;  uvArray[1] = vBottom;
        uvArray[2] = uRight; uvArray[3] = vBottom;
        uvArray[4] = uLeft;  uvArray[5] = vTop;
        uvArray[6] = uRight; uvArray[7] = vTop;
        
        uvAttribute.needsUpdate = true;
    }
    
    /**
     * Set patrol center and radius
     */
    setPatrolArea(center, radius) {
        this.patrolCenter.copy(center);
        this.patrolRadius = radius;
        // Position enemy at patrol center initially
        this.position.copy(center);
        this.position.y = 0.7; // Adjusted height
        this.setBaseY(0.7);
    }
    
    /**
     * Update enemy behavior
     */
    update(deltaTime, camera) {
        super.update(deltaTime);
        
        // Update health bar
        if (this.healthBar) {
            this.healthBar.update(deltaTime, camera);
        }
        
        // Debug log for death state
        if (this.isDead && this.currentAnimation === 'death' && !this.deathAnimationComplete) {
            console.log(`Enemy update called while dead - deltaTime: ${deltaTime.toFixed(3)}`);
        }
        
        // Always update animation even when dead (for death animation)
        this.updateAnimation(deltaTime);
        
        // Stop other updates if dead
        if (this.isDead) return;
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // === NEW AI SYSTEM ===
        // Update AI state machine
        this.updateAI(deltaTime);
        
        // Handle attack state and attacking logic
        if (this.target && !this.isHit) {
            const distanceToTarget = this.position.distanceTo(this.target.position);
            
            // Check if should start attacking
            if (this.currentState === this.AIState.ATTACK && !this.isAttacking && this.attackCooldown <= 0) {
                // Start attack immediately and show telegraph
                this.faceTarget();
                this.switchAnimation('attack');
            }
            
            // Stop attacking if target moved away during attack
            if (this.isAttacking && distanceToTarget > this.attackRange) {
                // Switch back to appropriate state based on whether we can see player
                if (this.canSeePlayer()) {
                    this.currentState = this.AIState.CHASE;
                } else {
                    this.currentState = this.AIState.SEARCH;
                    this.searchTimer = 0;
                }
                this.switchAnimation('walk');
            }
        }
        
        // Continuously face target while attacking
        if (this.isAttacking && this.target) {
            this.faceTarget();
        }
        
        // Update movement based on AI state (only if not attacking or being hit)
        if (!this.isAttacking && !this.isHit) {
            this.updateMovementByState(deltaTime);
        }
        
        // Update knockback
        if (this.isKnockedBack) {
            this.knockbackTimer += deltaTime;
            
            if (this.knockbackTimer >= this.knockbackDuration) {
                // Knockback finished
                this.isKnockedBack = false;
                this.position.copy(this.knockbackOrigin);
            } else {
                // Lerp position during knockback
                const t = this.knockbackTimer / this.knockbackDuration;
                
                // Use easing curve: quick out, slow back
                let easeT;
                if (t < 0.3) {
                    // Quick knockback (first 30% of time)
                    easeT = t / 0.3 * 0.8; // Reach 80% distance quickly
                } else {
                    // Slow return (last 70% of time)
                    easeT = 0.8 + (1 - (t - 0.3) / 0.7) * 0.2; // Return from 80% to 0%
                }
                
                // Interpolate between origin and target, then back
                if (easeT <= 1) {
                    this.position.lerpVectors(this.knockbackOrigin, this.knockbackTarget, easeT);
                } else {
                    this.position.lerpVectors(this.knockbackTarget, this.knockbackOrigin, easeT - 1);
                }
            }
        }
        
        // Update scale punch
        if (this.scalePunchTimer > 0) {
            this.scalePunchTimer -= deltaTime;
            
            if (this.scalePunchTimer <= 0) {
                // Reset scale
                this.scale.set(1, 1, 1);
            } else {
                // Calculate scale with easing
                const t = 1 - (this.scalePunchTimer / this.scalePunchDuration);
                let scaleMultiplier;
                
                if (t < 0.3) {
                    // Scale up quickly
                    scaleMultiplier = 1 + (this.maxScalePunch - 1) * (t / 0.3);
                } else {
                    // Scale down back to normal
                    scaleMultiplier = this.maxScalePunch - (this.maxScalePunch - 1) * ((t - 0.3) / 0.7);
                }
                
                this.scale.set(scaleMultiplier, scaleMultiplier, 1);
            }
        }
    }
    
    /**
     * Update animation frames
     */
    updateAnimation(deltaTime) {
        // Always animate if dead (for death animation) or if playing
        if ((this.isDead || this.isPlaying) && this.totalFrames > 1) {
            this.elapsedTime += deltaTime;
            
            // Debug logging for death animation timing
            if (this.currentAnimation === 'death' && this.currentFrame === 0) {
                console.log(`Death animation timing - Elapsed: ${this.elapsedTime.toFixed(3)}, FrameTime: ${this.frameTime}, DeltaTime: ${deltaTime.toFixed(3)}`);
            }
            
            if (this.elapsedTime >= this.frameTime) {
                this.elapsedTime = 0;
                
                // Debug logging for death animation
                if (this.currentAnimation === 'death') {
                    console.log(`Death animation frame update triggered - Current Frame: ${this.currentFrame}/${this.totalFrames}`);
                }
                
                if (this.currentAnimation === 'attack') {
                    // Handle attack animation
                    this.currentFrame++;
                    
                    // Create telegraph 2-3 frames before damage (better warning timing)
                    const damageFrame = Math.floor(this.totalFrames / 2);
                    const telegraphFrame = Math.max(1, damageFrame - 2); // 2 frames before damage
                    
                    if (this.currentFrame === telegraphFrame && !this.telegraphCreated) {
                        // Skip telegraph creation for fireball casters (they have their own fireball telegraphs)
                        if (!this.isFireballCaster) {
                            this.createAttackTelegraph();
                        }
                        this.telegraphCreated = true;
                        console.log(`Telegraph created on frame ${this.currentFrame}, damage on frame ${damageFrame}`);
                    }
                    
                    // Deal damage on the middle frame
                    if (this.currentFrame === damageFrame && this.target) {
                        const distanceToTarget = this.position.distanceTo(this.target.position);
                        
                        // Handle different attack types based on enemy type
                        if (this.isFireballCaster && this.fireballManager) {
                            // Fireball attack for enemy_5
                            console.log('Enemy_5 casts fireball!');
                            
                            // Launch fireball at random location around player instead of directly at them
                            const baseTargetPos = this.target.position.clone();
                            
                            // Add random offset around the player (within a 3-unit radius)
                            const randomAngle = Math.random() * Math.PI * 2; // Random direction
                            const randomDistance = Math.random() * 3.0; // Random distance up to 3 units
                            
                            const randomOffset = new THREE.Vector3(
                                Math.cos(randomAngle) * randomDistance,
                                0, // Keep at ground level
                                Math.sin(randomAngle) * randomDistance
                            );
                            
                            const targetPos = baseTargetPos.add(randomOffset);
                            this.fireballManager.launchFireball(targetPos);
                        } else if (distanceToTarget <= this.attackRange) {
                            // Regular melee attack for other enemies
                            console.log('Enemy attacks player!');
                            
                            // Trigger hurt animation on player
                            if (this.target.hurt) {
                                const success = this.target.hurt(this.position);
                                if (success) {
                                    console.log('Player hurt animation triggered!');
                                    
                                    // Deal damage through combat system
                                    if (this.combatSystem && this.combatSystem.handlePlayerDamage) {
                                        this.combatSystem.handlePlayerDamage(this.attackDamage);
                                    }
                                }
                            }
                        }
                    }
                    
                    if (this.currentFrame >= this.totalFrames) {
                        // Attack animation finished
                        this.currentFrame = 0;
                        this.attackCooldown = this.attackCooldownDuration;
                        this.removeAttackTelegraph();
                        this.switchAnimation('walk');
                        this.telegraphCreated = false; // Reset for next attack
                    }
                } else if (this.currentAnimation === 'hit') {
                    // Handle hit animation
                    this.currentFrame++;
                    
                    if (this.currentFrame >= this.totalFrames) {
                        // Hit animation finished
                        this.currentFrame = 0;
                        this.switchAnimation('walk');
                    }
                } else if (this.currentAnimation === 'death') {
                    // Handle death animation
                    this.currentFrame++;
                    console.log(`Death animation advancing to frame ${this.currentFrame}/${this.totalFrames}`);
                    
                    // Fade out during last few frames
                    const framesLeft = this.totalFrames - this.currentFrame;
                    if (framesLeft <= this.deathFadeFrames && framesLeft >= 0) {
                        const opacityFactor = framesLeft / this.deathFadeFrames;
                        if (this.material) this.material.opacity = opacityFactor;
                    }
                    
                    if (this.currentFrame >= this.totalFrames && !this.deathAnimationComplete) {
                        // Death animation finished
                        this.currentFrame = this.totalFrames - 1; // Stay on last frame
                        this.deathAnimationComplete = true;
                        console.log('Death animation complete, frame:', this.currentFrame);
                        
                        // Remove from scene after a short delay
                        setTimeout(() => {
                            if (this.parent) {
                                this.parent.remove(this);
                            }
                            this.dispose();
                            console.log('Enemy removed from scene');
                        }, 500); // Half second delay
                    }
                } else {
                    // Regular looping animation (walk)
                    this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                }
                
                // Always update UV coordinates after frame changes
                this.updateUVCoordinates();
            }
        }
    }
    
    /**
     * Update enemy movement based on current AI state
     */
    updateMovementByState(deltaTime) {
        // Skip movement if knocked back
        if (this.isKnockedBack) return;
        
        // Execute behavior based on current AI state
        switch (this.currentState) {
            case this.AIState.PATROL:
                this.patrolBehavior(deltaTime);
                break;
                
            case this.AIState.CHASE:
                this.chaseBehavior(deltaTime);
                break;
                
            case this.AIState.SEARCH:
                this.searchBehavior(deltaTime);
                break;
                
            case this.AIState.ATTACK:
                // No movement during attack - handled by attack animation
                break;
                
            case this.AIState.RETURN:
                this.returnBehavior(deltaTime);
                break;
                
            case this.AIState.STUNNED:
                // No movement when stunned
                break;
                
            default:
                // Default to patrol behavior
                this.patrolBehavior(deltaTime);
                break;
        }
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, attackerPosition = null) {
        if (this.isDead || this.isHit) return; // Don't take damage while already hit
        
        this.health -= amount;
        
        // Update health bar
        if (this.healthBar) {
            this.healthBar.setHealth(this.health, this.maxHealth);
        }
        
        // === NEW AI REACTION TO DAMAGE ===
        // When hit, immediately become aware of player and switch to chase
        if (this.target && (this.currentState === this.AIState.PATROL || this.currentState === this.AIState.SEARCH || this.currentState === this.AIState.RETURN)) {
            console.log(`Enemy hit! Switching to CHASE mode`);
            this.currentState = this.AIState.CHASE;
            this.hasSeenPlayer = true;
            this.lastKnownPlayerPosition.copy(this.target.position);
        }
        
        // Only trigger individual freeze frames if NOT during lightning strike
        if (this.combatSystem && this.combatSystem.game && this.combatSystem.game.freezeFrame) {
            // Skip individual freeze frames during lightning strikes to prevent cumulative lag
            if (!this.combatSystem.isPerformingLightningStrike || !this.combatSystem.isPerformingLightningStrike()) {
                let freezeDuration = 0.06; // 60ms additional freeze for individual enemy hits
                this.combatSystem.game.freezeFrame(freezeDuration);
            }
        }
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        } else {
            // Play hit animation
            this.switchAnimation('hit');
            
            // Apply knockback if attacker position provided
            if (attackerPosition) {
                this.applyKnockback(attackerPosition);
            }
            
            // Trigger scale punch effect
            this.scalePunchTimer = this.scalePunchDuration;
            
            // Disabled colour flash effect
            // this.flashDamage();
        }
    }
    
    /**
     * Enemy death
     */
    die() {
        if (this.isDead) return;
        
        console.log('Enemy die() called');
        
        // Only trigger death freeze frames if NOT during lightning strike
        if (this.combatSystem && this.combatSystem.game && this.combatSystem.game.freezeFrame) {
            // Skip death freeze frames during lightning strikes to prevent cumulative lag
            if (!this.combatSystem.isPerformingLightningStrike || !this.combatSystem.isPerformingLightningStrike()) {
                let freezeDuration = 0.15; // 150ms freeze for enemy death (dramatic pause)
                this.combatSystem.game.freezeFrame(freezeDuration);
            }
        }
        
        // Spawn crystals at death location
        if (this.combatSystem && this.combatSystem.enemyManager && this.combatSystem.enemyManager.crystalManager) {
            this.combatSystem.enemyManager.crystalManager.spawnCrystalsAtDeath(this.position.clone());
        }
        
        // 33% chance to drop health orb
        if (Math.random() < 0.33) {
            if (this.combatSystem && this.combatSystem.enemyManager && this.combatSystem.enemyManager.healthOrbManager) {
                console.log('Enemy dropped a health orb!');
                this.combatSystem.enemyManager.healthOrbManager.spawnHealthOrb(this.position.clone());
            }
        }
        
        this.isDead = true;
        this.isPlaying = true; // Ensure animation continues playing
        this.currentFrame = 0; // Reset frame counter
        this.elapsedTime = 0; // Reset animation timer
        this.currentAnimation = ''; // Force animation switch
        this.switchAnimation('death');
        
        // Hide health bar
        if (this.healthBar) {
            this.healthBar.visible = false;
        }
        
        console.log('Enemy death animation started, currentAnimation:', this.currentAnimation);
    }
    
    /**
     * Check if position is within attack range of a target
     */
    isInAttackRange(targetPosition, range = 1.5) {
        const distance = this.position.distanceTo(targetPosition);
        return distance <= range;
    }
    
    // Disabled flashing tint when enemy takes damage
    flashDamage() {
        // Intentionally empty – visual damage flash removed
    }
    
    /**
     * Apply knockback effect
     */
    applyKnockback(fromPosition) {
        // Calculate knockback direction (away from attacker)
        const knockbackDir = new THREE.Vector3();
        knockbackDir.subVectors(this.position, fromPosition);
        knockbackDir.y = 0; // Keep it horizontal
        knockbackDir.normalize();
        
        // Store original position
        this.knockbackOrigin.copy(this.position);
        
        // Calculate target position
        this.knockbackTarget.copy(this.position);
        this.knockbackTarget.add(knockbackDir.multiplyScalar(this.knockbackDistance));
        
        // Start knockback
        this.isKnockedBack = true;
        this.knockbackTimer = 0;
    }
    
    /**
     * Create attack telegraph during attack animation
     */
    createAttackTelegraph() {
        if (!this.telegraphManager) return;
        
        // Clean up any existing telegraph first
        this.removeAttackTelegraph();
        
        // Calculate remaining frames from current frame to end of attack
        const remainingFrames = this.totalFrames - this.currentFrame;
        const remainingDuration = remainingFrames * this.frameTime;
        
        // Telegraph duration is now shorter - only from when it appears until attack ends
        const telegraphDuration = Math.max(0.3, remainingDuration); // Minimum 0.3 seconds
        
        this.currentTelegraph = this.telegraphManager.createTelegraph(
            'melee', 
            this.position, 
            this.attackRange, 
            telegraphDuration, // Telegraph lasts from now until attack ends
            null, // direction
            this // followTarget - the telegraph will follow this enemy
        );
        
        console.log(`Enemy attack telegraph created - duration: ${telegraphDuration.toFixed(2)}s`);
    }
    
    /**
     * Remove attack telegraph
     */
    removeAttackTelegraph() {
        if (this.currentTelegraph) {
            this.currentTelegraph.cancel();
            this.currentTelegraph = null;
        }
    }
    
    /**
     * Face the target (player)
     */
    faceTarget() {
        if (!this.target) return;
        
        const toTarget = new THREE.Vector3();
        toTarget.subVectors(this.target.position, this.position);
        toTarget.y = 0; // Ignore height difference
        
        // Only update direction if there's significant movement
        if (toTarget.length() > 0.1) {
            this.currentDirection = toTarget.x > 0 ? 1 : -1;
        }
    }

    // === NEW AI BEHAVIOR METHODS ===

    /**
     * Check if enemy can see the player
     */
    canSeePlayer() {
        if (!this.target) return false;
        
        const playerPos = this.target.position;
        const distance = this.position.distanceTo(playerPos);
        
        // Check distance first
        if (distance > this.detectionRange) return false;
        
        // Calculate direction to player
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(playerPos, this.position);
        toPlayer.y = 0; // Ignore height difference
        toPlayer.normalize();
        
        // Get enemy's forward direction (based on current movement or facing)
        const forward = new THREE.Vector3();
        if (this.currentState === this.AIState.PATROL) {
            // Use patrol movement direction
            const angle = this.patrolAngle + Math.PI / 2; // Add 90 degrees for forward direction
            forward.set(Math.cos(angle), 0, Math.sin(angle));
        } else {
            // Use current facing direction
            forward.set(this.currentDirection, 0, 0);
        }
        
        // Calculate angle between forward direction and player direction
        const dot = toPlayer.dot(forward);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
        
        // Check if player is within vision cone
        return angle <= this.visionAngle / 2;
    }

    /**
     * Update AI state based on player detection and current state
     */
    updateAI(deltaTime) {
        if (this.isDead || this.isHit) return; // No AI when dead or being hit
        
        // Update detection timer
        this.detectionTimer += deltaTime;
        
        // Check for player periodically (not every frame for performance)
        if (this.detectionTimer >= this.detectionInterval) {
            this.detectionTimer = 0;
            
            const canSeePlayer = this.canSeePlayer();
            const distanceToPlayer = this.target ? this.position.distanceTo(this.target.position) : Infinity;
            
            // State transitions based on detection and current state
            switch (this.currentState) {
                case this.AIState.PATROL:
                    if (canSeePlayer) {
                        console.log(`Enemy detected player! Switching to CHASE`);
                        this.currentState = this.AIState.CHASE;
                        this.hasSeenPlayer = true;
                        this.lastKnownPlayerPosition.copy(this.target.position);
                    }
                    break;
                    
                case this.AIState.CHASE:
                    if (canSeePlayer) {
                        // Update last known position while we can see player
                        this.lastKnownPlayerPosition.copy(this.target.position);
                    } else if (distanceToPlayer > this.loseTargetRange) {
                        // Lost the player - switch to search
                        console.log(`Enemy lost player! Switching to SEARCH at last known position`);
                        this.currentState = this.AIState.SEARCH;
                        this.searchTimer = 0;
                        this.searchAngle = Math.random() * Math.PI * 2; // Random search direction
                    }
                    
                    // Check if close enough to attack
                    if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
                        this.currentState = this.AIState.ATTACK;
                    }
                    break;
                    
                case this.AIState.SEARCH:
                    if (canSeePlayer) {
                        // Found player again - back to chase
                        console.log(`Enemy found player again! Switching back to CHASE`);
                        this.currentState = this.AIState.CHASE;
                        this.lastKnownPlayerPosition.copy(this.target.position);
                    }
                    break;
                    
                case this.AIState.ATTACK:
                    // Attack state is handled by existing attack logic
                    if (distanceToPlayer > this.attackRange) {
                        // Player moved away - back to chase or search
                        if (canSeePlayer) {
                            this.currentState = this.AIState.CHASE;
                        } else {
                            this.currentState = this.AIState.SEARCH;
                            this.searchTimer = 0;
                        }
                    }
                    break;
                    
                case this.AIState.RETURN:
                    // Check if we've returned close enough to patrol center
                    const distanceToPatrolCenter = this.position.distanceTo(this.patrolCenter);
                    if (distanceToPatrolCenter <= this.returnTolerance) {
                        console.log(`Enemy returned to patrol area`);
                        this.currentState = this.AIState.PATROL;
                        // Reset patrol angle to current position
                        const dx = this.position.x - this.patrolCenter.x;
                        const dz = this.position.z - this.patrolCenter.z;
                        this.patrolAngle = Math.atan2(dz, dx);
                    } else if (canSeePlayer) {
                        // Player detected while returning - back to chase
                        this.currentState = this.AIState.CHASE;
                        this.lastKnownPlayerPosition.copy(this.target.position);
                    }
                    break;
            }
        }
    }

    /**
     * Patrol behavior - circular movement around patrol center
     */
    patrolBehavior(deltaTime) {
        // Update patrol angle
        this.patrolAngle += (this.moveSpeed * deltaTime) / this.patrolRadius;
        
        // Keep angle in 0-2PI range
        if (this.patrolAngle > Math.PI * 2) {
            this.patrolAngle -= Math.PI * 2;
        }
        
        // Calculate new position
        const newX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
        const newZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
        
        // Determine direction based on movement
        const deltaX = newX - this.position.x;
        if (Math.abs(deltaX) > 0.001) {
            this.currentDirection = deltaX > 0 ? 1 : -1;
        }
        
        // Update position
        this.position.x = newX;
        this.position.z = newZ;
    }

    /**
     * Chase behavior - move directly toward player
     */
    chaseBehavior(deltaTime) {
        if (!this.target) return;
        
        // Move toward player position
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(this.target.position, this.position);
        toPlayer.y = 0; // Keep movement horizontal
        
        if (toPlayer.length() > 0.1) {
            toPlayer.normalize();
            
            // Move toward player at chase speed
            const movement = toPlayer.multiplyScalar(this.chaseSpeed * deltaTime);
            this.position.add(movement);
            
            // Update facing direction
            this.currentDirection = toPlayer.x > 0 ? 1 : -1;
        }
    }

    /**
     * Search behavior - look around last known player position
     */
    searchBehavior(deltaTime) {
        this.searchTimer += deltaTime;
        
        if (this.searchTimer >= this.searchDuration) {
            // Search time expired - return to patrol
            console.log(`Enemy search timeout. Returning to patrol`);
            this.currentState = this.AIState.RETURN;
            return;
        }
        
        // Move in a search pattern around last known position
        this.searchAngle += (this.moveSpeed * deltaTime) / this.searchRadius;
        
        const searchX = this.lastKnownPlayerPosition.x + Math.cos(this.searchAngle) * this.searchRadius;
        const searchZ = this.lastKnownPlayerPosition.z + Math.sin(this.searchAngle) * this.searchRadius;
        
        // Move toward search position
        const toSearch = new THREE.Vector3(searchX, this.position.y, searchZ);
        toSearch.sub(this.position);
        
        if (toSearch.length() > 0.1) {
            toSearch.normalize();
            const movement = toSearch.multiplyScalar(this.moveSpeed * deltaTime);
            this.position.add(movement);
            
            // Update facing direction
            this.currentDirection = toSearch.x > 0 ? 1 : -1;
        }
    }

    /**
     * Return behavior - move back to patrol area
     */
    returnBehavior(deltaTime) {
        // Move toward patrol center
        const toPatrolCenter = new THREE.Vector3();
        toPatrolCenter.subVectors(this.patrolCenter, this.position);
        toPatrolCenter.y = 0; // Keep movement horizontal
        
        if (toPatrolCenter.length() > 0.1) {
            toPatrolCenter.normalize();
            
            // Move toward patrol center at return speed
            const movement = toPatrolCenter.multiplyScalar(this.returnSpeed * deltaTime);
            this.position.add(movement);
            
            // Update facing direction
            this.currentDirection = toPatrolCenter.x > 0 ? 1 : -1;
        }
    }

    /**
     * Get debug information about current AI state
     */
    getAIDebugInfo() {
        const playerDistance = this.target ? this.position.distanceTo(this.target.position) : 'No target';
        const canSee = this.target ? this.canSeePlayer() : false;
        
        return {
            state: this.currentState,
            canSeePlayer: canSee,
            playerDistance: playerDistance,
            hasSeenPlayer: this.hasSeenPlayer,
            searchTimer: this.searchTimer.toFixed(1),
            detectionRange: this.detectionRange,
            isAttacking: this.isAttacking,
            isHit: this.isHit
        };
    }
}

/**
 * EnemyManager - Manages all enemies in the scene
 */
class EnemyManager {
    constructor(scene, player, initialEnemyCount = 0, combatSystem = null) {
        this.scene = scene;
        this.player = player;
        this.combatSystem = combatSystem;
        this.enemies = [];
        // Array of texture sets, one per enemy type
        // Each set: { walkTexture, attackTextures, hitTexture, deathTexture }
        this.enemyTextureSets = [];
        this.initialEnemyCount = initialEnemyCount;
        
        // Load enemy textures and spawn initial enemies
        this.loadEnemyTextures(['enemy_1', 'enemy_2', 'enemy_3', 'enemy_4', 'enemy_5']).then(() => {
            if (this.initialEnemyCount > 0) {
                this.spawnEnemies(this.initialEnemyCount);
            }
        });
    }
    
    /**
     * Load enemy textures (walk and attack)
     */
    async loadEnemyTextures(folders = ['enemy_1']) {
        const loader = new THREE.TextureLoader();
        
        try {
            for (const folder of folders) {
                const textureSet = { walkTexture: null, attackTextures: [], hitTexture: null, deathTexture: null };

                // Walk / moving texture (attempt Run.png for enemy_5, then Moving.png, then Flight.png, then fallback to walk.png)
                const tryLoad = (path) => new Promise((res, rej) => {
                    loader.load(path, (tex)=> res(tex), undefined, () => rej());
                });

                try {
                    if (folder === 'enemy_5') {
                        textureSet.walkTexture = await tryLoad(`assets/sprites/enemies/${folder}/Run.png`);
                    } else {
                        textureSet.walkTexture = await tryLoad(`assets/sprites/enemies/${folder}/Moving.png`);
                    }
                } catch {
                    try {
                        textureSet.walkTexture = await tryLoad(`assets/sprites/enemies/${folder}/Flight.png`);
                    } catch {
                        try {
                            textureSet.walkTexture = await tryLoad(`assets/sprites/enemies/${folder}/Run.png`);
                        } catch {
                            try {
                                textureSet.walkTexture = await tryLoad(`assets/sprites/enemies/${folder}/walk.png`);
                            } catch (e) {
                                console.error(`Failed to load walk texture for ${folder}`);
                                throw e;
                            }
                        }
                    }
                }

                // Configure for pixel art
                textureSet.walkTexture.magFilter = THREE.NearestFilter;
                textureSet.walkTexture.minFilter = THREE.NearestFilter;
                textureSet.walkTexture.wrapS = THREE.ClampToEdgeWrapping;
                textureSet.walkTexture.wrapT = THREE.ClampToEdgeWrapping;
                
                // Load attack textures (different patterns for different enemies)
                if (folder === 'enemy_3' || folder === 'enemy_4') {
                    // enemy_3 and enemy_4 have a single Attack.png file
                    const attackTexturePromise = new Promise((resolve, reject) => {
                        loader.load(
                            `assets/sprites/enemies/${folder}/Attack.png`,
                            (texture) => {
                                // Configure texture for pixel art
                                texture.magFilter = THREE.NearestFilter;
                                texture.minFilter = THREE.NearestFilter;
                                texture.wrapS = THREE.ClampToEdgeWrapping;
                                texture.wrapT = THREE.ClampToEdgeWrapping;
                                resolve(texture);
                            },
                            undefined,
                            (error) => {
                                console.error(`Failed to load enemy attack texture: ${folder} Attack.png`, error);
                                reject(error);
                            }
                        );
                    });
                    textureSet.attackTextures.push(await attackTexturePromise);
                } else if (folder === 'enemy_5') {
                    // enemy_5 has Attack1.png for fireball casting
                    const attackTexturePromise = new Promise((resolve, reject) => {
                        loader.load(
                            `assets/sprites/enemies/${folder}/Attack1.png`,
                            (texture) => {
                                // Configure texture for pixel art
                                texture.magFilter = THREE.NearestFilter;
                                texture.minFilter = THREE.NearestFilter;
                                texture.wrapS = THREE.ClampToEdgeWrapping;
                                texture.wrapT = THREE.ClampToEdgeWrapping;
                                resolve(texture);
                            },
                            undefined,
                            (error) => {
                                console.error(`Failed to load enemy attack texture: ${folder} Attack1.png`, error);
                                reject(error);
                            }
                        );
                    });
                    textureSet.attackTextures.push(await attackTexturePromise);
                } else {
                    // enemy_1 and enemy_2 have Attack1.png, Attack2.png, Attack3.png
                    for (let i = 1; i <= 3; i++) {
                        const attackTexturePromise = new Promise((resolve, reject) => {
                    loader.load(
                                `assets/sprites/enemies/${folder}/Attack${i}.png`,
                        (texture) => {
                            // Configure texture for pixel art
                            texture.magFilter = THREE.NearestFilter;
                            texture.minFilter = THREE.NearestFilter;
                            texture.wrapS = THREE.ClampToEdgeWrapping;
                            texture.wrapT = THREE.ClampToEdgeWrapping;
                            resolve(texture);
                        },
                        undefined,
                        (error) => {
                                    console.error(`Failed to load enemy attack texture: ${folder} Attack${i}`, error);
                            reject(error);
                        }
                    );
                });
                        textureSet.attackTextures.push(await attackTexturePromise);
                    }
                }
            
            // Load hit texture (enemy_5 has "Take hit.png" with space)
                const hitTexturePath = folder === 'enemy_5' ? 
                    `assets/sprites/enemies/${folder}/Take hit.png` :
                    `assets/sprites/enemies/${folder}/Take Hit.png`;
                
                textureSet.hitTexture = await new Promise((resolve, reject) => {
                loader.load(
                        hitTexturePath,
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                            console.error(`Failed to load enemy hit texture: ${folder}`, error);
                        reject(error);
                    }
                );
            });
            
            // Load death texture
                textureSet.deathTexture = await new Promise((resolve, reject) => {
                loader.load(
                        `assets/sprites/enemies/${folder}/Death.png`,
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                            console.error(`Failed to load enemy death texture: ${folder}`, error);
                        reject(error);
                    }
                );
            });
            
                // Store texture set with metadata
                textureSet.enemyType = folder;
                if (folder === 'enemy_5') {
                    textureSet.frameSize = 250; // enemy_5 has 250x250 sprites
                } else {
                    textureSet.frameSize = (folder === 'enemy_3' || folder === 'enemy_4') ? 150 : 200;
                }
                this.enemyTextureSets.push(textureSet);
            }

            console.log(`Enemy textures loaded successfully for ${this.enemyTextureSets.length} enemy types`);
        } catch (error) {
            console.error('Error loading enemy textures:', error);
        }
    }
    
    /**
     * Spawn an enemy at a specific position
     */
    spawnEnemy(position, patrolRadius = 5) {
        // Pick a texture set: default first if none specified
        const textureSet = this.enemyTextureSets[Math.floor(Math.random() * this.enemyTextureSets.length)];

        if (!textureSet || !textureSet.walkTexture || textureSet.attackTextures.length === 0 || !textureSet.hitTexture || !textureSet.deathTexture) {
            console.warn('Enemy textures not loaded yet');
            return null;
        }
        
        // Create enemy with appropriate sprite dimensions
        const frameSize = textureSet.frameSize || 200;
        const scaleFactor = frameSize / 200; // Scale relative to the standard 200x200
        const enemySize = 5.2 * scaleFactor; // Adjust size based on sprite dimensions
        
        const enemy = new Enemy(
            textureSet.walkTexture, 
            textureSet.attackTextures, 
            textureSet.hitTexture, 
            textureSet.deathTexture, 
            enemySize, 
            enemySize, 
            frameSize, 
            frameSize, 
            8
        );
        
        // Store enemy type for special behaviors
        enemy.enemyType = textureSet.enemyType;
        
        // Special properties for enemy_3 (flying enemy)
        if (textureSet.enemyType === 'enemy_3') {
            enemy.moveSpeed = 3.0; // Faster movement for flying enemy
            enemy.attackRange = 1.0; // Short attack range (close combat)
            enemy.maxHealth = 30; // Lower health than ground enemies
            enemy.health = enemy.maxHealth;
            enemy.healthBar.setHealth(enemy.health, enemy.maxHealth, false); // Don't show on initial creation
            
            // Adjust position to be higher (flying)
            position.y = 1.5; // Flying height
            enemy.setBaseY(1.5);
        }
        
        // Special properties for enemy_4 (ground enemy with unique stats)
        if (textureSet.enemyType === 'enemy_4') {
            enemy.moveSpeed = 2.2; // Slightly slower than default
            enemy.attackRange = 1.6; // Reduced attack range (was 2.2, now 1.6)
            enemy.maxHealth = 45; // Higher health than other enemies
            enemy.health = enemy.maxHealth;
            enemy.healthBar.setHealth(enemy.health, enemy.maxHealth, false); // Don't show on initial creation
            enemy.attackDamage = 2; // Higher damage than default
            enemy.attackCooldownDuration = 2.5; // Longer cooldown between attacks
            
            // Ground enemy, normal Y position
            position.y = 0;
            enemy.setBaseY(0);
        }
        
        // Special properties for enemy_5 (fireball caster)
        if (textureSet.enemyType === 'enemy_5') {
            enemy.moveSpeed = 1.8; // Slower movement (caster enemy)
            enemy.attackRange = 8.0; // Long range for fireball casting
            enemy.maxHealth = 35; // Medium health
            enemy.health = enemy.maxHealth;
            enemy.healthBar.setHealth(enemy.health, enemy.maxHealth, false); // Don't show on initial creation
            enemy.attackDamage = 3; // High damage via fireballs
            enemy.attackCooldownDuration = 2.0; // Faster cooldown for more frequent attacks (reduced from 3.5)
            enemy.isFireballCaster = true; // Special flag for fireball attacks
            
            // Significantly increase detection and aggro ranges
            enemy.detectionRange = 15.0; // Much larger detection range (default is usually around 8)
            enemy.loseTargetRange = 18.0; // Larger range before losing target
            enemy.chaseSpeed = 2.5; // Slightly faster chase speed to close distance
            
            // Lift enemy_5 sprite slightly above ground
            position.y = 1.0;
            enemy.setBaseY(1.0);
        }
        
        enemy.setPatrolArea(position, patrolRadius);
        enemy.setCamera(this.scene.camera || this.player.camera);
        enemy.setTarget(this.player); // Set player as target
        enemy.setCombatSystem(this.combatSystem);
        enemy.setTelegraphManager(this.telegraphManager);
        enemy.setFireballManager(this.fireballManager); // Set fireball manager
        
        this.scene.add(enemy);
        this.enemies.push(enemy);
        
        return enemy;
    }
    
    /**
     * Spawn multiple enemies in the world
     */
    spawnEnemies(count = 5) {
        const spawnRadius = 30; // Increased from 20
        
        for (let i = 0; i < count; i++) {
            // Create varied spawn patterns
            let position;
            let patrolRadius;
            
            if (i < count / 3) {
                // Close enemies - smaller patrol radius, closer to player
                const angle = (i / (count / 3)) * Math.PI * 2;
                const distance = 8 + Math.random() * 7; // 8-15 units away
                position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                patrolRadius = 2 + Math.random() * 2; // 2-4 unit patrol radius
            } else if (i < (count * 2) / 3) {
                // Medium distance enemies
                const angle = (i / (count / 3)) * Math.PI * 2;
                const distance = 15 + Math.random() * 10; // 15-25 units away
                position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                patrolRadius = 3 + Math.random() * 3; // 3-6 unit patrol radius
            } else {
                // Far enemies - larger patrol radius, further from player
                const angle = (i / (count / 3)) * Math.PI * 2;
                const distance = 25 + Math.random() * spawnRadius; // 25-55 units away
                position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                patrolRadius = 4 + Math.random() * 4; // 4-8 unit patrol radius
            }
            
            this.spawnEnemy(position, patrolRadius);
        }
        
        console.log(`Spawned ${count} enemies in varied formations`);
    }
    
    /**
     * Set combat system for all enemies
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
        this.enemies.forEach(enemy => {
            enemy.setCombatSystem(combatSystem);
        });
    }
    
    /**
     * Set telegraph manager for all enemies
     */
    setTelegraphManager(telegraphManager) {
        this.telegraphManager = telegraphManager;
        this.enemies.forEach(enemy => {
            enemy.setTelegraphManager(telegraphManager);
        });
    }

    /**
     * Set fireball manager for all enemies
     */
    setFireballManager(fireballManager) {
        this.fireballManager = fireballManager;
        this.enemies.forEach(enemy => {
            enemy.setFireballManager(fireballManager);
        });
    }

    /**
     * Set crystal manager for enemy drops
     */
    setCrystalManager(crystalManager) {
        this.crystalManager = crystalManager;
    }
    
    /**
     * Set health orb manager for enemy drops
     */
    setHealthOrbManager(healthOrbManager) {
        this.healthOrbManager = healthOrbManager;
    }
    
    /**
     * Update all enemies
     */
    update(deltaTime, camera) {
        // Update camera reference for all enemies
        if (camera) {
            this.enemies.forEach(enemy => {
                enemy.setCamera(camera);
            });
        }
        
        // Update each enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Always update enemy (even if dead, for death animation)
            enemy.update(deltaTime, camera);
            
            // Only remove if death animation is complete
            if (enemy.isDead && enemy.deathAnimationComplete) {
                // Remove dead enemies after animation
                this.enemies.splice(i, 1);
            } else if (!enemy.isDead) {
                // Check collision with player (optional - for damage dealing)
                if (this.player && enemy.isInAttackRange(this.player.position, 1.0)) {
                    // Enemy is close to player - could trigger damage here
                }
            }
        }
    }
    
    /**
     * Get all living enemies
     */
    getEnemies() {
        return this.enemies.filter(enemy => !enemy.isDead);
    }
    
    /**
     * Get total enemy count (including dead ones still animating)
     */
    getTotalEnemyCount() {
        return this.enemies.length;
    }
    
    /**
     * Get living enemy count
     */
    getLivingEnemyCount() {
        return this.getEnemies().length;
    }
    
    /**
     * Spawn a wave of enemies at random positions
     */
    spawnWave(count = 5, minDistance = 15, maxDistance = 40) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            
            const patrolRadius = 3 + Math.random() * 4; // 3-7 unit patrol radius
            this.spawnEnemy(position, patrolRadius);
        }
        
        console.log(`Spawned wave of ${count} enemies`);
    }
    
    /**
     * Get nearest enemy to a position
     */
    getNearestEnemy(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                const distance = enemy.position.distanceTo(position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = enemy;
                }
            }
        });
        
        return nearest;
    }
    
    /**
     * Handle player attack - check which enemies are hit
     */
    handlePlayerAttack(playerPosition, attackDirection, range, angleInDegrees, damageInfo = null) {
        const hits = [];
        const angleInRadians = (angleInDegrees * Math.PI) / 180;
        
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                // Calculate vector from player to enemy
                const toEnemy = new THREE.Vector3();
                toEnemy.subVectors(enemy.position, playerPosition);
                toEnemy.y = 0; // Ignore height difference
                
                const distance = toEnemy.length();
                
                // Check if within range
                if (distance <= range) {
                    // Normalize to get direction
                    toEnemy.normalize();
                    
                    // Calculate angle between attack direction and enemy direction
                    const angle = Math.acos(Math.max(-1, Math.min(1, toEnemy.dot(attackDirection))));
                    
                    // Check if within attack angle
                    if (angle <= angleInRadians / 2) {
                        // Enemy is hit!
                        const damage = damageInfo ? damageInfo.damage : 1;
                        enemy.takeDamage(damage, playerPosition);
                        
                        hits.push({
                            enemy: enemy,
                            distance: distance,
                            died: enemy.isDead,
                            damage: damage,
                            isCritical: damageInfo ? damageInfo.isCritical : false
                        });
                    }
                }
            }
        });
        
        return hits;
    }
    
    /**
     * Dispose of all enemies
     */
    dispose() {
        this.enemies.forEach(enemy => {
            if (enemy.parent) {
                enemy.parent.remove(enemy);
            }
            enemy.dispose();
        });
        
        this.enemies = [];
        
        this.enemyTextureSets.forEach(set => {
            if (set.walkTexture) set.walkTexture.dispose();
            set.attackTextures.forEach(tex => tex.dispose());
            if (set.hitTexture) set.hitTexture.dispose();
            if (set.deathTexture) set.deathTexture.dispose();
        });
    }
} 