/**
 * LightningStrike - Visual lightning strike effect for enemies
 * Uses a sprite sheet to display animated lightning strikes
 */
class LightningStrike extends THREE.Object3D {
    constructor(texture, frameWidth = 128, frameHeight = 256, columns = 8, rows = 1, fps = 30) {
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
        
        // Create sprite
        const spriteSize = 3.0; // Reduced by 50% from 6.0 to 3.0
        this.geometry = new THREE.PlaneGeometry(spriteSize, spriteSize * 2); // Taller for lightning bolt
        
        // Create material with transparency and glow
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            color: 0xffffff,
            emissive: 0x4488ff, // Blue-white glow
            emissiveIntensity: 0.8
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
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
     * Play the lightning strike animation at a specific position
     */
    play(position, onComplete = null) {
        console.log('Playing lightning strike at position:', position);
        
        this.position.copy(position);
        this.position.y = position.y + 2.0; // Position above enemy
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.visible = true;
        this.onComplete = onComplete;
        
        // Keep lightning strikes upright (no random rotation)
        this.rotation.set(0, 0, 0);
        
        // Start with full opacity
        this.material.opacity = 1.0;
        
        // Set initial frame
        this.updateUVCoordinates();
    }
    
    /**
     * Update animation
     */
    update(deltaTime) {
        if (!this.isPlaying) return;
        
        this.elapsedTime += deltaTime;
        
        if (this.elapsedTime >= this.frameTime) {
            this.elapsedTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= this.totalFrames) {
                // Animation complete
                console.log('Lightning strike animation complete');
                this.isPlaying = false;
                this.visible = false;
                
                if (this.onComplete) {
                    this.onComplete(this);
                }
            } else {
                this.updateUVCoordinates();
            }
        }
        
        // Add slight flickering effect during animation
        if (this.isPlaying && Math.random() < 0.2) {
            this.material.opacity = 0.8 + Math.random() * 0.2; // Flicker between 0.8 and 1.0
        }
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

/**
 * LightningStrikeManager - Manages pool of lightning strike effects
 */
class LightningStrikeManager {
    constructor(scene, maxEffects = 10) {
        this.scene = scene;
        this.maxEffects = maxEffects;
        this.effectPool = [];
        this.activeEffects = [];
        this.lightningTexture = null;
    }
    
    /**
     * Initialize the lightning strike system
     */
    async initialize() {
        // Load lightning texture
        const loader = new THREE.TextureLoader();
        
        try {
            this.lightningTexture = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/sprites/lightning_strike.png',
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        console.log('Lightning texture loaded successfully');
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load lightning texture:', error);
                        reject(error);
                    }
                );
            });
            
            // Create effect pool
            for (let i = 0; i < this.maxEffects; i++) {
                const effect = new LightningStrike(this.lightningTexture, 128, 256, 8, 1, 30);
                this.scene.add(effect);
                this.effectPool.push(effect);
            }
            
            console.log('Lightning strike system initialized');
        } catch (error) {
            console.error('Failed to initialize lightning strikes:', error);
        }
    }
    
    /**
     * Spawn a lightning strike at a position
     */
    spawnLightning(position) {
        console.log('Spawning lightning at:', position);
        
        if (this.effectPool.length === 0) {
            console.warn('No available lightning effects in pool');
            return;
        }
        
        // Get effect from pool
        const effect = this.effectPool.pop();
        this.activeEffects.push(effect);
        
        // Play effect
        effect.play(position, (completedEffect) => {
            // Return to pool when complete
            const index = this.activeEffects.indexOf(completedEffect);
            if (index > -1) {
                this.activeEffects.splice(index, 1);
                this.effectPool.push(completedEffect);
            }
        });
    }
    
    /**
     * Update all active effects
     */
    update(deltaTime) {
        this.activeEffects.forEach(effect => {
            effect.update(deltaTime);
        });
    }
    
    /**
     * Dispose of all effects
     */
    dispose() {
        [...this.effectPool, ...this.activeEffects].forEach(effect => {
            if (effect.parent) {
                effect.parent.remove(effect);
            }
            effect.dispose();
        });
        
        if (this.lightningTexture) {
            this.lightningTexture.dispose();
        }
    }
} 