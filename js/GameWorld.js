/**
 * GameWorld - Manages the 3D world environment for Cat Quest-style gameplay
 * Now includes realistic grass shader system
 */
class GameWorld {
    constructor(scene, player = null) {
        this.scene = scene;
        this.ground = null;
        this.grassSystem = null;
        this.player = player;
        this.worldObjects = [];
        this.trees = [];
        this.bushes = [];
        this.stones = [];
        
        // World settings
        this.worldSize = 250; // Increased by 5x (50 * 5 = 250)
        this.groundColor = 0x337B30; // Updated to darker green
        
        this.createWorld();
        this.createLighting();
        this.createTrees();
        this.createBushes();
        this.createStones();
        this.createRocks();
    }
    
    /**
     * Create the basic world geometry
     */
    createWorld() {
        this.createGround();
        this.createGrassSystem();
    }
    
    /**
     * Create the ground plane - darker base for grass
     */
    createGround() {
        // Create a large ground plane as base
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        
        // Create ground material with darker green color (shows through grass)
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: this.groundColor,
            transparent: false
        });
        
        // Create the ground mesh
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        this.ground.position.y = -0.01; // Slightly below grass
        this.ground.receiveShadow = true;
        
        this.scene.add(this.ground);
    }
    
    /**
     * Create the grass system with shaders
     */
    createGrassSystem() {
        if (this.player) {
            this.grassSystem = new DynamicGrassSystem(this.scene, this.player);
        } else {
            // Fallback to static grass if no player provided
            this.grassSystem = new GrassSystem(this.scene);
        }
    }
    
    /**
     * Create lighting setup similar to Cat Quest
     */
    createLighting() {
        // Ambient light (soft overall lighting)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun-like lighting)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -25;
        directionalLight.shadow.camera.right = 25;
        directionalLight.shadow.camera.top = 25;
        directionalLight.shadow.camera.bottom = -25;
        
        this.scene.add(directionalLight);
        
        // Add a subtle rim light
        const rimLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
        rimLight.position.set(-10, 10, -5);
        this.scene.add(rimLight);
    }
    
    /**
     * Create tree obstacles scattered around
     */
    createTrees() {
        const loader = new THREE.TextureLoader();
        
        // Load all tree textures
        const treeTextures = [];
        const treePromises = [];
        
        for (let i = 1; i <= 2; i++) {
            const promise = new Promise((resolve) => {
                loader.load(
                    `assets/images/tree_${i}.png`,
            (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                
                        // Store texture with its dimensions
                        treeTextures.push({
                            texture: texture,
                            width: texture.image.width,
                            height: texture.image.height
                        });
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load tree_${i}.png:`, error);
                        resolve(); // Continue even if one fails
                    }
                );
            });
            treePromises.push(promise);
        }
        
        // Wait for all textures to load
        Promise.all(treePromises).then(() => {
            // Create trees - some standalone, some in clusters
            const standAloneTreeCount = 120;
            const treeClusterCount = 30; // 30 clusters of 2-3 trees each
            
            // Create standalone trees (biased towards north)
            for (let i = 0; i < standAloneTreeCount; i++) {
                if (treeTextures.length === 0) continue;
                
                const treeData = treeTextures[Math.floor(Math.random() * treeTextures.length)];
                
                // Calculate scale based on pixel dimensions
                const pixelToWorld = 0.025; // Adjust for tree size
                const width = treeData.width * pixelToWorld;
                const height = treeData.height * pixelToWorld;
                
                const tree = new BillboardSprite(treeData.texture, width, height);
                
                // Biased position - more trees to the north (negative Z)
                let angle;
                if (i < standAloneTreeCount * 0.6) {
                    // 60% of trees in northern hemisphere
                    angle = Math.PI + (Math.random() - 0.5) * Math.PI; // PI ± PI/2
                } else {
                    // 40% scattered elsewhere
                    angle = Math.random() * Math.PI * 2;
                }
                
                const distance = 5 + Math.random() * 95; // 5-100 units from center (closer start)
                tree.position.set(
                            Math.cos(angle) * distance,
                    height * 0.45, // Position based on height
                            Math.sin(angle) * distance
                        );
                tree.setBaseY(height * 0.45);
                
                // Set camera reference
                if (this.playerSprite && this.playerSprite.camera) {
                    tree.setCamera(this.playerSprite.camera);
                }
                
                // Enable camera occlusion fading for trees
                tree.enableCameraOcclusionFade(5.0, 3.5); // Start fade at 5 units, fully transparent at 3.5
                
                this.scene.add(tree);
                this.trees.push(tree);
            }
            
            // Create tree clusters (2-3 trees each)
            for (let c = 0; c < treeClusterCount; c++) {
                // Cluster centers biased towards north
                let clusterAngle;
                if (c < treeClusterCount * 0.7) {
                    // 70% of clusters in north
                    clusterAngle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
                } else {
                    clusterAngle = Math.random() * Math.PI * 2;
                }
                
                const clusterDistance = 8 + Math.random() * 92; // 8-100 units (closer start)
                const clusterCenter = new THREE.Vector3(
                    Math.cos(clusterAngle) * clusterDistance,
                    0,
                    Math.sin(clusterAngle) * clusterDistance
                );
                
                // 2-3 trees per cluster
                const treesInCluster = 2 + Math.floor(Math.random() * 2);
                
                for (let t = 0; t < treesInCluster; t++) {
                    const treeData = treeTextures[Math.floor(Math.random() * treeTextures.length)];
                    const pixelToWorld = 0.025;
                    const width = treeData.width * pixelToWorld;
                    const height = treeData.height * pixelToWorld;
                    
                    const tree = new BillboardSprite(treeData.texture, width, height);
                    
                    // Position within cluster (tight grouping)
                    const offsetAngle = Math.random() * Math.PI * 2;
                    const offsetDistance = 0.5 + Math.random() * 2.5; // 0.5-3 units (tighter clusters)
                    tree.position.set(
                        clusterCenter.x + Math.cos(offsetAngle) * offsetDistance,
                        height * 0.45,
                        clusterCenter.z + Math.sin(offsetAngle) * offsetDistance
                    );
                    tree.setBaseY(height * 0.45);
                    
                    if (this.playerSprite && this.playerSprite.camera) {
                        tree.setCamera(this.playerSprite.camera);
                    }
                    
                    // Enable camera occlusion fading for trees
                    tree.enableCameraOcclusionFade(5.0, 3.5);
                        
                        this.scene.add(tree);
                        this.trees.push(tree);
                }
            }
            
            console.log(`Created ${this.trees.length} trees total: ${standAloneTreeCount} standalone and ${treeClusterCount} clusters`);
        });
    }
    
    /**
     * Create bush obstacles scattered around
     */
    createBushes() {
        const loader = new THREE.TextureLoader();
        
        // Load all bush textures
        const bushTextures = [];
        const bushPromises = [];
        
        for (let i = 1; i <= 2; i++) {
            const promise = new Promise((resolve) => {
                loader.load(
                    `assets/images/bush_${i}.png`,
            (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                
                        // Store texture with its dimensions
                        bushTextures.push({
                            texture: texture,
                            width: texture.image.width,
                            height: texture.image.height
                        });
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load bush_${i}.png:`, error);
                        resolve(); // Continue even if one fails
                    }
                );
            });
            bushPromises.push(promise);
        }
        
        // Wait for all textures to load
        Promise.all(bushPromises).then(() => {
            // Create bushes - some standalone, some in clusters
            const standaloneBushCount = 40;  // Increased by 5x (8 * 5 = 40)
            const clusterCount = 15;  // Increased by 5x (3 * 5 = 15)
            
            // Create standalone bushes
            for (let i = 0; i < standaloneBushCount; i++) {
                if (bushTextures.length === 0) continue;
                
                const bushData = bushTextures[Math.floor(Math.random() * bushTextures.length)];
                const pixelToWorld = 0.02925; // Increased by 30% from original (0.0225 * 1.3)
                const width = bushData.width * pixelToWorld;
                const height = bushData.height * pixelToWorld;
                
                const bush = new BillboardSprite(bushData.texture, width, height);
                
                // Random position
                const angle = Math.random() * Math.PI * 2;
                const distance = 10 + Math.random() * 50; // 10-60 units from center
                bush.position.set(
                    Math.cos(angle) * distance,
                    height * 0.4,
                    Math.sin(angle) * distance
                );
                bush.setBaseY(height * 0.4);
                
                // Set camera reference
                if (this.playerSprite && this.playerSprite.camera) {
                    bush.setCamera(this.playerSprite.camera);
                }
                
                this.scene.add(bush);
                this.bushes.push(bush);
            }
            
            // Create bush clusters (will be mixed with stones later)
            for (let c = 0; c < clusterCount; c++) {
                const clusterCenter = new THREE.Vector3(
                    (Math.random() - 0.5) * 100, // -50 to 50 units on X
                    0,
                    (Math.random() - 0.5) * 100, // -50 to 50 units on Z
                );
                
                // 1-2 bushes per cluster (leaving room for stones, max 3 total)
                const bushesInCluster = 1 + Math.floor(Math.random() * 2);
                
                for (let i = 0; i < bushesInCluster; i++) {
                    const bushData = bushTextures[Math.floor(Math.random() * bushTextures.length)];
                    const pixelToWorld = 0.02925; // Increased by 30% from original (0.0225 * 1.3)
                    const width = bushData.width * pixelToWorld;
                    const height = bushData.height * pixelToWorld;
                    
                    const bush = new BillboardSprite(bushData.texture, width, height);
                    
                    // Position within cluster
                    const offsetAngle = Math.random() * Math.PI * 2;
                    const offsetDistance = Math.random() * 2; // Within 2 units of center
                    bush.position.set(
                        clusterCenter.x + Math.cos(offsetAngle) * offsetDistance,
                        height * 0.4,
                        clusterCenter.z + Math.sin(offsetAngle) * offsetDistance
                    );
                    bush.setBaseY(height * 0.4);
                    
                    // Set camera reference
                    if (this.playerSprite && this.playerSprite.camera) {
                        bush.setCamera(this.playerSprite.camera);
                    }
                    
                    this.scene.add(bush);
                    this.bushes.push(bush);
                }
                
                // Store cluster center for stone placement
                if (!this.clusterCenters) {
                    this.clusterCenters = [];
                }
                this.clusterCenters.push({
                    center: clusterCenter,
                    bushCount: bushesInCluster
                });
            }
            
            console.log(`Created ${standaloneBushCount} standalone bushes and ${clusterCount} bush clusters`);
        });
    }
    
    /**
     * Create stone obstacles scattered around
     */
    createStones() {
        const loader = new THREE.TextureLoader();
        
        // Load all stone textures
        const stoneTextures = [];
        const stonePromises = [];
        
        for (let i = 1; i <= 4; i++) {
            const promise = new Promise((resolve) => {
                loader.load(
                    `assets/images/stone_${i}.png`,
                    (texture) => {
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        
                        // Store texture with its dimensions
                        stoneTextures.push({
                            texture: texture,
                            width: texture.image.width,
                            height: texture.image.height
                        });
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load stone_${i}.png:`, error);
                        resolve(); // Continue even if one fails
                    }
                );
            });
            stonePromises.push(promise);
        }
        
        // Wait for all textures to load
        Promise.all(stonePromises).then(() => {
            // Create stones - some standalone, some in clusters
            const standaloneStoneCount = 50;  // Increased by 5x (10 * 5 = 50)
            
            // Create standalone stones
            for (let i = 0; i < standaloneStoneCount; i++) {
                // Pick a random stone texture
                if (stoneTextures.length === 0) continue;
                
                const stoneData = stoneTextures[Math.floor(Math.random() * stoneTextures.length)];
                
                // Calculate scale based on pixel dimensions (assuming base unit is ~32 pixels)
                const pixelToWorld = 0.026; // Increased by 30% (0.02 * 1.3)
                const width = stoneData.width * pixelToWorld;
                const height = stoneData.height * pixelToWorld;
                
                const stone = new BillboardSprite(stoneData.texture, width, height);
                
                // Random position
                const angle = Math.random() * Math.PI * 2;
                const distance = 15 + Math.random() * 60; // 15-75 units from center
                stone.position.set(
                    Math.cos(angle) * distance,
                    height * 0.4, // Position based on height (stones sit on ground)
                    Math.sin(angle) * distance
                );
                stone.setBaseY(height * 0.4);
                
                // Set camera reference
                if (this.playerSprite && this.playerSprite.camera) {
                    stone.setCamera(this.playerSprite.camera);
                }
                
                this.scene.add(stone);
                this.stones.push(stone);
            }
            
            // Add stones to existing bush clusters
            if (this.clusterCenters) {
                this.clusterCenters.forEach(clusterData => {
                    // Calculate remaining slots (max 3 items per cluster)
                    const maxClusterSize = 3;
                    const remainingSlots = maxClusterSize - clusterData.bushCount;
                    const stonesInCluster = Math.min(remainingSlots, 1 + Math.floor(Math.random() * 2));
                    
                    for (let i = 0; i < stonesInCluster; i++) {
                        const stoneData = stoneTextures[Math.floor(Math.random() * stoneTextures.length)];
                        const pixelToWorld = 0.026; // Increased by 30% (0.02 * 1.3)
                        const width = stoneData.width * pixelToWorld;
                        const height = stoneData.height * pixelToWorld;
                        
                        const stone = new BillboardSprite(stoneData.texture, width, height);
                        
                        // Position within cluster, slightly offset from bushes
                        const offsetAngle = Math.random() * Math.PI * 2;
                        const offsetDistance = 0.5 + Math.random() * 2.5; // 0.5-3 units from center
                        stone.position.set(
                            clusterData.center.x + Math.cos(offsetAngle) * offsetDistance,
                            height * 0.4,
                            clusterData.center.z + Math.sin(offsetAngle) * offsetDistance
                        );
                        stone.setBaseY(height * 0.4);
                        
                        if (this.playerSprite && this.playerSprite.camera) {
                            stone.setCamera(this.playerSprite.camera);
                        }
                        
                        this.scene.add(stone);
                        this.stones.push(stone);
                    }
                });
            }
            
            console.log(`Created ${standaloneStoneCount} standalone stones and added stones to ${this.clusterCenters ? this.clusterCenters.length : 0} clusters`);
        });
    }
    
    /**
     * Create rock obstacles (3D objects)
     */
    createRocks() {
        // Implementation of createRocks method
    }
    
    /**
     * Update world objects including grass animation
     */
    update(deltaTime, camera) {
        // Update grass animation
        if (this.grassSystem) {
            this.grassSystem.update(deltaTime);
        }
        
        // Update tree billboarding
        this.trees.forEach(tree => {
            if (tree.setCamera && camera) {
                tree.setCamera(camera);
            }
            if (tree.update) {
                tree.update(deltaTime);
            }
        });
        
        // Update bush billboarding
        this.bushes.forEach(bush => {
            if (bush.setCamera && camera) {
                bush.setCamera(camera);
            }
            if (bush.update) {
                bush.update(deltaTime);
            }
        });
    }
    
    /**
     * Get ground height at a specific position
     */
    getGroundHeight(x, z) {
        // Simple flat ground
        return 0;
    }
    
    /**
     * Check collision with world objects (no objects to collide with now)
     */
    checkCollision(position, radius = 0.5) {
        // No objects to collide with
        return false;
    }
    
    /**
     * Dispose of world resources
     */
    dispose() {
        this.worldObjects.forEach(obj => {
            if (obj.dispose) {
                obj.dispose();
            }
            if (obj.geometry) {
                obj.geometry.dispose();
            }
            if (obj.material) {
                obj.material.dispose();
            }
        });
        
        // Dispose of trees
        this.trees.forEach(tree => {
            if (tree.parent) {
                this.scene.remove(tree);
            }
            if (tree.dispose) {
                tree.dispose();
            }
        });
        
        // Dispose of bushes
        this.bushes.forEach(bush => {
            if (bush.parent) {
                this.scene.remove(bush);
            }
            if (bush.dispose) {
                bush.dispose();
            }
        });
        
        if (this.grassSystem) {
            this.grassSystem.dispose();
        }
        
        if (this.ground) {
            this.ground.geometry.dispose();
            this.ground.material.dispose();
        }
        
        // Dispose stones
        this.stones.forEach(stone => {
            stone.dispose();
            this.scene.remove(stone);
        });
    }
} 