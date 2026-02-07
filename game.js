// --- 1. Math Helper ---
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(s) { return new Vector2(this.x * s, this.y * s); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    dist(v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); }
    normalize() {
        let m = this.mag();
        return m === 0 ? new Vector2(0, 0) : new Vector2(this.x / m, this.y / m);
    }
    clone() { return new Vector2(this.x, this.y); }
}

function distToSegmentSquared(p, v, w) {
    var l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) +
           Math.pow(p.y - (v.y + t * (w.y - v.y)), 2);
}

function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
}

function distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}


// --- 2. Константы ---
const CONFIG = {
    GRAVITY: 0.1,
    ACCELERATION: 0.1,
    FRICTION: 0.9,
    MAX_SPEED: 1.5,
    JUMP_FORCE: 4.5,
    MAX_CHARGE: 100,
    CHARGE_RATE: 0.8,
    WORLD_WIDTH: 3500, 
    WORLD_HEIGHT: 2000, 
    VIEWPORT_WIDTH: 1920, 
    VIEWPORT_HEIGHT: 1080,
    BOT_COUNT: 5,
    PROJECTILE_DRAG: 0.998,
    PROJECTILE_GRAVITY: 0.05,
    MAX_PARTICLES: 600, 
    WIN_LIMIT: 10,
    MAX_INVENTORY: 7,
    GAME_MODE: 'DM', // 'DM', 'TDM', 'CTF'
    CTF_RESPAWN_TIME: 1200 // 20 seconds * 60 fps
};

const BOT_NAMES = [
    "Пельмень", "Батон", "Сосиска", "Грызун", "Терминатор 2000", "Нуб", "Профи", 
    "Читер", "Лаг", "Кактус", "Шпунтик", "Винтик", "Нагибатор", "АФК", 
    "Бот Борис", "Илон Маск", "Скайнет", "Валл-И", "R2D2", "Шрек", 
    "Губка Боб", "Колобок", "Чебурашка", "Злой Тапочек", "Диванный Воин", 
    "Мамкин Хакер", "Пудж", "Киборг", "Разрушитель", "Титаниум", "Вдова", 
    "Атом", "Вольт", "Хаос", "Немезида", "Омега", "Джаггернаут"
];

const TEAMS = {
    0: { name: 'Free', color: '#fff' },
    1: { name: 'Синие', color: '#3498db' },
    2: { name: 'Красные', color: '#e74c3c' }
};

const COSMETICS = {
    helmets: [
        { id: 'none', label: 'Без шлема' },
        { id: 'visor', label: 'Визор' },
        { id: 'tactical', label: 'Тактический' },
        { id: 'cap', label: 'Кепка' }
    ],
    outfits: [
        { id: 'standard', label: 'Классика' },
        { id: 'tactical', label: 'Тактик' },
        { id: 'armor', label: 'Броня' },
        { id: 'hoodie', label: 'Худи' }
    ],
    boots: [
        { id: 'standard', label: 'Обычные' },
        { id: 'combat', label: 'Берцы' },
        { id: 'sneakers', label: 'Кроссы' }
    ],
    accessories: [
        { id: 'none', label: 'Нет' },
        { id: 'cape', label: 'Плащ' },
        { id: 'backpack', label: 'Рюкзак' },
        { id: 'antenna', label: 'Антенна' }
    ],
    palette: ['#3498db', '#e67e22', '#9b59b6', '#2ecc71', '#f1c40f', '#e74c3c', '#95a5a6']
};

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function defaultCosmetics() {
    return {
        helmet: 'none',
        outfit: 'standard',
        boots: 'standard',
        accessory: 'none',
        accent: '#f1c40f'
    };
}

function randomBotCosmetics() {
    return {
        color: randomChoice(COSMETICS.palette),
        cosmetics: {
            helmet: randomChoice(COSMETICS.helmets).id,
            outfit: randomChoice(COSMETICS.outfits).id,
            boots: randomChoice(COSMETICS.boots).id,
            accessory: randomChoice(COSMETICS.accessories).id,
            accent: randomChoice(COSMETICS.palette)
        }
    };
}

// --- 3. Оружие и Баффы ---

const PowerUpType = {
    SHIELD: { name: "Щит", color: '#00ffff', duration: 1200, type: 'shield', icon: 'S' }, // 20 sec
    DAMAGE: { name: "Урон", color: '#ff0000', duration: 1200, type: 'damage', icon: 'D' }, // 20 sec
    JUMP:   { name: "Прыжок", color: '#00ff00', duration: 1200, type: 'jump', icon: 'J' }, // 20 sec
    SPEED:  { name: "Скорость", color: '#ffff00', duration: 1200, type: 'speed', icon: 'H' } // 20 sec
};

const WeaponType = {
    PISTOL:     { name: "Бластер", color: '#3498db', radius: 15, damage: 8, infinite: true, type: 'blaster', cooldown: 45, chargeable: false }, 
    BAZOOKA:    { name: "Базука", color: '#e74c3c', radius: 60, damage: 35, type: 'explosive', burn: 3, cooldown: 40, chargeable: true }, 
    GRENADE:    { name: "Граната", color: '#27ae60', radius: 70, damage: 45, type: 'bounce', cooldown: 45, chargeable: true },
    DRILL:      { name: "Бур", color: '#f39c12', radius: 25, damage: 15, specialized: true, type: 'drill', cooldown: 40, chargeable: true },
    PLASMA:     { name: "Плазма", color: '#00ffcc', radius: 45, damage: 30, bounces: 2, type: 'energy', cooldown: 50, chargeable: true },
    MOLOTOV:    { name: "Молотов", color: '#e67e22', radius: 30, damage: 15, type: 'molotov', burn: 15, cooldown: 50, chargeable: true },
    SINGULARITY:{ name: "Дыра", color: '#8e44ad', radius: 100, damage: 999, type: 'blackhole', cooldown: 120, chargeable: true }, 
    
    SHOTGUN:    { name: "Дробовик", color: '#f1c40f', radius: 10, damage: 8, type: 'shotgun', count: 5, spread: 0.3, cooldown: 50, chargeable: false }, 
    SNIPER:     { name: "Снайперка", color: '#ffe082', radius: 5, damage: 60, type: 'highspeed', cooldown: 70, chargeable: false }, 
    MINIGUN:    { name: "Миниган", color: '#f39c12', radius: 5, damage: 4, type: 'rapid', cooldown: 4, chargeable: false }, 
    HOMING:     { name: "Самонавод", color: '#ff00ff', radius: 40, damage: 25, type: 'homing', cooldown: 60, chargeable: true },
    TELEPORT:   { name: "Телепорт", color: '#3498db', radius: 0, damage: 0, type: 'teleport', cooldown: 60, chargeable: true },
    LASER:      { name: "Лазер", color: '#e74c3c', radius: 5, damage: 40, type: 'laser', cooldown: 80, chargeable: false },
    NUKE:       { name: "Ядерка", color: '#2c3e50', radius: 250, damage: 100, type: 'nuke', cooldown: 100, chargeable: true }
};

const Materials = {
    DIRT:   { color: [101, 78, 56],   hardness: 0.0 }, 
    STONE:  { color: [100, 100, 100], hardness: 0.6 }, 
    BEDROCK:{ color: [40, 40, 40],    hardness: 0.95}  
};

