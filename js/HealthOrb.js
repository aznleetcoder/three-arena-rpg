/**
 * HealthOrb - Collectible health orb that restores player health
 */
class HealthOrb extends THREE.Object3D {
    constructor(texture, size = 0.27) { // Reduced by another 40% from 0.45 to 0.27
        super();
        
        this.texture = texture;
        this.size = size;
        this.healthValue = 1; // Amount of health restored
        
        // Physics properties
        this.velocity = new THREE.Vector3();
        this.gravity = -15;
        this.bounceHeight = 2.0;
        this.bounceCount = 0;
        this.maxBounces = 2;
        this.isGrounded = false;
        
        // Collection properties
        this.magnetRadius = 3.0; // Distance at which orb starts moving toward player
        this.collectRadius = 0.8; // Distance at which orb is collected
        this.isBeingCollected = false;
        this.magnetSpeed = 8.0;
        
        // Animation properties
        this.floatOffset = Math.random() * Math.PI * 2; // Random phase for floating
        this.rotationSpeed = 2.0;
        this.pulseSpeed = 3.0;
        
        // Lifetime
        this.lifeTime = 30.0; // Despawn after 30 seconds
        this.age = 0;
        
        this.createMesh();
        this.setRandomInitialVelocity();
    }
    
    /**
     * Create the health orb mesh
     */
    createMesh() {
        // Create geometry
        this.geometry = new THREE.PlaneGeometry(this.size, this.size);
        
        // Create material with glow effect
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            depthWrite: false,
            color: 0xffffff,
            emissive: 0xff0000, // Red glow for health
            emissiveIntensity: 0.3
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.add(this.mesh);
        
        // Set render order for proper transparency
        this.renderOrder = 1000;
        this.mesh.renderOrder = 1000;
    }
    
    /**
     * Set random initial velocity for physics
     */
    setRandomInitialVelocity() {
        // Random horizontal velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3; // 2-5 units/sec
        
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.z = Math.sin(angle) * speed;
        this.velocity.y = this.bounceHeight; // Initial upward velocity
    }
    
    /**
     * Update health orb physics and behavior
     */
    update(deltaTime, playerPosition) {
        this.age += deltaTime;
        
        // Check if orb should despawn
        if (this.age >= this.lifeTime) {
            return 'despawn';
        }
        
        // Check distance to player for magnetism
        const distanceToPlayer = this.position.distanceTo(playerPosition);
        
        if (!this.isBeingCollected && distanceToPlayer <= this.collectRadius) {
            return 'collect';
        }
        
        // Magnetism behavior
        if (!this.isBeingCollected && distanceToPlayer <= this.magnetRadius && this.isGrounded) {
            this.moveTowardPlayer(playerPosition, deltaTime);
        } else if (!this.isGrounded) {
            // Apply physics when airborne
            this.updatePhysics(deltaTime);
        }
        
        // Floating animation when grounded
        if (this.isGrounded) {
            this.updateFloatingAnimation(deltaTime);
        }
        
        // Rotation animation
        this.rotation.y += this.rotationSpeed * deltaTime;
        
        // Pulsing glow effect
        const pulse = (Math.sin(this.age * this.pulseSpeed) + 1) * 0.5;
        this.material.emissiveIntensity = 0.2 + pulse * 0.4;
        
        // Fade out near end of lifetime
        if (this.age > this.lifeTime - 3) {
            const fadeProgress = (this.age - (this.lifeTime - 3)) / 3;
            this.material.opacity = 1 - fadeProgress;
        }
        
        return 'active';
    }
    
    /**
     * Update physics simulation
     */
    updatePhysics(deltaTime) {
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision
        if (this.position.y <= 0.2) {
            this.position.y = 0.2;
            
            if (this.velocity.y < 0 && this.bounceCount < this.maxBounces) {
                // Bounce
                this.velocity.y = Math.abs(this.velocity.y) * 0.6; // Bounce with energy loss
                this.velocity.x *= 0.8; // Friction
                this.velocity.z *= 0.8;
                this.bounceCount++;
            } else {
                // Stop bouncing and ground the orb
                this.velocity.set(0, 0, 0);
                this.isGrounded = true;
            }
        }
    }
    
    /**
     * Move toward player with magnetism
     */
    moveTowardPlayer(playerPosition, deltaTime) {
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.position);
        direction.y = 0; // Keep movement horizontal
        direction.normalize();
        
