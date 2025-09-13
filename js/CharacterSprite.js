/**
 * CharacterSprite - Advanced sprite system for Cat Quest character animations
 * Handles directional sprite sheets with idle and run states
 */
class CharacterSprite extends BillboardSprite {
    constructor(spriteSheets, width = 1, height = 1, frameWidth = 96, frameHeight = 80, fps = 8) {
        // Initialize with the first frame of idle_down
        super(null, width, height);
        
        this.spriteSheets = spriteSheets;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.fps = fps;
        this.attackFps = 12; // Faster FPS for attacks
        this.frameTime = 1 / fps;
        this.attackFrameTime = 1 / this.attackFps;
        
        // Animation state
        this.currentState = 'idle'; // idle, run, attack, hurt
        this.currentDirection = 'down'; // up, down, left, right
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = true;
        this.isAttacking = false;
        this.attackFinished = false;
        this.onAttackComplete = null; // Callback for when attack finishes
        
        // Animation safety timeout
        this.animationTimeout = 0;
        this.maxAnimationTime = 2.0; // Maximum 2 seconds for any non-looping animation
        
        // Add hurt animation state
        this.isHurt = false;
        this.hurtFinished = false;
        this.hurtFps = 12; // Same as attack animation speed
        this.hurtFrameTime = 1 / this.hurtFps;
        this.onHurtComplete = null; // Callback for when hurt animation finishes
        
        // Sprite sheet data
        this.animations = {};
        this.currentAnimation = null;
        
        // Initialize animations
        this.setupAnimations();
    }
    
    /**
     * Setup animation data from sprite sheets
     */
    setupAnimations() {
        // Parse sprite sheets to extract frame data
        for (const [key, texture] of Object.entries(this.spriteSheets)) {
            if (texture && texture.image) {
                const img = texture.image;
                const framesX = Math.floor(img.width / this.frameWidth);
                const framesY = Math.floor(img.height / this.frameHeight);
                
                this.animations[key] = {
                    texture: texture,
                    frames: framesX * framesY,
                    framesX: framesX,
                    framesY: framesY
                };
            }
        }
        
        // Set initial animation (force it to ensure it runs)
        this.setAnimation('idle', 'down', true);
    }
    
    /**
     * Set current animation state and direction
     */
    setAnimation(state, direction, force = false) {
        const animationKey = `${state}_${direction}`;
        
        if (this.animations[animationKey] && 
            (force || this.currentState !== state || this.currentDirection !== direction)) {
            
            this.currentState = state;
            this.currentDirection = direction;
            this.currentAnimation = this.animations[animationKey];
            this.currentFrame = 0;
            this.elapsedTime = 0;
            
            // Update material texture
            this.material.map = this.currentAnimation.texture;
            this.material.needsUpdate = true;
            
            // Set UV coordinates for first frame
            this.updateUVCoordinates();
        }
    }
    
    /**
     * Update UV coordinates for current frame
     */
    updateUVCoordinates() {
        if (!this.currentAnimation) return;
        
        const frameX = this.currentFrame % this.currentAnimation.framesX;
        const frameY = Math.floor(this.currentFrame / this.currentAnimation.framesX);
        
        const uLeft = frameX / this.currentAnimation.framesX;
        const uRight = (frameX + 1) / this.currentAnimation.framesX;
        const vTop = 1 - ((frameY + 1) / this.currentAnimation.framesY); // Flip V coordinate
        const vBottom = 1 - (frameY / this.currentAnimation.framesY);     // Flip V coordinate
        
        // Update geometry UV coordinates
        const uvAttribute = this.geometry.attributes.uv;
        if (!uvAttribute) return;
        
        const uvArray = uvAttribute.array;
        
        // Plane geometry has 4 vertices with UV coordinates
        // Make sure we're showing only one frame from the sprite sheet
        uvArray[0] = uLeft;  uvArray[1] = vBottom; // bottom-left
        uvArray[2] = uRight; uvArray[3] = vBottom; // bottom-right
        uvArray[4] = uLeft;  uvArray[5] = vTop;    // top-left
        uvArray[6] = uRight; uvArray[7] = vTop;    // top-right
        
        uvAttribute.needsUpdate = true;
    }
    
