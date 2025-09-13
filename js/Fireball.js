/**
 * Fireball - Projectile that drops from the sky for enemy_5 attacks
 * Uses a sprite sheet to display animated fireballs
 */
class Fireball extends THREE.Object3D {
    constructor(texture, frameWidth = 100, frameHeight = 100, columns = 6, rows = 5, fps = 12) {
        super();
        
        this.texture = texture;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.columns = columns;
        this.rows = rows;
        this.totalFrames = columns * rows;
        this.fps = fps;
        this.frameTime = 1 / fps;
        
        // Animation state
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = false;
        this.onComplete = null;
        
        // Fireball properties
        this.size = 3.0; // Size of the fireball (increased by 50% for better glow effect)
        this.fallSpeed = 2.5; // Speed of falling (reduced from 4.0 to 2.5)
        this.damage = 1; // Damage dealt to player (1 heart)
        this.explosionRadius = 2.5; // Radius of explosion damage
        this.telegraphRadius = 0.83; // Telegraph radius (2.5 / 3 = 0.83 - 3x smaller)
        this.lifetime = 0;
        this.maxLifetime = 5.0; // Maximum lifetime before auto-removal
        
        // Physics
        this.startY = 15; // Start high above the target
        this.targetPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.isActive = false;
        this.hasExploded = false;
        
        // Telegraph system
        this.telegraph = null;
        this.telegraphManager = null;
        
        // Explosion system
        this.explosionManager = null;
        
        // Camera reference for billboarding
        this.camera = null;
        
        // Manager reference for pool return
        this.manager = null;
        
        // Create sprite
        this.geometry = new THREE.PlaneGeometry(this.size, this.size);
        
        // Create material with transparency and glow
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            color: 0xffffff,
            emissive: 0xff4400, // Orange-red glow
            emissiveIntensity: 0.9 // Increased glow intensity by 50% (0.6 → 0.9)
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Rotate the mesh 90 degrees to the right (clockwise around Z-axis)
        this.mesh.rotation.z = -Math.PI / 2; // -90 degrees = 90 degrees clockwise
        
        // Tilt the fireball back by 45 degrees (around X-axis)
        this.mesh.rotation.x = Math.PI / 4; // 45 degrees backward tilt
        
        this.add(this.mesh);
        
        // Set render order to render on top
        this.renderOrder = 1000;
        this.mesh.renderOrder = 1000;
        
        // Initialize UV coordinates
        this.updateUVCoordinates();
        
        // Hide by default
        this.visible = false;
    }
    
    /**
     * Set camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Set manager reference for pool return
     */
    setManager(manager) {
        this.manager = manager;
    }
    
    /**
     * Update billboarding to face camera
     */
    updateBillboarding() {
        if (!this.camera) return;
        
        // Make the fireball face the camera
        this.lookAt(this.camera.position);
    }
    
    /**
     * Update UV coordinates for current frame
     */
    updateUVCoordinates() {
        const col = this.currentFrame % this.columns;
        const row = Math.floor(this.currentFrame / this.columns);
        
        const uLeft = col / this.columns;
        const uRight = (col + 1) / this.columns;
        const vTop = 1 - ((row + 1) / this.rows); // Flip V coordinate
        const vBottom = 1 - (row / this.rows);
        
        // Update geometry UV coordinates
        const uvAttribute = this.geometry.attributes.uv;
        if (!uvAttribute) return;
        
        const uvArray = uvAttribute.array;
        
        // Update UV coordinates for the plane
        uvArray[0] = uLeft;  uvArray[1] = vBottom;
        uvArray[2] = uRight; uvArray[3] = vBottom;
        uvArray[4] = uLeft;  uvArray[5] = vTop;
        uvArray[6] = uRight; uvArray[7] = vTop;
        
        uvAttribute.needsUpdate = true;
    }
    
    /**
     * Set telegraph manager reference
     */
    setTelegraphManager(telegraphManager) {
        this.telegraphManager = telegraphManager;
    }
    
    /**
     * Set explosion manager reference
     */
    setExplosionManager(explosionManager) {
        this.explosionManager = explosionManager;
    }
    
