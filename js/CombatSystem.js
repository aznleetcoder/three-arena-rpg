/**
 * CombatSystem - Handles combat mechanics and attack detection
 */
class CombatSystem {
    constructor(playerController, enemyManager, cameraController = null, game = null) {
        this.playerController = playerController;
        this.enemyManager = enemyManager;
        this.cameraController = cameraController;
        this.game = game; // Reference to main game for freeze frame
        this.impactEffectManager = null;
        this.damageNumberManager = null;
        this.bloodParticleSystem = null;
        this.lightningStrikeManager = null; // Reference to lightning strike manager
        
        // Attack properties
        this.attackRange = 2.5; // Units in front of player
        this.attackAngle = 90; // Degrees of attack cone
        this.attackCooldown = 0;
        this.attackCooldownDuration = 0.3; // 0.3 seconds between attacks
        
        // Lightning strike properties
        this.lightningStrikeCooldown = 0;
        this.lightningStrikeCooldownDuration = 3.0; // 3 seconds between lightning strikes
        this.lightningStrikeRange = 5.0; // 5 unit radius
        this.lightningStrikeTargets = 3; // Up to 3 targets
        this.lightningStrikeBaseDamage = 12; // Base damage (12-15 with variance)
        this.lightningStrikeDamageVariance = 0.25; // 25% variance for 12-15 damage
        
        // Lightning strike state - prevent individual freeze frames during lightning
        this.isLightningStriking = false;
        
        // Damage properties
        this.baseDamage = 10; // Base damage per hit
        this.damageVariance = 0.2; // 20% damage variance
        this.criticalChance = 0.15; // 15% chance for critical hit
        this.criticalMultiplier = 2.0; // Critical hits do 2x damage
        
        // Player health
        this.playerHealth = 5; // Player starts with 5 health
        this.playerMaxHealth = 5;
        this.playerInvulnerable = false;
        this.invulnerabilityDuration = 1.0; // 1 second of invulnerability after being hit
        this.invulnerabilityTimer = 0;
        
        // Visual feedback
        this.attackIndicator = null;
        this.createAttackIndicator();
        
        // Attack state
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackDuration = 0.3; // How long the attack "swing" lasts
        
        // Initialize health UI
        this.updateHealthUI();
    }
    
    /**
     * Create visual attack indicator (optional debug visualization)
     */
    createAttackIndicator() {
        // Disabled - no visual indicator needed
        this.attackIndicator = null;
    }
    
    /**
     * Trigger an attack
     */
    triggerAttack() {
        // Check if can attack
        if (this.attackCooldown > 0 || this.isAttacking) {
            return false;
        }
        
        // Get player position and direction
        const playerPos = this.playerController.getPosition();
        const attackDir = this.playerController.getLastDirection();
        
        // Normalize attack direction
        attackDir.y = 0;
        attackDir.normalize();
        
        // Calculate damage for this attack
        const damageInfo = this.calculateDamage();
        
        // Check for hit enemies
        const hits = this.enemyManager.handlePlayerAttack(
            playerPos,
            attackDir,
            this.attackRange,
            this.attackAngle,
            damageInfo
        );
        
        // Process hits
        if (hits.length > 0) {
            console.log(`Hit ${hits.length} enemies!`);
            
            // Sort by distance to hit closest first
            hits.sort((a, b) => a.distance - b.distance);
            
            // Apply effects
            hits.forEach(hit => {
                if (hit.died) {
                    console.log('Enemy defeated!');
                    // Could add score, effects, etc.
                }
            });
            
            // Screen shake or other feedback could go here
            this.onSuccessfulHit(hits);
        } else {
            console.log('Attack missed!');
        }
        
        // Set attack state
        this.isAttacking = true;
        this.attackTimer = this.attackDuration;
        this.attackCooldown = this.attackCooldownDuration;
        
        // Attack indicator disabled
        
        return true;
    }
    
    /**
     * Trigger a lightning strike
     */
    triggerLightningStrike() {
        // Check if can use lightning strike
        if (this.lightningStrikeCooldown > 0) {
            console.log('Lightning strike blocked - on cooldown');
            return false;
        }
        
        // Get player position
        const playerPos = this.playerController.getPosition();
        
        // Find enemies within range
        const enemiesInRange = this.findEnemiesInRange(playerPos, this.lightningStrikeRange);
        
        if (enemiesInRange.length === 0) {
            console.log('No enemies in range for lightning strike');
            // Still trigger cooldown even if no enemies hit
            this.lightningStrikeCooldown = this.lightningStrikeCooldownDuration;
            return false;
        }
        
        // Shuffle enemies and take up to lightningStrikeTargets
        const shuffled = enemiesInRange.sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, this.lightningStrikeTargets);
        
