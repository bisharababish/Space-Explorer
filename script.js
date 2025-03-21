// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
let gameRunning = false;
let score = 0;
let health = 100;
let fuel = 100;
let level = 1;

// UI elements
const scoreElement = document.getElementById('score');
const fuelElement = document.getElementById('fuel');
const healthElement = document.getElementById('health');
const healthBarFill = document.getElementById('healthBarFill');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// Player ship
const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    angle: 0,
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    velocityX: 0,
    velocityY: 0,
    rotationSpeed: 0.05,
    acceleration: 0.1,
    friction: 0.99,
    firing: false,
    lastFired: 0,
    fireRate: 300, // milliseconds between shots
    color: '#7B68EE',
    trailParticles: [],
    engineGlow: 0
};

// Game objects
let asteroids = [];
let crystals = [];
let lasers = [];
let particles = [];
let stars = [];
let explosions = [];
let wormholes = [];

// Controls
const keys = {};

// Event listeners
window.addEventListener('keydown', function(e) {
    keys[e.key] = true;
    
    // Prevent scrolling with arrow keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', function(e) {
    keys[e.key] = false;
});

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!gameRunning) {
        generateStars();
    }
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);

// Initialize stars for background
function generateStars() {
    stars = [];
    const numStars = Math.floor(canvas.width * canvas.height / 1000);
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            brightness: Math.random(),
            twinkleSpeed: 0.01 + Math.random() * 0.03
        });
    }
}

// Generate game objects
function generateAsteroids(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        // Ensure asteroids don't spawn too close to the player
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distanceBetween(ship.x, ship.y, x, y) < 200);
        
        const size = 20 + Math.random() * 40;
        const vertices = 7 + Math.floor(Math.random() * 5);
        const shape = [];
        
        for (let j = 0; j < vertices; j++) {
            const angle = (j / vertices) * Math.PI * 2;
            const radius = size * (0.8 + Math.random() * 0.4);
            shape.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        asteroids.push({
            x: x,
            y: y,
            velocityX: Math.random() * 2 - 1,
            velocityY: Math.random() * 2 - 1,
            radius: size,
            shape: shape,
            angle: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            health: Math.floor(size / 10) + 1
        });
    }
}

function generateCrystals(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distanceBetween(ship.x, ship.y, x, y) < 150);
        
        crystals.push({
            x: x,
            y: y,
            radius: 10,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.03,
            pulsate: 0,
            pulsateSpeed: 0.05 + Math.random() * 0.03,
            value: Math.floor(Math.random() * 3) + 1 // 1-3 score points
        });
    }
}

function generateWormhole() {
    if (wormholes.length < 1 && Math.random() < 0.003) {
        let x, y;
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distanceBetween(ship.x, ship.y, x, y) < 300);
        
        wormholes.push({
            x: x,
            y: y,
            radius: 40,
            outerRadius: 60,
            angle: 0,
            rotationSpeed: 0.01,
            pulsate: 0,
            pulsateSpeed: 0.03,
            particles: []
        });
    }
}

