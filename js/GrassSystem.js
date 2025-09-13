/**
 * GrassSystem - Procedural grass generation with shader-based rendering
 * Creates realistic grass fields with wind animation
 */
class GrassSystem {
    constructor(scene) {
        this.scene = scene;
        this.grassMesh = null;
        this.startTime = Date.now();
        
        // Grass parameters
        this.PLANE_SIZE = 90; // Increased by 3x (30 * 3 = 90)
        this.BLADE_COUNT = 200000; // Doubled from 100,000 to 200,000 for 2x density
        this.BLADE_WIDTH = 0.15; // Increased from 0.1 to 0.15 for softer appearance
        this.BLADE_HEIGHT = 0.27; // Reduced by 3x (0.8 / 3 ≈ 0.27)
        this.BLADE_HEIGHT_VARIATION = 0.2; // Reduced by 3x (0.6 / 3 = 0.2)
        
        // Shader uniforms
        this.grassUniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib['fog'],
            {
            iTime: { type: 'f', value: 0.0 }
            }
        ]);
        
        this.createGrassShader();
        this.generateGrassField();
    }
    
    /**
     * Create the grass shader material
     */
    createGrassShader() {
        // Grass shader code (inline since we can't use ES6 imports in this context)
        const vertexShader = `
            varying vec2 vUv;
            varying vec2 cloudUV;
            varying vec3 vColor;
            uniform float iTime;
            
            #ifdef USE_FOG
                varying float vFogDepth;
            #endif

            void main() {
                vUv = uv;
                cloudUV = uv;
                vColor = color;
                vec3 cpos = position;

                float waveSize = 10.0;
                float tipDistance = 0.075; // Reduced by another 50% (0.15 / 2 = 0.075)
                float centerDistance = 0.025; // Reduced by another 50% (0.05 / 2 = 0.025)

                if (color.x > 0.6) {
                    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * tipDistance;
                } else if (color.x > 0.0) {
                    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * centerDistance;
                }

                float diff = position.x - cpos.x;
                cloudUV.x += iTime / 20000.;
                cloudUV.y += iTime / 10000.;

                vec4 worldPosition = vec4(cpos, 1.);
                vec4 mvPosition = modelViewMatrix * vec4(cpos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                #ifdef USE_FOG
                    vFogDepth = -mvPosition.z;
                #endif
            }
        `;
        
        const fragmentShader = `
            uniform float iTime;
            varying vec2 vUv;
            varying vec2 cloudUV;
            varying vec3 vColor;
            
            #ifdef USE_FOG
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying float vFogDepth;
            #endif
            
            void main() {
                // Base grass color
                vec3 grassColor1 = vec3(0.2, 0.6, 0.2);  // Dark green
                vec3 grassColor2 = vec3(0.4, 0.8, 0.3);  // Light green
                vec3 grassColor3 = vec3(0.6, 0.9, 0.4);  // Very light green
                
                // Use vertex color to blend between grass colors
                float heightFactor = (vColor.r + vColor.g + vColor.b) / 3.0;
                
                vec3 baseColor;
                if (heightFactor < 0.3) {
                    // Base of grass - darker
                    baseColor = mix(grassColor1, grassColor2, heightFactor / 0.3);
                } else {
                    // Top of grass - lighter
                    baseColor = mix(grassColor2, grassColor3, (heightFactor - 0.3) / 0.7);
                }
                
                // Add some variation based on UV position
                float noise = sin(vUv.x * 50.0) * cos(vUv.y * 50.0) * 0.03;
                baseColor += noise;
                
                // Simple lighting (simplified without normals)
                float lighting = 0.8 + 0.2 * heightFactor; // Brighter at tips
                
                // Add subtle time-based color variation using cloudUV
                float timeVariation = sin(cloudUV.x * 10.0) * 0.02;
                baseColor.g += timeVariation;
                
                vec3 finalColor = baseColor * lighting;
                
                #ifdef USE_FOG
                    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
                    finalColor = mix(finalColor, fogColor, fogFactor);
                #endif
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        this.grassMaterial = new THREE.ShaderMaterial({
            uniforms: this.grassUniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: false,
            fog: true
        });
    }
    
    /**
     * Generate the grass field
     */
    generateGrassField() {
        const positions = [];
        const uvs = [];
        const indices = [];
        const colors = [];
        
        for (let i = 0; i < this.BLADE_COUNT; i++) {
            const VERTEX_COUNT = 5;
            const surfaceMin = this.PLANE_SIZE / 2 * -1;
            const surfaceMax = this.PLANE_SIZE / 2;
            const radius = this.PLANE_SIZE / 2;
            
            // Generate random position within circular area
            const r = radius * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            
            const pos = new THREE.Vector3(x, 0, y);
            const uv = [
                this.convertRange(pos.x, surfaceMin, surfaceMax, 0, 1),
                this.convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)
            ];
            
            const blade = this.generateBlade(pos, i * VERTEX_COUNT, uv);
            blade.verts.forEach(vert => {
                positions.push(...vert.pos);
                uvs.push(...vert.uv);
                colors.push(...vert.color);
            });
            blade.indices.forEach(indice => indices.push(indice));
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        this.grassMesh = new THREE.Mesh(geometry, this.grassMaterial);
        this.scene.add(this.grassMesh);
    }
    
    /**
     * Generate a single grass blade
     */
    generateBlade(center, vArrOffset, uv) {
        const MID_WIDTH = this.BLADE_WIDTH * 0.7; // Increased from 0.5 to 0.7 for less tapering
        const TIP_OFFSET = 0.05; // Reduced from 0.1 to 0.05 for rounder tips
        const height = this.BLADE_HEIGHT + (Math.random() * this.BLADE_HEIGHT_VARIATION);
        
        const yaw = Math.random() * Math.PI * 2;
        const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const tipBend = Math.random() * Math.PI * 2;
        const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
        
        // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
        const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * 1));
        const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * -1));
        const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
        
        tl.y += height / 2;
        tr.y += height / 2;
        tc.y += height;
        
        // Vertex Colors (black = base, white = tip)
        const black = [0, 0, 0];
        const gray = [0.5, 0.5, 0.5];
        const white = [1.0, 1.0, 1.0];
        
        const verts = [
            { pos: bl.toArray(), uv: uv, color: black },
            { pos: br.toArray(), uv: uv, color: black },
            { pos: tr.toArray(), uv: uv, color: gray },
            { pos: tl.toArray(), uv: uv, color: gray },
            { pos: tc.toArray(), uv: uv, color: white }
        ];
        
        const indices = [
            vArrOffset,
            vArrOffset + 1,
            vArrOffset + 2,
            vArrOffset + 2,
            vArrOffset + 4,
            vArrOffset + 3,
            vArrOffset + 3,
            vArrOffset,
            vArrOffset + 2
        ];
        
        return { verts, indices };
    }
    
    /**
     * Utility function to convert ranges
     */
    convertRange(val, oldMin, oldMax, newMin, newMax) {
        return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
    }
    
    /**
     * Update the grass animation
     */
    update(deltaTime) {
        const elapsedTime = Date.now() - this.startTime;
        this.grassUniforms.iTime.value = elapsedTime;
    }
    
    /**
     * Dispose of grass resources
     */
    dispose() {
        if (this.grassMesh) {
            this.grassMesh.geometry.dispose();
            this.grassMaterial.dispose();
            this.scene.remove(this.grassMesh);
        }
    }
} 