        console.log(`Lightning strike hitting ${targets.length} enemies!`);
        
        // Set lightning strike flag to prevent individual freeze frames
        this.isLightningStriking = true;
        
        // Strike all enemies simultaneously instead of staggered
        const hits = [];
        targets.forEach((enemy, index) => {
            // Calculate damage for this strike
            const variance = (Math.random() - 0.5) * 2 * this.lightningStrikeDamageVariance;
            const damage = Math.round(this.lightningStrikeBaseDamage * (1 + variance));
            
            // Deal damage immediately
            enemy.takeDamage(damage, playerPos);
            
            // Spawn lightning effect with slight delay for visual appeal
            setTimeout(() => {
                if (this.lightningStrikeManager) {
                    this.lightningStrikeManager.spawnLightning(enemy.position);
                }
            }, index * 50); // Reduced delay from 150ms to 50ms
            
            // Show damage number immediately
            if (this.damageNumberManager) {
                const damagePos = enemy.position.clone();
                damagePos.y += 0.5;
                this.damageNumberManager.showDamage(damage, damagePos, false);
            }
            
            hits.push({
                enemy: enemy,
                damage: damage,
                died: enemy.isDead
            });
        });
        
        // Apply visual feedback after a short delay
        setTimeout(() => {
            this.isLightningStriking = false; // Allow freeze frames again
            this.onLightningStrikeHit(hits);
        }, 100);
        
        // Set cooldown
        this.lightningStrikeCooldown = this.lightningStrikeCooldownDuration;
        
