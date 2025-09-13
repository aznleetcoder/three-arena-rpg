/**
 * Crystal - Collectible crystal that drops from enemies
 * Floats and glows, can be collected by player
 */
class Crystal extends THREE.Object3D {
    constructor(texture, size = 0.32) { // Reduced by 60% (was 0.8, now 0.32)
        super();
        
        this.texture = texture;
        this.size = size;
        this.isCollected = false;
        this.isActive = true;
        
        // Camera reference for billboarding
        this.camera = null;
        
        // Collection effect manager for visual feedback
        this.collectionEffectManager = null;
        
        // XP system reference for gaining XP
        this.xpSystem = null;
        
        // Animation properties
        this.floatHeight = 0.3; // How high to float
        this.floatSpeed = 2.0; // Speed of floating animation
        this.rotationSpeed = 0.015; // Rotation speed (reduced by another 90% from 0.15)
        this.elapsedTime = 0;
        
        // Collection properties
        this.collectionRange = 1.5; // Distance at which player can collect
        this.magnetRange = 2.0; // Distance at which crystal moves toward player (reduced from 3.0)
        this.magnetSpeed = 8.0; // Speed when moving toward player
        this.baseY = 0; // Ground level position
        
        // Physics for scattering
        this.velocity = new THREE.Vector3();
        this.hasLanded = false;
        this.bounceHeight = 2.0; // Initial bounce height
        this.gravity = -15.0; // Gravity strength
        this.bounce = 0.4; // Bounce factor
        this.friction = 0.85; // Friction when sliding
        
        // Create crystal sprite
        this.createCrystalSprite();
    }
    
    /**
     * Create the crystal sprite
     */
    createCrystalSprite() {
        const geometry = new THREE.PlaneGeometry(this.size, this.size);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.sprite = new THREE.Mesh(geometry, material);
        this.sprite.renderOrder = 200; // Render on top
        this.add(this.sprite);
    }
    

    
    /**
     * Initialize crystal with scatter physics
     */
    scatter(position, scatterForce = 3.0) {
        this.position.copy(position);
        this.baseY = position.y;
        this.position.y += this.bounceHeight;
        
        // Random scatter direction
        const angle = Math.random() * Math.PI * 2;
        const force = 0.5 + Math.random() * scatterForce;
        
        this.velocity.set(
            Math.cos(angle) * force,
            2.0 + Math.random() * 3.0, // Upward velocity
            Math.sin(angle) * force
        );
        
        this.hasLanded = false;
    }
    
    /**
     * Set camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
    }

    /**
     * Set collection effect manager for visual feedback
     */
    setCollectionEffectManager(collectionEffectManager) {
        this.collectionEffectManager = collectionEffectManager;
    }

    /**
     * Set XP system reference for gaining XP
     */
    setXPSystem(xpSystem) {
        this.xpSystem = xpSystem;
    }

    /**
     * Update crystal animation and physics
     */
    update(deltaTime, playerPosition = null) {
        if (!this.isActive || this.isCollected) return;
        
        this.elapsedTime += deltaTime;
        
        // Store player position for collection effect
        if (playerPosition) {
            this.playerPosition = playerPosition.clone();
        }
        
        // Handle billboarding to camera (like other sprites)
        this.updateBillboarding();
        
        // Handle scatter physics
        if (!this.hasLanded) {
            this.updateScatterPhysics(deltaTime);
        } else {
            // Normal floating animation
            this.updateFloatingAnimation();
        }
        
        // Handle magnetism toward player
        if (playerPosition) {
            this.updatePlayerMagnetism(playerPosition, deltaTime);
        }
        
        // Rotate crystal
        this.sprite.rotation.z += this.rotationSpeed * deltaTime;
    }

    /**
     * Update billboarding to face camera with tilt (like other sprites)
     */
    updateBillboarding() {
        if (!this.camera) return;
        
        // Get camera direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Calculate billboard rotation to face camera
        const targetRotation = new THREE.Euler();
        targetRotation.setFromVector3(cameraDirection);
        
        // Apply tilt like other sprites (15-degree tilt)
        const tiltAngle = Math.PI / 12; // 15 degrees
        
        // Make the crystal face the camera with the same tilt as other sprites
        this.lookAt(this.camera.position);
        this.rotateX(tiltAngle); // Add the characteristic sprite tilt
    }
    
    /**
     * Update scatter physics (bouncing and settling)
     */
    updateScatterPhysics(deltaTime) {
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Check if hit ground
        if (this.position.y <= this.baseY + 0.1) {
            this.position.y = this.baseY + 0.1;
            
            // Bounce
            if (Math.abs(this.velocity.y) > 0.5) {
                this.velocity.y *= -this.bounce;
                this.velocity.x *= this.friction;
                this.velocity.z *= this.friction;
            } else {
                // Settle on ground
                this.velocity.set(0, 0, 0);
                this.hasLanded = true;
                console.log('Crystal settled on ground');
            }
        }
    }
    
    /**
     * Update floating animation when settled
     */
    updateFloatingAnimation() {
        const floatOffset = Math.sin(this.elapsedTime * this.floatSpeed) * this.floatHeight;
        this.position.y = this.baseY + 0.1 + floatOffset;
    }
    