    /**
     * Update animation frames
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update animation timeout for non-looping animations
        if ((this.currentState === 'attack' || this.currentState === 'hurt') && this.isPlaying) {
            this.animationTimeout += deltaTime;
            
            // Force reset if animation takes too long
            if (this.animationTimeout > this.maxAnimationTime) {
                console.warn(`Animation '${this.currentState}' exceeded timeout, forcing reset`);
                this.resetAnimationState();
                if (this.currentState === 'attack' && this.onAttackComplete) {
                    this.onAttackComplete();
                } else if (this.currentState === 'hurt' && this.onHurtComplete) {
                    this.onHurtComplete();
                }
                this.animationTimeout = 0;
                return;
            }
        }
        
        if (this.isPlaying && this.currentAnimation && this.currentAnimation.frames > 1) {
            this.elapsedTime += deltaTime;
            
            // Use different frame times for attacks vs regular animations
            const currentFrameTime = this.currentState === 'attack' ? this.attackFrameTime : 
                                    this.currentState === 'hurt' ? this.hurtFrameTime : this.frameTime;
            
            if (this.elapsedTime >= currentFrameTime) {
                this.elapsedTime = 0;
                
                if (this.currentState === 'attack') {
                    // Attack animations don't loop - play once
                    if (this.currentFrame < this.currentAnimation.frames - 1) {
                        this.currentFrame++;
                        this.updateUVCoordinates();
                    } else {
                        // Attack animation finished
                        this.attackFinished = true;
                        this.isAttacking = false;
                        if (this.onAttackComplete) {
                            this.onAttackComplete();
                        }
                    }
                } else if (this.currentState === 'hurt') {
                    // Hurt animations don't loop - play once
                    if (this.currentFrame < this.currentAnimation.frames - 1) {
                        this.currentFrame++;
                        this.updateUVCoordinates();
                    } else {
                        // Hurt animation finished
                        this.hurtFinished = true;
                        this.isHurt = false;
                        if (this.onHurtComplete) {
                            this.onHurtComplete();
                        }
                    }
                } else {
                    // Regular animations loop
                    this.currentFrame = (this.currentFrame + 1) % this.currentAnimation.frames;
                    this.updateUVCoordinates();
                }
            }
        }
    }
    
    /**
     * Set animation based on movement state and direction vector
     */
    setMovementAnimation(isMoving, directionVector) {
        // Don't change animation if currently attacking or hurt
        if (this.isAttacking || this.isHurt) {
            return;
        }
        
        const state = isMoving ? 'run' : 'idle';
        let direction = 'down'; // default
        
        if (directionVector && directionVector.length() > 0) {
            // Determine primary direction based on movement vector
            const absX = Math.abs(directionVector.x);
            const absZ = Math.abs(directionVector.z);
            
            if (absX > absZ) {
                direction = directionVector.x > 0 ? 'right' : 'left';
            } else {
                direction = directionVector.z > 0 ? 'down' : 'up';
            }
        }
        
        this.setAnimation(state, direction);
    }
    
    /**
     * Trigger attack animation
     */
    attack(direction = null) {
        // Don't start new attack if already attacking
        if (this.isAttacking) {
            return false;
        }
        
        // Use current direction if no direction specified
        const attackDirection = direction || this.currentDirection;
        
        this.isAttacking = true;
        this.attackFinished = false;
        this.currentFrame = 0; // Reset frame to ensure clean start
        this.elapsedTime = 0; // Reset elapsed time
        this.animationTimeout = 0; // Reset timeout
        this.setAnimation('attack', attackDirection, true);
        
        return true;
    }
    
