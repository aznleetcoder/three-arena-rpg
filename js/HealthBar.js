/**
 * HealthBar - 3D health bar that hovers above enemies
 */
class HealthBar extends THREE.Object3D {
    constructor(width = 2, height = 0.2) {
        super();
        
        this.width = width;
        this.height = height;
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.paddingX = 0.03; // 3% horizontal padding (reduced from 5% to make bar 4% wider)
        this.paddingY = 0.15; // 15% vertical padding (unchanged)
        
        // Create rounded rectangle shape
        const shape = new THREE.Shape();
        const cornerRadius = height * 0.5; // 50% of height for more rounded corners
        const x = -width / 2;
        const y = -height / 2;
        
        shape.moveTo(x + cornerRadius, y);
        shape.lineTo(x + width - cornerRadius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        shape.lineTo(x + width, y + height - cornerRadius);
        shape.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        shape.lineTo(x + cornerRadius, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        shape.lineTo(x, y + cornerRadius);
        shape.quadraticCurveTo(x, y, x + cornerRadius, y);
        
        // Create background (dark green)
        const bgGeometry = new THREE.ShapeGeometry(shape);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x1B4332, // Dark green
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            fog: false // Don't be affected by fog/depth effects
        });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.background.renderOrder = 9998;
        this.background.layers.set(1); // Set to UI layer
        this.add(this.background);
        
        // Create health fill (white) - smaller than background
        const fillPaddingX = width * this.paddingX;
        const fillPaddingY = height * this.paddingY;
        const fillWidth = width - (fillPaddingX * 2);
        const fillHeight = height - (fillPaddingY * 2);
        
        const fillShape = new THREE.Shape();
        const fillCornerRadius = fillHeight * 0.5;
        const fillX = -fillWidth / 2;
        const fillY = -fillHeight / 2;
        
        fillShape.moveTo(fillX + fillCornerRadius, fillY);
        fillShape.lineTo(fillX + fillWidth - fillCornerRadius, fillY);
        fillShape.quadraticCurveTo(fillX + fillWidth, fillY, fillX + fillWidth, fillY + fillCornerRadius);
        fillShape.lineTo(fillX + fillWidth, fillY + fillHeight - fillCornerRadius);
        fillShape.quadraticCurveTo(fillX + fillWidth, fillY + fillHeight, fillX + fillWidth - fillCornerRadius, fillY + fillHeight);
        fillShape.lineTo(fillX + fillCornerRadius, fillY + fillHeight);
        fillShape.quadraticCurveTo(fillX, fillY + fillHeight, fillX, fillY + fillHeight - fillCornerRadius);
        fillShape.lineTo(fillX, fillY + fillCornerRadius);
        fillShape.quadraticCurveTo(fillX, fillY, fillX + fillCornerRadius, fillY);
        
        const fillGeometry = new THREE.ShapeGeometry(fillShape);
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // White
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            fog: false // Don't be affected by fog/depth effects
        });
        this.fill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.fill.renderOrder = 9999;
        this.fill.position.z = 0.001; // Slightly in front
        this.fill.layers.set(1); // Set to UI layer
        this.add(this.fill);
        
        // Create border
        const borderShape = new THREE.Shape();
        borderShape.moveTo(x + cornerRadius, y);
        borderShape.lineTo(x + width - cornerRadius, y);
        borderShape.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        borderShape.lineTo(x + width, y + height - cornerRadius);
        borderShape.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        borderShape.lineTo(x + cornerRadius, y + height);
        borderShape.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        borderShape.lineTo(x, y + cornerRadius);
        borderShape.quadraticCurveTo(x, y, x + cornerRadius, y);
        
        const borderPoints = borderShape.getPoints();
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
        const borderMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 4, // Increased thickness
            transparent: true,
            opacity: 0.5 // 50% opacity
        });
        this.border = new THREE.Line(borderGeometry, borderMaterial);
        this.border.renderOrder = 10000;
        this.border.layers.set(1); // Set to UI layer
        this.add(this.border);
        
        // Hide by default
        this.visible = false;
        this.hideTimer = 0;
        this.hideDelay = 3; // Hide after 3 seconds of no damage
    }
    
    /**
     * Set health values
     */
    setHealth(current, max, showBar = true) {
        this.currentHealth = current;
        this.maxHealth = max;
        this.updateBar();
        
        // Show bar when health changes (unless it's the initial setup)
        if (showBar && (current < max)) {
            this.show();
        }
    }
    
    /**
     * Update the visual representation
     */
    updateBar() {
        const healthPercent = Math.max(0, Math.min(1, this.currentHealth / this.maxHealth));
        
        // Update fill width (accounting for padding)
        const fillWidth = this.width - (this.width * this.paddingX * 2);
        this.fill.scale.x = healthPercent;
        this.fill.position.x = -(fillWidth * (1 - healthPercent)) / 2;
        
        // Always use white color
        this.fill.material.color.setHex(0xFFFFFF); // White
    }
    
    /**
     * Show the health bar
     */
    show() {
        this.visible = true;
        this.hideTimer = 0;
    }
    
    /**
     * Update health bar (handle auto-hide)
     */
    update(deltaTime, camera, parentWorldPosition = null) {
        if (!this.visible) return;
        
        // Update world position if parent position is provided
        if (parentWorldPosition && this.parent) {
            // Get world position from parent
            const worldPos = new THREE.Vector3();
            this.parent.localToWorld(worldPos.copy(this.position));
            this.worldPosition = worldPos;
        }
        
        // Face camera
        if (camera) {
            this.lookAt(camera.position);
        }
        
        // Auto-hide timer
        this.hideTimer += deltaTime;
        if (this.hideTimer >= this.hideDelay) {
            this.visible = false;
        }
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        this.background.geometry.dispose();
        this.background.material.dispose();
        this.fill.geometry.dispose();
        this.fill.material.dispose();
        this.border.geometry.dispose();
        this.border.material.dispose();
    }
} 