    /**
     * Update magnetism toward player
     */
    updatePlayerMagnetism(playerPosition, deltaTime) {
        const distanceToPlayer = this.position.distanceTo(playerPosition);
        
        // Check for collection
        if (distanceToPlayer <= this.collectionRange) {
            this.collect();
            return;
        }
        
        // Apply magnetism if player is close enough
        if (distanceToPlayer <= this.magnetRange && this.hasLanded) {
            const toPlayer = new THREE.Vector3();
            toPlayer.subVectors(playerPosition, this.position);
            toPlayer.normalize();
            
            // Move toward player
            const movement = toPlayer.multiplyScalar(this.magnetSpeed * deltaTime);
            this.position.add(movement);
        }
    }
    
    /**
     * Collect the crystal
     */
    collect() {
        if (this.isCollected) return;
        
        this.isCollected = true;
        this.isActive = false;
        
        // Give XP to player
        if (this.xpSystem) {
            this.xpSystem.onCrystalCollected();
        }
        
        // Trigger orange collection effect at player position
        if (this.collectionEffectManager && this.playerPosition) {
            this.collectionEffectManager.spawnCollectionEffect(this.playerPosition);
        }
        
        console.log('Crystal collected!');
        
        // Could trigger collection sound, particles, etc.
        this.visible = false;
    }
    
    /**
     * Dispose of crystal resources
     */
    dispose() {
        if (this.sprite) {
            this.sprite.geometry.dispose();
            this.sprite.material.dispose();
        }
    }
}

/**
 * CrystalManager - Manages all crystals in the scene
 */
class CrystalManager {
    constructor(scene) {
        this.scene = scene;
        this.crystals = [];
        this.crystalTexture = null;
        this.camera = null; // Camera reference for billboarding
        this.collectionEffectManager = null; // Collection effect manager for visual feedback
        this.xpSystem = null; // XP system reference for gaining XP
        
        // Load crystal texture
        this.loadCrystalTexture();
    }
    
    /**
     * Load crystal texture
     */
    loadCrystalTexture() {
        const loader = new THREE.TextureLoader();
        loader.load(
            'assets/images/crystal.png',
            (texture) => {
                // Configure texture for pixel art
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                
                this.crystalTexture = texture;
                console.log('Crystal texture loaded successfully');
            },
            undefined,
            (error) => {
                console.error('Failed to load crystal texture:', error);
            }
        );
    }
    
    /**
     * Spawn crystals at enemy death location
     */
    spawnCrystalsAtDeath(position, count = null) {
        if (!this.crystalTexture) {
            console.warn('Crystal texture not loaded yet');
            return;
        }
        
        // Random count if not specified
        if (count === null) {
            count = 3 + Math.floor(Math.random() * 2); // 3-4 crystals
        }
        
        console.log(`Spawning ${count} crystals at enemy death`);
        
        for (let i = 0; i < count; i++) {
            const crystal = new Crystal(this.crystalTexture);
            
            // Set camera reference for billboarding
            if (this.camera) {
                crystal.setCamera(this.camera);
            }
            
            // Set collection effect manager for visual feedback
            if (this.collectionEffectManager) {
                crystal.setCollectionEffectManager(this.collectionEffectManager);
            }
            
            // Set XP system reference for gaining XP
            if (this.xpSystem) {
                crystal.setXPSystem(this.xpSystem);
            }
            
            // Slightly offset spawn position for each crystal
            const offsetPosition = position.clone();
            offsetPosition.x += (Math.random() - 0.5) * 1.0;
            offsetPosition.z += (Math.random() - 0.5) * 1.0;
            
            // Initialize with scatter physics
            crystal.scatter(offsetPosition, 3.0);
            
            this.scene.add(crystal);
            this.crystals.push(crystal);
        }
    }
    
    /**
     * Set camera reference for all crystals
     */
    setCamera(camera) {
        this.camera = camera;
        // Update camera reference for all existing crystals
        this.crystals.forEach(crystal => {
            crystal.setCamera(camera);
        });
    }

    /**
     * Set collection effect manager for visual feedback
     */
    setCollectionEffectManager(collectionEffectManager) {
        this.collectionEffectManager = collectionEffectManager;
        // Update collection effect manager for all existing crystals
        this.crystals.forEach(crystal => {
            crystal.setCollectionEffectManager(collectionEffectManager);
        });
    }

    /**
     * Set XP system reference for gaining XP
     */
    setXPSystem(xpSystem) {
        this.xpSystem = xpSystem;
        // Update XP system reference for all existing crystals
        this.crystals.forEach(crystal => {
            crystal.setXPSystem(xpSystem);
        });
    }

    /**
     * Update all crystals
     */
    update(deltaTime, playerPosition = null) {
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const crystal = this.crystals[i];
            
            crystal.update(deltaTime, playerPosition);
            
            // Remove collected crystals
            if (crystal.isCollected) {
                this.scene.remove(crystal);
                crystal.dispose();
                this.crystals.splice(i, 1);
            }
        }
    }
    
    /**
     * Get total crystal count
     */
    getCrystalCount() {
        return this.crystals.length;
    }
    
    /**
     * Clear all crystals (useful for scene transitions)
     */
    clearAll() {
        this.crystals.forEach(crystal => {
            this.scene.remove(crystal);
            crystal.dispose();
        });
        this.crystals = [];
    }
} 