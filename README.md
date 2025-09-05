# three-arena-rpg# Three Arena

A real-time multiplayer 3D arena combat game built with Three.js, featuring Cat Quest-inspired visuals and intense PvP gameplay.

## 🎮 Game Overview

Three Arena is a top-down 3D multiplayer combat game where players battle in a fantasy arena environment. Fight against other players and AI enemies in real-time, level up through an XP system, and master various combat skills in this action-packed arena experience.

## ✨ Features

### Core Gameplay
- **Real-time Multiplayer Combat** - Battle other players in live PvP action
- **AI Enemy System** - Fight against intelligent Moblin enemies with synchronized behavior
- **Skill-based Combat** - Multiple attack types including dash attacks and special abilities
- **XP and Leveling System** - Gain experience and progress your character
- **Health and Damage System** - Strategic combat with health management

### Visual & Audio
- **Art Style** - Colorful, whimsical pixel 3D environments
- **Dynamic Lighting** - Advanced shadow mapping and atmospheric lighting
- **Particle Effects** - Blood particles, explosions, and impact effects
- **Sprite-based Characters** - Detailed character animations using sprite sheets
- **Environmental Audio** - Immersive sound effects and positional audio

### Technical Features
- **Three.js Rendering** - High-performance 3D graphics
- **Ably Real-time Networking** - Seamless multiplayer synchronization
- **Responsive Controls** - Smooth WASD movement and mouse interactions
- **Cinematic Camera** - Dynamic camera system following the action
- **Cross-platform Compatible** - Runs in any modern web browser

## 🎯 Game Mechanics

### Combat System
- **Melee Attacks** - Close-range combat with timing-based mechanics
- **Dash Abilities** - Quick movement and attack combinations
- **Skill Cooldowns** - Strategic ability management
- **Damage Numbers** - Visual feedback for all damage dealt
- **Health Orbs** - Collectible healing items

### Enemy AI
- **Smart Enemy Behavior** - Enemies detect, chase, and attack players
- **Synchronized Attacks** - Multiplayer-coordinated enemy actions
- **Fireball Attacks** - Ranged enemy abilities
- **Horde Management** - Dynamic enemy spawning system

### World Features
- **Circular Arena** - Bounded combat area with natural barriers
- **Environmental Objects** - Trees, bushes, and rocks for tactical positioning
- **Dynamic Skydome** - Atmospheric sky rendering
- **Collision Detection** - Physics-based movement and interactions

## 🕹️ Controls

- **WASD** - Move your character
- **Mouse** - Look around and target
- **Click** - Basic attack
- **Shift + Click** - Dash attack
- **Special (Q)** - Use special abilities

## 🛠️ Technical Architecture

### Frontend Technologies
- **Three.js** - 3D rendering engine
- **JavaScript ES6+** - Modern web development
- **WebGL** - Hardware-accelerated graphics
- **Web Audio API** - Advanced audio processing

### Networking
- **Ably Pub/Sub** - Real-time message synchronization
- **Custom Network Protocol** - Optimized player and enemy state sync
- **Event-driven Architecture** - Responsive multiplayer updates

### Game Systems
- **Entity Component System** - Modular game object architecture
- **State Management** - Centralized game state handling
- **Resource Loading** - Efficient asset management
- **Performance Optimization** - Smooth 60fps gameplay

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Internet connection for multiplayer features

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/leonwangg1/three-arena.git
   cd three-arena
   ```

2. Open `threejs-game.html` in your web browser or serve via a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. Navigate to `http://localhost:8000/threejs-game.html`

### Configuration
- Configure Ably credentials in `src/classes/ably-config.js` for multiplayer functionality
- Adjust game settings in the main game files as needed

## 📁 Project Structure

```
three-arena/
├── threejs-game.html          # Main game entry point
├── src/
│   ├── threejs/               # Three.js game engine
│   │   ├── main-threejs.js    # Game initialization and loop
│   │   ├── ThreeJSScene.js    # 3D scene management
│   │   ├── ThreeJSPlayer.js   # Main player controller
│   │   ├── GameWorld.js       # World environment
│   │   ├── InputManager.js    # Input handling
│   │   └── Example/           # Game systems
│   │       ├── Enemy.js       # AI enemy system
│   │       ├── XPSystem.js    # Experience system
│   │       ├── DamageNumber.js # Damage display
│   │       └── ...           # Other game systems
│   └── classes/               # Core game classes
│       ├── NetworkClient.js   # Multiplayer networking
│       └── AblyEnemySyncManager.js # Enemy synchronization
└── assets/                    # Game assets
    ├── sprites/               # Character and effect sprites
    ├── textures/             # Environmental textures
    └── audio/                # Sound effects
```

## 🎨 Game Assets

The game features custom sprite sheets, environmental textures, and audio effects that create an immersive fantasy combat experience. 
All assets are optimized for web delivery and cross-browser compatibility.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source. See the repository for license details.

## 🎮 Play Now

Experience the thrill of multiplayer arena combat - jump into Three Arena and test your skills against players from around the world!
