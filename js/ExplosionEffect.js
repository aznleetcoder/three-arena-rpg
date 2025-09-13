/**
 * ExplosionEffect - Animated explosion effect for fireball impacts
 * Uses a sprite sheet to display explosion animations
 */
class ExplosionEffect extends THREE.Object3D {
    constructor(texture, frameWidth = 64, frameHeight = 64, columns = 8, rows = 1, fps = 20) {
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
        
        // Camera reference for billboarding
        this.camera = null;
        
        // Create sprite
        const spriteSize = 3.0; // Size of the explosion
        this.geometry = new THREE.PlaneGeometry(spriteSize, spriteSize);
        
        // Create material with transparency and glow
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            color: 0xffffff,
            emissive: 0xff6600, // Orange glow for explosion
            emissiveIntensity: 0.8
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Tilt the explosion back by 45 degrees (around X-axis)
        this.mesh.rotation.x = Math.PI / 4; // 45 degrees backward tilt
        
        this.add(this.mesh);
        
        // Set render order to render on top
        this.renderOrder = 1001;
        this.mesh.renderOrder = 1001;
        
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
     * Play the explosion animation at a specific position
     */
    play(position, onComplete = null) {
        console.log('Playing explosion at position:', position);
        
        this.position.copy(position);
        this.position.y += 0.5; // Slightly above ground
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.visible = true;
        this.onComplete = onComplete;
        
        // Start with full opacity
        this.material.opacity = 1.0;
        
        // Set initial frame
        this.updateUVCoordinates();
    }
    
    /**
     * Set camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Update billboarding to face camera while maintaining tilt
     */
    updateBillboarding() {
        if (!this.camera) return;
        
        // Make the explosion face the camera
        this.lookAt(this.camera.position);
        
        // Reapply the 45-degree backward tilt after billboarding
        this.mesh.rotation.x = Math.PI / 4; // 45 degrees backward tilt
    }
    
    /**
     * Update animation
     */
    update(deltaTime) {
        if (!this.isPlaying) return;
        
        // Update billboarding to face camera
        this.updateBillboarding();
        
        this.elapsedTime += deltaTime;
        
        if (this.elapsedTime >= this.frameTime) {
            this.elapsedTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= this.totalFrames) {
                // Animation complete
                console.log('Explosion animation complete');
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
     * Dispose of explosion resources
     */
    dispose() {
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}

/**
 * ExplosionManager - Manages pool of explosion effects
 */
class ExplosionManager {
    constructor(scene, maxExplosions = 10) {
        this.scene = scene;
        this.maxExplosions = maxExplosions;
        this.explosionPool = [];
        this.activeExplosions = [];
        this.explosionTexture = null;
        this.camera = null;
    }
    
    /**
     * Initialize the explosion system
     */
    async initialize() {
        // Load explosion texture
        const loader = new THREE.TextureLoader();
        
        try {
            this.explosionTexture = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/sprites/explode.png',
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        console.log('Explosion texture loaded successfully');
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load explosion texture:', error);
                        reject(error);
                    }
                );
            });
            
            // Determine spritesheet layout from texture dimensions
            const image = this.explosionTexture.image;
            const columns = Math.floor(image.width / 64); // 64x64 sprites
            const rows = Math.floor(image.height / 64);
            
            console.log(`Explosion spritesheet: ${columns}x${rows} (${columns * rows} frames)`);
            
            // Create explosion pool
            for (let i = 0; i < this.maxExplosions; i++) {
                const explosion = new ExplosionEffect(this.explosionTexture, 64, 64, columns, rows, 12);
                if (this.camera) {
                    explosion.setCamera(this.camera);
                }
                this.scene.add(explosion);
                this.explosionPool.push(explosion);
            }
            
            console.log('Explosion system initialized');
        } catch (error) {
            console.error('Failed to initialize explosion system:', error);
        }
    }
    
    /**
     * Set camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
        // Update camera reference for all explosions
        [...this.explosionPool, ...this.activeExplosions].forEach(explosion => {
            explosion.setCamera(camera);
        });
    }
    
    /**
     * Spawn an explosion at a position
     */
    spawnExplosion(position) {
        console.log('Spawning explosion at:', position);
        
        if (this.explosionPool.length === 0) {
            console.warn('No available explosions in pool');
            return;
        }
        
        // Get explosion from pool
        const explosion = this.explosionPool.pop();
        this.activeExplosions.push(explosion);
        
        // Set camera reference if available
        if (this.camera) {
            explosion.setCamera(this.camera);
        }
        
        // Play explosion
        explosion.play(position, (completedExplosion) => {
            // Return to pool when complete
            const index = this.activeExplosions.indexOf(completedExplosion);
            if (index > -1) {
                this.activeExplosions.splice(index, 1);
                this.explosionPool.push(completedExplosion);
            }
        });
    }
    
    /**
     * Update all active explosions
     */
    update(deltaTime) {
        this.activeExplosions.forEach(explosion => {
            explosion.update(deltaTime);
        });
    }
    
    /**
     * Dispose of all explosions
     */
    dispose() {
        [...this.explosionPool, ...this.activeExplosions].forEach(explosion => {
            if (explosion.parent) {
                explosion.parent.remove(explosion);
            }
            explosion.dispose();
        });
        
        if (this.explosionTexture) {
            this.explosionTexture.dispose();
        }
    }
} 