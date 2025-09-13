/**
 * XPSystem - Manages player experience points and level progression
 */
class XPSystem {
    constructor() {
        this.currentXP = 0;
        this.currentLevel = 1;
        this.xpPerCrystal = 3;
        this.baseXPRequired = 15; // XP required for level 2
        this.exponentialFactor = 1.5; // Exponential scaling factor
        
        // UI elements
        this.xpBarContainer = null;
        this.xpBarFill = null;
        this.xpText = null;
        this.levelText = null;
        
        this.initializeUI();
        this.updateUI();
    }
    
    /**
     * Initialize XP bar UI elements
     */
    initializeUI() {
        // Create XP bar container
        this.xpBarContainer = document.createElement('div');
        this.xpBarContainer.id = 'xp-bar-container';
        this.xpBarContainer.innerHTML = `
            <div id="xp-level-text">LV 1</div>
            <div id="xp-bar">
                <div id="xp-bar-fill"></div>
            </div>
            <div id="xp-text">0 / 15 XP</div>
        `;
        
        // Add to UI overlay
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
            uiOverlay.appendChild(this.xpBarContainer);
        }
        
        // Get references to UI elements
        this.xpBarFill = document.getElementById('xp-bar-fill');
        this.xpText = document.getElementById('xp-text');
        this.levelText = document.getElementById('xp-level-text');
    }
    
    /**
     * Calculate XP required for a specific level
     */
    getXPRequiredForLevel(level) {
        if (level <= 1) return 0;
        return Math.floor(this.baseXPRequired * Math.pow(this.exponentialFactor, level - 2));
    }
    
    /**
     * Calculate total XP required to reach a level
     */
    getTotalXPForLevel(level) {
        let totalXP = 0;
        for (let i = 2; i <= level; i++) {
            totalXP += this.getXPRequiredForLevel(i);
        }
        return totalXP;
    }
    
    /**
     * Get current level progress (0-1)
     */
    getCurrentLevelProgress() {
        const currentLevelTotalXP = this.getTotalXPForLevel(this.currentLevel);
        const nextLevelTotalXP = this.getTotalXPForLevel(this.currentLevel + 1);
        const xpForThisLevel = nextLevelTotalXP - currentLevelTotalXP;
        const xpIntoThisLevel = this.currentXP - currentLevelTotalXP;
        
        return Math.max(0, Math.min(1, xpIntoThisLevel / xpForThisLevel));
    }
    
    /**
     * Get XP needed for next level
     */
    getXPForNextLevel() {
        const currentLevelTotalXP = this.getTotalXPForLevel(this.currentLevel);
        const nextLevelTotalXP = this.getTotalXPForLevel(this.currentLevel + 1);
        return nextLevelTotalXP - this.currentXP;
    }
    
    /**
     * Get XP progress in current level
     */
    getXPInCurrentLevel() {
        const currentLevelTotalXP = this.getTotalXPForLevel(this.currentLevel);
        return this.currentXP - currentLevelTotalXP;
    }
    
    /**
     * Get XP required for current level
     */
    getXPRequiredForCurrentLevel() {
        return this.getXPRequiredForLevel(this.currentLevel + 1);
    }
    
    /**
     * Add XP and check for level ups
     */
    addXP(amount) {
        const oldLevel = this.currentLevel;
        this.currentXP += amount;
        
        // Check for level ups
        while (this.currentXP >= this.getTotalXPForLevel(this.currentLevel + 1)) {
            this.currentLevel++;
            console.log(`Level up! Now level ${this.currentLevel}`);
            this.onLevelUp(this.currentLevel);
        }
        
        this.updateUI();
        
        // Return true if leveled up
        return this.currentLevel > oldLevel;
    }
    
    /**
     * Called when player levels up
     */
    onLevelUp(newLevel) {
        // Add level up visual effects here
        this.showLevelUpEffect();
        
        // Could add level up bonuses, unlock new abilities, etc.
        console.log(`Congratulations! You reached level ${newLevel}!`);
    }
    
    /**
     * Show level up visual effect
     */
    showLevelUpEffect() {
        // Add glow effect to level text
        if (this.levelText) {
            this.levelText.style.animation = 'levelUpGlow 1s ease-out';
            setTimeout(() => {
                this.levelText.style.animation = '';
            }, 1000);
        }
        
        // Add scale effect to XP bar
        if (this.xpBarContainer) {
            this.xpBarContainer.style.animation = 'levelUpScale 0.5s ease-out';
            setTimeout(() => {
                this.xpBarContainer.style.animation = '';
            }, 500);
        }
    }
    
    /**
     * Update XP bar UI
     */
    updateUI() {
        if (!this.xpBarFill || !this.xpText || !this.levelText) return;
        
        const progress = this.getCurrentLevelProgress();
        const xpInLevel = this.getXPInCurrentLevel();
        const xpRequiredForLevel = this.getXPRequiredForCurrentLevel();
        
        // Update bar fill
        this.xpBarFill.style.width = `${progress * 100}%`;
        
        // Update text
        this.xpText.textContent = `${xpInLevel} / ${xpRequiredForLevel} XP`;
        this.levelText.textContent = `LV ${this.currentLevel}`;
    }
    
    /**
     * Handle crystal collection XP
     */
    onCrystalCollected() {
        const leveledUp = this.addXP(this.xpPerCrystal);
        console.log(`Gained ${this.xpPerCrystal} XP from crystal! Total: ${this.currentXP} XP`);
        return leveledUp;
    }
    
    /**
     * Get current stats for debugging
     */
    getStats() {
        return {
            level: this.currentLevel,
            xp: this.currentXP,
            xpInLevel: this.getXPInCurrentLevel(),
            xpRequired: this.getXPRequiredForCurrentLevel(),
            progress: this.getCurrentLevelProgress(),
            nextLevelAt: this.getTotalXPForLevel(this.currentLevel + 1)
        };
    }
} 