    /**
     * Launch fireball at a target position
     */
    launch(targetPosition, onComplete = null) {
        console.log('Launching fireball at position:', targetPosition);
        
        // Set target and start position
        this.targetPosition.copy(targetPosition);
        this.position.copy(targetPosition);
        this.position.y = this.startY; // Start high above target
        
        // Calculate velocity to drop onto target
        this.velocity.set(0, -this.fallSpeed, 0);
        
        // Calculate dynamic lifetime based on fall distance
        // Distance from start (Y=15) to ground level (Y=0.0)
        const totalFallDistance = this.startY - 0.0; // 15 - 0 = 15 units
        const calculatedLifetime = (totalFallDistance / this.fallSpeed) + 1.0; // +1 second buffer
        this.maxLifetime = Math.max(calculatedLifetime, 7.0); // Minimum 7 seconds
        
        console.log(`Fireball lifetime set to ${this.maxLifetime.toFixed(2)}s (fall distance: ${totalFallDistance.toFixed(2)} units, explosion and removal at Y=0.0)`);
        
        // Reset state
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.isActive = true;
        this.hasExploded = false;
        this.visible = true;
        this.onComplete = onComplete;
        this.lifetime = 0;
        
        // Create telegraph at landing position
        this.createFireballTelegraph();
        
        // Start with full opacity
        this.material.opacity = 1.0;
        
        // Set initial frame
        this.updateUVCoordinates();
    }
    
    /**
     * Create telegraph for fireball landing area
     */
    createFireballTelegraph() {
        if (!this.telegraphManager) return;
        
        // Calculate time until fireball lands at Y=0.0 (explosion point)
        const explosionTime = (this.startY - 0.0) / this.fallSpeed;
        
        // Show telegraph for the last 1.5 seconds of flight
        const telegraphDuration = Math.min(1.5, explosionTime);
        const telegraphDelay = explosionTime - telegraphDuration;
        
        // Calculate fade-out timing to match explosion
        const fadeOutDuration = 0.3; // 0.3 seconds fade out
        const fadeStartTime = telegraphDuration - fadeOutDuration;
        
        // Create telegraph after delay
        setTimeout(() => {
            if (this.isActive && !this.hasExploded) {
                this.telegraph = this.telegraphManager.createTelegraph(
                    'area',
                    this.targetPosition,
                    this.telegraphRadius, // 3x smaller than explosion radius
                    telegraphDuration, // Telegraph duration
                    null, // no direction
                    null, // no follow target - stays at landing position
                    0.3,  // custom opacity - more transparent for fireball telegraphs
                    fadeStartTime, // custom fade start time - fade out to match explosion
                    this.telegraphRadius * 0.05 // custom thickness - much thinner border (5% of radius)
                );
                
                console.log(`Fireball telegraph created (delayed) - radius: ${this.telegraphRadius}, duration: ${telegraphDuration.toFixed(2)}s, fade starts: ${fadeStartTime.toFixed(2)}s`);
            }
        }, telegraphDelay * 1000); // Convert to milliseconds
    }
    
    /**
     * Remove fireball telegraph
     */
    removeFireballTelegraph() {
        if (this.telegraph) {
            this.telegraph.cancel();
            this.telegraph = null;
        }
    }
    
    /**
     * Check if position is within telegraph area
     */
    isInTelegraphArea(position) {
        const distance = this.targetPosition.distanceTo(position);
        return distance <= this.telegraphRadius;
    }
    
