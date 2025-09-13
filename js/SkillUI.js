/**
 * SkillUI - Manages skill icon displays and cooldown indicators
 */
class SkillUI {
    constructor() {
        this.attackIcon = document.getElementById('attack-icon');
        this.dashIcon = document.getElementById('dash-icon');
        this.lightningIcon = document.getElementById('lightning-icon');
        this.attackOverlay = this.attackIcon?.querySelector('.cooldown-overlay');
        this.dashOverlay = this.dashIcon?.querySelector('.cooldown-overlay');
        this.lightningOverlay = this.lightningIcon?.querySelector('.cooldown-overlay');
        
        // Get key indicators
        this.attackKeyIndicator = this.attackIcon?.querySelector('.key-indicator');
        this.dashKeyIndicator = this.dashIcon?.querySelector('.key-indicator');
        this.lightningKeyIndicator = this.lightningIcon?.querySelector('.key-indicator');
        
        // Initialize icons as ready
        this.attackIcon?.classList.add('ready');
        this.dashIcon?.classList.add('ready');
        this.lightningIcon?.classList.add('ready');
        
        // Track previous states to prevent unnecessary updates
        this.previousAttackProgress = -1;
        this.previousDashProgress = -1;
        this.previousLightningProgress = -1;
    }
    
    /**
     * Update attack cooldown display
     * @param {number} cooldownProgress - Progress from 0 (on cooldown) to 1 (ready)
     */
    updateAttackCooldown(cooldownProgress) {
        if (!this.attackIcon || !this.attackOverlay) return;
        
        // Clamp progress between 0 and 1
        cooldownProgress = Math.max(0, Math.min(1, cooldownProgress));
        
        // Only update if changed significantly (prevent flashing)
        if (Math.abs(cooldownProgress - this.previousAttackProgress) < 0.01 && cooldownProgress < 1) {
            return;
        }
        
        this.previousAttackProgress = cooldownProgress;
        
        if (cooldownProgress >= 0.99) {
            // Skill is ready
            if (!this.attackIcon.classList.contains('ready')) {
                // Trigger pulse animation by removing and re-adding the class
                this.attackIcon.classList.remove('ready');
                void this.attackIcon.offsetWidth; // Force reflow
                this.attackIcon.classList.add('ready');
            }
            this.attackOverlay.style.setProperty('--progress', '360deg');
            
            // Fade key indicator back to full opacity
            if (this.attackKeyIndicator) {
                this.attackKeyIndicator.classList.remove('cooldown');
            }
        } else {
            // Skill is on cooldown
            this.attackIcon.classList.remove('ready');
            
            // Calculate angle (0 to 360 degrees)
            const angle = cooldownProgress * 360;
            this.attackOverlay.style.setProperty('--progress', `${angle}deg`);
            
            // Fade key indicator to reduced opacity
            if (this.attackKeyIndicator) {
                this.attackKeyIndicator.classList.add('cooldown');
            }
        }
    }
    
    /**
     * Update dash cooldown display
     * @param {number} cooldownProgress - Progress from 0 (on cooldown) to 1 (ready)
     */
    updateDashCooldown(cooldownProgress) {
        if (!this.dashIcon || !this.dashOverlay) return;
        
        // Clamp progress between 0 and 1
        cooldownProgress = Math.max(0, Math.min(1, cooldownProgress));
        
        // Only update if changed significantly (prevent flashing)
        if (Math.abs(cooldownProgress - this.previousDashProgress) < 0.01 && cooldownProgress < 1) {
            return;
        }
        
        this.previousDashProgress = cooldownProgress;
        
        if (cooldownProgress >= 0.99) {
            // Skill is ready
            if (!this.dashIcon.classList.contains('ready')) {
                // Trigger pulse animation by removing and re-adding the class
                this.dashIcon.classList.remove('ready');
                void this.dashIcon.offsetWidth; // Force reflow
                this.dashIcon.classList.add('ready');
            }
            this.dashOverlay.style.setProperty('--progress', '360deg');
            
            // Fade key indicator back to full opacity
            if (this.dashKeyIndicator) {
                this.dashKeyIndicator.classList.remove('cooldown');
            }
        } else {
            // Skill is on cooldown
            this.dashIcon.classList.remove('ready');
            
            // Calculate angle (0 to 360 degrees)
            const angle = cooldownProgress * 360;
            this.dashOverlay.style.setProperty('--progress', `${angle}deg`);
            
            // Fade key indicator to reduced opacity
            if (this.dashKeyIndicator) {
                this.dashKeyIndicator.classList.add('cooldown');
            }
        }
    }
    
    /**
     * Update lightning strike cooldown display
     * @param {number} cooldownProgress - Progress from 0 (on cooldown) to 1 (ready)
     */
    updateLightningStrikeCooldown(cooldownProgress) {
        if (!this.lightningIcon || !this.lightningOverlay) return;
        
        // Clamp progress between 0 and 1
        cooldownProgress = Math.max(0, Math.min(1, cooldownProgress));
        
        // Only update if changed significantly (prevent flashing)
        if (Math.abs(cooldownProgress - this.previousLightningProgress) < 0.01 && cooldownProgress < 1) {
            return;
        }
        
        this.previousLightningProgress = cooldownProgress;
        
        if (cooldownProgress >= 0.99) {
            // Skill is ready
            if (!this.lightningIcon.classList.contains('ready')) {
                // Trigger pulse animation by removing and re-adding the class
                this.lightningIcon.classList.remove('ready');
                void this.lightningIcon.offsetWidth; // Force reflow
                this.lightningIcon.classList.add('ready');
            }
            this.lightningOverlay.style.setProperty('--progress', '360deg');
            
            // Fade key indicator back to full opacity
            if (this.lightningKeyIndicator) {
                this.lightningKeyIndicator.classList.remove('cooldown');
            }
        } else {
            // Skill is on cooldown
            this.lightningIcon.classList.remove('ready');
            
            // Calculate angle (0 to 360 degrees)
            const angle = cooldownProgress * 360;
            this.lightningOverlay.style.setProperty('--progress', `${angle}deg`);
            
            // Fade key indicator to reduced opacity
            if (this.lightningKeyIndicator) {
                this.lightningKeyIndicator.classList.add('cooldown');
            }
        }
    }
} 