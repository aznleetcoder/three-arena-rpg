/**
 * CatQuestCamera - Implements Cat Quest's camera system
 * Fixed isometric angle with smooth following and slight offset
 */
class CatQuestCamera {
    constructor(camera, target = null) {
        this.camera = camera;
        this.target = target;
        
        // Cat Quest camera settings
        this.distance = 4; // Even closer view (was 5)
        this.height = 6.0; // Increased camera height for better elevated view
        this.angle = Math.PI / 10; // 18 degrees - lowered from 22.5 degrees for even closer ground view
        
        // Smooth following parameters
        this.followSpeed = 5.0; // Increased from 2.0 for tighter following
        this.rotationSpeed = 1.5;
        
        // Camera intro animation
        this.introAnimation = {
            isActive: true,
            startHeight: 0.8, // Start very low
            targetHeight: this.height,
            currentHeight: 0.8,
            duration: 3.0, // 3 seconds
            elapsed: 0,
            easing: 'easeOutCubic'
        };
        
        // Camera offset (Cat Quest has slight offset behind player)
        this.offset = new THREE.Vector3(0, 0, 2);
        
        // Current position and target position
        this.currentPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        
        // Mouse control
        this.mouseControl = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.rotationX = 0;
        this.rotationY = -0.35; // Rotate camera to the left
        
        // Screen shake properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeInitialDuration = 0;
        this.shakeTime = 0;
        this.shakeOffset = new THREE.Vector3();
        this.shakeRotation = 0;
        this.shakePattern = null;
        
        // Initialize camera position
        this.setupInitialPosition();
        this.setupMouseControls();
    }
    
    /**
     * Set up initial camera position in Cat Quest style
     */
    setupInitialPosition() {
        // Cat Quest uses a fixed isometric angle
        const x = Math.sin(this.angle) * this.distance;
        const z = Math.cos(this.angle) * this.distance;
        
        // Start with intro height if animation is active
        const initialHeight = this.introAnimation.isActive ? this.introAnimation.startHeight : this.height;
        
        this.camera.position.set(x, initialHeight, z);
        this.camera.lookAt(0, 0, 0);
        
        this.currentPosition.copy(this.camera.position);
        this.targetPosition.copy(this.camera.position);
    }
    