    /**
     * Update fireball physics and animation
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.lifetime += deltaTime;
        
        // Remove if too old
        if (this.lifetime >= this.maxLifetime) {
            this.explode();
            return;
        }
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update billboarding to face camera
        this.updateBillboarding();
        
        // Check if hit ground level for explosion effects and immediate removal
        // Only trigger explosion when fireball reaches exactly Y=0.0 (ground level)
        if (this.position.y <= 0.0 && !this.hasExploded) {
            this.triggerGroundImpact(); // This will also remove the fireball
            return;
        }
        
        // Update animation
        if (this.isPlaying) {
            this.elapsedTime += deltaTime;
            
            if (this.elapsedTime >= this.frameTime) {
                this.elapsedTime = 0;
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                this.updateUVCoordinates();
            }
        }
    }
    
    /**
     * Trigger ground impact effects and remove the fireball sprite immediately
     */
    triggerGroundImpact() {
        if (this.hasExploded) return;
        
        console.log('Fireball hit ground at Y=0.0, position:', this.position);
        this.hasExploded = true; // Prevent multiple explosions
        
        // Trigger explosion animation at ground level (Y=0.0)
        if (this.explosionManager) {
            const groundExplosionPos = new THREE.Vector3(this.targetPosition.x, 0.0, this.targetPosition.z);
            this.explosionManager.spawnExplosion(groundExplosionPos);
        }
        
        // Remove telegraph when fireball hits ground
        this.removeFireballTelegraph();
        
        // Call completion callback for damage calculation
        if (this.onComplete) {
            this.onComplete(this);
        }
        
        // Remove the fireball sprite immediately after explosion
        this.removeFireball();
    }
    
    /**
     * Remove the fireball sprite when it goes underground
     */
    removeFireball() {
        console.log('Fireball removed - went underground');
        this.isActive = false;
        this.visible = false;
        
        // Return to pool via manager
        if (this.manager) {
            this.manager.returnFireballToPool(this);
        }
    }
    
    /**
     * Explode the fireball (for timeout cases)
     */
    explode() {
        if (this.hasExploded) {
            // If already exploded, just remove the sprite
            this.removeFireball();
        } else {
            // Trigger ground impact first
            this.triggerGroundImpact();
            this.removeFireball();
        }
    }
    
    /**
     * Check if fireball overlaps with a position
     */
    isOverlapping(position, radius = 1.0) {
        const distance = this.position.distanceTo(position);
        return distance <= (this.explosionRadius + radius);
    }
    
    /**
     * Get explosion position
     */
    getExplosionPosition() {
        return new THREE.Vector3(this.targetPosition.x, 0.0, this.targetPosition.z);
    }
    
    /**
     * Clean up fireball resources
     */
    dispose() {
        this.isActive = false;
        this.visible = false;
        this.hasExploded = false; // Reset explosion state
        this.lifetime = 0;
        this.elapsedTime = 0;
        this.currentFrame = 0;
        this.isPlaying = false;
        
        // Remove telegraph if it exists
        this.removeFireballTelegraph();
        
        // Clear callbacks
        this.onComplete = null;
        this.onTelegraphUpdate = null;
        this.onTelegraphRemove = null;
        
        // Clear references
        this.explosionManager = null;
        this.telegraphManager = null;
        
        console.log('Fireball disposed');
    }
}

/**
 * FireballManager - Manages pool of fireball projectiles
 */
class FireballManager {
    constructor(scene, maxFireballs = 15) {
        this.scene = scene;
        this.maxFireballs = maxFireballs;
        this.fireballPool = [];
        this.activeFireballs = [];
        this.fireballTexture = null;
        this.combatSystem = null;
        this.camera = null;
        this.telegraphManager = null;
        this.explosionManager = null;
    }
    
    /**
     * Set camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
        // Update camera reference for all fireballs
        [...this.fireballPool, ...this.activeFireballs].forEach(fireball => {
            fireball.setCamera(camera);
        });
    }
    
    /**
     * Set telegraph manager reference
     */
    setTelegraphManager(telegraphManager) {
        this.telegraphManager = telegraphManager;
        // Update telegraph manager reference for all fireballs
        [...this.fireballPool, ...this.activeFireballs].forEach(fireball => {
            fireball.setTelegraphManager(telegraphManager);
        });
    }
    
    /**
     * Set explosion manager reference
     */
    setExplosionManager(explosionManager) {
        this.explosionManager = explosionManager;
        // Update explosion manager reference for all fireballs
        [...this.fireballPool, ...this.activeFireballs].forEach(fireball => {
            fireball.setExplosionManager(explosionManager);
        });
    }
    
