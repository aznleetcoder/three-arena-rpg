/**
 * CollectionEffect - Orange circle blur effect for item collection
 * Shows on player when items are collected
 */
class CollectionEffect extends THREE.Object3D {
    constructor(size = 2.0) {
        super();
        
        this.size = size;
        this.isActive = false;
        this.elapsedTime = 0;
        this.duration = 0.4; // Total effect duration
        this.fadeInTime = 0.1; // Fast fade in
        this.fadeOutTime = 0.3; // Slower fade out
        
        // Create the orange circle effect
        this.createEffectSprite();
    }
    
    /**
     * Create the orange circle blur effect
     */
    createEffectSprite() {
        // Create a circular gradient texture
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Create radial gradient (orange center fading to transparent)
        const gradient = context.createRadialGradient(
            size/2, size/2, 0,        // Inner circle (center)
            size/2, size/2, size/2    // Outer circle (edge)
        );
        gradient.addColorStop(0, 'rgba(255, 140, 0, 0.8)');    // Orange center
        gradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.6)');  // Orange mid
        gradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.2)');  // Fading orange
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0.0)');    // Transparent edge
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite geometry and material
        const geometry = new THREE.PlaneGeometry(this.size, this.size);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending // Additive blending for glow effect
        });
        
        this.sprite = new THREE.Mesh(geometry, material);
        this.sprite.renderOrder = 300; // Render on top
        this.add(this.sprite);
        
        // Initially hidden
        this.visible = false;
    }
    
    /**
     * Start the collection effect at player position
     */
    start(playerPosition) {
        this.position.copy(playerPosition);
        this.position.y += 0.5; // Slightly above player center
        
        this.elapsedTime = 0;
        this.isActive = true;
        this.visible = true;
        
        console.log('Collection effect started');
    }
    
    /**
     * Update the effect animation
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.elapsedTime += deltaTime;
        
        // Calculate fade animation
        let opacity = 0;
        
        if (this.elapsedTime < this.fadeInTime) {
            // Fade in quickly
            opacity = (this.elapsedTime / this.fadeInTime) * 0.8;
        } else if (this.elapsedTime < this.duration - this.fadeOutTime) {
            // Hold at peak
            opacity = 0.8;
        } else if (this.elapsedTime < this.duration) {
            // Fade out
            const fadeOutProgress = (this.elapsedTime - (this.duration - this.fadeOutTime)) / this.fadeOutTime;
            opacity = 0.8 * (1 - fadeOutProgress);
        } else {
            // Effect complete
            this.complete();
            return;
        }
        
        // Apply opacity
        if (this.sprite && this.sprite.material) {
            this.sprite.material.opacity = opacity;
        }
        
        // Slight scale animation (grows slightly)
        const progress = this.elapsedTime / this.duration;
        const scale = 1 + progress * 0.3; // Grows 30% over duration
        this.scale.set(scale, scale, scale);
    }
    
    /**
     * Complete the effect
     */
    complete() {
        this.isActive = false;
        this.visible = false;
        
        // Reset for potential reuse
        this.elapsedTime = 0;
        this.scale.set(1, 1, 1);
        
        if (this.sprite && this.sprite.material) {
            this.sprite.material.opacity = 0;
        }
    }
    
    /**
     * Dispose of effect resources
     */
    dispose() {
        if (this.sprite) {
            this.sprite.geometry.dispose();
            if (this.sprite.material.map) {
                this.sprite.material.map.dispose();
            }
            this.sprite.material.dispose();
        }
    }
}

/**
 * CollectionEffectManager - Manages collection effects
 */
class CollectionEffectManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
        this.pooledEffects = []; // Reuse effects for performance
    }
    
    /**
     * Spawn a collection effect at player position
     */
    spawnCollectionEffect(playerPosition) {
        let effect;
        
        // Try to reuse a pooled effect
        if (this.pooledEffects.length > 0) {
            effect = this.pooledEffects.pop();
        } else {
            // Create new effect
            effect = new CollectionEffect();
            this.scene.add(effect);
        }
        
        // Start the effect
        effect.start(playerPosition);
        this.activeEffects.push(effect);
    }
    
    /**
     * Spawn a specific type of collection effect
     */
    spawnEffect(playerPosition, type = 'crystal') {
        let effect;
        
        // Try to reuse a pooled effect
        if (this.pooledEffects.length > 0) {
            effect = this.pooledEffects.pop();
        } else {
            // Create new effect
            effect = new CollectionEffect();
            this.scene.add(effect);
        }
        
        // Set effect color based on type
        if (type === 'health') {
            this.setEffectColor(effect, 'health');
        } else {
            this.setEffectColor(effect, 'crystal');
        }
        
        // Start the effect
        effect.start(playerPosition);
        this.activeEffects.push(effect);
    }
    
    /**
     * Set effect color based on type
     */
    setEffectColor(effect, type) {
        if (!effect.sprite || !effect.sprite.material || !effect.sprite.material.map) return;
        
        // Create new colored texture
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Create radial gradient with appropriate color
        const gradient = context.createRadialGradient(
            size/2, size/2, 0,        // Inner circle (center)
            size/2, size/2, size/2    // Outer circle (edge)
        );
        
        if (type === 'health') {
            // Red health effect
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');    // Red center
            gradient.addColorStop(0.3, 'rgba(255, 0, 0, 0.6)');  // Red mid
            gradient.addColorStop(0.7, 'rgba(255, 0, 0, 0.2)');  // Fading red
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0.0)');    // Transparent edge
        } else {
            // Orange crystal effect (default)
            gradient.addColorStop(0, 'rgba(255, 140, 0, 0.8)');   // Orange center
            gradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.6)'); // Orange mid
            gradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.2)'); // Fading orange
            gradient.addColorStop(1, 'rgba(255, 140, 0, 0.0)');   // Transparent edge
        }
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        // Update texture
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.needsUpdate = true;
        
        // Dispose old texture and set new one
        if (effect.sprite.material.map) {
            effect.sprite.material.map.dispose();
        }
        effect.sprite.material.map = newTexture;
    }
    
    /**
     * Update all active effects
     */
    update(deltaTime) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            
            effect.update(deltaTime);
            
            // Move completed effects back to pool
            if (!effect.isActive) {
                this.activeEffects.splice(i, 1);
                this.pooledEffects.push(effect);
            }
        }
    }
    
    /**
     * Get count of active effects
     */
    getActiveCount() {
        return this.activeEffects.length;
    }
    
    /**
     * Dispose of all effects
     */
    dispose() {
        [...this.activeEffects, ...this.pooledEffects].forEach(effect => {
            this.scene.remove(effect);
            effect.dispose();
        });
        this.activeEffects = [];
        this.pooledEffects = [];
    }
} 