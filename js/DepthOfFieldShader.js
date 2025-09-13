/**
 * Simple Depth of Field Effect using fog-based blur
 * Simulates DOF by using distance-based blur
 */

class SimpleDepthOfField {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // DOF parameters
        this.focusDistance = 15.0;
        this.blurStrength = 0.5;
        this.enabled = true;
        
        // Create render targets
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            }
        );
        
        // Create blur material
        this.blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                focusDistance: { value: this.focusDistance },
                blurStrength: { value: this.blurStrength },
                blurRadiusMultiplier: { value: 1.5 },
                blurThreshold: { value: 0.05 },
                mixStrength: { value: 1.4 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float focusDistance;
                uniform float blurStrength;
                uniform float blurRadiusMultiplier;
                uniform float blurThreshold;
                uniform float mixStrength;
                
                varying vec2 vUv;
                
                // Enhanced blur function with larger radius
                vec4 blur(sampler2D image, vec2 uv, vec2 resolution, float radius) {
                    vec4 color = vec4(0.0);
                    vec2 texelSize = 1.0 / resolution;
                    float total = 0.0;
                    
                    // 25-tap blur for stronger effect
                    for(float x = -2.0; x <= 2.0; x++) {
                        for(float y = -2.0; y <= 2.0; y++) {
                            float weight = 1.0 - (abs(x) + abs(y)) * 0.2;
                            vec2 offset = vec2(x, y) * texelSize * radius * 3.0; // Tripled offset
                            color += texture2D(image, uv + offset) * weight;
                            total += weight;
                        }
                    }
                    
                    return color / total;
                }
                
                void main() {
                    vec4 originalColor = texture2D(tDiffuse, vUv);
                    
                    // Simple distance-based blur
                    // Use vUv.y as a proxy for distance (higher = further)
                    float distanceFactor = abs(vUv.y - 0.5) * 2.0; // 0 at center, 1 at edges
                    
                    // Apply more blur to top and bottom of screen with increased radius
                    float blurRadius = distanceFactor * blurStrength * blurRadiusMultiplier;
                    
                    if (blurRadius > blurThreshold) { // Higher threshold - blur only applies to more distant objects
                        vec4 blurredColor = blur(tDiffuse, vUv, resolution, blurRadius);
                        gl_FragColor = mix(originalColor, blurredColor, min(distanceFactor * mixStrength, 1.0));
                    } else {
                        gl_FragColor = originalColor;
                    }
                }
            `
        });
        
        // Create screen quad
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.blurMaterial
        );
        
        this.blurScene = new THREE.Scene();
        this.blurScene.add(this.quad);
        
        this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    
    render() {
        if (!this.enabled) {
            // If DOF is disabled, just render normally
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        // Store original camera layers
        const originalLayers = this.camera.layers.mask;
        
        // Render main scene (layer 0 only) to texture
        this.camera.layers.set(0);
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);
        
        // Apply blur effect to main scene
        this.blurMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.blurScene, this.blurCamera);
        
        // Render UI layer (layer 1) on top without blur
        this.camera.layers.set(1);
        this.renderer.autoClear = false;
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = true;
        
        // Restore original camera layers
        this.camera.layers.mask = originalLayers;
    }
    
    setSize(width, height) {
        this.renderTarget.setSize(width, height);
        this.blurMaterial.uniforms.resolution.value.set(width, height);
    }
    
    dispose() {
        this.renderTarget.dispose();
        this.blurMaterial.dispose();
        this.quad.geometry.dispose();
    }
} 