/**
 * DamageNumber - Animated damage numbers that appear when enemies take damage
 */
class DamageNumber extends THREE.Object3D {
    constructor() {
        super();
        
        // Create canvas for text with higher resolution
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024; // 4x resolution for better quality when close
        this.canvas.height = 512; // 4x resolution
        this.context = this.canvas.getContext('2d', { alpha: true });
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.minFilter = THREE.LinearMipmapLinearFilter; // Better quality for scaling
        this.texture.generateMipmaps = true;
        
        // Create sprite material
        this.material = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true,
            opacity: 1,
            depthTest: false,
            depthWrite: false,
            fog: false // Don't be affected by fog/depth effects
        });
        
        // Create sprite
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.scale.set(4.0, 2.0, 1); // 2x size
        this.sprite.renderOrder = 10001; // Ensure damage numbers appear above everything
        this.sprite.layers.set(1); // Set to UI layer
        this.add(this.sprite);
        
        // Screen space size settings
        this.screenSpaceSize = false; // Disabled for now
        this.targetScreenHeight = 60; // Target height in pixels on screen
        
        // Animation properties
        this.velocity = new THREE.Vector3();
        this.lifetime = 0;
        this.maxLifetime = 0.8; // Reduced from 1.2 seconds for faster fade
        this.isActive = false;
        
        // Hide by default
        this.visible = false;
    }
    
    /**
     * Show damage number with animation
     */
    show(damage, position, isCritical = false) {
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set text properties (4x for higher resolution canvas)
        const fontSize = isCritical ? 88 : 72; // 4x font sizes
        this.context.font = `${fontSize}px Bangers`;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        
        // Add stroke for better visibility
        this.context.strokeStyle = '#000000';
        this.context.lineWidth = 16; // 4x stroke width
        
        // Set fill color based on damage type
        if (isCritical) {
            this.context.fillStyle = '#FFD700'; // Gold for critical
        } else {
            this.context.fillStyle = '#FFFFFF'; // White for normal
        }
        
        // Draw text (centered on 4x canvas)
        const text = damage.toString();
        this.context.strokeText(text, 512, 256); // Centered on 1024x512 canvas
        this.context.fillText(text, 512, 256);
        
        // Add critical text
        if (isCritical) {
            this.context.font = '48px Bangers'; // 4x font size
            this.context.strokeText('CRITICAL!', 512, 340); // Shifted up from 384 to 340
            this.context.fillText('CRITICAL!', 512, 340);
        }
        
        // Update texture
        this.texture.needsUpdate = true;
        
        // Set position
        this.position.copy(position);
        this.position.y += 0; // Start at enemy position (lowered by 1 unit from previous)
        
        // Set random velocity (reduced upward movement)
        this.velocity.set(
            (Math.random() - 0.5) * 1, // Reduced X velocity
            1.5 + Math.random() * 0.5,  // Much less upward velocity
            (Math.random() - 0.5) * 1  // Reduced Z velocity
        );
        
        // Reset animation
        this.lifetime = 0;
        this.isActive = true;
        this.visible = true;
        this.material.opacity = 1;
        
        // Store critical state for screen space sizing
        this.isCritical = isCritical;
        
        // Initial scale will be set by updateScreenSpaceSize
        const scale = isCritical ? 6.0 : 4.0; // 2x scale
        this.sprite.scale.set(scale, scale * 0.5, 1);
    }
    
    /**
     * Update animation
     */
    update(deltaTime, camera = null) {
        if (!this.isActive) return;
        
        this.lifetime += deltaTime;
        
        if (this.lifetime >= this.maxLifetime) {
            this.isActive = false;
            this.visible = false;
            return;
        }
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Apply gravity (reduced)
        this.velocity.y -= 2 * deltaTime;
        
        // Fade out
        const fadeStart = 0.3; // Start fading earlier (was 0.6)
        if (this.lifetime > fadeStart) {
            const fadeProgress = (this.lifetime - fadeStart) / (this.maxLifetime - fadeStart);
            this.material.opacity = 1 - fadeProgress;
        }
        
        // Maintain consistent screen size
        if (this.screenSpaceSize && camera) {
            this.updateScreenSpaceSize(camera);
        }
        
        // Scale pulse for first 0.2 seconds
        if (this.lifetime < 0.2) {
            const pulseProgress = this.lifetime / 0.2;
            const scaleMod = 1 + Math.sin(pulseProgress * Math.PI) * 0.3;
            // Apply pulse to base scale, not cumulative
            const baseScale = this.lastBaseScale || new THREE.Vector3(4.0, 2.0, 1);
            this.sprite.scale.copy(baseScale).multiplyScalar(scaleMod);
        }
    }
    
    /**
     * Update sprite scale to maintain consistent screen size
     */
    updateScreenSpaceSize(camera) {
        // Get world position of sprite
        const worldPos = new THREE.Vector3();
        this.getWorldPosition(worldPos);
        
        // Calculate distance from camera
        const distance = camera.position.distanceTo(worldPos);
        
        // Calculate scale factor to maintain consistent screen size
        // This is based on the perspective projection formula
        const vFov = camera.fov * Math.PI / 180; // vertical fov in radians
        const height = 2 * Math.tan(vFov / 2) * distance;
        
        // Calculate desired world height based on screen pixels
        const targetWorldHeight = (this.targetScreenHeight / window.innerHeight) * height;
        
        // Set sprite scale (maintain aspect ratio 2:1)
        const scale = targetWorldHeight * (this.isCritical ? 1.5 : 1.0);
        this.sprite.scale.set(scale * 2, scale, 1);
        
        // Store base scale for pulse animation
        this.lastBaseScale = this.sprite.scale.clone();
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        this.texture.dispose();
        this.material.dispose();
    }
}

/**
 * DamageNumberManager - Manages pool of damage numbers
 */
class DamageNumberManager {
    constructor(scene, poolSize = 20) {
        this.scene = scene;
        this.pool = [];
        this.active = [];
        
        // Create pool
        for (let i = 0; i < poolSize; i++) {
            const damageNumber = new DamageNumber();
            this.scene.add(damageNumber);
            this.pool.push(damageNumber);
        }
    }
    
    /**
     * Show damage number
     */
    showDamage(damage, position, isCritical = false) {
        // Get from pool
        if (this.pool.length === 0) return;
        
        const damageNumber = this.pool.pop();
        this.active.push(damageNumber);
        
        damageNumber.show(damage, position, isCritical);
    }
    
    /**
     * Update all active damage numbers
     */
    update(deltaTime, camera = null) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const damageNumber = this.active[i];
            damageNumber.update(deltaTime, camera);
            
            // Return to pool if inactive
            if (!damageNumber.isActive) {
                this.active.splice(i, 1);
                this.pool.push(damageNumber);
            }
        }
    }
    
    /**
     * Dispose all resources
     */
    dispose() {
        [...this.pool, ...this.active].forEach(damageNumber => {
            if (damageNumber.parent) {
                damageNumber.parent.remove(damageNumber);
            }
            damageNumber.dispose();
        });
    }
} 