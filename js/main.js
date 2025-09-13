/**
 * Main Game Class - Cat Quest Movement Prototype
 * Implements the complete Cat Quest-style movement system with billboarding
 */
class CatQuestGame {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.depthOfField = null; // Depth of field effect
        
        // Game systems
        this.gameWorld = null;
        this.cameraController = null;
        this.playerController = null;
        this.playerSprite = null;
        this.playerShadow = null;
        this.skydome = null;
        this.enemyManager = null;
        this.combatSystem = null;
        this.impactEffectManager = null;
        this.dustParticleSystem = null;
        this.skillUI = null;
        this.crystalManager = null;
        this.collectionEffectManager = null;
        this.xpSystem = null;
        
        // Game loop
        this.clock = new THREE.Clock();
        this.isRunning = false;
        
        // Hit-stop system
        this.freezeTime = 0; // Time remaining in freeze (seconds)
        this.freezeDuration = 0; // Total freeze duration
        
        // Initialize the game
        this.init();
    }
    
    /**
     * Initialize the game
     */
    async init() {
        this.createRenderer();
        this.createScene();
        await this.createSkydome();
        await this.createPlayer();
        this.createWorld();
        this.createCamera();
        this.createControllers();
        await this.createEffects();
        await this.createEnemies();
        this.createUI();
        
        // Start the game loop
        this.start();
    }
    
    /**
     * Create the Three.js renderer
     */
    createRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Don't set clear color - let the skydome handle the background
        // this.renderer.setClearColor(0x87CEEB, 1); // Sky blue background like Cat Quest
        
        // Setup post-processing for depth of field
        this.setupPostProcessing();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    
    /**
     * Setup post-processing effects
     */
    setupPostProcessing() {
        // Wait for camera to be created
        setTimeout(() => {
            if (this.camera && this.renderer && this.scene) {
                // Create simple depth of field effect
                this.depthOfField = new SimpleDepthOfField(this.scene, this.camera, this.renderer);
                this.depthOfField.blurStrength = 0.5; // Updated to match your settings
                
                console.log('Depth of field enabled');
                
                // Setup debug UI controls
                this.setupDOFDebugControls();
            }
        }, 500); // Wait for camera initialization
    }
    
    /**
     * Setup debug UI controls for depth of field
     */
    setupDOFDebugControls() {
        if (!this.depthOfField) return;
        
        // Blur strength slider
        const blurStrengthSlider = document.getElementById('blur-strength');
        const blurStrengthValue = document.getElementById('blur-strength-value');
        if (blurStrengthSlider) {
            blurStrengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.depthOfField.blurStrength = value;
                this.depthOfField.blurMaterial.uniforms.blurStrength.value = value;
                blurStrengthValue.textContent = value.toFixed(1);
            });
        }
        
        // Blur radius multiplier slider
        const blurRadiusSlider = document.getElementById('blur-radius');
        const blurRadiusValue = document.getElementById('blur-radius-value');
        if (blurRadiusSlider) {
            blurRadiusSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.depthOfField.blurMaterial.uniforms.blurRadiusMultiplier.value = value;
                blurRadiusValue.textContent = value.toFixed(1);
            });
        }
        
        // Blur threshold slider
        const blurThresholdSlider = document.getElementById('blur-threshold');
        const blurThresholdValue = document.getElementById('blur-threshold-value');
        if (blurThresholdSlider) {
            blurThresholdSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.depthOfField.blurMaterial.uniforms.blurThreshold.value = value;
                blurThresholdValue.textContent = value.toFixed(2);
            });
        }
        
        // Mix strength slider
        const mixStrengthSlider = document.getElementById('mix-strength');
        const mixStrengthValue = document.getElementById('mix-strength-value');
        if (mixStrengthSlider) {
            mixStrengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.depthOfField.blurMaterial.uniforms.mixStrength.value = value;
                mixStrengthValue.textContent = value.toFixed(1);
            });
        }
        
        // Enable/disable checkbox
        const dofEnabledCheckbox = document.getElementById('dof-enabled');
        if (dofEnabledCheckbox) {
            dofEnabledCheckbox.addEventListener('change', (e) => {
                this.depthOfField.enabled = e.target.checked;
            });
        }
        
        // Add keyboard shortcut to toggle debug UI
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyH' && !event.repeat) {
                const controls = document.getElementById('dof-controls');
                if (controls) {
                    controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
                }
            }
            
            // Toggle instructions with 'I' key
            if (event.code === 'KeyI' && !event.repeat) {
                const instructions = document.getElementById('controls');
                if (instructions) {
                    instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
        
        console.log('DOF debug controls initialized. Press H to toggle visibility.');
    }
    
    /**
     * Create the Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        
        // Add fog for depth (Cat Quest has atmospheric perspective)
        this.scene.fog = new THREE.Fog(0xeaff95, 20, 50);
    }
    
    /**
     * Create the skydome
     */
    async createSkydome() {
        this.skydome = new Skydome(this.scene);
        console.log('Skydome system initialized');
        
        // Wait a moment for skydome to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Create the player sprite
     */
    async createPlayer() {
        try {
            // Load character sprite sheets
            const spriteLoader = new SpriteSheetLoader();
            const spriteSheets = await spriteLoader.loadCharacterSprites();
            
            console.log('Loaded sprite sheets:', Object.keys(spriteSheets));
            
            // Create character sprite with proper dimensions
            // Scale to match the intended size (96x80px sprites in world units) - 3x larger
            const spriteWidth = 3.6;  // 1.2 * 3 = 3.6
            const spriteHeight = 3.0; // 1.0 * 3 = 3.0
            
            this.playerSprite = new CharacterSprite(
                spriteSheets, 
                spriteWidth, 
                spriteHeight, 
                96, // frameWidth
                80, // frameHeight
                8   // fps
            );
            
            // Position character so feet are on ground (sprites are 80px tall, so lift up by half)
            this.playerSprite.position.set(0, 0.7, 0); // Adjusted to 0.7 for proper ground contact
            this.playerSprite.setBaseY(0.7);
            this.playerSprite.castShadow = true;
            
            // Create circular shadow under character
            this.createCharacterShadow();
            
            this.scene.add(this.playerSprite);
            
        } catch (error) {
            console.error('Failed to load character sprites, using fallback:', error);
            
            // Fallback to simple sprite if loading fails
            this.createFallbackSprite();
        }
    }
    
    /**
     * Create fallback sprite if sprite sheets fail to load
     */
    createFallbackSprite() {
        // Create a simple cat sprite texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Draw a simple cat placeholder
        ctx.fillStyle = '#FF8C00'; // Orange cat
        ctx.fillRect(16, 32, 32, 24); // Body
        
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.arc(32, 20, 12, 0, Math.PI * 2); // Head
        ctx.fill();
        
        // Ears
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(24, 12);
        ctx.lineTo(28, 4);
        ctx.lineTo(32, 12);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(32, 12);
        ctx.lineTo(36, 4);
        ctx.lineTo(40, 12);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(28, 18, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(36, 18, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.arc(48, 40, 6, 0, Math.PI * 2);
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        // Create the player sprite
        this.playerSprite = new BillboardSprite(texture, 1, 1);
        // Position fallback sprite so feet are on ground  
        this.playerSprite.position.set(0, 0.7, 0); // Adjusted to 0.7 for proper ground contact
        this.playerSprite.setBaseY(0.7);
        this.playerSprite.castShadow = true;
        
        // Create circular shadow under character
        this.createCharacterShadow();
        
        this.scene.add(this.playerSprite);
    }
    
    /**
     * Create circular shadow under character
     */
    createCharacterShadow() {
        // Create a circular shadow texture
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 64;
        shadowCanvas.height = 64;
        const ctx = shadowCanvas.getContext('2d');
        
        // Create radial gradient for soft shadow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        shadowTexture.magFilter = THREE.LinearFilter;
        shadowTexture.minFilter = THREE.LinearFilter;
        
        // Create shadow geometry and material
        const shadowGeometry = new THREE.PlaneGeometry(1, 1); // Reduced from 2x2 to 1x1
        const shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            alphaTest: 0.01,
            depthWrite: false
        });
        
        // Create shadow mesh
        this.playerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.playerShadow.rotation.x = -Math.PI / 2; // Rotate to lie flat on ground
        this.playerShadow.position.set(0, 0.01, 0); // Slightly above ground to prevent z-fighting
        
        this.scene.add(this.playerShadow);
    }
    
    /**
     * Create the game world
     */
    createWorld() {
        this.gameWorld = new GameWorld(this.scene, this.playerSprite);
        
        // Set camera for world objects after camera is created
        setTimeout(() => {
            if (this.gameWorld && this.camera) {
                this.gameWorld.trees.forEach(tree => {
                    if (tree.setCamera) {
                        tree.setCamera(this.camera);
                    }
                });
                this.gameWorld.bushes.forEach(bush => {
                    if (bush.setCamera) {
                        bush.setCamera(this.camera);
                    }
                });
                this.gameWorld.stones.forEach(stone => {
                    if (stone.setCamera) {
                        stone.setCamera(this.camera);
                    }
                });
            }
        }, 100);
    }
    
    /**
     * Create the camera
     */
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            50, // FOV - reduced from 60 for tighter view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane - increased to see the skydome (radius 500)
        );
        
        // Enable both layer 0 (default) and layer 1 (UI)
        this.camera.layers.enable(1);
    }
    
    /**
     * Create the game controllers
     */
    createControllers() {
        // Create camera controller
        this.cameraController = new CatQuestCamera(this.camera, this.playerSprite);
        
        // Create player controller
        this.playerController = new PlayerController(this.playerSprite, this.cameraController);
        
        // Set dust particle system reference (will be created later)
        setTimeout(() => {
            if (this.playerController && this.dustParticleSystem) {
                this.playerController.setDustParticleSystem(this.dustParticleSystem);
            }
        }, 100);
        
        // Set camera reference for player sprite billboarding
        this.playerSprite.setCamera(this.camera);
    }
    
    /**
     * Create visual effects systems
     */
    async createEffects() {
        // Create impact effect manager
        this.impactEffectManager = new ImpactEffectManager(this.scene);
        await this.impactEffectManager.initialize();
        
        // Create lightning strike manager
        this.lightningStrikeManager = new LightningStrikeManager(this.scene);
        await this.lightningStrikeManager.initialize();
        
        // Create fireball manager
        this.fireballManager = new FireballManager(this.scene);
        await this.fireballManager.initialize();
        
        // Create explosion manager
        this.explosionManager = new ExplosionManager(this.scene);
        await this.explosionManager.initialize();
        
        // Create damage number manager
        this.damageNumberManager = new DamageNumberManager(this.scene);
        
        // Create blood particle system
        this.bloodParticleSystem = new BloodParticleSystem(this.scene);
        
        // Create dust particle system
        this.dustParticleSystem = new DustParticleSystem(this.scene);
        
        // Create collection effect system
        this.collectionEffectManager = new CollectionEffectManager(this.scene);
        
        console.log('Visual effects initialized');
    }
    
    /**
     * Create enemy system
     */
    async createEnemies() {
        // Create enemy manager with 30 zombies
        this.enemyManager = new EnemyManager(this.scene, this.playerSprite, 30);
        console.log('Enemy system initialized');
        
        // Create telegraph system for attack warnings
        this.telegraphManager = new TelegraphManager(this.scene);
        
        // Create crystal system for enemy drops
        this.crystalManager = new CrystalManager(this.scene);
        
        // Create health orb system for enemy drops
        this.healthOrbManager = new HealthOrbManager(this.scene);
        await this.healthOrbManager.initialize();
        
        // Set camera reference for crystal billboarding
        if (this.camera) {
            this.crystalManager.setCamera(this.camera);
            this.healthOrbManager.setCamera(this.camera);
        }
        
        // Set camera reference for fireball billboarding
        if (this.camera && this.fireballManager) {
            this.fireballManager.setCamera(this.camera);
        }
        
        // Set camera reference for explosion billboarding
        if (this.camera && this.explosionManager) {
            this.explosionManager.setCamera(this.camera);
        }
        
        // Set collection effect manager for crystal collection effects
        if (this.collectionEffectManager) {
            this.crystalManager.setCollectionEffectManager(this.collectionEffectManager);
            this.healthOrbManager.setCollectionEffectManager(this.collectionEffectManager);
        }
        
        // Set XP system reference for crystal XP gain (after UI is created)
        setTimeout(() => {
            if (this.xpSystem && this.crystalManager) {
                this.crystalManager.setXPSystem(this.xpSystem);
            }
        }, 100);
        
        // Create combat system with camera controller and impact effects
        this.combatSystem = new CombatSystem(this.playerController, this.enemyManager, this.cameraController, this);
        this.combatSystem.setImpactEffectManager(this.impactEffectManager);
        this.combatSystem.setDamageNumberManager(this.damageNumberManager);
        this.combatSystem.setBloodParticleSystem(this.bloodParticleSystem);
        this.combatSystem.setLightningStrikeManager(this.lightningStrikeManager);
        this.playerController.setCombatSystem(this.combatSystem);
        
        // Set fireball manager reference in combat system
        this.fireballManager.setCombatSystem(this.combatSystem);
        
        // Set telegraph manager reference for fireball system
        this.fireballManager.setTelegraphManager(this.telegraphManager);
        
        // Set explosion manager reference for fireball system
        this.fireballManager.setExplosionManager(this.explosionManager);

        // Set combat system and managers on enemy manager
        this.enemyManager.setCombatSystem(this.combatSystem);
        this.enemyManager.setTelegraphManager(this.telegraphManager);
        this.enemyManager.setFireballManager(this.fireballManager);
        this.enemyManager.setCrystalManager(this.crystalManager);
        this.enemyManager.setHealthOrbManager(this.healthOrbManager);
        
        // Set health orb manager reference in combat system
        this.healthOrbManager.setCombatSystem(this.combatSystem);
        
        console.log('Combat system initialized');
        
        // Add keyboard control to spawn more enemies
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyE' && !event.repeat) {
                // Spawn 5 more enemies when 'E' is pressed
                this.enemyManager.spawnWave(5);
                console.log(`Total enemies: ${this.enemyManager.getTotalEnemyCount()}, Living: ${this.enemyManager.getLivingEnemyCount()}`);
            }
            
            if (event.code === 'KeyQ' && !event.repeat) {
                // Trigger lightning strike when 'Q' is pressed
                if (this.combatSystem) {
                    const success = this.combatSystem.triggerLightningStrike();
                    if (success) {
                        console.log('Lightning strike triggered!');
                    }
                }
            }
        });
    }
    
    /**
     * Create UI systems
     */
    createUI() {
        this.skillUI = new SkillUI();
        this.xpSystem = new XPSystem();
        console.log('Skill UI and XP System initialized');
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.isRunning = true;
        this.gameLoop();
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.gameLoop());
        
        const deltaTime = this.clock.getDelta();
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the scene
        this.render();
    }
    
    /**
     * Update all game systems
     */
    update(deltaTime) {
        // Handle hit-stop/freeze frame
        if (this.freezeTime > 0) {
            this.freezeTime -= deltaTime;
            // Skip all updates during freeze except the freeze timer itself
            return;
        }
        
        // Update player
        if (this.playerController) {
            this.playerController.update(deltaTime);
        }
        
        // Update camera
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }
        
        // Update player sprite billboarding
        if (this.playerSprite) {
            this.playerSprite.update(deltaTime);
        }
        
        // Update enemies
        if (this.enemyManager) {
            this.enemyManager.update(deltaTime, this.camera);
            
            // Update enemy count UI
            const enemyCountEl = document.getElementById('enemy-current');
            if (enemyCountEl) {
                enemyCountEl.textContent = this.enemyManager.getLivingEnemyCount();
            }
        }
        
        // Update combat system
        if (this.combatSystem) {
            this.combatSystem.update(deltaTime);
        }
        
        // Update skill UI
        if (this.skillUI && this.combatSystem && this.playerController) {
            // Get cooldown progress for attack (from combat system)
            const attackProgress = this.combatSystem.getAttackCooldownProgress();
            this.skillUI.updateAttackCooldown(attackProgress);
            
            // Get cooldown progress for dash (from player controller)
            const dashProgress = this.getDashCooldownProgress();
            this.skillUI.updateDashCooldown(dashProgress);
            
            // Get cooldown progress for lightning strike (from combat system)
            const lightningProgress = this.combatSystem.getLightningStrikeCooldownProgress();
            this.skillUI.updateLightningStrikeCooldown(lightningProgress);
        }
        
        // Update impact effects
        if (this.impactEffectManager) {
            this.impactEffectManager.update(deltaTime);
        }
        
        // Update lightning strike effects
        if (this.lightningStrikeManager) {
            this.lightningStrikeManager.update(deltaTime);
        }
        
        // Update fireball effects
        if (this.fireballManager) {
            this.fireballManager.update(deltaTime);
        }
        
        // Update explosion effects
        if (this.explosionManager) {
            this.explosionManager.update(deltaTime);
        }
        
        // Update damage numbers
        if (this.damageNumberManager) {
            this.damageNumberManager.update(deltaTime, this.camera);
        }
        
        // Update telegraph system
        if (this.telegraphManager) {
            this.telegraphManager.update(deltaTime);
        }
        
        // Update blood particles
        if (this.bloodParticleSystem) {
            this.bloodParticleSystem.update(deltaTime);
        }
        
        // Update dust particles
        if (this.dustParticleSystem) {
            this.dustParticleSystem.update(deltaTime);
        }
        
        // Update crystal system
        if (this.crystalManager && this.playerSprite) {
            this.crystalManager.update(deltaTime, this.playerSprite.position);
        }
        
        // Update health orb system
        if (this.healthOrbManager && this.playerSprite) {
            this.healthOrbManager.update(deltaTime, this.playerSprite.position);
        }
        
        // Update collection effects
        if (this.collectionEffectManager) {
            this.collectionEffectManager.update(deltaTime);
        }
        
        // Update world objects
        if (this.gameWorld) {
            this.gameWorld.update(deltaTime, this.camera);
        }
        
        // Update skydome (for any dynamic effects)
        if (this.skydome) {
            this.skydome.update(deltaTime);
        }
        
        // Update player shadow position to follow player
        if (this.playerShadow && this.playerSprite) {
            this.playerShadow.position.x = this.playerSprite.position.x;
            this.playerShadow.position.z = this.playerSprite.position.z;
        }
    }
    
    /**
     * Render the scene
     */
    render() {
        if (this.depthOfField) {
            // Use depth of field rendering
            this.depthOfField.render();
        } else {
            // Fallback to regular rendering
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update depth of field size
        if (this.depthOfField) {
            this.depthOfField.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    /**
     * Dispose of game resources
     */
    dispose() {
        this.stop();
        
        if (this.gameWorld) {
            this.gameWorld.dispose();
        }
        
        if (this.playerSprite) {
            this.playerSprite.dispose();
        }
        
        if (this.enemyManager) {
            this.enemyManager.dispose();
        }
        
        if (this.combatSystem) {
            this.combatSystem.dispose();
        }
        
        if (this.impactEffectManager) {
            this.impactEffectManager.dispose();
        }
        
        if (this.lightningStrikeManager) {
            this.lightningStrikeManager.dispose();
        }
        
        if (this.fireballManager) {
            this.fireballManager.dispose();
        }
        
        if (this.explosionManager) {
            this.explosionManager.dispose();
        }
        
        if (this.damageNumberManager) {
            this.damageNumberManager.dispose();
        }
        
        if (this.bloodParticleSystem) {
            this.bloodParticleSystem.dispose();
        }
        
        if (this.dustParticleSystem) {
            this.dustParticleSystem.dispose();
        }
        
        if (this.collectionEffectManager) {
            this.collectionEffectManager.dispose();
        }
        
        if (this.crystalManager) {
            this.crystalManager.dispose();
        }
        
        if (this.healthOrbManager) {
            this.healthOrbManager.dispose();
        }
        
        if (this.skydome) {
            this.skydome.dispose();
        }
        
        if (this.xpSystem) {
            // XP system doesn't need special disposal, just clear reference
            this.xpSystem = null;
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
    
    /**
     * Get dash cooldown progress
     */
    getDashCooldownProgress() {
        if (!this.playerController) return 1;
        
        // Calculate progress (0 = just used, 1 = ready)
        const cooldownRemaining = Math.max(0, this.playerController.dashCooldownTimer || 0);
        const cooldownDuration = this.playerController.dashCooldown || 3.0;
        
        if (cooldownRemaining <= 0) {
            return 1; // Fully ready
        }
        
        return Math.max(0, Math.min(1, 1 - (cooldownRemaining / cooldownDuration)));
    }
    
    /**
     * Trigger a hit-stop freeze frame effect
     */
    freezeFrame(duration = 0.05) {
        this.freezeTime = duration;
        this.freezeDuration = duration;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', async () => {
    try {
    const game = new CatQuestGame();
    
    // Make game accessible globally for debugging
    window.catQuestGame = game;
    
    console.log('Cat Quest Movement Prototype loaded!');
    console.log('Controls: WASD or Arrow Keys to move, SPACEBAR to attack, Q for lightning strike, Mouse drag to rotate camera');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
}); 