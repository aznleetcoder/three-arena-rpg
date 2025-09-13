/**
 * DustParticleSystem - Creates dust puff effects for dashes, landings, etc.
 */
class DustParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 100;
        
        // Particle properties
        this.particleSize = 0.3;
        this.particleLifetime = 0.5; // seconds
        this.particleSpeed = 2.0;
        this.particleGravity = -2.0;
        
        // Initialize particle pool
        this.initializeParticlePool();
    }
    
    /**
     * Initialize pool of reusable particles
     */
    initializeParticlePool() {
        // Create circular geometry
        const geometry = new THREE.CircleGeometry(this.particleSize / 2, 8); // radius, segments
        
        for (let i = 0; i < this.maxParticles; i++) {
            // Create dust material with brownish/tan color
            const material = new THREE.MeshBasicMaterial({
                color: 0xd4a574, // Dusty brown/tan
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.visible = false;
            
            // Add custom properties for particle behavior
            particle.userData = {
                velocity: new THREE.Vector3(),
                lifetime: 0,
                maxLifetime: this.particleLifetime,
                startOpacity: 0.6,
                startScale: 1.0
            };
            
            this.scene.add(particle);
            this.particlePool.push(particle);
        }
    }
    
    /**
     * Spawn a dust puff at a position
     */
    spawnDustPuff(position, direction = null, particleCount = 8, isFootstep = false) {
        // Determine if this is a footstep (smaller particles)
        isFootstep = particleCount <= 3;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;
            
            // Position with slight randomness
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * (isFootstep ? 0.15 : 0.3);
            particle.position.y = 0.1; // Just above ground
            particle.position.z += (Math.random() - 0.5) * (isFootstep ? 0.15 : 0.3);
            
            // Velocity in a cone shape
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speedMultiplier = isFootstep ? 0.3 : 1.0; // Footsteps have less energy
            const speed = this.particleSpeed * (0.5 + Math.random() * 0.5) * speedMultiplier;
            
            particle.userData.velocity.set(
                Math.cos(angle) * speed * 0.5,
                (isFootstep ? 0.5 : 1.0) + Math.random() * 0.5, // Less upward for footsteps
                Math.sin(angle) * speed * 0.5
            );
            
            // If direction provided, bias particles opposite to movement
            if (direction) {
                particle.userData.velocity.x -= direction.x * 0.3;
                particle.userData.velocity.z -= direction.z * 0.3;
            }
            
            // Random rotation
            particle.rotation.z = Math.random() * Math.PI * 2;
            
            // Random size variation
            const baseScale = isFootstep ? 0.3 : 0.5;
            const scale = baseScale + Math.random() * (isFootstep ? 0.3 : 0.5);
            particle.scale.set(scale, scale, 1);
            particle.userData.startScale = scale;
            
            // Reset lifetime
            particle.userData.lifetime = 0;
            particle.userData.maxLifetime = this.particleLifetime * (0.8 + Math.random() * 0.4) * (isFootstep ? 0.6 : 1.0);
            particle.material.opacity = particle.userData.startOpacity * (isFootstep ? 0.4 : 1.0);
            
            particle.visible = true;
            this.particles.push(particle);
        }
    }
    
    /**
     * Get particle from pool
     */
    getParticleFromPool() {
        for (let particle of this.particlePool) {
            if (!particle.visible) {
                return particle;
            }
        }
        return null;
    }
    
    /**
     * Update all active particles
     */
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update lifetime
            particle.userData.lifetime += deltaTime;
            
            // Check if particle should die
            if (particle.userData.lifetime >= particle.userData.maxLifetime) {
                particle.visible = false;
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.position.add(
                particle.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Apply gravity
            particle.userData.velocity.y += this.particleGravity * deltaTime;
            
            // Slow down horizontal movement (air resistance)
            particle.userData.velocity.x *= 0.95;
            particle.userData.velocity.z *= 0.95;
            
            // Fade out and shrink
            const lifeProgress = particle.userData.lifetime / particle.userData.maxLifetime;
            particle.material.opacity = particle.userData.startOpacity * (1 - lifeProgress);
            
            // Grow slightly then shrink
            const scaleMultiplier = lifeProgress < 0.2 ? 
                1 + lifeProgress * 2 : // Grow for first 20%
                1.4 - (lifeProgress - 0.2) * 0.5; // Then shrink
            
            const scale = particle.userData.startScale * scaleMultiplier;
            particle.scale.set(scale, scale, 1);
            
            // Slight rotation
            particle.rotation.z += deltaTime * 2;
            
            // Keep above ground
            if (particle.position.y < 0.05) {
                particle.position.y = 0.05;
                particle.userData.velocity.y = 0;
            }
        }
    }
    
    /**
     * Clean up
     */
    dispose() {
        this.particlePool.forEach(particle => {
            particle.geometry.dispose();
            particle.material.dispose();
            this.scene.remove(particle);
        });
        
        this.particles = [];
        this.particlePool = [];
    }
} 