// Game logic
function updateShip() {
    // Controls
    ship.thrust = keys['ArrowUp'] || keys['w'] || keys['W'];
    ship.rotateLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
    ship.rotateRight = keys['ArrowRight'] || keys['d'] || keys['D'];
    ship.firing = keys[' '];
    
    // Rotation
    if (ship.rotateLeft) ship.angle -= ship.rotationSpeed;
    if (ship.rotateRight) ship.angle += ship.rotationSpeed;
    
    // Thrust
    if (ship.thrust && fuel > 0) {
        ship.velocityX += Math.cos(ship.angle) * ship.acceleration;
        ship.velocityY += Math.sin(ship.angle) * ship.acceleration;
        
        // Decrease fuel
        fuel = Math.max(0, fuel - 0.1);
        fuelElement.textContent = Math.floor(fuel);
        
        // Create trail particles
        if (Math.random() < 0.4) {
            const distance = ship.radius * 0.8;
            const angle = ship.angle + Math.PI;
            
            particles.push({
                x: ship.x + Math.cos(angle) * distance,
                y: ship.y + Math.sin(angle) * distance,
                radius: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 10}, 100%, 70%)`,
                life: 1,
                velocityX: ship.velocityX * 0.5 + (Math.random() - 0.5) * 2,
                velocityY: ship.velocityY * 0.5 + (Math.random() - 0.5) * 2
            });
        }
        
        // Increase engine glow
        ship.engineGlow = Math.min(1, ship.engineGlow + 0.1);
    } else {
        // Decrease engine glow
        ship.engineGlow = Math.max(0, ship.engineGlow - 0.1);
    }
    
    // Apply friction
    ship.velocityX *= ship.friction;
    ship.velocityY *= ship.friction;
    
    // Update position
    ship.x += ship.velocityX;
    ship.y += ship.velocityY;
    
    // Screen wrapping
    if (ship.x < -ship.radius) ship.x = canvas.width + ship.radius;
    if (ship.x > canvas.width + ship.radius) ship.x = -ship.radius;
    if (ship.y < -ship.radius) ship.y = canvas.height + ship.radius;
    if (ship.y > canvas.height + ship.radius) ship.y = -ship.radius;
    
    // Weapon firing
    if (ship.firing) {
        const now = Date.now();
        if (now - ship.lastFired > ship.fireRate) {
            const distance = ship.radius * 1.2;
            const laserX = ship.x + Math.cos(ship.angle) * distance;
            const laserY = ship.y + Math.sin(ship.angle) * distance;
            
            lasers.push({
                x: laserX,
                y: laserY,
                velocityX: Math.cos(ship.angle) * 8 + ship.velocityX * 0.5,
                velocityY: Math.sin(ship.angle) * 8 + ship.velocityY * 0.5,
                radius: 3,
                life: 60,
                color: '#FF4500'
            });
            
            ship.lastFired = now;
        }
    }
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        
        // Update position
        laser.x += laser.velocityX;
        laser.y += laser.velocityY;
        
        // Screen wrapping
        if (laser.x < 0) laser.x = canvas.width;
        if (laser.x > canvas.width) laser.x = 0;
        if (laser.y < 0) laser.y = canvas.height;
        if (laser.y > canvas.height) laser.y = 0;
        
        // Decrease life
        laser.life--;
        
        // Remove if life is depleted
        if (laser.life <= 0) {
            lasers.splice(i, 1);
            continue;
        }
        
        // Laser particle effect
        if (Math.random() < 0.3) {
            particles.push({
                x: laser.x,
                y: laser.y,
                radius: 1 + Math.random() * 2,
                color: `hsl(${Math.random() * 40 + 10}, 100%, 70%)`,
                life: 0.5,
                velocityX: (Math.random() - 0.5) * 2,
                velocityY: (Math.random() - 0.5) * 2
            });
        }
        
        // Collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const distance = distanceBetween(laser.x, laser.y, asteroid.x, asteroid.y);
            
            if (distance < asteroid.radius + laser.radius) {
                // Remove laser
                lasers.splice(i, 1);
                
                // Reduce asteroid health
                asteroid.health--;
                
                // Create impact particles
                createExplosion(laser.x, laser.y, 10, 1, '#FFD700');
                
                // If asteroid is destroyed
                if (asteroid.health <= 0) {
                    // Create explosion
                    createExplosion(asteroid.x, asteroid.y, 20, 1.5, '#FFA500');
                    
                    // Add score
                    score += Math.floor(asteroid.radius / 5);
                    scoreElement.textContent = score;
                    
                    // Chance to spawn crystal
                    if (Math.random() < 0.3) {
                        crystals.push({
                            x: asteroid.x,
                            y: asteroid.y,
                            radius: 10,
                            angle: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.03,
                            pulsate: 0,
                            pulsateSpeed: 0.05 + Math.random() * 0.03,
                            value: Math.floor(Math.random() * 3) + 1
                        });
                    }
                    
                    // Remove asteroid
                    asteroids.splice(j, 1);
                }
                
                break;
            }
        }
    }
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        // Update position
        asteroid.x += asteroid.velocityX;
        asteroid.y += asteroid.velocityY;
        
        // Update rotation
        asteroid.angle += asteroid.rotationSpeed;
        
        // Screen wrapping
        if (asteroid.x < -asteroid.radius) asteroid.x = canvas.width + asteroid.radius;
        if (asteroid.x > canvas.width + asteroid.radius) asteroid.x = -asteroid.radius;
        if (asteroid.y < -asteroid.radius) asteroid.y = canvas.height + asteroid.radius;
        if (asteroid.y > canvas.height + asteroid.radius) asteroid.y = -asteroid.radius;
        
        // Collision with ship
        const distance = distanceBetween(ship.x, ship.y, asteroid.x, asteroid.y);
        if (distance < ship.radius + asteroid.radius * 0.7) {
            // Damage to ship
            health -= 10;
            health = Math.max(0, health);
            healthElement.textContent = health;
            healthBarFill.style.width = `${health}%`;
            
            // Knockback effect
            const angle = Math.atan2(ship.y - asteroid.y, ship.x - asteroid.x);
            ship.velocityX += Math.cos(angle) * 3;
            ship.velocityY += Math.sin(angle) * 3;
            
            // Asteroid knockback
            asteroid.velocityX -= Math.cos(angle) * 1.5;
            asteroid.velocityY -= Math.sin(angle) * 1.5;
            
            // Create impact particles
            createExplosion(ship.x, ship.y, 15, 1, '#FF6347');
            
            // Game over if health is depleted
            if (health <= 0) {
                endGame();
            }
        }
    }
    
    // Spawn more asteroids if needed
    if (asteroids.length < 5 + level) {
        generateAsteroids(1);
    }
}

function updateCrystals() {
    for (let i = crystals.length - 1; i >= 0; i--) {
        const crystal = crystals[i];
        
        // Update rotation
        crystal.angle += crystal.rotationSpeed;
        
        // Pulsating effect
        crystal.pulsate += crystal.pulsateSpeed;
        if (crystal.pulsate > Math.PI * 2) {
            crystal.pulsate -= Math.PI * 2;
        }
        
        // Collision with ship
        const distance = distanceBetween(ship.x, ship.y, crystal.x, crystal.y);
        if (distance < ship.radius + crystal.radius) {
            // Add score
            score += crystal.value * 10;
            scoreElement.textContent = score;
            
            // Refuel ship
            fuel = Math.min(100, fuel + 20);
            fuelElement.textContent = Math.floor(fuel);
            
            // Create collection particles
            createExplosion(crystal.x, crystal.y, 15, 1, '#7DF9FF');
            
            // Remove crystal
            crystals.splice(i, 1);
        }
    }
    
    // Spawn more crystals if needed
    if (crystals.length < 3 + Math.floor(level / 2)) {
        generateCrystals(1);
    }
}

function updateWormholes() {
    generateWormhole();
    
    for (let i = wormholes.length - 1; i >= 0; i--) {
        const wormhole = wormholes[i];
        
        // Update rotation
        wormhole.angle += wormhole.rotationSpeed;
        
        // Pulsating effect
        wormhole.pulsate += wormhole.pulsateSpeed;
        if (wormhole.pulsate > Math.PI * 2) {
            wormhole.pulsate -= Math.PI * 2;
        }
        
        // Generate particles around wormhole
        if (Math.random() < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const distance = wormhole.radius + Math.random() * 20;
            
            wormhole.particles.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                life: 1,
                speed: 0.01 + Math.random() * 0.02
            });
        }
        
        // Update wormhole particles
        for (let j = wormhole.particles.length - 1; j >= 0; j--) {
            const particle = wormhole.particles[j];
            
            // Move particles towards center
            const distance = Math.sqrt(particle.x * particle.x + particle.y * particle.y);
            const moveSpeed = particle.speed * (1 + (wormhole.radius - distance) / 10);
            
            if (distance > 0) {
                particle.x -= (particle.x / distance) * moveSpeed;
                particle.y -= (particle.y / distance) * moveSpeed;
            }
            
            // Decrease life
            particle.life -= 0.01;
            
            // Remove if life is depleted or reached center
            if (particle.life <= 0 || distance < 5) {
                wormhole.particles.splice(j, 1);
            }
        }
        
        // Collision with ship
        const distance = distanceBetween(ship.x, ship.y, wormhole.x, wormhole.y);
        if (distance < ship.radius + wormhole.radius * 0.7) {
            // Next level
            nextLevel();
            
            // Remove wormhole
            wormholes.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        
        // Decrease life
        particle.life -= 0.02;
        
        // Remove if life is depleted
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        
        // Increase size
        explosion.radius += explosion.speed;
        
        // Decrease life
        explosion.life -= 0.05;
        
        // Remove if life is depleted
        if (explosion.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function updateStars() {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        
        // Twinkle effect
        star.brightness += Math.sin(Date.now() * star.twinkleSpeed) * 0.01;
        star.brightness = Math.max(0.3, Math.min(1, star.brightness));
        
        // Parallax effect when ship moves
        star.x -= ship.velocityX * 0.01;
        star.y -= ship.velocityY * 0.01;
        
        // Screen wrapping
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
    }
}

// Drawing functions
function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    // Ship body
    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.3, 0);
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);
    ctx.closePath();
    
    // Ship gradient
    const gradient = ctx.createLinearGradient(-ship.radius, 0, ship.radius, 0);
    gradient.addColorStop(0, '#4B0082');
    gradient.addColorStop(1, ship.color);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = '#9370DB';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Engine glow
    if (ship.engineGlow > 0) {
        ctx.beginPath();
        ctx.moveTo(-ship.radius * 0.3, 0);
        ctx.lineTo(-ship.radius * 1.2, -ship.radius * 0.4);
        ctx.lineTo(-ship.radius * 1.7, 0);
        ctx.lineTo(-ship.radius * 1.2, ship.radius * 0.4);
        ctx.closePath();
        
        const glowGradient = ctx.createRadialGradient(
            -ship.radius * 0.8, 0, 0,
            -ship.radius * 0.8, 0, ship.radius * 1.2
        );
        glowGradient.addColorStop(0, `rgba(255, 165, 0, ${ship.engineGlow})`);
        glowGradient.addColorStop(0.5, `rgba(255, 69, 0, ${ship.engineGlow * 0.5})`);
        glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.fill();
    }
    
    ctx.restore();
}

function drawLasers() {
    for (let i = 0; i < lasers.length; i++) {
        const laser = lasers[i];
        
        ctx.save();
        ctx.translate(laser.x, laser.y);
        
        // Laser glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, laser.radius * 3);
        gradient.addColorStop(0, laser.color);
        gradient.addColorStop(0.5, `rgba(255, 69, 0, 0.5)`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, laser.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Laser core
        ctx.beginPath();
        ctx.arc(0, 0, laser.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF';
        ctx.fill();
        
        ctx.restore();
    }
}

function drawAsteroids() {
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];
        
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.angle);
        
        // Asteroid body
        ctx.beginPath();
        ctx.moveTo(asteroid.shape[0].x, asteroid.shape[0].y);
        
        for (let j = 1; j < asteroid.shape.length; j++) {
            ctx.lineTo(asteroid.shape[j].x, asteroid.shape[j].y);
        }
        
        ctx.closePath();
        
        // Asteroid gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, asteroid.radius);
        gradient.addColorStop(0, '#696969');
        gradient.addColorStop(1, '#2F4F4F');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = '#A9A9A9';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
}

function drawCrystals() {
    for (let i = 0; i < crystals.length; i++) {
        const crystal = crystals[i];
        
        ctx.save();
        ctx.translate(crystal.x, crystal.y);
        ctx.rotate(crystal.angle);
        
        // Pulsating effect
        const scale = 1 + Math.sin(crystal.pulsate) * 0.2;
        ctx.scale(scale, scale);
        
        // Crystal body
        ctx.beginPath();
        ctx.moveTo(0, -crystal.radius * 1.2);
        ctx.lineTo(crystal.radius, -crystal.radius * 0.3);
        ctx.lineTo(crystal.radius * 0.5, crystal.radius);
        ctx.lineTo(-crystal.radius * 0.5, crystal.radius);
        ctx.lineTo(-crystal.radius, -crystal.radius * 0.3);
        ctx.closePath();
        
        // Crystal gradient
        const gradient = ctx.createLinearGradient(0, -crystal.radius, 0, crystal.radius);
        gradient.addColorStop(0, '#00FFFF');
        gradient.addColorStop(0.5, '#7DF9FF');
        gradient.addColorStop(1, '#40E0D0');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = '#E0FFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Crystal glow
        ctx.globalAlpha = 0.5 + Math.sin(crystal.pulsate) * 0.3;
        ctx.shadowColor = '#7DF9FF';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }
}

function drawWormholes() {
    for (let i = 0; i < wormholes.length; i++) {
        const wormhole = wormholes[i];
        
        ctx.save();
        ctx.translate(wormhole.x, wormhole.y);
        ctx.rotate(wormhole.angle);
        
        // Pulsating effect
        const scale = 1 + Math.sin(wormhole.pulsate) * 0.2;
        const currentRadius = wormhole.radius * scale;
        const currentOuterRadius = wormhole.outerRadius * scale;
        
        // Outer glow
        const outerGradient = ctx.createRadialGradient(0, 0, currentRadius * 0.8, 0, 0, currentOuterRadius);
        outerGradient.addColorStop(0, 'rgba(75, 0, 130, 0.8)');
        outerGradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.5)');
        outerGradient.addColorStop(1, 'rgba(148, 0, 211, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, currentOuterRadius, 0, Math.PI * 2);
        ctx.fillStyle = outerGradient;
        ctx.fill();
        
        // Inner portal
        const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
        innerGradient.addColorStop(0, '#000000');
        innerGradient.addColorStop(0.7, '#4B0082');
        innerGradient.addColorStop(1, '#8A2BE2');
        
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerGradient;
        ctx.fill();
        
        // Swirl effect
        for (let j = 0; j < 5; j++) {
            const swirl = wormhole.angle * 2 + (j / 5) * Math.PI * 2;
            const swirlX = Math.cos(swirl) * currentRadius * 0.8;
            const swirlY = Math.sin(swirl) * currentRadius * 0.8;
            const swirlSize = currentRadius * 0.4;
            
            ctx.beginPath();
            ctx.arc(swirlX, swirlY, swirlSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(148, 0, 211, 0.3)';
            ctx.fill();
        }
        
        // Draw wormhole particles
        for (let j = 0; j < wormhole.particles.length; j++) {
            const particle = wormhole.particles[j];
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147, 112, 219, ${particle.life})`;
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawExplosions() {
    for (let i = 0; i < explosions.length; i++) {
        const explosion = explosions[i];
        
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, explosion.radius
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${explosion.life})`);
        gradient.addColorStop(0.4, `rgba(255, 165, 0, ${explosion.life * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

function drawStars() {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fill();
    }
}

function drawHUD() {
    // Update health bar
    healthBarFill.style.width = `${health}%`;
    
    // Level indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${level}`, canvas.width - 20, 30);
}

// Helper functions
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function createExplosion(x, y, count, size, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            radius: 3 + Math.random() * 3,
            color: color,
            life: 1,
            velocityX: (Math.random() - 0.5) * 5,
            velocityY: (Math.random() - 0.5) * 5
        });
    }
    
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        speed: 1.5 * size,
        life: 1,
        color: color
    });
}