        return true;
    }
    
    /**
     * Find enemies within range of a position
     */
    findEnemiesInRange(position, range) {
        const enemies = this.enemyManager.getEnemies();
        const inRange = [];
        
        enemies.forEach(enemy => {
            const distance = enemy.position.distanceTo(position);
            if (distance <= range) {
                inRange.push(enemy);
            }
        });
        
        return inRange;
    }
    
    /**
     * Called when lightning strike hits enemies
     */
    onLightningStrikeHit(hits) {
        // Trigger hit-stop for impactful combat feel
        if (this.game && this.game.freezeFrame) {
            // Optimized freeze duration since we no longer have overlapping freeze frames
            let freezeDuration = 0.08; // Base 80ms freeze (reduced from 150ms)
            
            if (hits.length > 2) {
                freezeDuration = 0.12; // 120ms for hitting 3+ enemies (reduced from 250ms)
            } else if (hits.length > 1) {
                freezeDuration = 0.10; // 100ms for hitting 2 enemies (reduced from 200ms)
            }
            
            this.game.freezeFrame(freezeDuration);
        }
        
        // Screen shake for lightning strikes
        if (this.cameraController && this.cameraController.shake) {
            // Lightning strikes have unique shake pattern
            if (hits.length > 2) {
                this.cameraController.shakePresets.criticalHit(); // Heavy shake for 3+ hits
            } else if (hits.length > 1) {
                this.cameraController.shakePresets.heavyHit(); // Heavy shake for 2 hits
            } else {
                this.cameraController.shakePresets.normalHit(); // Normal shake for 1 hit
            }
        }
    }
    
    /**
     * Called when attack successfully hits enemies
     */
    onSuccessfulHit(hits) {
        // Trigger hit-stop for impactful combat feel
        if (this.game && this.game.freezeFrame) {
            // Scale freeze duration based on number of hits and critical
            const hasCritical = hits.some(hit => hit.isCritical);
            let freezeDuration = 0.12; // Base 120ms freeze (increased from 50ms)
            
            if (hasCritical) {
                freezeDuration = 0.18; // 180ms for critical hits (increased from 80ms)
            } else if (hits.length > 2) {
                freezeDuration = 0.15; // 150ms for multi-hits (increased from 70ms)
            }
            
            this.game.freezeFrame(freezeDuration);
        }
        
        // Add hit effects here
        // Screen shake on enemy hit with new tweened system
        if (this.cameraController && this.cameraController.shake) {
            // Check if any hit was critical
            const hasCritical = hits.some(hit => hit.isCritical);
            
            if (hasCritical) {
                // Use critical hit preset
                this.cameraController.shakePresets.criticalHit();
            } else if (hits.length > 2) {
                // Multiple enemies hit - use heavy shake
                this.cameraController.shakePresets.heavyHit();
            } else if (hits.length > 1) {
                // Two enemies hit - normal shake
                this.cameraController.shakePresets.normalHit();
            } else {
                // Single enemy hit - light shake
                this.cameraController.shakePresets.lightHit();
            }
        }
        
        // Spawn impact effects at hit locations
        if (this.impactEffectManager) {
            hits.forEach(hit => {
                if (hit.enemy && hit.enemy.position) {
                    // Spawn impact effect at enemy position
                    const impactPos = hit.enemy.position.clone();
                    impactPos.y += 1.0; // Position at enemy's mid-height
                    this.impactEffectManager.spawnImpact(impactPos);
                    console.log('Spawning impact for hit enemy at:', impactPos);
                }
            });
        }
        
        // Show damage numbers
        if (this.damageNumberManager) {
            hits.forEach(hit => {
                if (hit.enemy && hit.enemy.position) {
                    // Show damage number above enemy
                    const damagePos = hit.enemy.position.clone();
                    damagePos.y += 0.5; // Position above enemy (lowered by 1 unit from 1.5)
                    this.damageNumberManager.showDamage(hit.damage, damagePos, hit.isCritical);
                    console.log(`Showing damage: ${hit.damage}${hit.isCritical ? ' CRITICAL!' : ''}`);
                }
            });
        }
        
        // Spawn blood particles
        if (this.bloodParticleSystem) {
            hits.forEach(hit => {
                if (hit.enemy && hit.enemy.position) {
                    // Calculate hit direction (from player to enemy - blood sprays AWAY from player)
                    const hitDirection = new THREE.Vector3();
                    hitDirection.subVectors(hit.enemy.position, this.playerController.getPosition());
                    hitDirection.y = 0; // Keep it horizontal
                    hitDirection.normalize();
                    
                    // Spawn blood at enemy position
                    const bloodPos = hit.enemy.position.clone();
                    bloodPos.y += 0.5; // At enemy body level
                    
                    // More particles for critical hits
                    const particleCount = hit.isCritical ? 12 : 8;
                    this.bloodParticleSystem.spawnBloodBurst(bloodPos, hitDirection, particleCount);
                }
            });
        }
        
        // Could add:
        // - Hit particles
        // - Sound effects
        // - Combo counter
    }
    
    /**
     * Update combat system
     */
    update(deltaTime) {
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Update lightning strike cooldown
        if (this.lightningStrikeCooldown > 0) {
            this.lightningStrikeCooldown -= deltaTime;
        }
        
        // Update attack state
        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }
        
        // Update invulnerability timer
        if (this.playerInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            
            if (this.invulnerabilityTimer <= 0) {
                this.playerInvulnerable = false;
                console.log('Player invulnerability ended');
            }
        }
    }
    
    /**
     * Restore player health (from health orbs)
     */
    restoreHealth(amount = 1) {
        if (this.playerHealth >= this.playerMaxHealth) {
            console.log('Player already at max health');
            return false;
        }
        
        const oldHealth = this.playerHealth;
        this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        const actualHealing = this.playerHealth - oldHealth;
        
        console.log(`Player healed for ${actualHealing} health. Health: ${this.playerHealth}/${this.playerMaxHealth}`);
        
        // Update health UI
        this.updateHealthUI();
        
        // Add healing effect animation
        this.animateHeartHealing();
        
        return true;
    }
    
    /**
     * Animate heart healing when player gains health
     */
    animateHeartHealing() {
        // Animate newly filled hearts
        for (let i = 0; i < this.playerHealth; i++) {
            const heart = document.getElementById(`heart-${i}`);
            if (heart) {
                // Remove animation class if it exists
                heart.classList.remove('heal-animation');
                
                // Force reflow to restart animation
                void heart.offsetWidth;
                
                // Add healing animation class
                heart.classList.add('heal-animation');
                
                // Remove animation class after it completes
                setTimeout(() => {
                    heart.classList.remove('heal-animation');
                }, 600);
            }
        }
    }

    /**
     * Handle player taking damage
     */
    handlePlayerDamage(damage = 1) {
        if (this.playerInvulnerable) {
            console.log('Player is invulnerable, no damage taken');
            return false;
        }
        
        this.playerHealth -= damage;
        console.log(`Player took ${damage} damage. Health: ${this.playerHealth}/${this.playerMaxHealth}`);
        
        // Show hit overlay effect
        this.showHitOverlay();
        
        // Trigger hit-stop when player takes damage
        if (this.game && this.game.freezeFrame) {
            let freezeDuration = 0.1; // 100ms freeze when player is hit
            this.game.freezeFrame(freezeDuration);
        }
        
        // Update UI with animation
        this.updateHealthUI();
        
        // Animate the hearts that were lost
        this.animateHeartLoss();
        
        // Screen shake on player hit
        if (this.cameraController && this.cameraController.shakePresets) {
            // Use player hurt preset for consistent feel
            this.cameraController.shakePresets.playerHurt();
        }
        
        // Make player invulnerable for a short time
        this.playerInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        
        if (this.playerHealth <= 0) {
            console.log('Player defeated!');
            // TODO: Handle player death (respawn, game over, etc.)
        }
        
        return true;
    }
    
    /**
     * Update health UI display
     */
    updateHealthUI() {
        const heartsContainer = document.getElementById('hearts-container');
        
        if (!heartsContainer) return;
        
        // Clear existing hearts
        heartsContainer.innerHTML = '';
        
        // Create hearts based on max health
        for (let i = 0; i < this.playerMaxHealth; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heart.id = `heart-${i}`;
            
            // Set filled or empty based on current health
            if (i < this.playerHealth) {
                heart.classList.add('filled');
            } else {
                heart.classList.add('empty');
            }
            
            heartsContainer.appendChild(heart);
        }
    }
    
    /**
     * Show hit overlay effect when player is hit
     */
    showHitOverlay() {
        const hitOverlay = document.getElementById('hit-overlay');
        if (hitOverlay) {
            // Make sure the overlay is visible in the DOM
            hitOverlay.style.display = 'block';
            
            // Force reflow to ensure display change is applied
            hitOverlay.offsetHeight;
            
            // Add show class to trigger fade-in
            hitOverlay.classList.add('show');
            
            // Remove show class after peak visibility to start fade-out
            setTimeout(() => {
                hitOverlay.classList.remove('show');
                
                // Hide from DOM after fade-out completes
                setTimeout(() => {
                    hitOverlay.style.display = 'none';
                }, 150); // Match CSS transition duration
            }, 100); // Show at full opacity for 100ms
        }
    }

    /**
     * Animate heart loss when player takes damage
     */
    animateHeartLoss() {
        // Animate all remaining filled hearts
        for (let i = 0; i < this.playerHealth; i++) {
            const heart = document.getElementById(`heart-${i}`);
            if (heart) {
                // Remove animation class if it exists
                heart.classList.remove('hit-animation');
                
                // Force reflow to restart animation
                void heart.offsetWidth;
                
                // Add animation class
                heart.classList.add('hit-animation');
                
                // Remove animation class after it completes
                setTimeout(() => {
                    heart.classList.remove('hit-animation');
                }, 500);
            }
        }
    }
    
    /**
     * Get player health info
     */
    getPlayerHealth() {
        return {
            current: this.playerHealth,
            max: this.playerMaxHealth,
            percentage: this.playerHealth / this.playerMaxHealth
        };
    }
    
    /**
     * Check if lightning strike can be used
     */
    canUseLightningStrike() {
        return this.lightningStrikeCooldown <= 0;
    }
    
    /**
     * Get lightning strike cooldown progress (0-1)
     */
    getLightningStrikeCooldownProgress() {
        return 1 - (this.lightningStrikeCooldown / this.lightningStrikeCooldownDuration);
    }

    /**
     * Check if currently performing lightning strike (used to prevent individual freeze frames)
     */
    isPerformingLightningStrike() {
        return this.isLightningStriking;
    }

    /**
     * Check if player can attack
     */
    canAttack() {
        return this.attackCooldown <= 0 && !this.isAttacking;
    }
    
    /**
     * Get attack cooldown progress (0-1)
     */
    getAttackCooldownProgress() {
        return 1 - (this.attackCooldown / this.attackCooldownDuration);
    }
    
    /**
     * Dispose of combat system resources
     */
    dispose() {
        if (this.attackIndicator) {
            this.attackIndicator.geometry.dispose();
            this.attackIndicator.material.dispose();
        }
    }
    
    /**
     * Set camera controller reference
     */
    setCameraController(cameraController) {
        this.cameraController = cameraController;
    }
    
    /**
     * Set impact effect manager reference
     */
    setImpactEffectManager(impactEffectManager) {
        this.impactEffectManager = impactEffectManager;
    }
    
    /**
     * Set damage number manager reference
     */
    setDamageNumberManager(damageNumberManager) {
        this.damageNumberManager = damageNumberManager;
    }
    
    /**
     * Set lightning strike manager reference
     */
    setLightningStrikeManager(lightningStrikeManager) {
        this.lightningStrikeManager = lightningStrikeManager;
    }

    /**
     * Calculate damage for an attack
     */
    calculateDamage() {
        // Base damage with variance
        const variance = (Math.random() - 0.5) * 2 * this.damageVariance;
        let damage = Math.round(this.baseDamage * (1 + variance));
        
        // Check for critical hit
        const isCritical = Math.random() < this.criticalChance;
        if (isCritical) {
            damage = Math.round(damage * this.criticalMultiplier);
        }
        
        return { damage, isCritical };
    }
    
    /**
     * Set blood particle system reference
     */
    setBloodParticleSystem(bloodParticleSystem) {
        this.bloodParticleSystem = bloodParticleSystem;
    }
    
    /**
     * Set game reference for freeze frame
     */
    setGame(game) {
        this.game = game;
    }
} 