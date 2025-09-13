/**
 * AttackTelegraph - Visual warning system for enemy attacks
 * Shows red circles that pulse and grow before attacks hit
 */
class AttackTelegraph extends THREE.Object3D {
    constructor(attackType = 'melee', range = 2.0, warningTime = 1.2, customOpacity = null, customFadeTime = null, customThickness = null) {
        super();
        
        this.attackType = attackType;
        this.range = range;
        this.warningTime = warningTime;
        this.customOpacity = customOpacity; // Store custom opacity
        this.customFadeTime = customFadeTime; // Custom fade-out start time
        this.customThickness = customThickness; // Custom border thickness
        this.elapsedTime = 0;
        this.isActive = false;
        
        // Glow effect properties
        this.glowMesh = null;
        this.hasGlowEffect = false;
        this.explosionTriggered = false;
        this.explosionTime = 0;
        this.glowFadeOutDuration = 1.0; // 1 second fade out after explosion
        
        // Create the telegraph visual
        this.createTelegraphGeometry();
        
        // Animation properties
        this.pulseSpeed = 4.0; // Pulses per second
        this.maxIntensity = 0.8;
        this.minIntensity = 0.2;
        
        // Initially hidden
        this.visible = false;
    }
    
    /**
     * Create the visual geometry for the telegraph
     */
    createTelegraphGeometry() {
        // Create different shapes based on attack type
        switch (this.attackType) {
            case 'melee':
                this.createCircleTelegraph();
                break;
            case 'ranged':
                this.createLineTelegraph();
                break;
            case 'area':
                this.createLargeCircleTelegraph();
                break;
            default:
                this.createCircleTelegraph();
        }
    }
    