    /**
     * Initialize the fireball system
     */
    async initialize() {
        // Load fireball texture
        const loader = new THREE.TextureLoader();
        
        try {
            this.fireballTexture = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/sprites/Fireball.png',
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        console.log('Fireball texture loaded successfully');
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load fireball texture:', error);
                        reject(error);
                    }
                );
            });
            
            // Create fireball pool with updated dimensions (6x5 = 30 frames)
            // Spritesheet is 600x500px total, 100x100px per sprite = 6 columns x 5 rows
            for (let i = 0; i < this.maxFireballs; i++) {
                const fireball = new Fireball(this.fireballTexture, 100, 100, 6, 5, 12);
                fireball.setManager(this);
                if (this.camera) {
                    fireball.setCamera(this.camera);
                }
                if (this.telegraphManager) {
                    fireball.setTelegraphManager(this.telegraphManager);
                }
                if (this.explosionManager) {
                    fireball.setExplosionManager(this.explosionManager);
                }
                this.scene.add(fireball);
                this.fireballPool.push(fireball);
            }
            
            console.log('Fireball system initialized');
        } catch (error) {
            console.error('Failed to initialize fireball system:', error);
        }
    }
    
    /**
     * Launch a fireball at a target position
     */
    launchFireball(targetPosition) {
        console.log('Launching fireball at:', targetPosition);
        
        if (this.fireballPool.length === 0) {
            console.warn('No available fireballs in pool');
            return;
        }
        
        // Get fireball from pool
        const fireball = this.fireballPool.pop();
        this.activeFireballs.push(fireball);
        
        // Set camera reference if available
        if (this.camera) {
            fireball.setCamera(this.camera);
        }
        
        // Set telegraph manager reference if available
        if (this.telegraphManager) {
            fireball.setTelegraphManager(this.telegraphManager);
        }
        
        // Set explosion manager reference if available
        if (this.explosionManager) {
            fireball.setExplosionManager(this.explosionManager);
        }
        
        // Launch fireball
        fireball.launch(targetPosition, (completedFireball) => {
            // Handle explosion damage
            this.handleFireballExplosion(completedFireball);
            
            // Don't return to pool immediately - let it sink underground first
            // The pool return will happen when removeFireball() is called
        });
    }
    
    /**
     * Handle fireball explosion and damage
     */
    handleFireballExplosion(fireball) {
        const explosionPos = fireball.getExplosionPosition();
        
        // Check if player is in telegraph area (not explosion radius)
        if (this.combatSystem && this.combatSystem.playerController) {
            const playerPos = this.combatSystem.playerController.getPosition();
            
            // Use telegraph area for damage detection instead of explosion radius
            if (fireball.isInTelegraphArea(playerPos)) {
                console.log('Player hit by fireball - was in telegraphed area!');
                
                // Deal damage to player
                if (this.combatSystem.handlePlayerDamage) {
                    this.combatSystem.handlePlayerDamage(fireball.damage);
                }
            } else {
                console.log('Player avoided fireball - outside telegraphed area');
            }
        }
        
        // Could add explosion visual effect here
        console.log('Fireball explosion at:', explosionPos);
    }
    
    /**
     * Return a fireball to the pool
     */
    returnFireballToPool(fireball) {
        const index = this.activeFireballs.indexOf(fireball);
        if (index > -1) {
            this.activeFireballs.splice(index, 1);
            this.fireballPool.push(fireball);
            console.log(`Fireball returned to pool. Active: ${this.activeFireballs.length}, Pool: ${this.fireballPool.length}`);
        }
    }
    
    /**
     * Update all active fireballs
     */
    update(deltaTime) {
        this.activeFireballs.forEach(fireball => {
            fireball.update(deltaTime);
        });
    }
    
    /**
     * Set combat system reference
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
    }
    
    /**
     * Dispose of all fireballs
     */
    dispose() {
        [...this.fireballPool, ...this.activeFireballs].forEach(fireball => {
            if (fireball.parent) {
                fireball.parent.remove(fireball);
            }
            fireball.dispose();
        });
        
        if (this.fireballTexture) {
            this.fireballTexture.dispose();
        }
    }
} 