const WeaponArt = {
    'blaster': (ctx) => { ctx.fillStyle='#95a5a6'; ctx.fillRect(4,-2,8,4); ctx.fillStyle='#34495e'; ctx.fillRect(4,2,3,3); ctx.fillStyle='#3498db'; ctx.fillRect(10,-1,2,2); },
    'explosive': (ctx) => { ctx.fillStyle='#2c3e50'; ctx.fillRect(0,-4,16,6); ctx.fillStyle='#27ae60'; ctx.fillRect(4,-5,8,8); ctx.fillStyle='#c0392b'; ctx.fillRect(14,-4,2,6); ctx.fillStyle='#34495e'; ctx.fillRect(4,2,4,4); },
    'bounce': (ctx) => { ctx.fillStyle='#7f8c8d'; ctx.fillRect(2,-3,10,6); ctx.fillStyle='#2ecc71'; ctx.beginPath(); ctx.arc(12,0,3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#34495e'; ctx.fillRect(2,3,3,3); },
    'drill': (ctx) => { ctx.fillStyle='#f39c12'; ctx.fillRect(2,-3,8,6); ctx.fillStyle='#bdc3c7'; ctx.beginPath(); ctx.moveTo(10,-2); ctx.lineTo(18,0); ctx.lineTo(10,2); ctx.fill(); ctx.fillStyle='#34495e'; ctx.fillRect(2,3,4,3); },
    'energy': (ctx) => { ctx.fillStyle='#fff'; ctx.fillRect(2,-3,10,6); ctx.fillStyle='#00ffcc'; ctx.fillRect(4,-2,6,4); ctx.fillStyle='#34495e'; ctx.fillRect(2,3,4,3); },
    'molotov': (ctx) => { ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(10,0,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#e67e22'; ctx.beginPath(); ctx.arc(10,2,3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(9,-6,2,3); ctx.fillStyle='#e74c3c'; ctx.fillRect(9,-8,2,2); },
    'blackhole': (ctx) => { ctx.fillStyle='#2c3e50'; ctx.fillRect(2,-3,8,6); ctx.fillStyle='#8e44ad'; ctx.beginPath(); ctx.arc(12,0,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); },
    'shotgun': (ctx) => { ctx.fillStyle='#7f8c8d'; ctx.fillRect(2,-2,12,2); ctx.fillStyle='#7f8c8d'; ctx.fillRect(2,1,12,2); ctx.fillStyle='#8d6e63'; ctx.fillRect(0,-1,4,4); },
    'highspeed': (ctx) => { ctx.fillStyle='#34495e'; ctx.fillRect(0,-1,18,2); ctx.fillStyle='#000'; ctx.fillRect(4,-4,6,2); ctx.fillStyle='#8d6e63'; ctx.fillRect(-2,0,6,3); },
    'rapid': (ctx) => { ctx.fillStyle='#34495e'; ctx.fillRect(2,-4,10,8); ctx.fillStyle='#95a5a6'; ctx.fillRect(12,-3,6,6); ctx.fillStyle='#7f8c8d'; ctx.fillRect(4,4,4,4); },
    'homing': (ctx) => { ctx.fillStyle='#8e44ad'; ctx.fillRect(0,-5,10,10); ctx.fillStyle='#ff00ff'; ctx.beginPath(); ctx.arc(5,0,3,0,Math.PI*2); ctx.fill(); },
    'teleport': (ctx) => { ctx.fillStyle='#3498db'; ctx.fillRect(6,-2,6,4); ctx.fillStyle='#ecf0f1'; ctx.fillRect(8,-1,2,2); ctx.fillStyle='#3498db'; ctx.fillRect(6,2,2,4); },
    'laser': (ctx) => { ctx.fillStyle='#fff'; ctx.fillRect(2,-2,12,4); ctx.fillStyle='#e74c3c'; ctx.fillRect(4,-1,8,2); },
    'nuke': (ctx) => { ctx.fillStyle='#2c3e50'; ctx.beginPath(); ctx.arc(10,0,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#f1c40f'; ctx.beginPath(); ctx.arc(10,0,2,0,Math.PI*2); ctx.fill(); }
};

// --- 4. Particles ---

class Particle {
    constructor() { this.active = false; }
    spawn(pos, vel, life, color, type = 'normal') {
        this.pos = pos; this.vel = vel; this.life = life; this.maxLife = life;
        this.color = color; this.type = type; this.size = Math.random() * 3 + 1;
        this.active = true;
    }
    update(game) {
        if (!this.active) return false;
        
        if (this.type === 'blood' || this.type === 'chunk') {
            this.vel.y += CONFIG.GRAVITY;
            this.pos = this.pos.add(this.vel);
            if (game.terrain.isSolid(this.pos.x, this.pos.y)) {
                this.active = false;
                let stainSize = this.type === 'chunk' ? 4 : 2;
                game.terrain.drawStain(this.pos.x, this.pos.y, stainSize, this.color);
            }
            this.life--;
            return this.active;
        }

        game.effects.forEach(e => {
            if(e instanceof BlackHoleEffect && this.pos.dist(e.pos) < 250) {
                this.vel = this.vel.add(e.pos.sub(this.pos).normalize().mult(1.5));
            }
        });
        this.pos = this.pos.add(this.vel);
        if (this.type === 'fire') { this.vel.y -= 0.03; this.vel.x *= 0.95; this.size *= 0.95; }
        else if (this.type === 'spark') { this.vel.y += 0.1; }
        else if (this.type === 'glow') { this.vel = this.vel.mult(0.92); }
        else { this.vel.y += 0.02; }
        this.life--;
        if (this.life <= 0) this.active = false;
        return this.active;
    }
    draw(ctx, camera) {
        if (!this.active) return;
        
        // --- OPTIMIZATION: Cull off-screen particles ---
        if (camera) {
            if (this.pos.x < camera.x - 50 || this.pos.x > camera.x + CONFIG.VIEWPORT_WIDTH + 50 ||
                this.pos.y < camera.y - 50 || this.pos.y > camera.y + CONFIG.VIEWPORT_HEIGHT + 50) return;
        }

        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        if (this.type === 'glow' || this.type === 'fire') ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.color;
        if (this.type === 'spark' || this.type === 'blood') ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
        else { ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI*2); ctx.fill(); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() {
        this.pool = []; this.activeParticles = []; this.activeCount = 0;
        for(let i=0; i<CONFIG.MAX_PARTICLES; i++) this.pool.push(new Particle());
    }
    emit(pos, vel, life, color, type) {
        let p = this.pool.find(p => !p.active);
        if (p) {
            p.spawn(pos, vel, life, color, type);
            this.activeParticles.push(p);
            this.activeCount++;
        }
    }
    updateAndDraw(ctx, game) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            particle.update(game);
            if (!particle.active) {
                this.activeParticles.splice(i, 1);
                this.activeCount = Math.max(0, this.activeCount - 1);
                continue;
            }
            particle.draw(ctx, game.camera); // Pass camera for culling
        }
    }
}

// --- 5. Game Objects ---

class BackgroundGenerator {
    constructor(w, h) {
        this.layers = [
            this.createLayer(w, h, 0.06, 0.03, 0.6),
            this.createLayer(w, h, 0.12, 0.06, 0.9)
        ];
        this.generate();
    }
    createLayer(w, h, speedX, speedY, alpha) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return { canvas, ctx: canvas.getContext('2d'), speedX, speedY, alpha };
    }
    generate() {
        const types = ['space', 'mountains', 'forest', 'swamp', 'cyber'];
        const type = types[Math.floor(Math.random() * types.length)];
        let c1, c2;
        if (type === 'space') { c1="#000"; c2="#2c003e"; }
        else if (type === 'mountains') { c1="#1e3c72"; c2="#2a5298"; }
        else if (type === 'forest') { c1="#134e5e"; c2="#71b280"; }
        else if (type === 'swamp') { c1="#2c3e50"; c2="#000"; }
        else { c1="#000428"; c2="#004e92"; }
        this.layers.forEach((layer, index) => {
            const ctx = layer.ctx;
            const w = layer.canvas.width;
            const h = layer.canvas.height;
            ctx.clearRect(0, 0, w, h);
            let grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, c1); grd.addColorStop(1, c2);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
            const starCount = index === 0 ? 220 : 120;
            ctx.fillStyle = `rgba(255,255,255,${index === 0 ? 0.3 : 0.22})`;
            for(let i=0; i<starCount; i++) {
                const size = Math.random() * (index === 0 ? 2.4 : 1.6);
                ctx.beginPath();
                ctx.arc(Math.random() * w, Math.random() * h, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    draw(ctx, camera) {
        this.layers.forEach(layer => {
            let px = camera.x * layer.speedX;
            let py = camera.y * layer.speedY;
            let w = layer.canvas.width;
            let startX = -Math.floor(px % w);
            if (startX > 0) startX -= w;
            ctx.save();
            ctx.globalAlpha = layer.alpha;
            ctx.drawImage(layer.canvas, startX, py);
            if (startX + w < camera.x + CONFIG.VIEWPORT_WIDTH) ctx.drawImage(layer.canvas, startX + w, py);
            if (startX + w * 2 < camera.x + CONFIG.VIEWPORT_WIDTH) ctx.drawImage(layer.canvas, startX + w * 2, py);
            ctx.restore();
        });
    }
}

class Fire {
    constructor(pos, life) { this.pos = pos; this.life = life; this.startLife = life; }
    update(game) {
        this.life--;
        if (Math.random() < 0.1 && game.particleSystem.activeCount < CONFIG.MAX_PARTICLES) {
            let pVel = new Vector2((Math.random()-0.5)*0.5, -0.5 - Math.random());
            let colors = ['#f1c40f', '#e67e22', '#e74c3c']; 
            game.particleSystem.emit(this.pos.clone(), pVel, 20 + Math.random()*20, colors[Math.floor(Math.random()*colors.length)], 'fire');
        }
        if (this.life % 30 === 0) {
            game.entities.forEach(e => {
                if (!e.dead && e.pos.dist(this.pos) < 20) {
                    e.takeDamage(5, null, game); 
                    game.particleSystem.emit(e.pos.clone(), new Vector2(0,-1), 10, '#fff', 'spark');
                }
            });
        }
        return this.life > 0;
    }
    draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(230, 126, 34, ${0.1 * (this.life/this.startLife)})`;
        ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 12, 0, Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

class BlackHoleEffect {
    constructor(pos, life, radius, ownerId) { 
        this.pos = pos; 
        this.life = life; 
        this.radius = radius; 
        this.angle = 0; 
        this.ownerId = ownerId; 
    }
    update(game) {
        this.life--; this.angle += 0.2;
        game.entities.forEach(e => {
            if (!e.dead) {
                let dist = this.pos.dist(e.pos);
                if (dist < 400) {
                    let force = 150 / (dist + 10);
                    let pull = this.pos.sub(e.pos).normalize().mult(force);
                    e.vel = e.vel.add(pull);
                }
            }
        });
        game.crates.forEach(c => {
            if(this.pos.dist(c.pos) < 400) c.pos = c.pos.add(this.pos.sub(c.pos).normalize().mult(5));
        });
        if (game.particleSystem.activeCount < CONFIG.MAX_PARTICLES) {
            for(let i=0; i<2; i++) {
                let a = Math.random() * Math.PI * 2;
                let d = 30 + Math.random() * 80;
                let pPos = this.pos.add(new Vector2(Math.cos(a)*d, Math.sin(a)*d));
                let inward = this.pos.sub(pPos).normalize().mult(2);
                let tangent = new Vector2(-inward.y, inward.x).mult(0.5);
                game.particleSystem.emit(pPos, inward.add(tangent), 40, '#8e44ad', 'glow');
            }
        }
        if (this.life <= 1) {
            game.terrain.destroy(this.pos.x, this.pos.y, this.radius);
            game.shakeScreen(20); game.flashScreen();
            game.entities.forEach(ent => { 
                if (this.pos.dist(ent.pos) < this.radius) ent.takeDamage(999, this.ownerId, game); 
            });
        }
        return this.life > 0;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x, this.pos.y); ctx.rotate(this.angle);
        ctx.globalCompositeOperation = 'source-over';
        let grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
        grad.addColorStop(0, '#000'); grad.addColorStop(0.5, 'rgba(75, 0, 130, 0.8)'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }
}

class Crate {
    constructor(x, y, type = 'weapon') {
        this.pos = new Vector2(x, y);
        this.size = 20;
        this.grounded = false;
        this.active = true;
        this.yVel = 0;
        this.oscillation = 0;
        
        if (type === true) type = 'medkit'; 
        
        this.crateType = type; 
        this.isMedkit = type === 'medkit';

        if (type === 'weapon') {
            let types = Object.values(WeaponType).filter(w => w !== WeaponType.PISTOL);
            // CTF/TDM FILTER: No drills in CTF or TDM
            if (CONFIG.GAME_MODE === 'CTF' || CONFIG.GAME_MODE === 'TDM') {
                types = types.filter(w => w.type !== 'drill');
            }
            this.content = types[Math.floor(Math.random() * types.length)];
        } else if (type === 'powerup') {
             const buffs = Object.values(PowerUpType);
             this.content = buffs[Math.floor(Math.random() * buffs.length)];
        }
        if (type === 'medkit') this.content = { name: "Medkit" };
    }
    update(terrain) {
        this.oscillation += 0.1;
        if (!this.grounded) {
            this.yVel += CONFIG.GRAVITY;
            this.pos.y += this.yVel;
            if (terrain.isSolid(this.pos.x, this.pos.y + this.size/2)) {
                this.grounded = true;
                this.yVel = 0;
                while(terrain.isSolid(this.pos.x, this.pos.y + this.size/2)) this.pos.y--;
            }
        } else if (!terrain.isSolid(this.pos.x, this.pos.y + this.size/2 + 2)) {
            this.grounded = false;
        }
        if (this.pos.y > CONFIG.WORLD_HEIGHT) this.active = false;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        let hover = this.grounded ? Math.sin(this.oscillation) * 3 : 0;
        ctx.translate(this.pos.x, this.pos.y + hover);
        
        if (this.crateType === 'powerup') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, 14, 10, 3, 0, 0, Math.PI*2); ctx.fill();
            let grad = ctx.createLinearGradient(-10, -10, 10, 10);
            grad.addColorStop(0, '#555'); grad.addColorStop(0.5, '#ccc'); grad.addColorStop(1, '#555');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.roundRect(-10, -15, 20, 30, 8); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = this.content.color;
            ctx.shadowColor = this.content.color; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.roundRect(-6, -10, 12, 20, 4); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.content.icon, 0, 0);

        } else if (this.crateType === 'medkit') {
            ctx.fillStyle = '#fff'; ctx.fillRect(-12, -12, 24, 24);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(-4, -8, 8, 16); ctx.fillRect(-8, -4, 16, 8); 
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.strokeRect(-12, -12, 24, 24);
        } else {
            ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.strokeRect(-12, -12, 24, 24);
            ctx.fillStyle = '#787878'; ctx.fillRect(-12, -4, 24, 8); ctx.fillRect(-4, -12, 8, 24);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
        }
        ctx.restore();
    }
}

class BaseStructure {
    constructor(teamId, x, y) {
        this.teamId = teamId;
        this.pos = new Vector2(x, y);
        this.width = 100;
        this.height = 120;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        const color = TEAMS[this.teamId].color;
        
        ctx.fillStyle = '#222'; ctx.fillRect(-50, -20, 100, 20);
        ctx.fillStyle = color; ctx.fillRect(-50, -20, 100, 5);
        ctx.fillStyle = '#333'; ctx.fillRect(-40, -80, 80, 60);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(-40, -80, 80, 60);
        ctx.fillStyle = '#111'; ctx.fillRect(-15, -60, 30, 40);
        
        ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, -120); ctx.stroke();
        if (Date.now() % 1000 < 500) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -120, 4, 0, Math.PI*2); ctx.fill(); }
        
        ctx.fillStyle = color; ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(0, 0, 150, Math.PI, 0); ctx.fill();
        
        ctx.restore();
    }
}

class Flag {
    constructor(teamId, x, y) {
        this.teamId = teamId;
        this.homePos = new Vector2(x, y);
        this.pos = new Vector2(x, y);
        this.carrier = null; 
        this.state = 'at_base';
        this.dropTimer = 0;
    }
    update(terrain, entities, game) {
        if (this.state === 'carried' && this.carrier) {
            if (this.carrier.dead) {
                this.drop();
            } else {
                this.pos = this.carrier.pos.clone().add(new Vector2(0, -30));
                
                // -- CAPTURE LOGIC --
                // If I am being carried, and my carrier is in THEIR base zone, they score.
                const baseZoneRadius = 150;
                let carrierTeamBasePos = null;
                if (this.carrier.team === 1) carrierTeamBasePos = new Vector2(250, terrain.height - 400); // Blue Base
                else if (this.carrier.team === 2) carrierTeamBasePos = new Vector2(game.terrain.width - 250, terrain.height - 400); // Red Base
                
                if (carrierTeamBasePos && this.carrier.pos.dist(carrierTeamBasePos) < baseZoneRadius) {
                    // Check if their flag is at home
                    let carriersFlag = game.flags.find(f => f.teamId === this.carrier.team);
                    if (carriersFlag && carriersFlag.state === 'at_base') {
                        game.scoreCapture(this.carrier.team);
                        this.returnToBase(game);
                    }
                }
            }
        } else if (this.state === 'dropped') {
            if (!terrain.isSolid(this.pos.x, this.pos.y + 5)) this.pos.y += 2;
            this.dropTimer--;
            if (this.dropTimer <= 0) this.returnToBase(game);
        }

        entities.forEach(ent => {
            if (ent.dead) return;
            if (this.pos.dist(ent.pos) < 30) {
                if (ent.team !== 0 && ent.team !== this.teamId) {
                    if (this.state !== 'carried') {
                        this.pickup(ent, game);
                    }
                } 
                else if (ent.team === this.teamId) {
                    if (this.state === 'dropped') {
                        this.returnToBase(game);
                    } 
                }
            }
        });
    }
    pickup(ent, game) {
        this.state = 'carried';
        this.carrier = ent;
        game.particleSystem.emit(this.pos, new Vector2(0, -1), 20, TEAMS[ent.team].color, 'glow');
    }
    drop() {
        this.state = 'dropped';
        this.carrier = null;
        this.dropTimer = 600;
    }
    returnToBase(game) {
        this.state = 'at_base';
        this.carrier = null;
        this.pos = this.homePos.clone();
        game.particleSystem.emit(this.pos, new Vector2(0, -2), 30, '#fff', 'spark');
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.fillStyle = '#ccc'; ctx.fillRect(-2, -40, 4, 40);
        ctx.fillStyle = TEAMS[this.teamId].color;
        let wave = Math.sin(Date.now() / 200) * 5;
        ctx.beginPath(); ctx.moveTo(2, -40); ctx.lineTo(25, -30 + wave); ctx.lineTo(2, -20); ctx.fill();
        if(this.state === 'dropped') {
            ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText((this.dropTimer/60).toFixed(0), -5, -50);
        }
        ctx.restore();
    }
}

// --- 6. Terrain (FIXED GENERATION - NO ABYSS & INDESTRUCTIBLE BEDROCK) ---

class Terrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.dirtPattern = this.createTexture([101, 78, 56], 0.15); 
        this.stonePattern = this.createTexture([100, 100, 100], 0.25); 
        this.bedrockPattern = this.createTexture([40, 40, 40], 0.3); 

        this.generate();
    }

    createTexture(rgb, noiseAmount) {
        const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 64;
        const cx = cvs.getContext('2d');
        cx.fillStyle = `rgb(${rgb.join(',')})`; cx.fillRect(0,0,64,64);
        for(let i=0; i<150; i++) {
            cx.fillStyle = `rgba(0,0,0,${Math.random() * noiseAmount})`;
            let s = Math.random()*3; cx.fillRect(Math.random()*64, Math.random()*64, s, s);
        }
        return this.ctx.createPattern(cvs, 'repeat');
    }

    drawStain(x, y, radius, color) {
        this.ctx.globalCompositeOperation = 'source-atop'; 
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    generateTree(ctx, x, y) {
        const height = 40 + Math.random() * 60;
        const width = 6 + Math.random() * 4;
        ctx.fillStyle = '#5d4037'; 
        ctx.beginPath(); ctx.moveTo(x - width/2, y); ctx.lineTo(x - width/3, y - height); ctx.lineTo(x + width/3, y - height); ctx.lineTo(x + width/2, y); ctx.fill();
        const levels = 3;
        for(let i=0; i<levels; i++) {
            const yPos = y - height + (i * 10) - 10;
            const spread = 20 - (i * 5) + Math.random() * 10;
            ctx.fillStyle = '#1b5e20';
            for(let j=0; j<3; j++) { ctx.beginPath(); ctx.arc(x + (Math.random()-0.5)*spread, yPos + (Math.random()-0.5)*10, 12 + Math.random()*8, 0, Math.PI*2); ctx.fill(); }
            ctx.fillStyle = '#4caf50';
            for(let j=0; j<4; j++) { ctx.beginPath(); ctx.arc(x + (Math.random()-0.5)*spread, yPos + (Math.random()-0.5)*10, 10 + Math.random()*6, 0, Math.PI*2); ctx.fill(); }
        }
    }

    generate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- 1. Generate Surface Curve (No Abysses) ---
        const seed = Math.random() * 1000;
        const baseWidth = 500; // Flat area for bases
        const baseHeight = this.height - 400; // Height of bases
        let surfacePoints = [];

        this.ctx.fillStyle = this.dirtPattern;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);

        for (let x = 0; x <= this.width; x += 10) {
            let y;
            
            // --- DM GENERATION LOGIC ---
            if (CONFIG.GAME_MODE === 'DM') {
                // Just rolling hills, no flat bases
                let noise1 = Math.sin((x + seed) * 0.003) * 150;
                let noise2 = Math.sin((x + seed * 2) * 0.01) * 50;
                // Move ground slightly higher overall for DM so there is more fight space
                let rawY = baseHeight + 50 + noise1 + noise2; 
                y = Math.min(rawY, this.height - 200);
            } 
            // --- TDM / CTF GENERATION LOGIC ---
            else {
                // Left Base (Flat)
                if (x < baseWidth) {
                    y = baseHeight;
                }
                // Right Base (Flat)
                else if (x > this.width - baseWidth) {
                    y = baseHeight;
                }
                // Middle Area (Hills, but connected)
                else {
                    let noise1 = Math.sin((x + seed) * 0.003) * 150;
                    let noise2 = Math.sin((x + seed * 2) * 0.01) * 50;
                    let rawY = baseHeight + 100 + noise1 + noise2;
                    y = Math.min(rawY, this.height - 200);
                }
            }
            this.ctx.lineTo(x, y);
            surfacePoints.push({x, y});
        }
        
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.fill();

        // Stone Layer (Below dirt)
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.fillStyle = this.stonePattern;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let i = 0; i < surfacePoints.length; i++) {
            let p = surfacePoints[i];
            let depth = 150 + Math.sin(p.x * 0.005) * 50;
            this.ctx.lineTo(p.x, p.y + depth);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.fill();

        // Bedrock (Bottom 100px) - ONLY IN TEAM MODES
        if (CONFIG.GAME_MODE !== 'DM') {
            this.ctx.fillStyle = this.bedrockPattern;
            this.ctx.fillRect(0, this.height - 100, this.width, 100);
        }
        
        // --- BASE SUPPORTS (Sloped Bedrock) - ONLY IN TDM/CTF ---
        if (CONFIG.GAME_MODE !== 'DM') {
            const slopeWidth = 600; 

            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height);
            this.ctx.lineTo(0, baseHeight);
            this.ctx.lineTo(baseWidth, baseHeight);
            this.ctx.lineTo(baseWidth + slopeWidth, this.height); 
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(this.width, this.height);
            this.ctx.lineTo(this.width, baseHeight);
            this.ctx.lineTo(this.width - baseWidth, baseHeight);
            this.ctx.lineTo(this.width - baseWidth - slopeWidth, this.height); 
            this.ctx.fill();
        }

        // Caves (Safe generation)
        this.ctx.globalCompositeOperation = 'destination-out';
        for(let i=0; i<8; i++) {
            let cx = Math.random() * (this.width - 200) + 100;
            // Don't drill under bases in TDM/CTF
            if (CONFIG.GAME_MODE !== 'DM') {
                const slopeWidth = 600; 
                if (cx < baseWidth + slopeWidth + 50 || cx > this.width - baseWidth - slopeWidth - 50) continue;
            }
            
            let cy = this.height - 300 + Math.random() * 150;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 30+Math.random()*50, 0, Math.PI*2);
            this.ctx.fill();
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.updateCollisionData(); 

        // Grass & Trees
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.fillStyle = '#45a049'; 
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        for(let p of surfacePoints) this.ctx.lineTo(p.x, p.y + 15);
        this.ctx.lineTo(this.width, 0);
        this.ctx.fill();
        
        this.ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < surfacePoints.length; i++) {
            let p = surfacePoints[i];
            // Clear base area for buildings in TDM/CTF
            if (CONFIG.GAME_MODE !== 'DM') {
                if (p.x < baseWidth || p.x > this.width - baseWidth) continue; 
            }
            
            if (Math.random() < 0.01) this.generateTree(this.ctx, p.x, p.y);
            else if (Math.random() < 0.2) {
                this.ctx.fillStyle = Math.random() > 0.3 ? '#66bb6a' : '#2e7d32'; 
                let h = 4 + Math.random() * 6;
                this.ctx.fillRect(p.x, p.y - h, 2, h);
            }
        }
    }

    updateCollisionData() {
        this.collisionData = this.ctx.getImageData(0, 0, this.width, this.height).data;
    }

    // --- NEW ROBUST CLIPPING LOGIC ---
    clipToDestructible() {
        const baseW = 500;
        const baseH = this.height - 400;
        const slopeWidth = 600; 
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0); // TL
        this.ctx.lineTo(this.width, 0); // TR
        
        // Custom clipping shape based on mode
        if (CONFIG.GAME_MODE !== 'DM') {
            this.ctx.lineTo(this.width, baseH); // Right Base Top
            this.ctx.lineTo(this.width - baseW, baseH); // Right Base Inner
            this.ctx.lineTo(this.width - baseW - slopeWidth, this.height - 100); // Right Slope Base
            this.ctx.lineTo(baseW + slopeWidth, this.height - 100); // Bottom Flat (Above Bedrock)
            this.ctx.lineTo(baseW, baseH); // Left Slope Base
            this.ctx.lineTo(0, baseH); // Left Base Top
        } else {
            // For DM, everything is destructible to bottom
            this.ctx.lineTo(this.width, this.height);
            this.ctx.lineTo(0, this.height);
        }
        
        this.ctx.lineTo(0, 0); // Close
        this.ctx.clip();
    }

    destroy(x, y, radius, type = null) {
        if (radius <= 0) return 0;
        
        // 1. SCORCHING (Painting)
        const scorchTypes = ['explosive', 'bounce', 'nuke', 'molotov', 'homing'];
        if (type && scorchTypes.includes(type)) {
            this.ctx.save();
            this.clipToDestructible(); // Apply Mask
            this.ctx.globalCompositeOperation = 'source-atop';
            
            const count = type === 'nuke' ? 500 : 80;
            for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = radius * (0.85 + Math.random() * 0.3); 
                let baseSize = 3; if (type === 'nuke') baseSize = 4;
                const sSize = (Math.random() * baseSize + 2); 
                const shade = 40 + Math.random() * 40; 
                this.ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.7 + Math.random()*0.3})`; 
                
                this.ctx.save(); 
                this.ctx.translate(x + Math.cos(angle)*dist, y + Math.sin(angle)*dist); 
                this.ctx.rotate(Math.random() * Math.PI * 2);
                this.ctx.beginPath(); 
                this.ctx.rect(-sSize/2, -sSize/2, sSize, sSize * (0.5 + Math.random())); 
                this.ctx.fill(); 
                this.ctx.restore();
            }
            this.ctx.restore(); // Remove Mask
        }

        // 2. DESTRUCTION (Erasing)
        this.ctx.save();
        this.clipToDestructible(); // Apply Mask
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = "rgba(0,0,0,1)"; 
        this.ctx.beginPath(); 
        this.ctx.arc(x, y, radius, 0, Math.PI * 2); 
        this.ctx.fill(); 
        this.ctx.restore(); // Remove Mask
        this.ctx.globalCompositeOperation = 'source-over';

        // 3. COLLISION UPDATE (Manual check still needed for array)
        let r2 = radius * radius;
        // Optimization: Bounding box check against World Bounds
        let startX = Math.floor(Math.max(0, x - radius));
        let endX = Math.floor(Math.min(this.width, x + radius));
        let startY = Math.floor(Math.max(0, y - radius));
        let endY = Math.floor(Math.min(this.height, y + radius));

        const baseW = 500;
        const baseH = this.height - 400;
        const bedrockLevel = this.height - 100;
        const slopeWidth = 600; 

        for (let cy = startY; cy < endY; cy++) {
            // Bedrock Check only for non-DM
            if (CONFIG.GAME_MODE !== 'DM' && cy >= bedrockLevel) continue; 
            
            for (let cx = startX; cx < endX; cx++) {
                // Base Protection Checks ONLY for TDM/CTF
                if (CONFIG.GAME_MODE !== 'DM') {
                    if (cx < baseW + slopeWidth && cy > baseH) {
                        if (cx < baseW) continue; // Under flat part
                        let slopeX = cx - baseW;
                        let allowedY = baseH + slopeX * ((this.height - baseH)/slopeWidth);
                        if (cy > allowedY) continue; 
                    }
                    if (cx > this.width - baseW - slopeWidth && cy > baseH) {
                        if (cx > this.width - baseW) continue;
                        let slopeX = (this.width - baseW) - cx;
                        let allowedY = baseH + slopeX * ((this.height - baseH)/slopeWidth);
                        if (cy > allowedY) continue;
                    }
                }
                
                let dx = cx - x; let dy = cy - y;
                if (dx*dx + dy*dy <= r2) {
                    let idx = (cy * this.width + cx) * 4 + 3;
                    this.collisionData[idx] = 0;
                }
            }
        }
        return radius;
    }

    isSolid(x, y) {
        x = x | 0; y = y | 0;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.collisionData[(y * this.width + x) * 4 + 3] > 10;
    }
    
    raycast(start, end) {
        let dir = end.sub(start); let dist = dir.mag(); dir = dir.normalize(); let pos = start.clone();
        for(let i=0; i<dist; i+=15) {
            pos = pos.add(dir.mult(15));
            if (this.isSolid(pos.x, pos.y)) return true;
        }
        return false;
    }
}

// --- 7. Projectiles ---

class Projectile {
    constructor(pos, vel, type, ownerId, team = 0) {
        this.pos = pos; this.vel = vel; this.type = type; this.ownerId = ownerId; this.team = team;
        this.active = true; this.timer = 0;
        this.bounces = type.bounces || 0;
        if (type.type === 'bounce') this.timer = 180;
        this.trail = []; 
    }

    update(terrain, particleSystem, entities, game) {
        if (!this.active) return;
        
        if (this.type.type === 'fire_droplet') {
            this.pos = this.pos.add(this.vel); this.vel.y += CONFIG.GRAVITY; 
            if (game.tick % 5 === 0) {
                this.trail.push(this.pos.clone());
                if (this.trail.length > 5) this.trail.shift();
            }
            if (terrain.isSolid(this.pos.x, this.pos.y)) {
                this.active = false; game.fires.push(new Fire(this.pos.clone(), 300 + Math.random()*200)); 
            }
            return;
        }

        if (this.type.type === 'homing') {
            let nearest = null; let minD = 400;
            entities.forEach(e => {
                if(e.id !== this.ownerId && !e.dead) {
                    if (CONFIG.GAME_MODE === 'DM' || e.team !== this.team) {
                        let d = this.pos.dist(e.pos);
                        if(d < minD) { minD = d; nearest = e; }
                    }
                }
            });
            if(nearest) {
                let dir = nearest.pos.sub(this.pos).normalize().mult(0.3);
                this.vel = this.vel.add(dir);
                if(this.vel.mag() > 5) this.vel = this.vel.normalize().mult(5);
            }
        }

        if (game.tick % 3 === 0) { this.trail.push(this.pos.clone()); if (this.trail.length > 10) this.trail.shift(); }

        if (this.type.type !== 'energy' && this.type.type !== 'blackhole' && this.type.type !== 'laser' && this.type.type !== 'highspeed' && this.type.type !== 'blaster' && this.type.type !== 'shotgun' && this.type.type !== 'rapid') {
             this.vel = this.vel.mult(CONFIG.PROJECTILE_DRAG);
             this.vel.y += CONFIG.PROJECTILE_GRAVITY;
        } else if (this.type.type === 'blackhole') {
             this.vel = this.vel.mult(0.98); 
             if (this.vel.mag() < 0.3) { this.explode(terrain, particleSystem, entities, game); return; }
        } else if (this.type.type === 'highspeed') {
             this.vel.y += 0.01; 
        }

        let nextPos = this.pos.add(this.vel);
        
        // --- IMPROVED COLLISION: LINE SEGMENT CHECK ---
        let hitEntity = null;
        let closestDist = Infinity;

        // Check against terrain first to prevent shooting through walls
        let hitWall = terrain.raycast(this.pos, nextPos);
        
        for (let ent of entities) {
            if (ent.dead) continue;
            if (ent.id === this.ownerId && this.pos.dist(ent.pos) < 20) continue; 
            if (CONFIG.GAME_MODE !== 'DM' && ent.team !== 0 && ent.team === this.team) continue;
            
            // Check distance from entity center to the movement segment
            let distToTrajectory = distToSegment(ent.pos, this.pos, nextPos);
            let hitRadius = (this.type.type === 'laser' ? 10 : 15); // Increased laser hit radius
            
            if (distToTrajectory < hitRadius) {
                 // Check if this hit is closer than previous hits
                 let d = this.pos.dist(ent.pos);
                 if (d < closestDist) {
                     closestDist = d;
                     hitEntity = ent;
                 }
            }
        }

        if (hitEntity && !hitWall) {
             this.pos = hitEntity.pos.clone().sub(this.vel.normalize().mult(5)); // Visual fix
             this.explode(terrain, particleSystem, entities, game);
             return;
        }
        
        // If we didn't hit an entity, check terrain normally or advanced logic
        if (hitWall || terrain.isSolid(nextPos.x, nextPos.y)) {
             this.pos = nextPos;
             if (this.type.type === 'drill') {
                 // Drill logic
                 terrain.destroy(nextPos.x, nextPos.y, 8);
                 this.vel = this.vel.mult(0.96); 
                 this.pos = nextPos;
                 if(Math.random() < 0.1) particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*2, -2), 10, '#fff', 'spark');
                 if (this.vel.mag() < 0.5) this.explode(terrain, particleSystem, entities, game);
                 return;
             } 
             if (this.type.type === 'teleport') {
                 let owner = entities.find(e => e.id === this.ownerId);
                 if(owner) {
                    owner.pos = this.pos.clone();
                    owner.vel = new Vector2(0,0);
                    particleSystem.emit(owner.pos, new Vector2(0,0), 30, '#0ff', 'glow');
                 }
                 this.active = false;
                 return;
             }
             
             // Bouncing
             if (this.bounces > 0 || this.type.type === 'bounce') {
                 // Bounce logic (simplified)
                 let normal = new Vector2(0, -1);
                 if (terrain.isSolid(this.pos.x + this.vel.x, this.pos.y)) normal.x = -1; 
                 else if (terrain.isSolid(this.pos.x, this.pos.y + this.vel.y)) normal.y = -1; 

                 if (normal.x !== 0) this.vel.x *= -0.6; else this.vel.y *= -0.6;
                 this.vel = this.vel.mult(0.8); 
                 
                 // FIX: Stop and Explode if too slow (prevents sliding through ground)
                 if (this.vel.mag() < 0.5 && this.type.type === 'bounce') {
                     this.explode(terrain, particleSystem, entities, game);
                     return;
                 }
                 
                 if (this.type.type !== 'bounce') this.bounces--;
             } else {
                 this.pos = nextPos;
                 this.explode(terrain, particleSystem, entities, game);
             }
        } else {
             this.pos = nextPos;
        }

        if (this.pos.y > CONFIG.WORLD_HEIGHT) {
            this.active = false;
        }
    }

    explode(terrain, particleSystem, entities, game) {
        this.active = false;
        if (this.pos.y > CONFIG.WORLD_HEIGHT) return;

        game.shakeScreen(this.type.damage / 5); 
        if (this.type.damage > 30) game.flashScreen(); 

        if (this.type.type === 'molotov' || (this.type.burn && this.type.burn > 0)) {
             let fireCount = this.type.burn || 10;
             for(let i=0; i<fireCount; i++) {
                 let v = new Vector2((Math.random()-0.5)*8, -2 - Math.random()*5);
                 let p = new Projectile(this.pos.clone().add(new Vector2(0,-5)), v, {type: 'fire_droplet', color: '#e67e22'}, this.ownerId);
                 game.projectiles.push(p);
             }
        } 
        if (this.type.type === 'blackhole') {
             game.effects.push(new BlackHoleEffect(this.pos.clone(), 300, this.type.radius, this.ownerId)); 
             return; 
        }

        if (this.type.type === 'nuke') {
            for(let i=0; i<100; i++) {
                let v = new Vector2((Math.random()-0.5)*15, -Math.random()*20);
                game.particleSystem.emit(this.pos.clone(), v, 100 + Math.random()*50, '#f1c40f', 'fire');
            }
        }

        if (this.type.type !== 'laser') terrain.destroy(this.pos.x, this.pos.y, this.type.radius, this.type.type);
        
        entities.forEach(ent => {
            if (!ent.dead) {
                if (CONFIG.GAME_MODE !== 'DM' && ent.team !== 0 && ent.team === this.team && ent.id !== this.ownerId) return;

                let d = this.pos.dist(ent.pos);
                let dmgRadius = this.type.radius + 20; 
                if (d < dmgRadius) {
                    let damage = this.type.damage * (1 - d / dmgRadius);
                    let attacker = game.entities.find(e => e.id === this.ownerId);
                    if (attacker && attacker.damageMultiplier) damage *= attacker.damageMultiplier;

                    if(this.type.type === 'laser') damage = this.type.damage; 
                    ent.takeDamage(damage < 0 ? 0 : damage, this.ownerId, game);
                    let pushDir = ent.pos.sub(this.pos).normalize();
                    ent.vel = ent.vel.add(pushDir.mult(4)); 
                }
            }
        });

        let count = 10; let color = this.type.color; let type = 'normal';
        if (this.type.type === 'energy' || this.type.type === 'blaster') { color = '#00ffcc'; type = 'glow'; count = 15; }
        if (this.type.type === 'explosive' || this.type.type === 'nuke') { color = '#ffaa00'; type = 'fire'; count = 30; }

        if (game.particleSystem.activeCount < CONFIG.MAX_PARTICLES) {
            for(let i=0; i<count; i++) {
                let v = new Vector2((Math.random()-0.5)*4, (Math.random()-0.5)*4); 
                particleSystem.emit(this.pos.clone(), v, 20 + Math.random()*20, color, type);
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        if (this.type.type === 'blaster') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            let tail = this.pos.sub(this.vel.normalize().mult(26));
            let glow = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, 16);
            glow.addColorStop(0, 'rgba(255,255,255,0.9)');
            glow.addColorStop(0.5, 'rgba(52, 152, 219, 0.6)');
            glow.addColorStop(1, 'rgba(52, 152, 219, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 18; ctx.shadowColor = this.type.color;
            ctx.strokeStyle = this.type.color; ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();
            ctx.restore();
            return;
        }

        // --- LASER VISUAL ---
        if (this.type.type === 'laser') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            let tail = this.pos.sub(this.vel.normalize().mult(60));
            
            // Outer Glow
            ctx.strokeStyle = this.type.color; 
            ctx.lineWidth = 14; 
            ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            // Core Glow
            ctx.lineWidth = 6; 
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            // White Core
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2; 
            ctx.globalAlpha = 1.0;
            ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();
            
            ctx.restore();
            return;
        }

        if (this.type.type === 'rapid' || this.type.type === 'shotgun' || this.type.type === 'highspeed') {
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffff00'; 
            ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2;
            ctx.beginPath();
            let trailLen = 20; if (this.type.type === 'shotgun') trailLen = 15; if (this.type.type === 'highspeed') trailLen = 60; 
            let tail = this.pos.sub(this.vel.normalize().mult(trailLen)); 
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();
            ctx.shadowBlur = 0;
            return;
        }
        
        if (this.type.type === 'nuke') {
            ctx.save(); ctx.translate(this.pos.x, this.pos.y);
            let angle = Math.atan2(this.vel.y, this.vel.x); ctx.rotate(angle);
            ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(2, -6, 3, 12);
            ctx.restore();
            return;
        }

        if (this.type.type === 'fire_droplet') {
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI*2); ctx.fill(); return;
        }
        if (this.trail.length > 1) {
            ctx.beginPath(); ctx.strokeStyle = this.type.color; ctx.lineWidth = this.type.type === 'laser' ? 1 : 2; ctx.globalAlpha = 0.5;
            ctx.moveTo(this.trail[0].x, this.trail[0].y); for(let p of this.trail) ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1.0;
        }
        ctx.save(); ctx.translate(this.pos.x, this.pos.y);
        ctx.fillStyle = this.type.color; ctx.beginPath(); ctx.arc(0,0, 4, 0,Math.PI*2); ctx.fill();
        
        // --- BLINKING LIGHT FOR GRENADES ---
        if (this.type.type === 'bounce') {
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.fillStyle = '#f00';
                ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.restore();
    }
}

// --- 8. Character ---

class Character {
    constructor(x, y, id, color, name, team = 0, cosmetics = null) {
        this.id = id; this.name = name; this.team = team;
        this.pos = new Vector2(x, y); this.vel = new Vector2(0, 0);
        this.size = new Vector2(14, 26); 
        this.color = (CONFIG.GAME_MODE !== 'DM' && team !== 0) ? TEAMS[team].color : color;
        this.grounded = false; this.facingRight = true;
        this.dead = false; this.hp = 100;
        this.inventory = [{...WeaponType.PISTOL}]; 
        this.weaponIndex = 0;
        this.weapon = this.inventory[0];
        this.charge = 0; this.isCharging = false;
        this.input = { left: false, right: false, jump: false, shoot: false, aimTarget: new Vector2(0,0), weaponSlot: null };
        this.kills = 0; this.deaths = 0;
        this.animTimer = 0;
        this.buffs = [];
        this.jumpMultiplier = 1; this.speedMultiplier = 1; this.damageMultiplier = 1; this.isShielded = false;
        this.cosmetics = cosmetics ? { ...defaultCosmetics(), ...cosmetics } : defaultCosmetics();
        
        this.respawnTimer = 0; // CTF Individual Timer
    }

    applyBuff(buff) {
        this.buffs = this.buffs.filter(b => b.type !== buff.type);
        this.buffs.push({ ...buff, timeLeft: buff.duration });
    }

    updateBuffs() {
        this.jumpMultiplier = 1; this.speedMultiplier = 1; this.damageMultiplier = 1; this.isShielded = false;
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            let b = this.buffs[i];
            b.timeLeft--;
            if (b.timeLeft <= 0) { this.buffs.splice(i, 1); continue; }
            if (b.type === 'jump') this.jumpMultiplier = 1.5;
            if (b.type === 'speed') this.speedMultiplier = 1.5;
            if (b.type === 'damage') this.damageMultiplier = 2;
            if (b.type === 'shield') this.isShielded = true;
        }
    }

    takeDamage(amount, attackerId, game) {
        if (this.isShielded || this.dead) return; 
        this.hp -= amount;
        if (this.hp <= 0 && !this.dead) {
            this.hp = 0; this.dead = true; this.deaths++; this.vel.y = -5;
            
            // CTF Respawn Timer (20 sec)
            if (CONFIG.GAME_MODE === 'CTF') this.respawnTimer = CONFIG.CTF_RESPAWN_TIME;

            for(let i=0; i<30; i++) game.particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*5, (Math.random()-0.5)*5), 60, '#8a0303', 'blood');
            for(let i=0; i<6; i++) game.particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*6, -Math.random()*6), 100, '#660000', 'chunk');

            if (attackerId !== undefined && attackerId !== null && attackerId !== this.id) {
                let killer = game.entities.find(e => e.id === attackerId);
                if (killer) {
                    killer.kills++;
                    // TDM Score logic moved to Round End
                }
            } 
            
            if (this === game.player && attackerId !== undefined && attackerId !== null) {
                const killer = game.entities.find(e => e.id === attackerId);
                if (killer) game.cameraTarget = killer;
            }
            game.checkWinCondition();
        }
    }

    switchWeapon(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.inventory.length) {
            this.weapon = this.inventory[slotIndex];
            this.weaponIndex = slotIndex;
            return true;
        }
        return false;
    }

    update(terrain, projectiles, crates, game) {
        this.updateBuffs();
        this.animTimer += 0.1;
        
        // CTF Respawn
        if (this.dead && CONFIG.GAME_MODE === 'CTF') {
            this.respawnTimer--;
            this.pos.y += this.vel.y; this.vel.y += CONFIG.GRAVITY;
            if (this.respawnTimer <= 0) game.respawnEntity(this);
            return; 
        }

        if (this.dead) { this.pos.y += this.vel.y; this.vel.y += CONFIG.GRAVITY; return; }
        
        if (this.pos.y > CONFIG.WORLD_HEIGHT + 100 && !this.dead) {
             this.dead = true; this.hp = 0; this.deaths++;
             if (CONFIG.GAME_MODE === 'CTF') this.respawnTimer = CONFIG.CTF_RESPAWN_TIME;
             game.checkWinCondition();
        }

        game.effects.forEach(e => {
            if(e instanceof BlackHoleEffect && this.pos.dist(e.pos) < 400) {
                let pull = e.pos.sub(this.pos).normalize().mult((200/(this.pos.dist(e.pos)+10))*0.05);
                this.vel = this.vel.add(pull);
            }
        });

        crates.forEach(c => {
            if (c.active && this.pos.dist(c.pos) < 25) {
                if (c.isMedkit) this.hp = Math.min(100, this.hp + 40);
                else if (c.crateType === 'powerup') this.applyBuff(c.content);
                else if (c.content) { 
                        if (!this.inventory.find(w => w.name === c.content.name)) {
                            if (this.inventory.length < CONFIG.MAX_INVENTORY) {
                                this.inventory.push({...c.content});
                                this.switchWeapon(this.inventory.length - 1);
                            } else {
                                this.inventory[this.weaponIndex] = {...c.content};
                                this.weapon = this.inventory[this.weaponIndex];
                            }
                            if(this === game.player) game.updateInventoryUI();
                        }
                }
                c.active = false;
            }
        });

        let targetSpeed = 0;
        let maxSpeed = CONFIG.MAX_SPEED * this.speedMultiplier;
        if (this.input.left) { targetSpeed = -maxSpeed; this.facingRight = false; }
        if (this.input.right) { targetSpeed = maxSpeed; this.facingRight = true; }
        let accel = this.grounded ? CONFIG.ACCELERATION : CONFIG.ACCELERATION * 0.5;
        this.vel.x += (targetSpeed - this.vel.x) * accel;
        if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
        if (this.input.jump && this.grounded) {
            this.vel.y = -CONFIG.JUMP_FORCE * this.jumpMultiplier; this.grounded = false; this.pos.y -= 2;
        }
        this.vel.y += CONFIG.GRAVITY;

        // Collision
        let nextX = this.pos.x + this.vel.x;
        let hw = this.size.x / 2; let hh = this.size.y / 2; let feetY = this.pos.y + hh - 5;
        let sideOffset = this.vel.x > 0 ? hw : -hw;
        if (terrain.isSolid(nextX + sideOffset, this.pos.y) || terrain.isSolid(nextX + sideOffset, feetY)) {
             let climbed = false;
             if (this.grounded) {
                 for(let s=1; s<=5; s++) {
                     if (!terrain.isSolid(nextX + sideOffset, feetY - s) && !terrain.isSolid(nextX, this.pos.y - s - hh)) {
                         this.pos.y -= s; climbed = true; break;
                     }
                 }
             }
             if (!climbed) { this.vel.x = 0; nextX = this.pos.x; }
        }
        this.pos.x = nextX;
        
        let nextY = this.pos.y + this.vel.y;
        if (this.vel.y < 0 && terrain.isSolid(this.pos.x, nextY - hh)) { this.vel.y = 0; nextY = this.pos.y; }
        if (this.vel.y >= 0 && terrain.isSolid(this.pos.x, nextY + hh)) {
            this.grounded = true; this.vel.y = 0;
            let t = nextY; while(terrain.isSolid(this.pos.x, t + hh)) t--; nextY = t;
        } else { this.grounded = false; }
        this.pos.y = nextY;
        
        if (this.pos.x < hw) this.pos.x = hw; if (this.pos.x > CONFIG.WORLD_WIDTH - hw) this.pos.x = CONFIG.WORLD_WIDTH - hw;

        // Shooting
        if (this.input.shoot) {
            if (this.weapon.chargeable) {
                this.isCharging = true;
                if (this.charge < CONFIG.MAX_CHARGE) this.charge += CONFIG.CHARGE_RATE;
            } else if (!this.cooldown || this.cooldown <= 0) {
                this.fire(game);
                this.cooldown = this.weapon.cooldown;
            }
        } else {
            if (this.isCharging) {
                this.fire(game);
                this.charge = 0; this.isCharging = false;
                this.cooldown = this.weapon.cooldown || 20; 
            }
        }
        if (this.cooldown > 0) this.cooldown--;
    }

    fire(game) {
        let power = (this.charge / CONFIG.MAX_CHARGE) * 10 + 5; 
        if (!this.weapon.chargeable) power = 12;
        let dir = this.input.aimTarget.sub(this.pos).normalize();

        if (this.weapon.type === 'shotgun') {
            for(let i=0; i<5; i++) {
                let spread = new Vector2(dir.y, -dir.x).mult((Math.random()-0.5)*0.5);
                let p = new Projectile(this.pos.clone(), dir.add(spread).normalize().mult(power), this.weapon, this.id, this.team);
                game.projectiles.push(p);
            }
        } else if (this.weapon.type === 'laser') {
             let p = new Projectile(this.pos.clone(), dir.mult(power*2), this.weapon, this.id, this.team);
             game.projectiles.push(p);
        } else {
            let p = new Projectile(this.pos.clone(), dir.mult(power), this.weapon, this.id, this.team);
            game.projectiles.push(p);
        }
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        this.buffs.forEach(buff => {
            if (buff.type === 'shield') {
                ctx.save();
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
                ctx.rotate(Date.now() / 300);
                // --- FIXED: Full Circle for Shield ---
                ctx.beginPath(); ctx.arc(0, -5, 22, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 0.2; ctx.fillStyle = '#00ffff'; ctx.fill();
                ctx.restore();
            }
            if (buff.type === 'damage') {
                ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
                let s = Math.sin(Date.now()/100)*2;
                ctx.beginPath(); 
                for(let i=0; i<8; i++) {
                    let a = (i/8)*Math.PI*2 + Date.now()/500;
                    let r = 20 + s + (i%2)*4;
                    ctx.lineTo(Math.cos(a)*r, -5 + Math.sin(a)*r);
                }
                ctx.closePath();
                ctx.stroke();
            }
            if (buff.type === 'speed') {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                if (Math.abs(this.vel.x) > 0.5) {
                   ctx.fillRect(this.facingRight ? -20 : 10, -10, 15, 2);
                   ctx.fillRect(this.facingRight ? -25 : 15, 0, 10, 2);
                }
            }
        });

        // Name
        ctx.fillStyle = 'white'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.name, 0, -38);
        ctx.fillStyle = '#333'; ctx.fillRect(-15, -35, 30, 4);
        ctx.fillStyle = this.hp > 50 ? '#2ecc71' : '#e74c3c'; ctx.fillRect(-15, -35, 30 * (this.hp / 100), 4);

        if (!this.facingRight) ctx.scale(-1, 1);
        const isMoving = Math.abs(this.vel.x) > 0.1;
        const walkCycle = isMoving ? Math.sin(this.animTimer * 2) * 4 : 0;
        const breathe = Math.sin(this.animTimer * 0.5);

        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.ellipse(-2 + walkCycle, 10, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(2 - walkCycle, 10, 3, 4, 0, 0, Math.PI*2); ctx.fill();

        ctx.translate(0, breathe);
        const cosmetics = this.cosmetics || defaultCosmetics();

        if (cosmetics.accessory === 'cape') {
            ctx.fillStyle = cosmetics.accent;
            ctx.beginPath();
            ctx.moveTo(-6, -6);
            ctx.lineTo(-10, 12);
            ctx.lineTo(0, 10);
            ctx.lineTo(6, -6);
            ctx.closePath();
            ctx.fill();
        } else if (cosmetics.accessory === 'backpack') {
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-8, -6, 4, 10);
            ctx.fillStyle = '#222';
            ctx.fillRect(-7, -4, 2, 6);
        } else if (cosmetics.accessory === 'antenna') {
            ctx.strokeStyle = cosmetics.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(0, -26);
            ctx.stroke();
            ctx.fillStyle = cosmetics.accent;
            ctx.beginPath(); ctx.arc(0, -28, 2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.roundRect(-6, -8, 12, 16, 4); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-4, -6, 8, 10);

        if (cosmetics.outfit === 'tactical') {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-6, -6, 12, 6);
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-2, -6, 4, 6);
        } else if (cosmetics.outfit === 'armor') {
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(-6, -8, 12, 8);
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-6, -2, 12, 2);
        } else if (cosmetics.outfit === 'hoodie') {
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(-6, -8, 12, 4);
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-3, -4, 6, 2);
        }

        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -12, 6, 0, Math.PI*2); ctx.fill();

        if (cosmetics.helmet === 'visor') {
            ctx.fillStyle = cosmetics.accent;
            ctx.beginPath(); ctx.arc(0, -13, 6.5, Math.PI, 0); ctx.lineTo(6.5, -12); ctx.lineTo(-6.5, -12); ctx.fill();
        } else if (cosmetics.helmet === 'tactical') {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-6, -18, 12, 4);
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-4, -16, 8, 2);
        } else if (cosmetics.helmet === 'cap') {
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-6, -17, 12, 3);
            ctx.fillRect(-10, -15, 8, 2);
        } else {
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath(); ctx.arc(0, -13, 6.5, Math.PI, 0); ctx.lineTo(6.5, -13); ctx.lineTo(6.5, -10); ctx.lineTo(-6.5, -10); ctx.fill();
        }
        ctx.fillStyle = '#000'; ctx.fillRect(1, -12, 4, 2);

        if (cosmetics.boots === 'combat') {
            ctx.fillStyle = '#111';
            ctx.fillRect(-6 + walkCycle, 10, 5, 3);
            ctx.fillRect(1 - walkCycle, 10, 5, 3);
        } else if (cosmetics.boots === 'sneakers') {
            ctx.fillStyle = cosmetics.accent;
            ctx.fillRect(-5 + walkCycle, 10, 4, 2);
            ctx.fillRect(1 - walkCycle, 10, 4, 2);
        }
        
        let aimX = this.input.aimTarget.x - this.pos.x;
        let aimY = this.input.aimTarget.y - this.pos.y;
        this.facingRight = aimX >= 0;
        if (!this.facingRight) aimX = -aimX;
        let angle = Math.atan2(aimY, aimX);

        ctx.save();
        ctx.translate(0, -4); ctx.rotate(angle);
        ctx.fillStyle = this.weapon.color;
        WeaponArt[this.weapon.type] ? WeaponArt[this.weapon.type](ctx) : ctx.fillRect(0, -2, 12, 4);
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(8, 2, 2.5, 0, Math.PI*2); ctx.fill(); 
        ctx.restore();

        if (this.isCharging) {
            let c = Math.floor((this.charge/CONFIG.MAX_CHARGE)*255);
            ctx.fillStyle = `rgb(255, ${255-c}, 0)`;
            let w = 30 * (this.charge/CONFIG.MAX_CHARGE);
            ctx.fillRect(-15, -25, w, 3);
        }
        ctx.restore();
    }
}