        // Move toward player
        const movement = direction.multiplyScalar(this.magnetSpeed * deltaTime);
        this.position.add(movement);
    }
    
    /**
     * Floating animation when grounded
     */
    updateFloatingAnimation(deltaTime) {
        // Gentle floating motion
        const floatHeight = 0.2 + Math.sin(this.age * 2 + this.floatOffset) * 0.1;
        this.position.y = floatHeight;
    }
    
    /**
     * Set camera for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Update billboard rotation to face camera
     */
    updateBillboard() {
        if (this.camera) {
            this.lookAt(this.camera.position);
        }
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.texture) this.texture.dispose();
    }
}

/**
 * HealthOrbManager - Manages health orb spawning and collection
 */
class HealthOrbManager {
    constructor(scene) {
        this.scene = scene;
        this.healthOrbs = [];
        this.healthOrbTexture = null;
        this.camera = null;
        this.collectionEffectManager = null;
        this.combatSystem = null; // Reference to combat system for health restoration
    }
    
    /**
     * Initialize the health orb system
     */
    async initialize() {
        // Load health orb texture
        const loader = new THREE.TextureLoader();
        
        try {
            this.healthOrbTexture = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/images/health_orb.png',
                    (texture) => {
                        // Configure texture
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        console.log('Health orb texture loaded successfully');
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load health orb texture:', error);
                        reject(error);
                    }
                );
            });
            
            console.log('Health orb system initialized');
        } catch (error) {
            console.error('Failed to initialize health orb system:', error);
        }
    }
    
    /**
     * Spawn a health orb at a position
     */
    spawnHealthOrb(position) {
        if (!this.healthOrbTexture) {
            console.warn('Health orb texture not loaded');
            return;
        }
        
        console.log('Spawning health orb at:', position);
        
        const healthOrb = new HealthOrb(this.healthOrbTexture);
        healthOrb.position.copy(position);
        healthOrb.position.y += 1.0; // Start slightly above ground
        
        if (this.camera) {
            healthOrb.setCamera(this.camera);
        }
        
        this.scene.add(healthOrb);
        this.healthOrbs.push(healthOrb);
    }
    
    /**
     * Update all health orbs
     */
    update(deltaTime, playerPosition) {
        for (let i = this.healthOrbs.length - 1; i >= 0; i--) {
            const orb = this.healthOrbs[i];
            
            // Update billboard rotation
            orb.updateBillboard();
            
            // Update orb behavior
            const result = orb.update(deltaTime, playerPosition);
            
            if (result === 'collect') {
                this.collectHealthOrb(orb, i, playerPosition);
            } else if (result === 'despawn') {
                this.removeHealthOrb(orb, i);
            }
        }
    }
    
    /**
     * Collect a health orb
     */
    collectHealthOrb(orb, index, playerPosition) {
        console.log('Health orb collected! Restoring health.');
        
        // Restore player health
        if (this.combatSystem) {
            this.combatSystem.restoreHealth(orb.healthValue);
        }
        
        // Spawn collection effect
        if (this.collectionEffectManager) {
            this.collectionEffectManager.spawnEffect(playerPosition, 'health');
        }
        
        // Remove orb
        this.removeHealthOrb(orb, index);
    }
    
    /**
     * Remove a health orb
     */
    removeHealthOrb(orb, index) {
        this.scene.remove(orb);
        orb.dispose();
        this.healthOrbs.splice(index, 1);
    }
    
    /**
     * Set camera reference
     */
    setCamera(camera) {
        this.camera = camera;
        this.healthOrbs.forEach(orb => orb.setCamera(camera));
    }
    
    /**
     * Set collection effect manager
     */
    setCollectionEffectManager(collectionEffectManager) {
        this.collectionEffectManager = collectionEffectManager;
    }
    
    /**
     * Set combat system reference
     */
    setCombatSystem(combatSystem) {
        this.combatSystem = combatSystem;
    }
    
    /**
     * Dispose of all health orbs
     */
    dispose() {
        this.healthOrbs.forEach(orb => {
            this.scene.remove(orb);
            orb.dispose();
        });
        this.healthOrbs = [];
        
        if (this.healthOrbTexture) {
            this.healthOrbTexture.dispose();
        }
    }
} 