/**
 * ImpactEffect - Animated impact effect for combat hits
 * Uses a sprite sheet to display impact animations
 */
class ImpactEffect extends THREE.Object3D {
    constructor(texture, frameWidth = 128, frameHeight = 128, columns = 4, rows = 4, fps = 90) {
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
        const spriteSize = 4.5; // Increased by another 50% from 3.0 to 4.5
        this.geometry = new THREE.PlaneGeometry(spriteSize, spriteSize);
        
        // Create material with transparency
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01, // Lower alpha test for better visibility
            side: THREE.DoubleSide,
            depthWrite: false, // Don't write to depth buffer for effects
            depthTest: false, // Render on top of everything
            color: 0xffffff, // White color (no tinting)
            emissive: 0xffffff, // Make it glow
            emissiveIntensity: 0.5
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.add(this.mesh);
        
        // Set render order to render on top
        this.renderOrder = 999;
        this.mesh.renderOrder = 999;
        
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
     * Play the impact animation at a specific position
     */
    play(position, onComplete = null) {
        console.log('Playing impact effect at position:', position);
        
        this.position.copy(position);
        this.position.y = position.y - 1.0; // Lowered further down to center on enemy body
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.visible = true;
        this.onComplete = onComplete;
        
        // Random rotation on Z axis for variety
        const randomRotation = Math.random() * Math.PI * 2; // 0 to 360 degrees
        this.rotation.set(0, 0, randomRotation);
        
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
                console.log('Impact animation complete');
                this.isPlaying = false;
                this.visible = false;
                
                if (this.onComplete) {
                    this.onComplete(this);
                }
            } else {
                this.updateUVCoordinates();
            }
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
 * ImpactEffectManager - Manages pool of impact effects
 */
class ImpactEffectManager {
    constructor(scene, maxEffects = 10) {
        this.scene = scene;
        this.maxEffects = maxEffects;
        this.effectPool = [];
        this.activeEffects = [];
        this.impactTexture = null;
    }
    
    /**
     * Initialize the impact effect system
     */
    async initialize() {
        // Load impact texture
        const loader = new THREE.TextureLoader();
        
        try {
            this.impactTexture = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/sprites/Impact_Cut_V5_spritesheet.png',
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        console.log('Impact texture loaded successfully');
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load impact texture:', error);
                        reject(error);
                    }
                );
            });
            
            // Create effect pool
            for (let i = 0; i < this.maxEffects; i++) {
                const effect = new ImpactEffect(this.impactTexture, 128, 128, 4, 4, 90);
                this.scene.add(effect);
                this.effectPool.push(effect);
            }
            
            console.log('Impact effect system initialized');
        } catch (error) {
            console.error('Failed to initialize impact effects:', error);
        }
    }
    
    /**
     * Spawn an impact effect at a position
     */
    spawnImpact(position) {
        console.log('Spawning impact at:', position);
        
        if (this.effectPool.length === 0) {
            console.warn('No available impact effects in pool');
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
        
        if (this.impactTexture) {
            this.impactTexture.dispose();
        }
    }
} 