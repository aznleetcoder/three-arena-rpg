/**
 * Skydome - Creates a seamless sky dome around the scene
 * Uses a large sphere with inverted normals to render a sky texture
 */
class Skydome {
    constructor(scene, skyTexturePath = 'assets/images/sky.png') {
        this.scene = scene;
        this.skyTexturePath = skyTexturePath;
        this.skydome = null;
        this.skyMaterial = null;
        
        // Skydome parameters
        this.radius = 500; // Large enough to encompass the entire scene
        this.segments = 32; // Lower segments for performance, still smooth enough
        
        this.init();
    }
    
    /**
     * Initialize the skydome
     */
    async init() {
        try {
            await this.loadSkyTexture();
            this.createSkydome();
            this.addToScene();
            console.log('Skydome created successfully');
        } catch (error) {
            console.error('Failed to create skydome:', error);
            this.createFallbackSky();
        }
    }
    
    /**
     * Load the sky texture
     */
    loadSkyTexture() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                this.skyTexturePath,
                (texture) => {
                    console.log('Sky texture loaded successfully:', this.skyTexturePath);
                    // Configure texture for seamless mapping
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    
                    this.skyTexture = texture;
                    resolve(texture);
                },
                (progress) => {
                    console.log('Sky texture loading progress:', progress);
                },
                (error) => {
                    console.error('Failed to load sky texture:', error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Create the skydome geometry and material
     */
    createSkydome() {
        // Create sphere geometry with enough segments for smoothness
        const geometry = new THREE.SphereGeometry(
            this.radius,
            this.segments,
            this.segments
        );
        
        // Create material with sky texture
        this.skyMaterial = new THREE.MeshBasicMaterial({
            map: this.skyTexture,
            side: THREE.BackSide, // Render on the inside of the sphere
            fog: false, // Don't apply fog to the sky
            depthWrite: false // Don't write to depth buffer
        });
        
        // Create the skydome mesh
        this.skydome = new THREE.Mesh(geometry, this.skyMaterial);
        
        // Set render order to render behind everything else
        this.skydome.renderOrder = -1;
        
        // Position at center - the dome will encompass everything
        this.skydome.position.set(0, 0, 0);
    }
    
    /**
     * Add skydome to the scene
     */
    addToScene() {
        if (this.skydome) {
            this.scene.add(this.skydome);
        }
    }
    
    /**
     * Create fallback sky if texture loading fails
     */
    createFallbackSky() {
        console.log('Creating fallback gradient sky');
        
        // Create a simple gradient sky
        const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);
        
        // Create gradient material (more noticeable colors for debugging)
        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x001122) }, // Dark blue
                bottomColor: { value: new THREE.Color(0x87CEEB) }, // Light blue
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide,
            fog: false,
            depthWrite: false
        });
        
        this.skydome = new THREE.Mesh(geometry, this.skyMaterial);
        this.skydome.renderOrder = -1;
        this.skydome.position.set(0, 0, 0);
        
        this.addToScene();
    }
    
    /**
     * Update skydome (if needed for dynamic effects)
     */
    update(deltaTime) {
        // Sky is static by default, but this can be used for:
        // - Rotating sky
        // - Day/night cycles
        // - Moving clouds
        
        // Example: Slow sky rotation (uncomment to enable)
        // if (this.skydome) {
        //     this.skydome.rotation.y += deltaTime * 0.001;
        // }
    }
    
    /**
     * Set sky rotation
     */
    setRotation(x = 0, y = 0, z = 0) {
        if (this.skydome) {
            this.skydome.rotation.set(x, y, z);
        }
    }
    
    /**
     * Get skydome mesh for direct manipulation
     */
    getSkydomeMesh() {
        return this.skydome;
    }
    
    /**
     * Dispose of skydome resources
     */
    dispose() {
        if (this.skydome) {
            this.scene.remove(this.skydome);
            this.skydome.geometry.dispose();
            this.skyMaterial.dispose();
            
            if (this.skyTexture) {
                this.skyTexture.dispose();
            }
        }
    }
} 