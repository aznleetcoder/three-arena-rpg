/**
 * BloodParticles - Blood splatter effect when enemies are hit
 */
class BloodParticle extends THREE.Sprite {
    constructor() {
        // Create circular texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; // White circle (will be tinted by material color)
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite material with darker red
        const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0x8B0000, // Dark red
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: false, // Render on top
            fog: false
        });
        
        super(material);
        
        // Particle physics
        this.velocity = new THREE.Vector3();
        this.lifetime = 0;
        this.maxLifetime = 1.0; // 1 second
        this.gravity = -9.8;
        this.size = 0.105; // Reduced by 30% from 0.15
        this.isActive = false;
        
        // Random color variation for darker blood
        const variation = Math.random() * 0.3; // 0-30% variation
        const baseColor = 0x8B0000; // Dark red
        const r = ((baseColor >> 16) & 255) / 255;
        const g = ((baseColor >> 8) & 255) / 255;
        const b = (baseColor & 255) / 255;
        this.material.color.setRGB(
            r * (0.7 + variation), // Vary between 70-100% of base red
            g,
            b
        );
        
        // Set to UI layer so it's not affected by DOF
        this.layers.set(1);
        this.renderOrder = 9997; // Just below health bars
    }
    
    /**
     * Spawn particle with initial velocity
     */
    spawn(position, direction) {
        this.position.copy(position);
        
        // Random velocity based on hit direction
        const speed = 3 + Math.random() * 4; // 3-7 units/second
        const spread = 0.5;
        
        this.velocity.set(
            direction.x + (Math.random() - 0.5) * spread,
            Math.random() * 0.8 + 0.5, // Reduced upward velocity (was 1-3, now 0.5-1.3)
            direction.z + (Math.random() - 0.5) * spread
        ).normalize().multiplyScalar(speed);
        
        // Reset particle state
        this.lifetime = 0;
        this.isActive = true;
        this.visible = true;
        this.material.opacity = 1;
        
        // Random initial size (reduced by 30%)
        this.size = 0.07 + Math.random() * 0.105; // 0.07-0.175 range (30% smaller)
        this.scale.set(this.size, this.size, 1);
    }
    
    /**
     * Update particle physics
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.lifetime += deltaTime;
        
        if (this.lifetime >= this.maxLifetime) {
            this.isActive = false;
            this.visible = false;
            return;
        }
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Ground collision
        if (this.position.y <= 0.01) {
            this.position.y = 0.01;
            this.velocity.y = 0;
            this.velocity.x *= 0.8; // Friction
            this.velocity.z *= 0.8;
        }
        
        // Fade out in last 30% of lifetime
        const fadeStart = 0.7;
        if (this.lifetime > this.maxLifetime * fadeStart) {
            const fadeProgress = (this.lifetime - this.maxLifetime * fadeStart) / (this.maxLifetime * 0.3);
            this.material.opacity = 1 - fadeProgress;
        }
        
        // Shrink over time
        const shrinkFactor = 1 - (this.lifetime / this.maxLifetime) * 0.5;
        this.scale.set(this.size * shrinkFactor, this.size * shrinkFactor, 1);
    }
}

/**
 * BloodParticleSystem - Manages pool of blood particles
 */
class BloodParticleSystem {
    constructor(scene, poolSize = 100) {
        this.scene = scene;
        this.particles = [];
        this.activeParticles = [];
        this.poolSize = poolSize;
        
        // Create particle pool
        for (let i = 0; i < poolSize; i++) {
            const particle = new BloodParticle();
            particle.visible = false;
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    /**
     * Spawn blood burst at position
     */
    spawnBloodBurst(position, hitDirection, particleCount = 8) {
        console.log('Spawning blood burst at:', position, 'particles:', particleCount);
        
        // Normalize hit direction
        const direction = hitDirection.clone().normalize();
        
        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length === 0) {
                console.warn('No particles available in pool');
                break;
            }
            
            const particle = this.particles.pop();
            this.activeParticles.push(particle);
            
            // Slightly randomize spawn position
            const spawnPos = position.clone();
            spawnPos.x += (Math.random() - 0.5) * 0.2;
            spawnPos.y += Math.random() * 0.3;
            spawnPos.z += (Math.random() - 0.5) * 0.2;
            
            particle.spawn(spawnPos, direction);
        }
        
        console.log('Active particles:', this.activeParticles.length);
    }
    
    /**
     * Update all active particles
     */
    update(deltaTime) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            particle.update(deltaTime);
            
            // Return to pool if inactive
            if (!particle.isActive) {
                this.activeParticles.splice(i, 1);
                this.particles.push(particle);
            }
        }
    }
    
    /**
     * Dispose of all particles
     */
    dispose() {
        [...this.particles, ...this.activeParticles].forEach(particle => {
            if (particle.parent) {
                particle.parent.remove(particle);
            }
            particle.material.dispose();
        });
    }
} 