function nextLevel() {
    level++;
    
    // Clear the screen of most objects
    asteroids = [];
    crystals = [];
    wormholes = [];
    
    // Generate new objects for the next level
    generateAsteroids(5 + level);
    generateCrystals(3 + Math.floor(level / 2));
    
    // Heal the ship a bit
    health = Math.min(100, health + 20);
    healthElement.textContent = health;
    healthBarFill.style.width = `${health}%`;
    
    // Refuel
    fuel = 100;
    fuelElement.textContent = fuel;
    
    // Bonus score
    score += level * 50;
    scoreElement.textContent = score;
    
    // Level up message
    const levelMessage = document.createElement('div');
    levelMessage.className = 'level-message';
    levelMessage.textContent = `Level ${level}`;
    document.body.appendChild(levelMessage);
    
    setTimeout(() => {
        levelMessage.remove();
    }, 3000);
}

function startGame() {
    gameRunning = true;
    score = 0;
    health = 100;
    fuel = 100;
    level = 1;
    
    // Update UI
    scoreElement.textContent = score;
    healthElement.textContent = health;
    fuelElement.textContent = fuel;
    healthBarFill.style.width = `${health}%`;
    
    // Reset arrays
    asteroids = [];
    crystals = [];
    lasers = [];
    particles = [];
    explosions = [];
    wormholes = [];
    
    // Reset ship
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.velocityX = 0;
    ship.velocityY = 0;
    ship.angle = 0;
    
    // Generate stars
    generateStars();
    
    // Generate initial game objects
    generateAsteroids(5 + level);
    generateCrystals(3 + Math.floor(level / 2));
    
    // Hide start screen
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    startGame();
}

function endGame() {
    gameRunning = false;
    
    // Show game over screen
    gameOverScreen.style.display = 'flex';
    finalScoreElement.textContent = `Final Score: ${score}`;
}

function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars();
    
    if (gameRunning) {
        // Update game objects
        updateShip();
        updateLasers();
        updateAsteroids();
        updateCrystals();
        updateWormholes();
        updateParticles();
        updateExplosions();
        updateStars();
        
        // Draw game objects
        drawWormholes();
        drawParticles();
        drawExplosions();
        drawCrystals();
        drawAsteroids();
        drawLasers();
        drawShip();
        
        // Draw HUD
        drawHUD();
        
        // Request next frame
        requestAnimationFrame(gameLoop);
    }
}

// Initialize the game
generateStars();
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';