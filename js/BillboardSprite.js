/**
 * BillboardSprite - A 2D sprite that always faces the camera
 * Mimics Cat Quest's billboarding technique for 2D sprites in 3D space
 */
class BillboardSprite extends THREE.Object3D {
    constructor(texture, width = 1, height = 1) {
        super();
        
        this.width = width;
        this.height = height;
        this.texture = texture;
        
        // Create the sprite geometry - a simple plane
        this.geometry = new THREE.PlaneGeometry(width, height);
        
        // Create material with the texture
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        
        // Create the mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.add(this.mesh);
        
        // Store reference to camera for billboarding
        this.camera = null;
        
        // Camera occlusion fading
        this.enableCameraFade = false;
        this.fadeStartDistance = 5.0; // Start fading when closer than this
        this.fadeEndDistance = 2.0; // Fully transparent at this distance
        this.targetOpacity = 1.0; // Store original opacity
        this.currentOpacity = 1.0;
        
        // Animation properties
        this.animationSpeed = 0.1;
        this.bobAmount = 0.05;
        this.bobSpeed = 3.0;
        this.time = 0;
        this.baseY = 0;
    }
    
    /**
     * Set the camera reference for billboarding
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Update the sprite to face the camera (billboarding)
     * This is the core of Cat Quest's 2D-in-3D technique
     */
    update(deltaTime) {
        // Apply 35-degree backward tilt to prevent skewing when camera is elevated
        // Convert 35 degrees to radians
        const tiltAngle = -35 * Math.PI / 180; // Negative for backward tilt
        
        this.rotation.x = tiltAngle;
        this.rotation.y = 0;
        this.rotation.z = 0;
        
        // Keep sprite at base Y position (no bobbing)
        this.position.y = this.baseY;
        
        // Update camera-based fading
        if (this.enableCameraFade && this.camera) {
            this.updateCameraFade();
        }
    }
    
    /**
     * Update opacity based on camera distance
     */
    updateCameraFade() {
        const distance = this.position.distanceTo(this.camera.position);
        
        let targetOpacity = this.targetOpacity;
        
        if (distance < this.fadeEndDistance) {
            // Fully transparent when very close
            targetOpacity = 0;
        } else if (distance < this.fadeStartDistance) {
            // Fade based on distance
            const fadeRange = this.fadeStartDistance - this.fadeEndDistance;
            const fadeProgress = (distance - this.fadeEndDistance) / fadeRange;
            targetOpacity = this.targetOpacity * fadeProgress;
        }
        
        // Smooth opacity transition
        this.currentOpacity += (targetOpacity - this.currentOpacity) * 0.1;
        
        // Apply opacity to material
        if (this.material) {
            this.material.opacity = this.currentOpacity;
            // Hide completely when nearly transparent to avoid rendering overhead
            this.visible = this.currentOpacity > 0.01;
        }
    }
    
    /**
     * Enable camera-based fading
     */
    enableCameraOcclusionFade(fadeStart = 5.0, fadeEnd = 2.0) {
        this.enableCameraFade = true;
        this.fadeStartDistance = fadeStart;
        this.fadeEndDistance = fadeEnd;
        if (this.material) {
            this.targetOpacity = this.material.opacity || 1.0;
        }
    }
    
    /**
     * Set the base Y position (ground level)
     */
    setBaseY(y) {
        this.baseY = y;
        this.position.y = y;
    }
    
    /**
     * Play animation by changing texture
     */
    setTexture(texture) {
        this.material.map = texture;
        this.material.needsUpdate = true;
    }
    
    /**
     * Set sprite scale
     */
    setScale(scale) {
        this.scale.set(scale, scale, scale);
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        if (this.texture) {
            this.texture.dispose();
        }
    }
}

/**
 * AnimatedBillboardSprite - Extends BillboardSprite with animation frames
 * Similar to how Cat Quest handles character animations
 */
class AnimatedBillboardSprite extends BillboardSprite {
    constructor(textures, width = 1, height = 1, fps = 8) {
        super(textures[0], width, height);
        
        this.textures = textures;
        this.fps = fps;
        this.frameTime = 1 / fps;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.loop = true;
    }
    
    /**
     * Update animation frames
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.isPlaying && this.textures.length > 1) {
            this.elapsedTime += deltaTime;
            
            if (this.elapsedTime >= this.frameTime) {
                this.elapsedTime = 0;
                this.currentFrame++;
                
                if (this.currentFrame >= this.textures.length) {
                    if (this.loop) {
                        this.currentFrame = 0;
                    } else {
                        this.currentFrame = this.textures.length - 1;
                        this.isPlaying = false;
                    }
                }
                
                this.setTexture(this.textures[this.currentFrame]);
            }
        }
    }
    
    /**
     * Play animation
     */
    play() {
        this.isPlaying = true;
        this.currentFrame = 0;
        this.elapsedTime = 0;
    }
    
    /**
     * Stop animation
     */
    stop() {
        this.isPlaying = false;
    }
    
    /**
     * Set animation loop
     */
    setLoop(loop) {
        this.loop = loop;
    }
} 