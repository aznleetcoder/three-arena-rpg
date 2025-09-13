/**
 * DynamicGrassSystem - Dynamic grass generation around player
 * Spawns and despawns grass based on player position for infinite grass fields
 */
class DynamicGrassSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.grassChunks = new Map(); // Store grass chunks by grid position
        this.grassMaterial = null;
        this.startTime = Date.now();
        
        // Dynamic grass parameters
        this.GRASS_RADIUS = 50; // Increased by 2x (25 * 2 = 50) - Radius around player to spawn grass
        this.CHUNK_SIZE = 10; // Size of each grass chunk
        this.BLADES_PER_CHUNK = 8000; // Doubled from 4,000 to 8,000 for 2x density
        this.BLADE_WIDTH = 0.15;
        this.BLADE_HEIGHT = 0.27;
        this.BLADE_HEIGHT_VARIATION = 0.2;
        
        // Player tracking
        this.lastPlayerPosition = new THREE.Vector3();
        this.updateThreshold = 2; // Update when player moves this distance
        
        // Shader uniforms
        this.grassUniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib['fog'],
            {
            iTime: { type: 'f', value: 0.0 }
            }
        ]);
        
        this.createGrassShader();
        this.updateGrassAroundPlayer();
    }
    
    /**
     * Create the grass shader material
     */
    createGrassShader() {
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
                float tipDistance = 0.15; // Increased by 2x (0.075 * 2 = 0.15)
                float centerDistance = 0.05; // Increased by 2x (0.025 * 2 = 0.05)

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
                // Base grass color (darkened)
                vec3 grassColor1 = vec3(0.25, 0.5, 0.25);  // Darkened (was 0.35, 0.7, 0.35)
                vec3 grassColor2 = vec3(0.3, 0.6, 0.25);  // Darkened (was 0.4, 0.8, 0.3)
                vec3 grassColor3 = vec3(0.5, 0.62, 0.28);  // Added yellow tint (increased red)
                
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
                
                // Calculate alpha based on height factor (darker areas more transparent)
                float alpha = 0.1 + (heightFactor * 0.9); // 0.1 at base, 1.0 at tips
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;
        
        this.grassMaterial = new THREE.ShaderMaterial({
            uniforms: this.grassUniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.05,
            fog: true
        });
    }
    
    /**
     * Get chunk key from world position
     */
    getChunkKey(x, z) {
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkZ = Math.floor(z / this.CHUNK_SIZE);
        return `${chunkX},${chunkZ}`;
    }
    
    /**
     * Get chunk center position from chunk coordinates
     */
    getChunkCenter(chunkX, chunkZ) {
        return {
            x: chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
            z: chunkZ * this.CHUNK_SIZE + this.CHUNK_SIZE / 2
        };
    }
    
    /**
     * Generate grass for a specific chunk
     */
    generateGrassChunk(chunkX, chunkZ) {
        const positions = [];
        const uvs = [];
        const indices = [];
        const colors = [];
        
        const chunkCenter = this.getChunkCenter(chunkX, chunkZ);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        for (let i = 0; i < this.BLADES_PER_CHUNK; i++) {
            const VERTEX_COUNT = 5;
            
            // Random position within chunk
            const x = chunkCenter.x + (Math.random() - 0.5) * this.CHUNK_SIZE;
            const z = chunkCenter.z + (Math.random() - 0.5) * this.CHUNK_SIZE;
            
            const pos = new THREE.Vector3(x, 0, z);
            const uv = [
                (x % this.CHUNK_SIZE) / this.CHUNK_SIZE,
                (z % this.CHUNK_SIZE) / this.CHUNK_SIZE
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
        
        const mesh = new THREE.Mesh(geometry, this.grassMaterial);
        this.scene.add(mesh);
        
        // Store chunk data
        this.grassChunks.set(chunkKey, {
            mesh: mesh,
            geometry: geometry,
            chunkX: chunkX,
            chunkZ: chunkZ,
            center: chunkCenter
        });
        
        return mesh;
    }
    
    /**
     * Remove a grass chunk
     */
    removeGrassChunk(chunkKey) {
        const chunk = this.grassChunks.get(chunkKey);
        if (chunk) {
            this.scene.remove(chunk.mesh);
            chunk.geometry.dispose();
            this.grassChunks.delete(chunkKey);
        }
    }
    
    /**
     * Update grass around player position
     */
    updateGrassAroundPlayer() {
        const playerPos = this.player.position;
        
        // Calculate which chunks should exist
        const chunksNeeded = new Set();
        const chunkRadius = Math.ceil(this.GRASS_RADIUS / this.CHUNK_SIZE);
        
        const playerChunkX = Math.floor(playerPos.x / this.CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerPos.z / this.CHUNK_SIZE);
        
        // Add chunks in radius around player
        for (let x = playerChunkX - chunkRadius; x <= playerChunkX + chunkRadius; x++) {
            for (let z = playerChunkZ - chunkRadius; z <= playerChunkZ + chunkRadius; z++) {
                const chunkCenter = this.getChunkCenter(x, z);
                const distance = Math.sqrt(
                    Math.pow(chunkCenter.x - playerPos.x, 2) + 
                    Math.pow(chunkCenter.z - playerPos.z, 2)
                );
                
                if (distance <= this.GRASS_RADIUS) {
                    chunksNeeded.add(`${x},${z}`);
                }
            }
        }
        
        // Remove chunks that are too far
        for (const [chunkKey, chunk] of this.grassChunks) {
            if (!chunksNeeded.has(chunkKey)) {
                this.removeGrassChunk(chunkKey);
            }
        }
        
        // Add missing chunks
        for (const chunkKey of chunksNeeded) {
            if (!this.grassChunks.has(chunkKey)) {
                const [x, z] = chunkKey.split(',').map(Number);
                this.generateGrassChunk(x, z);
            }
        }
    }
    
    /**
     * Generate a single grass blade
     */
    generateBlade(center, vArrOffset, uv) {
        const MID_WIDTH = this.BLADE_WIDTH * 0.7;
        const TIP_OFFSET = 0.05;
        const height = this.BLADE_HEIGHT + (Math.random() * this.BLADE_HEIGHT_VARIATION);
        
        const yaw = Math.random() * Math.PI * 2;
        const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const tipBend = Math.random() * Math.PI * 2;
        const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
        
        const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * 1));
        const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * -1));
        const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
        
        tl.y += height / 2;
        tr.y += height / 2;
        tc.y += height;
        
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
     * Update the grass system
     */
    update(deltaTime) {
        const elapsedTime = Date.now() - this.startTime;
        this.grassUniforms.iTime.value = elapsedTime;
        
        // Check if player has moved enough to update grass
        const playerPos = this.player.position;
        const distance = this.lastPlayerPosition.distanceTo(playerPos);
        
        if (distance > this.updateThreshold) {
            this.updateGrassAroundPlayer();
            this.lastPlayerPosition.copy(playerPos);
        }
    }
    
    /**
     * Get current chunk count (for debugging)
     */
    getChunkCount() {
        return this.grassChunks.size;
    }
    
    /**
     * Dispose of all grass resources
     */
    dispose() {
        for (const [chunkKey, chunk] of this.grassChunks) {
            this.scene.remove(chunk.mesh);
            chunk.geometry.dispose();
        }
        this.grassChunks.clear();
        
        if (this.grassMaterial) {
            this.grassMaterial.dispose();
        }
    }
} 