    /**
     * Create circular telegraph for melee attacks
     */
    createCircleTelegraph() {
        // Create very thin border ring (50% thinner than before)
        const borderGeometry = new THREE.RingGeometry(this.range * 0.97, this.range, 32);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false // Ignore depth testing to render over grass
        });
        
        this.borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
        this.borderMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.borderMesh.renderOrder = 1001; // Render on top of everything
        this.add(this.borderMesh);
        
        // Create radial gradient texture
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Create radial gradient from center (transparent) to edge (white)
        const gradient = context.createRadialGradient(
            size/2, size/2, 0,        // Inner circle (center, transparent)
            size/2, size/2, size/2    // Outer circle (edge, white)
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');    // Transparent center
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');    // Reduced alpha white edge
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create main circle with gradient
        const geometry = new THREE.CircleGeometry(this.range, 32);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false // Ignore depth testing to render over grass
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.mesh.renderOrder = 999; // Render below border but above grass
        this.add(this.mesh);
    }
    
    /**
     * Create line telegraph for ranged attacks
     */
    createLineTelegraph() {
        const geometry = new THREE.PlaneGeometry(0.5, this.range * 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false // Ignore depth testing to render over grass
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.renderOrder = 1000; // Much higher than grass
        this.add(this.mesh);
    }
    
    /**
     * Create large circle for area attacks
     */
    createLargeCircleTelegraph() {
        // For area attacks (fireballs), only create the glow effect, no border ring
        // The glow serves as the telegraph itself
        
        // Add glow effect for area attacks (fireballs)
        this.createGlowEffect();
    }
    
    /**
     * Create glow effect for area attacks (similar to crystal absorption)
     */
    createGlowEffect() {
        if (this.attackType !== 'area') return;
        
        // Create a circular gradient texture (orange-red glow)
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Create radial gradient (orange-red center fading to transparent)
        const gradient = context.createRadialGradient(
            size/2, size/2, 0,        // Inner circle (center)
            size/2, size/2, size/2    // Outer circle (edge)
        );
        gradient.addColorStop(0, 'rgba(220, 0, 0, 0.8)');    // Red center
        gradient.addColorStop(0.3, 'rgba(220, 0, 0, 0.6)');  // Red mid
        gradient.addColorStop(0.7, 'rgba(220, 0, 0, 0.3)');  // Fading red
        gradient.addColorStop(1, 'rgba(220, 0, 0, 0.0)');    // Transparent edge
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create glow geometry and material
        const glowSize = this.range * 4.5; // 3x bigger than before (1.5 * 3 = 4.5)
        const geometry = new THREE.PlaneGeometry(glowSize, glowSize);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0, // Start invisible
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending // Additive blending for glow effect
        });
        
        this.glowMesh = new THREE.Mesh(geometry, material);
        this.glowMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.glowMesh.renderOrder = 998; // Below main telegraph but above grass
        this.add(this.glowMesh);
        
        this.hasGlowEffect = true;
    }
    
    /**
     * Start the telegraph warning
     */
    startTelegraph(position, direction = null, followTarget = null) {
        this.position.copy(position);
        this.position.y = 0.0; // On the ground
        
        // Store reference to follow target (enemy)
        this.followTarget = followTarget;
        
        // Orient based on direction for line telegraphs
        if (direction && this.attackType === 'ranged') {
            const angle = Math.atan2(direction.x, direction.z);
            this.rotation.y = angle;
        }
        
        this.elapsedTime = 0;
        this.isActive = true;
        this.visible = true;
        
        console.log('Telegraph started at position:', position);
    }
    
    /**
     * Update telegraph animation
     */
    update(deltaTime) {
        if (!this.isActive && !this.explosionTriggered) return;
        
        // Follow the target (enemy) position if available
        if (this.followTarget && this.followTarget.position) {
            this.position.copy(this.followTarget.position);
            this.position.y = 0.0; // Keep on the ground
        }
        
        this.elapsedTime += deltaTime;
        
        // Calculate progress (0 to 1)
        const progress = Math.min(this.elapsedTime / this.warningTime, 1);
        
        // Fade in/out effect - use custom fade time if provided
        let fadeIntensity;
        if (this.customFadeTime !== null) {
            // Custom fade timing - fade out starts at customFadeTime seconds
            const fadeStartTime = this.customFadeTime;
            const fadeEndTime = this.warningTime;
            const fadeDuration = fadeEndTime - fadeStartTime;
            
            if (this.elapsedTime < fadeStartTime) {
                // Hold at full intensity until fade start time
                fadeIntensity = 1.0;
            } else if (this.elapsedTime < fadeEndTime) {
                // Fade out from customFadeTime to warningTime
                const fadeProgress = (this.elapsedTime - fadeStartTime) / fadeDuration;
                fadeIntensity = 1.0 - fadeProgress;
            } else {
                // Completely faded out
                fadeIntensity = 0.0;
            }
        } else {
            // Default fade timing - fade in for first 15%, hold for middle 70%, fade out for last 15%
            if (progress < 0.15) {
                // Fast fade in
                fadeIntensity = progress / 0.15;
            } else if (progress < 0.85) {
                // Hold at full intensity
                fadeIntensity = 1.0;
            } else {
                // Fast fade out
                fadeIntensity = 1.0 - ((progress - 0.85) / 0.15);
            }
        }
        
        // Keep white color throughout animation
        const color = new THREE.Color(0xffffff);
        
        // Apply to materials with fade effect
        let telegraphOpacity = fadeIntensity * 0.2;
        
        // If explosion has triggered, fade out the main telegraph elements too
        if (this.explosionTriggered && this.hasGlowEffect) {
            const explosionFadeProgress = Math.min(this.explosionTime / this.glowFadeOutDuration, 1);
            telegraphOpacity = 0.2 * (1 - explosionFadeProgress); // Fade out with glow
        }
        
        if (this.mesh && this.mesh.material) {
            this.mesh.material.opacity = telegraphOpacity;
        }
        
        if (this.borderMesh && this.borderMesh.material) {
            this.borderMesh.material.opacity = telegraphOpacity;
        }
        
        // Update glow effect for area attacks (fireballs)
        if (this.hasGlowEffect && this.glowMesh && this.glowMesh.material) {
            let glowIntensity = 0;
            
            if (!this.explosionTriggered) {
                // Before explosion: Glow intensity increases as fireball falls (starts at 40% of warning time)
                if (progress >= 0.4) {
                    const glowProgress = (progress - 0.4) / 0.6; // 0 to 1 over 60% of warning time
                    glowIntensity = glowProgress * 0.8; // Max intensity of 0.8
                }
                
                // Check if explosion should trigger
                if (progress >= 1) {
                    this.explosionTriggered = true;
                    this.explosionTime = 0;
                }
            } else {
                // After explosion: Fade out the glow over time
                this.explosionTime += deltaTime;
                const fadeProgress = Math.min(this.explosionTime / this.glowFadeOutDuration, 1);
                glowIntensity = 0.8 * (1 - fadeProgress); // Fade from 0.8 to 0
                
                // Hide the telegraph when fade-out is complete
                if (fadeProgress >= 1) {
                    this.visible = false;
                }
            }
            
            this.glowMesh.material.opacity = glowIntensity;
            
            // Slight scale pulsing for the glow effect (more dramatic after explosion)
            const pulseIntensity = this.explosionTriggered ? 0.2 : 0.1;
            const pulseScale = 1 + Math.sin(this.elapsedTime * 8) * pulseIntensity;
            this.glowMesh.scale.set(pulseScale, 1, pulseScale);
        }
        
        // Reduced scale effect - grows less over time
        const scale = 1 + progress * 0.05; // Reduced from 0.2 to 0.05 (75% less expansion)
        this.scale.set(scale, 1, scale);
        
        // Check if warning time is complete
        if (progress >= 1) {
            this.completeTelegraph();
        }
    }
    
    /**
     * Complete the telegraph and trigger attack
     */
    completeTelegraph() {
        this.isActive = false;
        
        // If we have a glow effect, keep visible for fade-out, otherwise hide immediately
        if (!this.hasGlowEffect) {
            this.visible = false;
        }
        
        console.log('Telegraph completed - attack should execute now');
    }
    
    /**
     * Cancel the telegraph (if enemy is interrupted)
     */
    cancel() {
        this.isActive = false;
        this.visible = false;
        this.elapsedTime = 0;
        
        // Immediately remove from scene if it has a parent
        if (this.parent) {
            this.parent.remove(this);
        }
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            if (this.mesh.material.map) {
                this.mesh.material.map.dispose();
            }
            this.mesh.material.dispose();
        }
        if (this.borderMesh) {
            this.borderMesh.geometry.dispose();
            this.borderMesh.material.dispose();
        }
        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            if (this.glowMesh.material.map) {
                this.glowMesh.material.map.dispose();
            }
            this.glowMesh.material.dispose();
        }
    }
}