    /**
     * Set up mouse controls for camera rotation
     */
    setupMouseControls() {
        document.addEventListener('mousedown', (event) => {
            // Check if clicking on UI elements
            const target = event.target;
            const isUIElement = target.closest('#ui-overlay') || 
                               target.closest('#controls') || 
                               target.closest('#health-display') || 
                               target.closest('#enemy-count') ||
                               target.closest('#dof-controls');
            
            if (event.button === 0 && !isUIElement) { // Left mouse button and not on UI
                this.mouseControl = true;
                this.mouseX = event.clientX;
                this.mouseY = event.clientY;
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.mouseControl = false;
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.mouseControl) {
                const deltaX = event.clientX - this.mouseX;
                const deltaY = event.clientY - this.mouseY;
                
                this.rotationY += deltaX * 0.01;
                this.rotationX += deltaY * 0.01;
                
                // Clamp vertical rotation (Cat Quest doesn't allow full vertical rotation)
                this.rotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 6, this.rotationX));
                
                this.mouseX = event.clientX;
                this.mouseY = event.clientY;
            }
        });
    }
    
    /**
     * Set the target to follow
     */
    setTarget(target) {
        this.target = target;
    }
    
    /**
     * Update camera position and rotation
     */
    update(deltaTime) {
        if (!this.target) return;
        
        // Handle intro animation
        if (this.introAnimation.isActive) {
            this.updateIntroAnimation(deltaTime);
        }
        
        // Update screen shake
        this.updateScreenShake(deltaTime);
        
        // Calculate target position based on player position and camera settings
        const targetPos = this.target.position.clone();
        
        // Apply rotation from mouse input
        const totalAngle = this.angle + this.rotationY;
        const currentHeight = this.introAnimation.isActive ? this.introAnimation.currentHeight : this.height;
        const totalHeight = currentHeight + this.rotationX * 5;
        
        // Calculate camera position relative to target
        const x = Math.sin(totalAngle) * this.distance;
        const z = Math.cos(totalAngle) * this.distance;
        
        // Set target position with offset
        this.targetPosition.set(
            targetPos.x + x + this.offset.x,
            totalHeight + this.offset.y,
            targetPos.z + z + this.offset.z
        );
        
        // Set target look-at position
        this.targetLookAt.copy(targetPos);
        
        // Smooth interpolation to target position (Cat Quest's smooth following)
        this.currentPosition.lerp(this.targetPosition, this.followSpeed * deltaTime);
        this.currentLookAt.lerp(this.targetLookAt, this.followSpeed * deltaTime);
        
        // Apply to camera with screen shake offset
        this.camera.position.copy(this.currentPosition).add(this.shakeOffset);
        this.camera.lookAt(this.currentLookAt);
    }
    
    /**
     * Update intro animation
     */
    updateIntroAnimation(deltaTime) {
        this.introAnimation.elapsed += deltaTime;
        
        // Calculate progress (0 to 1)
        const progress = Math.min(this.introAnimation.elapsed / this.introAnimation.duration, 1);
        
        // Apply easing
        const easedProgress = this.easeOutCubic(progress);
        
        // Interpolate height
        this.introAnimation.currentHeight = this.lerp(
            this.introAnimation.startHeight,
            this.introAnimation.targetHeight,
            easedProgress
        );
        
        // Check if animation is complete
        if (progress >= 1) {
            this.introAnimation.isActive = false;
            this.introAnimation.currentHeight = this.introAnimation.targetHeight;
            console.log('Camera intro animation completed');
        }
    }
    
    /**
     * Easing function - ease out cubic
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Linear interpolation
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    /**
     * Skip intro animation (for debugging)
     */
    skipIntroAnimation() {
        this.introAnimation.isActive = false;
        this.introAnimation.currentHeight = this.introAnimation.targetHeight;
        console.log('Camera intro animation skipped');
    }
    
    /**
     * Set camera distance from target
     */
    setDistance(distance) {
        this.distance = distance;
    }
    
    /**
     * Set camera height
     */
    setHeight(height) {
        this.height = height;
    }
    
    /**
     * Set follow speed
     */
    setFollowSpeed(speed) {
        this.followSpeed = speed;
    }
    
    /**
     * Reset camera rotation
     */
    resetRotation() {
        this.rotationX = 0;
        this.rotationY = 0;
    }
    
    /**
     * Get camera forward direction (useful for movement)
     */
    getForwardDirection() {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement on ground plane
        forward.normalize();
        return forward;
    }
    
    /**
     * Get camera right direction
     */
    getRightDirection() {
        const forward = this.getForwardDirection();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();
        return right;
    }
    
    /**
     * Trigger screen shake effect with tweening
     * @param {number} intensity - Strength of the shake (0.1 = subtle, 1.0 = strong)
     * @param {number} duration - Duration in seconds
     */
    shake(intensity = 0.5, duration = 0.3) {
        // Store initial values for tweening
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeInitialDuration = duration;
        this.shakeTime = 0;
        
        // Initialize shake pattern
        this.shakePattern = {
            frequency: 30 + intensity * 20, // Higher frequency for stronger shakes
            dampening: 3.0, // How quickly the shake dies down
            rotationInfluence: 0.2 * intensity, // Slight camera roll for impact
            seed: Math.random() * 1000 // Random seed for unique shake pattern
        };
    }
    
    /**
     * Update screen shake effect with smooth tweening
     */
    updateScreenShake(deltaTime) {
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            this.shakeTime += deltaTime;
            
            // Calculate progress (0 to 1)
            const progress = 1 - (this.shakeDuration / this.shakeInitialDuration);
            
            // Apply easing function for smooth decay
            const easedDecay = this.easeOutExpo(progress);
            const currentIntensity = this.shakeIntensity * (1 - easedDecay);
            
            // Create more controlled shake pattern using sine waves
            const time = this.shakeTime * this.shakePattern.frequency;
            const seed = this.shakePattern.seed;
            
            // Use multiple sine waves for more organic movement
            const xShake = Math.sin(time + seed) * 0.7 + Math.sin(time * 1.3 + seed * 2) * 0.3;
            const yShake = Math.sin(time * 0.8 + seed * 3) * 0.5 + Math.sin(time * 1.7 + seed * 4) * 0.3;
            const zShake = Math.sin(time * 1.1 + seed * 5) * 0.6 + Math.sin(time * 1.5 + seed * 6) * 0.4;
            
            // Apply dampening over time
            const dampening = Math.pow(1 - progress, this.shakePattern.dampening);
            
            // Set shake offset with controlled pattern
            this.shakeOffset.set(
                xShake * currentIntensity * dampening,
                yShake * currentIntensity * dampening * 0.5, // Less vertical shake
                zShake * currentIntensity * dampening
            );
            
            // Optional: Add slight camera roll for more impact
            if (this.shakePattern.rotationInfluence > 0) {
                // This would need to be applied to camera rotation if desired
                this.shakeRotation = xShake * this.shakePattern.rotationInfluence * dampening;
            }
        } else {
            // Smoothly interpolate back to zero when done
            this.shakeOffset.lerp(new THREE.Vector3(0, 0, 0), deltaTime * 10);
            
            // Reset when very close to zero
            if (this.shakeOffset.length() < 0.001) {
                this.shakeOffset.set(0, 0, 0);
                this.shakeDuration = 0;
                this.shakeRotation = 0;
            }
        }
    }
    
    /**
     * Easing function - exponential out for smooth decay
     */
    easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    
    /**
     * Preset shake effects for different situations
     */
    shakePresets = {
        // Light hit - subtle shake
        lightHit: () => this.shake(0.4, 0.2),
        
        // Normal hit - standard shake
        normalHit: () => this.shake(0.8, 0.25),
        
        // Heavy hit - strong shake
        heavyHit: () => this.shake(1.2, 0.35),
        
        // Critical hit - intense shake
        criticalHit: () => this.shake(1.6, 0.45),
        
        // Player damaged - medium shake with longer duration
        playerHurt: () => this.shake(1.0, 0.4),
        
        // Explosion - very strong but short
        explosion: () => this.shake(2.0, 0.3),
        
        // Landing impact - vertical emphasis
        landing: () => {
            this.shake(0.8, 0.25);
            // Modify pattern for more vertical movement
            if (this.shakePattern) {
                this.shakePattern.frequency = 25;
                this.shakePattern.dampening = 4.0;
            }
        }
    }
} 