class Bot extends Character {
    constructor(x, y, id, name, team, color = '#e74c3c', cosmetics = null) {
        super(x, y, id, color, name, team, cosmetics);
        this.decisionTimer = 0;
        this.aimJitter = new Vector2(0,0);
        
        const roles = ['ATTACKER', 'ATTACKER', 'DEFENDER', 'ROAMER', 'CAMPER'];
        this.role = roles[Math.floor(Math.random() * roles.length)];
        this.moveOffset = new Vector2((Math.random()-0.5)*80, 0);
        this.reactionSpeed = 10 + Math.random() * 20; 
        this.targetSearchTimer = 0;
        this.currentTarget = null;
        this.stuckTimer = 0;
        this.lastPosX = 0;

        // NEW AI VARS
        this.campingTimer = 0;
        this.lastSectorPos = new Vector2(x, y);
        this.lastAiTick = -1;
    }
    
    aiUpdate(terrain, entities, projectiles, game, cache) {
        this.decisionTimer--;
        this.targetSearchTimer--;
        this.campingTimer++;

        // Anti-Camping Check (Every 4 seconds approx)
        if (this.campingTimer > 240) {
            if (this.pos.dist(this.lastSectorPos) < 200) {
                // Forced Move
                this.roamSpot = new Vector2(Math.random()*CONFIG.WORLD_WIDTH, Math.random() * (CONFIG.WORLD_HEIGHT - 300));
                this.currentTarget = { pos: this.roamSpot, isStatic: true };
                this.decisionTimer = 180; // Force follow this for 3 sec
            }
            this.lastSectorPos = this.pos.clone();
            this.campingTimer = 0;
        }
        
        // Smart Weapon Switching
        if (this.weapon.type === 'blaster' && this.inventory.length > 1) {
            this.switchWeapon(1); // Switch to better gun if available
        }
        
        // PROXIMITY ALERT: If enemy is too close, ignore everything and fight
        const enemies = cache.enemies;
        let closeEnemy = null;
        const closeDistSq = 250 * 250;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy === this || enemy.dead) continue;
            if (distSq(this.pos, enemy.pos) < closeDistSq) {
                closeEnemy = enemy;
                break;
            }
        }
        
        if (closeEnemy) {
             this.currentTarget = closeEnemy;
             this.targetSearchTimer = 20; // Lock on
        } else if (this.targetSearchTimer <= 0) {
            this.pickTarget(entities, game, cache);
            this.targetSearchTimer = this.reactionSpeed;
        }

        if (!this.currentTarget) return;

        let targetPos = this.currentTarget.pos;
        if (this.currentTarget.isStatic) targetPos = targetPos.add(this.moveOffset);
        
        let aimPoint = this.currentTarget.pos;
        if (this.currentTarget instanceof Character) {
             aimPoint = aimPoint.add(this.currentTarget.vel.mult(10));
        }
        this.input.aimTarget = aimPoint;

        let dist = Math.sqrt(distSq(this.pos, targetPos));
        
        // Movement Logic
        // If enemy is too close, maybe move AWAY?
        if (closeEnemy && dist < 150) {
             // Retreat logic: Move away from enemy
             if (targetPos.x > this.pos.x) { this.input.right = false; this.input.left = true; } // Enemy right, go left
             else { this.input.right = true; this.input.left = false; } // Enemy left, go right
        } else if (dist > 50) {
            if (targetPos.x > this.pos.x + 20) { this.input.right = true; this.input.left = false; }
            else if (targetPos.x < this.pos.x - 20) { this.input.right = false; this.input.left = true; }
            else { this.input.right = false; this.input.left = false; }
        } else {
             this.input.right = false; this.input.left = false;
        }
        
        // Jump & Stuck/Tunneling Logic
        let ahead = this.facingRight ? 40 : -40;
        let hasWall = terrain.isSolid(this.pos.x + ahead, this.pos.y);
        let needsUp = targetPos.y < this.pos.y - 80;
        
        if (this.grounded) {
             // Check if stuck (Aggressive check)
             if (Math.abs(this.pos.x - this.lastPosX) < 1.0 && (this.input.left || this.input.right)) {
                 this.stuckTimer++;
             } else {
                 this.stuckTimer = 0;
             }
             this.lastPosX = this.pos.x;

             // STUCK LOGIC: If stuck for > 0.5s or facing a wall
             if (hasWall || this.stuckTimer > 15) {
                 this.input.jump = true; // Try jumping first
                 
                 // If really stuck, shoot the ground or wall
                 if (this.stuckTimer > 40) {
                     this.input.shoot = true;
                     // Shoot ahead or slightly down
                     if (Math.random() > 0.5) this.input.aimTarget = new Vector2(this.pos.x + ahead, this.pos.y);
                     else this.input.aimTarget = new Vector2(this.pos.x + ahead*0.5, this.pos.y + 20);

                     // Switch to explosive/drill if possible
                     let heavyWep = this.inventory.findIndex(w => w.type === 'drill' || w.type === 'explosive');
                     if (heavyWep !== -1) this.switchWeapon(heavyWep);
                 } else {
                     this.input.shoot = false;
                 }
             } 
             // Regular jump
             else if (needsUp && Math.random() < 0.05) {
                 this.input.jump = true;
             } else {
                 this.input.jump = false;
             }
        }
        
        // Combat Logic
        if (this.currentTarget instanceof Character && !this.currentTarget.dead) {
            let enemyDist = Math.sqrt(distSq(this.pos, this.currentTarget.pos));
            // Don't shoot self if wall is close unless stuck
            let wallFace = terrain.isSolid(this.pos.x + (this.facingRight?20:-20), this.pos.y);
            
            if (enemyDist < 700 && (!wallFace || this.stuckTimer > 30)) {
                 this.input.shoot = true;
                 // Add inaccuracy based on distance
                 let jitter = (enemyDist / 100) * 5;
                 this.input.aimTarget = this.currentTarget.pos.add(new Vector2((Math.random()-0.5)*jitter, (Math.random()-0.5)*jitter)); 
            } else {
                 this.input.shoot = false;
            }
        } else if (!hasWall && this.stuckTimer < 30) {
            this.input.shoot = false;
        }
    }

    pickTarget(entities, game, cache) {
        // --- 1. SURVIVAL: Find Medkit ---
        if (this.hp < 60) {
            let nearestMedkit = null;
            let nearestMedkitDist = Infinity;
            const medkits = cache.medkits;
            for (let i = 0; i < medkits.length; i++) {
                const medkit = medkits[i];
                const d = distSq(this.pos, medkit.pos);
                if (d < nearestMedkitDist) {
                    nearestMedkitDist = d;
                    nearestMedkit = medkit;
                }
            }
            if (nearestMedkit) {
                this.currentTarget = { pos: nearestMedkit.pos, isStatic: true };
                return;
            }
        }

        // --- 2. LOOTING: Find Weapon if I only have Pistol ---
        if (this.inventory.length === 1) {
             let nearestCrate = null;
             let nearestCrateDist = Infinity;
             const weaponCrates = cache.weaponCrates;
             for (let i = 0; i < weaponCrates.length; i++) {
                 const crate = weaponCrates[i];
                 const d = distSq(this.pos, crate.pos);
                 if (d < nearestCrateDist) {
                     nearestCrateDist = d;
                     nearestCrate = crate;
                 }
             }
             // Only go if it's reasonably close (don't cross entire map just for loot if fighting)
             if (nearestCrate && Math.sqrt(nearestCrateDist) < 800) {
                 this.currentTarget = { pos: nearestCrate.pos, isStatic: true };
                 return;
             }
        }

        const enemies = cache.enemies;
        let nearestEnemy = null;
        let closestEnemyDist = Infinity;
        let visibleChoice = null;
        let visibleCount = 0;
        const visibleDistSq = 600 * 600;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy === this || enemy.dead) continue;
            const d = distSq(this.pos, enemy.pos);
            if (d < visibleDistSq) {
                visibleCount++;
                if (Math.random() < 1 / visibleCount) visibleChoice = enemy;
            }
            if (d < closestEnemyDist) {
                closestEnemyDist = d;
                nearestEnemy = enemy;
            }
        }
        const randomVisibleEnemy = visibleChoice;

        // --- CTF LOGIC ---
        if (CONFIG.GAME_MODE === 'CTF') {
            let enemyFlag = game.flags.find(f => f.teamId !== this.team);
            let myFlag = game.flags.find(f => f.teamId === this.team);
            
            if (myFlag.carrier) {
                this.currentTarget = myFlag.carrier;
                return;
            }
            if (enemyFlag.carrier === this) {
                this.currentTarget = { pos: myFlag.homePos, isStatic: true };
                return;
            }
            if (this.role === 'DEFENDER') {
                if (randomVisibleEnemy && distSq(this.pos, randomVisibleEnemy.pos) < 400 * 400) {
                    this.currentTarget = randomVisibleEnemy;
                } else {
                    this.currentTarget = { pos: myFlag.homePos, isStatic: true };
                }
            } else { 
                if (randomVisibleEnemy && distSq(this.pos, randomVisibleEnemy.pos) < 300 * 300) {
                    this.currentTarget = randomVisibleEnemy;
                } else {
                    this.currentTarget = enemyFlag.carrier ? enemyFlag.carrier : { pos: enemyFlag.pos, isStatic: true }; 
                }
            }
        } 
        // --- DM / TDM LOGIC ---
        else {
             if (randomVisibleEnemy) {
                 this.currentTarget = randomVisibleEnemy;
             } else {
                 // Hunt distant enemies if none close
                 if (nearestEnemy) {
                     this.currentTarget = nearestEnemy;
                 } else {
                     // Roam
                     if (!this.roamSpot || Math.sqrt(distSq(this.pos, this.roamSpot)) < 100 || this.decisionTimer < -200) {
                         this.roamSpot = new Vector2(Math.random()*CONFIG.WORLD_WIDTH, Math.random() * (CONFIG.WORLD_HEIGHT - 300));
                         this.decisionTimer = 300;
                     }
                     this.currentTarget = { pos: this.roamSpot, isStatic: true };
                 }
             }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        this.camera = new Vector2(0, 0); this.shake = 0; this.flash = 0; this.tick = 0; this.gameState = 'MENU';
        this.paused = false;
        this.cameraTarget = null;
        this.statsVisible = false;
        this.statsDirty = true;
        this.input = { keys: {}, mouse: { screenPos: new Vector2(CONFIG.VIEWPORT_WIDTH/2, CONFIG.VIEWPORT_HEIGHT/2), worldPos: new Vector2(0,0), down: false } };
        this.aliveEntities = [];
        this.activeCrates = [];
        this.medkits = [];
        this.weaponCrates = [];
        this.enemyCacheByTeam = { 1: [], 2: [] };
        this.enemyCacheDm = [];
        this.playerCosmetics = defaultCosmetics();
        this.botCosmetics = new Map();
        this.botCosmeticsInitialized = false;
        
        this.particleSystem = new ParticleSystem();
        this.background = new BackgroundGenerator(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.noiseCanvas = document.createElement('canvas');
        this.noiseCtx = this.noiseCanvas.getContext('2d');
        this.noisePattern = null;
        this.vignetteCanvas = document.createElement('canvas');
        this.vignetteCtx = this.vignetteCanvas.getContext('2d');
        
        this.roundOver = false;

        window.addEventListener('keydown', e => {
            if (e.code === 'Tab') {
                e.preventDefault();
                if (this.statsVisible) {
                    document.getElementById('stats-overlay').style.display = 'none';
                    this.statsVisible = false;
                } else {
                    document.getElementById('stats-overlay').style.display = 'flex';
                    this.statsVisible = true;
                    this.statsDirty = true;
                }
            }
            if (e.code === 'Escape') this.togglePause();
            this.input.keys[e.code] = true;
            if (['1','2','3','4','5','6','7'].includes(e.key) && this.player) {
                if (this.player.switchWeapon(parseInt(e.key)-1)) this.updateInventoryUI();
            }
        });
        window.addEventListener('keyup', e => {
            if (e.code === 'Tab') e.preventDefault();
            this.input.keys[e.code] = false;
        });
        this.canvas.addEventListener('mousedown', () => this.input.mouse.down = true);
        this.canvas.addEventListener('mouseup', () => this.input.mouse.down = false);
        this.canvas.addEventListener('mousemove', e => {
            let r = this.canvas.getBoundingClientRect();
            this.input.mouse.screenPos.x = (e.clientX - r.left) * (this.canvas.width / r.width);
            this.input.mouse.screenPos.y = (e.clientY - r.top) * (this.canvas.height / r.height);
        });

        window.addEventListener('resize', () => this.resize());
        this.resize();

        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const container = document.getElementById('gameContainer');
        container.style.width = `${window.innerWidth}px`;
        container.style.height = `${window.innerHeight}px`;
        this.canvas.width = CONFIG.VIEWPORT_WIDTH;
        this.canvas.height = CONFIG.VIEWPORT_HEIGHT;
        this.noiseCanvas.width = 256;
        this.noiseCanvas.height = 256;
        this.vignetteCanvas.width = CONFIG.VIEWPORT_WIDTH;
        this.vignetteCanvas.height = CONFIG.VIEWPORT_HEIGHT;
        this.generateNoise();
        this.generateVignette();
    }

    generateNoise() {
        const w = this.noiseCanvas.width;
        const h = this.noiseCanvas.height;
        const imageData = this.noiseCtx.createImageData(w, h);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const shade = Math.floor(Math.random() * 255);
            imageData.data[i] = shade;
            imageData.data[i + 1] = shade;
            imageData.data[i + 2] = shade;
            imageData.data[i + 3] = 20;
        }
        this.noiseCtx.putImageData(imageData, 0, 0);
        this.noisePattern = this.ctx.createPattern(this.noiseCanvas, 'repeat');
    }

    generateVignette() {
        const w = this.vignetteCanvas.width;
        const h = this.vignetteCanvas.height;
        const gradient = this.vignetteCtx.createRadialGradient(
            w / 2, h / 2, h * 0.2,
            w / 2, h / 2, h * 0.7
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(180, 0, 0, 0.35)');
        this.vignetteCtx.clearRect(0, 0, w, h);
        this.vignetteCtx.fillStyle = gradient;
        this.vignetteCtx.fillRect(0, 0, w, h);
    }
    
    togglePause() {
        if (this.gameState !== 'PLAYING') return;
        this.paused = !this.paused;
        document.getElementById('pause-menu').style.display = this.paused ? 'flex' : 'none';
    }

    start() {
        this.terrain = new Terrain(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT); 
        this.entities = []; this.projectiles = []; this.crates = []; this.fires = []; this.effects = []; this.flags = []; this.bases = [];
        this.scores = { 1: 0, 2: 0 };
        this.gameOver = false;
        this.roundOver = false;
        
        const baseH = this.terrain.height - 400; 
        const baseW = 250; 

        if (CONFIG.GAME_MODE !== 'DM') {
            this.bases.push(new BaseStructure(1, baseW, baseH));
            this.bases.push(new BaseStructure(2, CONFIG.WORLD_WIDTH - baseW, baseH));
        }
        if (CONFIG.GAME_MODE === 'CTF') {
            this.flags.push(new Flag(1, baseW, baseH));
            this.flags.push(new Flag(2, CONFIG.WORLD_WIDTH - baseW, baseH));
        }

        let pName = document.getElementById('nickname-input').value || "Герой";
        let pTeam = CONFIG.GAME_MODE === 'DM' ? 0 : 1; 
        let startX = pTeam === 2 ? CONFIG.WORLD_WIDTH - baseW : baseW;
        let startY = baseH - 50;

        if (CONFIG.GAME_MODE === 'DM') { startX = CONFIG.WORLD_WIDTH / 2; startY = 200; }
        
        const playerColor = getPlayerColorFromUI();
        this.playerCosmetics = getPlayerCosmeticsFromUI(this.playerCosmetics);
        this.player = new Character(startX, startY, 0, playerColor, pName, pTeam, this.playerCosmetics);
        this.entities.push(this.player);
        this.cameraTarget = this.player;
        
        this.camera.x = Math.max(0, Math.min(this.player.pos.x - CONFIG.VIEWPORT_WIDTH/2, CONFIG.WORLD_WIDTH - CONFIG.VIEWPORT_WIDTH));
        this.camera.y = Math.max(0, Math.min(this.player.pos.y - CONFIG.VIEWPORT_HEIGHT/2, CONFIG.WORLD_HEIGHT - CONFIG.VIEWPORT_HEIGHT));

        for(let i=0; i<CONFIG.BOT_COUNT; i++) {
            let team = CONFIG.GAME_MODE === 'DM' ? 0 : (i % 2 === 0 ? 2 : 1);
            let bx = team === 1 ? baseW + Math.random()*100 : (team === 2 ? CONFIG.WORLD_WIDTH - baseW - Math.random()*100 : Math.random()*CONFIG.WORLD_WIDTH);
            let by = team === 0 ? 100 : baseH - 50;
            let name = BOT_NAMES[i % BOT_NAMES.length];
            const botId = i + 1;
            if (!this.botCosmetics.has(botId)) {
                this.botCosmetics.set(botId, randomBotCosmetics());
            }
            const botVisual = this.botCosmetics.get(botId);
            this.entities.push(new Bot(bx, by, botId, name, team, botVisual.color, botVisual.cosmetics));
        }
        this.botCosmeticsInitialized = true;
        
        for(let i=0; i<8; i++) this.spawnCrate();

        this.gameState = 'PLAYING';
        this.paused = false;
        document.getElementById('start-screen').style.display = 'none'; 
        document.getElementById('ui-layer').style.display = 'flex';
        document.getElementById('frag-goal-display').innerText = CONFIG.WIN_LIMIT;
        document.getElementById('team-hud').style.display = CONFIG.GAME_MODE === 'DM' ? 'none' : 'flex';
        
        // Hide/Show timer based on mode (Only shows during death now in CTF)
        document.getElementById('ctf-respawn-timer').style.display = 'none';
        
        document.getElementById('score-blue').innerText = "0";
        document.getElementById('score-red').innerText = "0";
        
        this.updateInventoryUI();
    }
    
    goToMenu() {
        this.gameState = 'MENU';
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('lobby-screen').style.display = 'none';
    }

    spawnCrate() {
        let type = 'weapon'; if (Math.random() < 0.3) type = Math.random() > 0.5 ? 'medkit' : 'powerup';
        this.crates.push(new Crate(Math.random()*(CONFIG.WORLD_WIDTH-800)+400, -50, type)); 
    }
    
    scoreTeam(teamId, amt) {
        this.scores[teamId] += amt;
        document.getElementById('score-blue').innerText = this.scores[1];
        document.getElementById('score-red').innerText = this.scores[2];
        this.checkWinCondition();
    }
    
    scoreCapture(teamId) {
        this.scoreTeam(teamId, 1);
    }

    endRound(winner) {
        if (this.roundOver) return;
        this.roundOver = true;
        
        let text = "НИЧЬЯ";
        if (winner) text = winner.name;
        else if (winner === null) text = "ВСЕ МЕРТВЫ";

        document.getElementById('round-winner-text').innerText = "Победитель: " + text;
        document.getElementById('round-over-screen').style.display = 'flex';

        setTimeout(() => {
            this.respawnAll();
            document.getElementById('round-over-screen').style.display = 'none';
            this.roundOver = false;
        }, 3000);
    }

    endRoundTeam(winningTeamId) {
         if (this.roundOver) return;
         this.roundOver = true;
         
         this.scoreTeam(winningTeamId, 1);
         
         document.getElementById('round-winner-text').innerText = "Раунд выиграли: " + TEAMS[winningTeamId].name;
         document.getElementById('round-over-screen').style.display = 'flex';

         setTimeout(() => {
            this.respawnAll();
            document.getElementById('round-over-screen').style.display = 'none';
            this.roundOver = false;
        }, 3000);
    }

    respawnAll() {
        // --- NEW: REGENERATE MAP ON ROUND END ---
        this.terrain = new Terrain(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.background.generate();
        
        // --- OPTIMIZATION 2: Clear old crates on map regen ---
        this.crates = [];
        for(let i=0; i<8; i++) this.spawnCrate();

        this.entities.forEach(ent => this.respawnEntity(ent));
        this.projectiles = [];
        this.fires = [];
        this.effects = [];
        this.cameraTarget = this.player;
    }

    respawnEntity(ent) {
        ent.dead = false;
        ent.hp = 100;
        ent.vel = new Vector2(0,0);
        ent.inventory = [{...WeaponType.PISTOL}];
        ent.weaponIndex = 0;
        ent.weapon = ent.inventory[0];
        
        if (ent === this.player) {
            this.updateInventoryUI();
            this.cameraTarget = this.player;
            document.getElementById('ctf-respawn-timer').style.display = 'none';
        }

        const baseW = 250;
        const baseH = this.terrain.height - 450; 
        
        if (ent.team === 1) ent.pos = new Vector2(baseW + (Math.random()-0.5)*100, baseH);
        else if (ent.team === 2) ent.pos = new Vector2(CONFIG.WORLD_WIDTH - baseW + (Math.random()-0.5)*100, baseH);
        else ent.pos = new Vector2(Math.random() * (CONFIG.WORLD_WIDTH - 200) + 100, 200);

        this.particleSystem.emit(ent.pos, new Vector2(0,0), 50, '#fff', 'glow');
    }

    checkWinCondition() {
        if (this.gameOver) return;
        let win = false; let txt = "";
        
        if (CONFIG.GAME_MODE === 'DM') {
            let leader = null;
            for (let i = 0; i < this.entities.length; i++) {
                const ent = this.entities[i];
                if (!leader || ent.kills > leader.kills) leader = ent;
            }
            if (leader && leader.kills >= CONFIG.WIN_LIMIT) { win = true; txt = leader.name; }
        } else {
            if (this.scores[1] >= CONFIG.WIN_LIMIT) { win = true; txt = "СИНИЕ"; }
            if (this.scores[2] >= CONFIG.WIN_LIMIT) { win = true; txt = "КРАСНЫЕ"; }
        }
        
        if (win) {
            this.gameOver = true;
            document.getElementById('game-over-screen').style.display = 'flex';
            document.getElementById('overlay-subtitle').innerText = txt;
        }
    }
    
    updateWaveRespawn() {
        // Now only used for displaying personal timer in CTF
        if (CONFIG.GAME_MODE === 'CTF' && this.player.dead) {
             const timer = document.getElementById('ctf-respawn-timer');
             timer.style.display = 'block';
             document.getElementById('respawn-time-val').innerText = Math.ceil(this.player.respawnTimer / 60);
        } else {
             document.getElementById('ctf-respawn-timer').style.display = 'none';
        }
    }

    shakeScreen(amount) { this.shake = amount; }
    flashScreen() { this.flash = 10; }
    
    updateInventoryUI() {
        let container = document.getElementById('inventory-container'); container.innerHTML = '';
        const weaponIcons = {
            blaster: `<svg viewBox="0 0 64 64"><rect x="8" y="26" width="32" height="12" rx="4"/><rect x="40" y="28" width="14" height="8" rx="2"/><rect x="14" y="38" width="8" height="10" rx="2"/><circle cx="48" cy="32" r="3"/></svg>`,
            explosive: `<svg viewBox="0 0 64 64"><circle cx="28" cy="36" r="12"/><rect x="36" y="18" width="16" height="6" rx="2"/><rect x="50" y="16" width="6" height="10" rx="2"/></svg>`,
            bounce: `<svg viewBox="0 0 64 64"><circle cx="28" cy="36" r="10"/><path d="M40 24h12l-6 8z"/><rect x="18" y="46" width="20" height="4" rx="2"/></svg>`,
            drill: `<svg viewBox="0 0 64 64"><rect x="10" y="28" width="24" height="10" rx="3"/><polygon points="34,28 54,32 34,38"/><rect x="12" y="40" width="8" height="8" rx="2"/></svg>`,
            energy: `<svg viewBox="0 0 64 64"><rect x="10" y="26" width="28" height="12" rx="4"/><polygon points="34,24 54,32 34,40"/><circle cx="20" cy="32" r="3"/></svg>`,
            molotov: `<svg viewBox="0 0 64 64"><rect x="28" y="12" width="8" height="10" rx="2"/><circle cx="32" cy="36" r="12"/><path d="M28 18h8l-4 10z"/></svg>`,
            blackhole: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="16"/><circle cx="32" cy="32" r="6"/><path d="M10 32h10M44 32h10" /></svg>`,
            shotgun: `<svg viewBox="0 0 64 64"><rect x="8" y="28" width="36" height="6" rx="3"/><rect x="8" y="36" width="30" height="6" rx="3"/><rect x="4" y="30" width="8" height="10" rx="3"/></svg>`,
            highspeed: `<svg viewBox="0 0 64 64"><rect x="6" y="30" width="40" height="4" rx="2"/><rect x="14" y="22" width="18" height="6" rx="2"/><rect x="4" y="34" width="10" height="8" rx="2"/></svg>`,
            rapid: `<svg viewBox="0 0 64 64"><rect x="8" y="24" width="30" height="16" rx="4"/><rect x="38" y="26" width="16" height="12" rx="3"/><rect x="14" y="40" width="8" height="8" rx="2"/></svg>`,
            homing: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="4"/><path d="M32 14v6M32 44v6M14 32h6M44 32h6"/></svg>`,
            teleport: `<svg viewBox="0 0 64 64"><rect x="22" y="28" width="20" height="8" rx="4"/><circle cx="32" cy="20" r="6"/><circle cx="32" cy="44" r="6"/></svg>`,
            laser: `<svg viewBox="0 0 64 64"><rect x="8" y="28" width="40" height="8" rx="4"/><rect x="48" y="30" width="8" height="4" rx="2"/><rect x="14" y="24" width="18" height="4" rx="2"/></svg>`,
            nuke: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="5"/><path d="M32 18v8M18 32h8M38 32h8M32 38v8"/></svg>`
        };
        for(let i=0; i<CONFIG.MAX_INVENTORY; i++) {
            let div = document.createElement('div'); div.className = 'inv-slot locked';
            if (i < this.player.inventory.length) {
                let w = this.player.inventory[i];
                div.className = 'inv-slot' + (this.player.weaponIndex === i ? ' active' : '');
                const icon = weaponIcons[w.type] || weaponIcons.blaster;
                div.innerHTML = `<span class="slot-key">${i+1}</span><div class="slot-icon" style="color:${w.color}">${icon}</div>`;
                div.onclick = () => { this.player.switchWeapon(i); this.updateInventoryUI(); };
            } else {
                div.innerHTML = `<span class="slot-key">${i+1}</span>`;
            }
            container.appendChild(div);
        }
    }
    
    loop() {
        if (this.gameState === 'PLAYING' && !this.gameOver && !this.paused) {
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.tick++; 
        
        // --- IMPROVED CTF LOOT SPAWNING ---
        let spawnChance = (CONFIG.GAME_MODE === 'CTF') ? 0.008 : 0.003;
        if (Math.random() < spawnChance) this.spawnCrate();

        this.input.mouse.worldPos = this.input.mouse.screenPos.add(this.camera);
        this.updateWaveRespawn();

        this.aliveEntities.length = 0;
        this.activeCrates.length = 0;
        this.medkits.length = 0;
        this.weaponCrates.length = 0;
        for (let i = 0; i < this.entities.length; i++) {
            const ent = this.entities[i];
            if (!ent.dead) this.aliveEntities.push(ent);
        }
        for (let i = 0; i < this.crates.length; i++) {
            const crate = this.crates[i];
            if (!crate.active) continue;
            this.activeCrates.push(crate);
            if (crate.isMedkit) this.medkits.push(crate);
            if (crate.crateType === 'weapon') this.weaponCrates.push(crate);
        }
        if (CONFIG.GAME_MODE === 'DM') {
            this.enemyCacheDm = this.aliveEntities;
        } else {
            this.enemyCacheByTeam[1].length = 0;
            this.enemyCacheByTeam[2].length = 0;
            for (let i = 0; i < this.aliveEntities.length; i++) {
                const ent = this.aliveEntities[i];
                if (ent.team !== 1) this.enemyCacheByTeam[1].push(ent);
                if (ent.team !== 2) this.enemyCacheByTeam[2].push(ent);
            }
        }

        // Round Logic
        if (!this.roundOver && !this.gameOver) {
            if (CONFIG.GAME_MODE === 'DM') {
                if (this.aliveEntities.length <= 1) {
                    this.endRound(this.aliveEntities.length === 1 ? this.aliveEntities[0] : null);
                }
            } else if (CONFIG.GAME_MODE === 'TDM') {
                let blueAlive = 0;
                let redAlive = 0;
                for (let i = 0; i < this.aliveEntities.length; i++) {
                    const ent = this.aliveEntities[i];
                    if (ent.team === 1) blueAlive++;
                    else if (ent.team === 2) redAlive++;
                }
                
                if (blueAlive === 0 || redAlive === 0) {
                     // Check if game really started (prevent instant win at start tick)
                     if (this.tick > 60) {
                        if (blueAlive > 0) this.endRoundTeam(1);
                        else if (redAlive > 0) this.endRoundTeam(2);
                        else this.endRound(null); // Draw
                     }
                }
            }
        }
        
        if (this.player && !this.player.dead) {
            this.player.input.left = this.input.keys['KeyA'];
            this.player.input.right = this.input.keys['KeyD'];
            this.player.input.jump = this.input.keys['KeyW'];
            this.player.input.shoot = this.input.mouse.down;
            this.player.input.aimTarget = this.input.mouse.worldPos;
        }
        
        const aiStride = Math.max(1, Math.floor(this.aliveEntities.length / 12));
        this.entities.forEach(ent => {
            if (ent instanceof Bot) {
                const enemies = CONFIG.GAME_MODE === 'DM'
                    ? this.enemyCacheDm
                    : (ent.team === 1 ? this.enemyCacheByTeam[1] : this.enemyCacheByTeam[2]);
                const cache = { enemies, medkits: this.medkits, weaponCrates: this.weaponCrates };
                if (aiStride === 1 || (this.tick + ent.id) % aiStride === 0) {
                    ent.aiUpdate(this.terrain, this.entities, this.projectiles, this, cache);
                    ent.lastAiTick = this.tick;
                }
            }
            ent.update(this.terrain, this.projectiles, this.crates, this);
        });
        
        this.crates.forEach(c => c.update(this.terrain));
        this.flags.forEach(f => f.update(this.terrain, this.entities, this));
        for (let i = this.projectiles.length - 1; i >= 0; i--) { 
            let p = this.projectiles[i]; p.update(this.terrain, this.particleSystem, this.entities, this); 
            if (!p.active) this.projectiles.splice(i, 1); 
        }
        this.fires = this.fires.filter(f => f.update(this));
        this.effects = this.effects.filter(f => f.update(this));
        
        // CAMERA LOGIC WITH MOUSE OFFSET
        let target = this.cameraTarget || this.player;
        if (target) {
            let targetPos = target.pos.clone();
            
            // Add Mouse Offset
            if (!this.roundOver && !this.gameOver && target === this.player) {
                let mouseOffset = this.input.mouse.screenPos.sub(new Vector2(CONFIG.VIEWPORT_WIDTH/2, CONFIG.VIEWPORT_HEIGHT/2));
                targetPos = targetPos.add(mouseOffset.mult(0.3)); // Offset strength
            }

            let tx = Math.max(0, Math.min(targetPos.x - CONFIG.VIEWPORT_WIDTH/2, CONFIG.WORLD_WIDTH - CONFIG.VIEWPORT_WIDTH));
            let ty = Math.max(0, Math.min(targetPos.y - CONFIG.VIEWPORT_HEIGHT/2, CONFIG.WORLD_HEIGHT - CONFIG.VIEWPORT_HEIGHT));
            this.camera.x += (tx - this.camera.x) * 0.1; 
            this.camera.y += (ty - this.camera.y) * 0.1;
            
            if (this.shake > 0) { 
                this.camera.x += (Math.random()-0.5)*this.shake; 
                this.camera.y += (Math.random()-0.5)*this.shake; 
                this.shake *= 0.9; 
                if(this.shake < 0.5) this.shake = 0; 
            }
        }
        
        if (this.statsVisible && (this.statsDirty || this.tick % 10 === 0)) {
            let html = '';
            const sortedEntities = [...this.entities].sort((a,b)=>b.kills-a.kills);
            sortedEntities.forEach(e => {
                let cls = e.team === 1 ? 'row-blue' : (e.team === 2 ? 'row-red' : '');
                if (e === this.player) cls += ' row-me';
                html += `<tr class="${cls}"><td>${e.name}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${TEAMS[e.team].name}</td></tr>`;
            });
            document.getElementById('stats-body').innerHTML = html;
            this.statsDirty = false;
        }
        document.getElementById('hp-display').innerText = Math.floor(this.player.hp);
    }

    draw() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
        
        if (!this.terrain) return;

        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
        
        this.background.draw(this.ctx, this.camera);
        
        // --- OPTIMIZATION 1: Draw only visible terrain ---
        // Calculate the slice of terrain canvas to draw based on camera
        // Note: The context is already translated by -camera.x, -camera.y.
        // So drawing at (camera.x, camera.y) in world coordinates maps to (0,0) on screen.
        let vw = this.canvas.width;
        let vh = this.canvas.height;
        let sx = Math.max(0, Math.floor(this.camera.x));
        let sy = Math.max(0, Math.floor(this.camera.y));
        let sw = Math.min(vw, this.terrain.width - sx);
        let sh = Math.min(vh, this.terrain.height - sy);

        if (sw > 0 && sh > 0) {
            // Draw slice from source (sx, sy, sw, sh) to destination (sx, sy, sw, sh) in world coords
            this.ctx.drawImage(this.terrain.canvas, sx, sy, sw, sh, sx, sy, sw, sh);
        }

        const viewLeft = this.camera.x - 200;
        const viewRight = this.camera.x + CONFIG.VIEWPORT_WIDTH + 200;
        const viewTop = this.camera.y - 200;
        const viewBottom = this.camera.y + CONFIG.VIEWPORT_HEIGHT + 200;
        const inView = (obj) => obj && obj.pos &&
            obj.pos.x >= viewLeft && obj.pos.x <= viewRight &&
            obj.pos.y >= viewTop && obj.pos.y <= viewBottom;

        this.bases.forEach(b => b.draw(this.ctx));
        this.flags.forEach(f => f.draw(this.ctx));
        this.crates.forEach(c => { if (inView(c)) c.draw(this.ctx); });
        this.fires.forEach(f => { if (inView(f)) f.draw(this.ctx); });
        this.effects.forEach(f => { if (inView(f)) f.draw(this.ctx); else if (!f.pos) f.draw(this.ctx); });
        this.entities.forEach(e => { if (inView(e)) e.draw(this.ctx); });
        this.projectiles.forEach(p => { if (inView(p)) p.draw(this.ctx); });
        this.particleSystem.updateAndDraw(this.ctx, this);
        
        if (this.gameState === 'PLAYING' && !this.player.dead && !this.paused) {
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)'; this.ctx.setLineDash([5, 5]); this.ctx.beginPath();
            this.ctx.moveTo(this.player.pos.x, this.player.pos.y); this.ctx.lineTo(this.input.mouse.worldPos.x, this.input.mouse.worldPos.y);
            this.ctx.stroke(); this.ctx.setLineDash([]);
            this.ctx.strokeStyle = '#f00'; this.ctx.strokeRect(this.input.mouse.worldPos.x-5, this.input.mouse.worldPos.y-5, 10, 10);
        }
        
        this.ctx.restore();
        if (this.player && this.player.hp <= 30) {
            this.ctx.drawImage(this.vignetteCanvas, 0, 0);
        }
        if (this.noisePattern) {
            this.ctx.globalAlpha = 0.04;
            this.ctx.fillStyle = this.noisePattern;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1;
        }
        if (this.flash > 0) { this.ctx.fillStyle = `rgba(255,255,255,${this.flash/20})`; this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height); this.flash--; }
    }
}

let gameInstance;
window.onload = () => { gameInstance = new Game(); };

function startGame() { gameInstance.start(); }
function restartGame() {
    gameInstance.start();
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('round-over-screen').style.display = 'none';
}
function goToMenu() { gameInstance.goToMenu(); }
function togglePause() { gameInstance.togglePause(); }

let previousScreen = 'MENU';

function openLobby(fromScreen) {
    previousScreen = fromScreen;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    document.getElementById('bot-count-input').value = CONFIG.BOT_COUNT;
    document.getElementById('bot-count-val').innerText = CONFIG.BOT_COUNT;
    document.getElementById('frag-limit-input').value = CONFIG.WIN_LIMIT; 
    document.getElementById('frag-limit-val').innerText = CONFIG.WIN_LIMIT;
    const cosmetics = gameInstance?.playerCosmetics || defaultCosmetics();
    const helmetSelect = document.getElementById('player-helmet-select');
    const outfitSelect = document.getElementById('player-outfit-select');
    const bootsSelect = document.getElementById('player-boots-select');
    const accessorySelect = document.getElementById('player-accessory-select');
    const accentInput = document.getElementById('player-accent-input');
    const colorInputSettings = document.getElementById('player-color-input-settings');
    const colorInputStart = document.getElementById('player-color-input');
    const lobbyName = document.getElementById('lobby-nickname-input');
    if (lobbyName) lobbyName.value = document.getElementById('nickname-input')?.value || '';
    if (helmetSelect) helmetSelect.value = cosmetics.helmet;
    if (outfitSelect) outfitSelect.value = cosmetics.outfit;
    if (bootsSelect) bootsSelect.value = cosmetics.boots;
    if (accessorySelect) accessorySelect.value = cosmetics.accessory;
    if (accentInput) accentInput.value = cosmetics.accent;
    if (colorInputSettings) colorInputSettings.value = colorInputStart?.value || '#3498db';
    populateCosmeticsSelects();
    updateLobbyPreview();
}

function updateLobbyUI() {
    const bots = parseInt(document.getElementById('bot-count-input').value);
    const frags = parseInt(document.getElementById('frag-limit-input').value);
    document.getElementById('bot-count-val').innerText = bots;
    document.getElementById('frag-limit-val').innerText = frags;
    CONFIG.BOT_COUNT = bots;
    CONFIG.WIN_LIMIT = frags;
    CONFIG.GAME_MODE = document.getElementById('game-mode-select').value;
}

function closeLobby() {
    if (gameInstance) {
        gameInstance.playerCosmetics = getPlayerCosmeticsFromUI(gameInstance.playerCosmetics);
        const colorInputSettings = document.getElementById('player-color-input-settings');
        const colorInputStart = document.getElementById('player-color-input');
        if (colorInputSettings && colorInputStart) {
            colorInputStart.value = colorInputSettings.value;
        }
    }
    document.getElementById('lobby-screen').style.display = 'none';
    if (previousScreen === 'MENU') {
        document.getElementById('start-screen').style.display = 'flex';
    } else if (previousScreen === 'PAUSE') {
        document.getElementById('pause-menu').style.display = 'flex';
    }
}

function getPlayerCosmeticsFromUI(current) {
    const cosmetics = { ...defaultCosmetics(), ...(current || {}) };
    const helmetSelect = document.getElementById('player-helmet-select');
    const outfitSelect = document.getElementById('player-outfit-select');
    const bootsSelect = document.getElementById('player-boots-select');
    const accessorySelect = document.getElementById('player-accessory-select');
    const accentInput = document.getElementById('player-accent-input');
    if (helmetSelect) cosmetics.helmet = helmetSelect.value;
    if (outfitSelect) cosmetics.outfit = outfitSelect.value;
    if (bootsSelect) cosmetics.boots = bootsSelect.value;
    if (accessorySelect) cosmetics.accessory = accessorySelect.value;
    if (accentInput) cosmetics.accent = accentInput.value;
    return cosmetics;
}

function getPlayerColorFromUI() {
    const settingsInput = document.getElementById('player-color-input-settings');
    const startInput = document.getElementById('player-color-input');
    return settingsInput?.value || startInput?.value || '#3498db';
}

function startGameFromLobby() {
    const lobbyName = document.getElementById('lobby-nickname-input');
    const startName = document.getElementById('nickname-input');
    if (lobbyName && startName) startName.value = lobbyName.value.trim();
    closeLobby();
    startGame();
}

function populateCosmeticsSelects() {
    const helmetSelect = document.getElementById('player-helmet-select');
    const outfitSelect = document.getElementById('player-outfit-select');
    const bootsSelect = document.getElementById('player-boots-select');
    const accessorySelect = document.getElementById('player-accessory-select');
    if (helmetSelect && helmetSelect.options.length === 0) {
        COSMETICS.helmets.forEach(opt => helmetSelect.add(new Option(opt.label, opt.id)));
    }
    if (outfitSelect && outfitSelect.options.length === 0) {
        COSMETICS.outfits.forEach(opt => outfitSelect.add(new Option(opt.label, opt.id)));
    }
    if (bootsSelect && bootsSelect.options.length === 0) {
        COSMETICS.boots.forEach(opt => bootsSelect.add(new Option(opt.label, opt.id)));
    }
    if (accessorySelect && accessorySelect.options.length === 0) {
        COSMETICS.accessories.forEach(opt => accessorySelect.add(new Option(opt.label, opt.id)));
    }
}

function updateLobbyPreview() {
    const canvas = document.getElementById('lobby-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = getPlayerColorFromUI();
    const cosmetics = getPlayerCosmeticsFromUI(gameInstance?.playerCosmetics);
    const preview = new Character(canvas.width / 2, canvas.height / 2 + 20, -1, color, 'PREVIEW', 0, cosmetics);
    preview.input.aimTarget = new Vector2(preview.pos.x + 30, preview.pos.y - 10);
    preview.animTimer = 0.5;
    preview.draw(ctx);
}

document.addEventListener('input', (event) => {
    if (event.target && event.target.closest('#lobby-screen')) {
        updateLobbyPreview();
    }
});