    /**
     * Trigger hurt animation based on attack direction
     */
    hurt(attackerPosition = null) {
        // Don't start hurt if already hurt or attacking
        if (this.isHurt || this.isAttacking) {
            return false;
        }
        
        let hurtDirection = this.currentDirection;
        
        // Calculate direction based on where the attack came from
        if (attackerPosition) {
            const toAttacker = new THREE.Vector3();
            toAttacker.subVectors(attackerPosition, this.position);
            toAttacker.y = 0; // Ignore height
            
            // Determine direction based on attacker position
            const absX = Math.abs(toAttacker.x);
            const absZ = Math.abs(toAttacker.z);
            
            if (absX > absZ) {
                hurtDirection = toAttacker.x > 0 ? 'right' : 'left';
            } else {
                hurtDirection = toAttacker.z > 0 ? 'down' : 'up';
            }
        }
        
        this.isHurt = true;
        this.hurtFinished = false;
        this.animationTimeout = 0; // Reset timeout
        this.setAnimation('hurt', hurtDirection, true);
        
        return true;
    }
    
    /**
     * Check if character is currently attacking
     */
    isCurrentlyAttacking() {
        return this.isAttacking;
    }
    
    /**
     * Set callback for when attack completes
     */
    setOnAttackComplete(callback) {
        this.onAttackComplete = callback;
    }
    
    /**
     * Set callback for when hurt animation completes
     */
    setOnHurtComplete(callback) {
        this.onHurtComplete = callback;
    }
    
    /**
     * Play animation
     */
    play() {
        this.isPlaying = true;
    }
    
    /**
     * Stop animation
     */
    stop() {
        this.isPlaying = false;
    }
    
    /**
     * Get current animation info
     */
    getCurrentAnimation() {
        return {
            state: this.currentState,
            direction: this.currentDirection,
            frame: this.currentFrame,
            totalFrames: this.currentAnimation ? this.currentAnimation.frames : 0
        };
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        super.dispose();
        
        // Dispose of all sprite sheet textures
        for (const animation of Object.values(this.animations)) {
            if (animation.texture) {
                animation.texture.dispose();
            }
        }
    }
    
    /**
     * Force reset animation state to idle/run
     */
    resetAnimationState() {
        this.isAttacking = false;
        this.attackFinished = false;
        this.isHurt = false;
        this.hurtFinished = false;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        // Don't call setAnimation here, let the movement system handle it
    }
}

/**
 * SpriteSheetLoader - Utility to load sprite sheets
 */
class SpriteSheetLoader {
    constructor() {
        this.loader = new THREE.TextureLoader();
    }
    
    /**
     * Load all character sprite sheets
     */
    async loadCharacterSprites(basePath = 'assets/sprites/character/') {
        const spriteSheets = {};
        const spritePaths = {
            'idle_up': `${basePath}IDLE/idle_up.png`,
            'idle_down': `${basePath}IDLE/idle_down.png`,
            'idle_left': `${basePath}IDLE/idle_left.png`,
            'idle_right': `${basePath}IDLE/idle_right.png`,
            'run_up': `${basePath}RUN/run_up.png`,
            'run_down': `${basePath}RUN/run_down.png`,
            'run_left': `${basePath}RUN/run_left.png`,
            'run_right': `${basePath}RUN/run_right.png`,
            'attack_up': `${basePath}ATTACK 1/attack1_up.png`,
            'attack_down': `${basePath}ATTACK 1/attack1_down.png`,
            'attack_left': `${basePath}ATTACK 1/attack1_left.png`,
            'attack_right': `${basePath}ATTACK 1/attack1_right.png`,
            'hurt_up': `${basePath}HURT/hurt_up.png`,
            'hurt_down': `${basePath}HURT/hurt_down.png`,
            'hurt_left': `${basePath}HURT/hurt_left.png`,
            'hurt_right': `${basePath}HURT/hurt_right.png`,
            // Dash animations
            'dash_up': `${basePath}DASH/dash_up.png`,
            'dash_down': `${basePath}DASH/dash_down.png`,
            'dash_left': `${basePath}DASH/dash_left.png`,
            'dash_right': `${basePath}DASH/dash_right.png`
        };
        
        const loadPromises = Object.entries(spritePaths).map(([key, path]) => {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    path,
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        
                        spriteSheets[key] = texture;
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load sprite: ${path}`, error);
                        resolve(); // Continue even if some sprites fail
                    }
                );
            });
        });
        
        await Promise.all(loadPromises);
        return spriteSheets;
    }
} 