/**
 * TelegraphManager - Manages all active telegraphs
 */
class TelegraphManager {
    constructor(scene) {
        this.scene = scene;
        this.activeTelegraphs = [];
    }
    
    /**
     * Create and start a new telegraph
     */
    createTelegraph(attackType, position, range, warningTime = 1.2, direction = null, followTarget = null, customOpacity = null, customFadeTime = null, customThickness = null) {
        const telegraph = new AttackTelegraph(attackType, range, warningTime, customOpacity, customFadeTime, customThickness);
        
        this.scene.add(telegraph);
        this.activeTelegraphs.push(telegraph);
        
        telegraph.startTelegraph(position, direction, followTarget);
        
        return telegraph;
    }
    
    /**
     * Update all active telegraphs
     */
    update(deltaTime) {
        // Clean up any cancelled telegraphs first
        this.cleanupCancelled();
        
        for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
            const telegraph = this.activeTelegraphs[i];
            
            telegraph.update(deltaTime);
            
            // Remove completed telegraphs or telegraphs that have been removed from scene
            if (!telegraph.isActive && !telegraph.visible) {
                // Only remove from scene if still attached
                if (telegraph.parent) {
                    this.scene.remove(telegraph);
                }
                telegraph.dispose();
                this.activeTelegraphs.splice(i, 1);
            }
        }
    }
    
    /**
     * Cancel all telegraphs (useful for scene transitions)
     */
    cancelAll() {
        this.activeTelegraphs.forEach(telegraph => {
            telegraph.cancel();
            if (telegraph.parent) {
                this.scene.remove(telegraph);
            }
            telegraph.dispose();
        });
        this.activeTelegraphs = [];
    }
    
    /**
     * Clean up cancelled telegraphs immediately
     */
    cleanupCancelled() {
        for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
            const telegraph = this.activeTelegraphs[i];
            
            // Remove telegraphs that have been cancelled and removed from scene
            if (!telegraph.isActive && !telegraph.parent) {
                telegraph.dispose();
                this.activeTelegraphs.splice(i, 1);
            }
        }
    }
    
    /**
     * Get count of active telegraphs
     */
    getActiveCount() {
        return this.activeTelegraphs.filter(t => t.isActive).length;
    }
} 