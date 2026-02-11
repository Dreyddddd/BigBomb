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

class SpatialGrid {
    constructor(cellSize, width, height) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    insert(entity) {
        const cx = Math.floor(entity.pos.x / this.cellSize);
        const cy = Math.floor(entity.pos.y / this.cellSize);
        const key = `${cx},${cy}`;
        let bucket = this.cells.get(key);
        if (!bucket) {
            bucket = [];
            this.cells.set(key, bucket);
        }
        bucket.push(entity);
    }

    queryRadius(pos, radius) {
        const minCx = Math.floor((pos.x - radius) / this.cellSize);
        const maxCx = Math.floor((pos.x + radius) / this.cellSize);
        const minCy = Math.floor((pos.y - radius) / this.cellSize);
        const maxCy = Math.floor((pos.y + radius) / this.cellSize);
        const results = [];

        for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
                const bucket = this.cells.get(`${cx},${cy}`);
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    results.push(bucket[i]);
                }
            }
        }
        return results;
    }
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
    CTF_RESPAWN_TIME: 1200, // 20 seconds * 60 fps
    SPATIAL_GRID_SIZE: 200,
    COLLISION_BATCH_TICKS: 3
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
    heads: [
        { id: '1', label: 'Тип 1' },
        { id: '2', label: 'Тип 2' },
        { id: '3', label: 'Тип 3' },
        { id: '4', label: 'Тип 4' },
        { id: '5', label: 'Тип 5' },
        { id: '6', label: 'Тип 6' },
        { id: '7', label: 'Тип 7' },
        { id: '8', label: 'Тип 8' },
        { id: '9', label: 'Тип 9' },
        { id: '10', label: 'Тип 10' },
        { id: '11', label: 'Тип 11' }
    ],
    bodies: [
        { id: '1', label: 'Тело 1' },
        { id: '2', label: 'Тело 2' },
        { id: '3', label: 'Тело 3' },
        { id: '4', label: 'Тело 4' },
        { id: '5', label: 'Тело 5' },
        { id: '6', label: 'Тело 6' },
        { id: '7', label: 'Тело 7' },
        { id: '8', label: 'Тело 8' }
    ]
};

const DEFAULT_PLAYER_COLOR = '#3498db';
const BOT_COLORS = ['#3498db', '#e67e22', '#9b59b6', '#2ecc71', '#f1c40f', '#e74c3c', '#95a5a6'];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const headImageCache = new Map();
function getHeadImage(headId) {
    if (!headId) return null;
    if (!headImageCache.has(headId)) {
        const img = new Image();
        img.onload = () => {
            if (typeof updateLobbyPreview === 'function') updateLobbyPreview();
        };
        img.src = `assets/images/heads/${headId}.png`;
        headImageCache.set(headId, img);
    }
    return headImageCache.get(headId);
}

const bodyImageCache = new Map();
function getBodyImage(bodyId) {
    if (!bodyId) return null;
    if (!bodyImageCache.has(bodyId)) {
        const img = new Image();
        img.onload = () => {
            if (typeof updateLobbyPreview === 'function') updateLobbyPreview();
        };
        img.src = `Assets/Images/Bodyes/${bodyId}.png`;
        bodyImageCache.set(bodyId, img);
    }
    return bodyImageCache.get(bodyId);
}

let bootsImage = null;
function getBootsImage() {
    if (!bootsImage) {
        const img = new Image();
        img.onerror = () => {
            if (!img._triedLowerCase) {
                img._triedLowerCase = true;
                img.src = 'assets/images/boots/boot.png';
            }
        };
        img.src = 'Assets/Images/Boots/boot.png';
        bootsImage = img;
    }
    return bootsImage;
}

function defaultCosmetics() {
    return {
        head: '1',
        body: '1'
    };
}

function randomBotCosmetics() {
    return {
        color: randomChoice(BOT_COLORS),
        cosmetics: {
            head: randomChoice(COSMETICS.heads).id,
            body: randomChoice(COSMETICS.bodies).id
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
    PISTOL:     { name: "Бластер", color: '#3498db', radius: 15, damage: 8, infinite: true, type: 'blaster', cooldown: 70, chargeable: false }, 
    BAZOOKA:    { name: "Базука", color: '#e74c3c', radius: 60, damage: 35, type: 'explosive', burn: 3, cooldown: 60, chargeable: true }, 
    GRENADE:    { name: "Граната", color: '#27ae60', radius: 70, damage: 45, type: 'bounce', cooldown: 45, chargeable: true },
    DRILL:      { name: "Бур", color: '#f39c12', radius: 25, damage: 15, specialized: true, type: 'drill', cooldown: 40, chargeable: true },
    PLASMA:     { name: "Плазма", color: '#00ffcc', radius: 45, damage: 30, bounces: 2, type: 'energy', cooldown: 140, chargeable: true },
    MOLOTOV:    { name: "Молотов", color: '#e67e22', radius: 30, damage: 15, type: 'molotov', burn: 15, cooldown: 50, chargeable: true },
    SINGULARITY:{ name: "Дыра", color: '#8e44ad', radius: 100, damage: 999, type: 'blackhole', cooldown: 320, chargeable: true }, 
    
    SHOTGUN:    { name: "Дробовик", color: '#f1c40f', radius: 10, damage: 8, type: 'shotgun', count: 5, spread: 0.3, cooldown: 50, chargeable: false }, 
    SNIPER:     { name: "Снайперка", color: '#ffe082', radius: 5, damage: 60, type: 'highspeed', cooldown: 70, chargeable: false }, 
    MINIGUN:    { name: "Миниган", color: '#f39c12', radius: 5, damage: 4, type: 'rapid', cooldown: 4, chargeable: false }, 
    HOMING:     { name: "Самонавод", color: '#ff00ff', radius: 40, damage: 25, type: 'homing', cooldown: 60, chargeable: true },
    TELEPORT:   { name: "Телепорт", color: '#3498db', radius: 0, damage: 0, type: 'teleport', cooldown: 60, chargeable: true },
    LASER:      { name: "Лазер", color: '#e74c3c', radius: 5, damage: 40, type: 'laser', cooldown: 80, chargeable: false },
    NUKE:       { name: "Ядерка", color: '#2c3e50', radius: 250, damage: 100, type: 'nuke', cooldown: 280, chargeable: true }
};

const PERK_LIST = [
    { id: 'tenacity', name: 'Упорство', desc: '+10% к максимальному HP' },
    { id: 'field_armor', name: 'Полевая броня', desc: 'Входящий взрывной урон -10%' },
    { id: 'dash', name: 'Рывок', desc: 'Скорость передвижения +10%' },
    { id: 'high_jump', name: 'Высокий прыжок', desc: 'Сила прыжка +15%' },
    { id: 'steady_hand', name: 'Твёрдая рука', desc: 'Разброс дробовика -10%' },
    { id: 'combat_instinct', name: 'Боевой инстинкт', desc: 'При HP < 35% урон +20%' },
    { id: 'pyrokinesis', name: 'Пирокинез', desc: '50% шанс поджечь поверхность любым оружием' },
    { id: 'fire_resist', name: 'Огнестойкость', desc: 'Урон от огня/молотова -15%' },
    { id: 'kill_impulse', name: 'Импульс при убийстве', desc: 'После фрага 5 сек. скорость +10%' },
    { id: 'berserk', name: 'Берсерк', desc: 'После фрага 3 сек. урон +10%' },
    { id: 'loot_scout', name: 'Разведчик лута', desc: 'Подбор ящиков +25% радиуса' },
    { id: 'sapper', name: 'Сапёр', desc: 'Урон по себе от своих взрывов -15%' },
    { id: 'close_damage', name: 'Убойный центр', desc: '+10% урона если цель ближе 120px' },
    { id: 'far_focus', name: 'Дальний фокус', desc: '+8% урона если цель дальше 450px' },
    { id: 'plasma_split', name: 'Дестабилизатор плазмы', desc: 'PLASMA делится на 2 при столкновении' },
    { id: 'tank', name: 'Танк', desc: 'Любой входящий урон -20%, скорость -10%' },
    { id: 'shrapnel', name: 'Шрапнель', desc: 'GRENADE сильнее отталкивает врага' },
    { id: 'fire_trail', name: 'Огненный след', desc: 'MOLOTOV создаёт +1..2 огненных капли' },
    { id: 'anti_grav', name: 'Антиграв-зацеп', desc: 'Сила притяжения чёрной дыры по вам -12%' },
    { id: 'pierce', name: 'Пробой', desc: 'SNIPER/LASER пробивают первую цель' },
    { id: 'bazooka_radius', name: 'Усиленный снаряд', desc: 'Радиус взрыва BAZOOKA +10%' },
    { id: 'regen_window', name: 'Реген-окно', desc: 'Через 6 сек без урона: +1 HP/сек до +50' },
    { id: 'back_strike', name: 'Тыловой удар', desc: '+10% урона по стоящей цели' },
    { id: 'spec_training', name: 'Спецподготовка', desc: 'Длительность powerup +12%' },
    { id: 'predator', name: 'Хищник', desc: 'После убийства +5 HP' },
    { id: 'quick_response', name: 'Скорый отклик', desc: 'После смены оружия быстрее готов к выстрелу' },
    { id: 'frag_shield', name: 'Фраг-щит', desc: 'После фрага 1.2 сек -20% входящего урона' },
    { id: 'ctf_courier', name: 'CTF: Курьер', desc: 'При переносе флага +8% скорость, -5% урон', mode: 'CTF' },
    { id: 'ctf_anchor', name: 'CTF: Опорник', desc: 'Рядом со своим флагом -10% входящего урона', mode: 'CTF' },
    { id: 'support', name: 'Поддержка', desc: 'В TDM/CTF рядом с союзником -5% входящего урона', mode: 'TEAM' }
];

function getAvailablePerksForMode(mode, ownedSet) {
    return PERK_LIST.filter((perk) => {
        if (ownedSet && ownedSet.has(perk.id)) return false;
        if (perk.mode === 'CTF' && mode !== 'CTF') return false;
        if (perk.mode === 'TEAM' && mode === 'DM') return false;
        return true;
    });
}

function pickRandomPerks(mode, owned, count = 3) {
    const pool = getAvailablePerksForMode(mode, new Set(owned || []));
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = pool[i];
        pool[i] = pool[j];
        pool[j] = t;
    }
    return pool.slice(0, count);
}

const Materials = {
    DIRT:   { color: [101, 78, 56],   hardness: 0.0 }, 
    STONE:  { color: [100, 100, 100], hardness: 0.6 }, 
    BEDROCK:{ color: [40, 40, 40],    hardness: 0.95}  
};

const WeaponArt = {
    'blaster': (ctx) => {
        ctx.fillStyle='#2c3e50'; ctx.fillRect(2,-3,14,6);
        ctx.fillStyle='#95a5a6'; ctx.fillRect(4,-4,10,2);
        ctx.fillStyle='#3498db'; ctx.fillRect(12,-2,3,2);
        ctx.fillStyle='#1f2d3a'; ctx.fillRect(4,2,4,3);
    },
    'explosive': (ctx) => {
        ctx.fillStyle='#2c3e50'; ctx.fillRect(0,-5,18,8);
        ctx.fillStyle='#27ae60'; ctx.fillRect(5,-6,8,4);
        ctx.fillStyle='#c0392b'; ctx.fillRect(14,-4,3,6);
        ctx.fillStyle='#34495e'; ctx.fillRect(3,3,5,3);
    },
    'bounce': (ctx) => {
        ctx.fillStyle='#7f8c8d'; ctx.fillRect(2,-4,12,7);
        ctx.fillStyle='#2ecc71'; ctx.beginPath(); ctx.arc(14,0,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#34495e'; ctx.fillRect(3,3,4,3);
    },
    'drill': (ctx) => {
        ctx.fillStyle='#f39c12'; ctx.fillRect(2,-4,9,7);
        ctx.fillStyle='#bdc3c7'; ctx.beginPath(); ctx.moveTo(11,-3); ctx.lineTo(20,0); ctx.lineTo(11,3); ctx.fill();
        ctx.fillStyle='#34495e'; ctx.fillRect(3,3,4,3);
    },
    'energy': (ctx) => {
        ctx.fillStyle='#34495e'; ctx.fillRect(2,-4,12,7);
        ctx.fillStyle='#00ffcc'; ctx.fillRect(4,-3,8,5);
        ctx.fillStyle='#ecf0f1'; ctx.fillRect(5,-4,6,2);
    },
    'molotov': (ctx) => {
        ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(11,1,4.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#e67e22'; ctx.beginPath(); ctx.arc(11,3,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.fillRect(10,-7,2,4);
        ctx.fillStyle='#e74c3c'; ctx.fillRect(10,-9,2,2);
    },
    'blackhole': (ctx) => {
        ctx.fillStyle='#2c3e50'; ctx.fillRect(2,-3,8,6);
        ctx.fillStyle='#8e44ad'; ctx.beginPath(); ctx.arc(12,0,4.5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
    },
    'shotgun': (ctx) => {
        ctx.fillStyle='#7f8c8d'; ctx.fillRect(0,-4,20,7);
        ctx.fillStyle='#2c3e50'; ctx.fillRect(0,3,9,3);
        ctx.fillStyle='#8d6e63'; ctx.fillRect(-2,0,5,3);
    },
    'highspeed': (ctx) => {
        ctx.fillStyle='#34495e'; ctx.fillRect(0,-2,20,4);
        ctx.fillStyle='#000'; ctx.fillRect(5,-5,7,2);
        ctx.fillStyle='#8d6e63'; ctx.fillRect(-2,0,6,3);
    },
    'rapid': (ctx) => {
        ctx.fillStyle='#2c3e50'; ctx.fillRect(0,-5,18,9);
        ctx.fillStyle='#7f8c8d'; ctx.fillRect(12,-4,5,7);
        ctx.fillStyle='#34495e'; ctx.fillRect(3,3,6,3);
    },
    'homing': (ctx) => {
        ctx.fillStyle='#8e44ad'; ctx.fillRect(0,-4,16,7);
        ctx.fillStyle='#f1c40f'; ctx.beginPath(); ctx.arc(12,0,3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#2c3e50'; ctx.fillRect(3,3,5,3);
    },
    'teleport': (ctx) => {
        ctx.fillStyle='#3498db'; ctx.fillRect(0,-4,16,7);
        ctx.fillStyle='#ecf0f1'; ctx.fillRect(11,-3,4,5);
        ctx.fillStyle='#2c3e50'; ctx.fillRect(3,3,5,3);
    },
    'laser': (ctx) => {
        ctx.fillStyle='#e74c3c'; ctx.fillRect(0,-3,18,6);
        ctx.fillStyle='#c0392b'; ctx.fillRect(13,-2,5,4);
        ctx.fillStyle='#2c3e50'; ctx.fillRect(3,3,5,3);
    },
    'nuke': (ctx) => {
        ctx.fillStyle='#2c3e50'; ctx.fillRect(0,-5,18,9);
        ctx.fillStyle='#95a5a6'; ctx.fillRect(4,-7,10,4);
        ctx.fillStyle='#e74c3c'; ctx.fillRect(13,-3,3,6);
    }
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

        if (game.blackHoles && game.blackHoles.length) {
            for (let i = 0; i < game.blackHoles.length; i++) {
                const blackHole = game.blackHoles[i];
                if (distSq(this.pos, blackHole.pos) < 250 * 250) {
                    this.vel = this.vel.add(blackHole.pos.sub(this.pos).normalize().mult(1.5));
                }
            }
        }
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
        this.pool = [];
        this.freeParticles = [];
        this.activeParticles = [];
        this.activeCount = 0;
        for(let i=0; i<CONFIG.MAX_PARTICLES; i++) {
            const particle = new Particle();
            this.pool.push(particle);
            this.freeParticles.push(particle);
        }
    }
    emit(pos, vel, life, color, type) {
        if (this.freeParticles.length === 0) return;
        const particle = this.freeParticles.pop();
        particle.spawn(pos, vel, life, color, type);
        this.activeParticles.push(particle);
        this.activeCount++;
    }
    updateAndDraw(ctx, game) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            particle.update(game);
            if (!particle.active) {
                const lastIdx = this.activeParticles.length - 1;
                this.activeParticles[i] = this.activeParticles[lastIdx];
                this.activeParticles.pop();
                this.activeCount = Math.max(0, this.activeCount - 1);
                this.freeParticles.push(particle);
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
            const nearbyEntities = game.getNearbyEntities(this.pos, 20);
            for (let i = 0; i < nearbyEntities.length; i++) {
                const e = nearbyEntities[i];
                if (!e.dead && e.pos.dist(this.pos) < 20) {
                    e.takeDamage(5, null, game, 'fire'); 
                    game.particleSystem.emit(e.pos.clone(), new Vector2(0,-1), 10, '#fff', 'spark');
                }
            }
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
        const nearbyEntities = game.getNearbyEntities(this.pos, 400);
        for (let i = 0; i < nearbyEntities.length; i++) {
            const e = nearbyEntities[i];
            if (!e.dead) {
                const distSquared = distSq(this.pos, e.pos);
                if (distSquared < 400 * 400) {
                    const dist = Math.sqrt(distSquared);
                    let force = 150 / (dist + 10);
                    let pull = this.pos.sub(e.pos).normalize().mult(force);
                    e.vel = e.vel.add(pull);
                }
            }
        }
        game.crates.forEach(c => {
            if (distSq(this.pos, c.pos) < 400 * 400) {
                c.pos = c.pos.add(this.pos.sub(c.pos).normalize().mult(5));
            }
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
            const blastEntities = game.getNearbyEntities(this.pos, this.radius);
            for (let i = 0; i < blastEntities.length; i++) {
                const ent = blastEntities[i];
                if (this.pos.dist(ent.pos) < this.radius) ent.takeDamage(999, this.ownerId, game, 'blackhole'); 
            }
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
                let safety = 0;
                while (terrain.isSolid(this.pos.x, this.pos.y + this.size/2) && safety < 200) {
                    this.pos.y--;
                    safety++;
                }
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
        this.dirtyCollisionRegions = [];
        this.destructibleClipPath = null;

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
        this.buildDestructibleClipPath();

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

    queueCollisionUpdate(x, y, radius) {
        const startX = Math.max(0, Math.floor(x - radius));
        const endX = Math.min(this.width, Math.ceil(x + radius));
        const startY = Math.max(0, Math.floor(y - radius));
        const endY = Math.min(this.height, Math.ceil(y + radius));
        this.dirtyCollisionRegions.push({ startX, startY, endX, endY });
    }

    flushCollisionUpdates() {
        if (this.dirtyCollisionRegions.length === 0) return;
        let minX = this.width;
        let minY = this.height;
        let maxX = 0;
        let maxY = 0;
        for (let i = 0; i < this.dirtyCollisionRegions.length; i++) {
            const region = this.dirtyCollisionRegions[i];
            minX = Math.min(minX, region.startX);
            minY = Math.min(minY, region.startY);
            maxX = Math.max(maxX, region.endX);
            maxY = Math.max(maxY, region.endY);
        }
        this.dirtyCollisionRegions.length = 0;

        const width = Math.max(0, maxX - minX);
        const height = Math.max(0, maxY - minY);
        if (width === 0 || height === 0) return;

        const dirtyCount = this.dirtyCollisionRegions.length;
        const dirtyArea = width * height;
        const totalArea = this.width * this.height;
        if (dirtyCount > 120 || dirtyArea > totalArea * 0.35) {
            this.updateCollisionData();
            return;
        }

        const regionData = this.ctx.getImageData(minX, minY, width, height).data;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4;
                const destIndex = ((minY + y) * this.width + (minX + x)) * 4;
                this.collisionData[destIndex] = regionData[srcIndex];
                this.collisionData[destIndex + 1] = regionData[srcIndex + 1];
                this.collisionData[destIndex + 2] = regionData[srcIndex + 2];
                this.collisionData[destIndex + 3] = regionData[srcIndex + 3];
            }
        }
    }

    // --- NEW ROBUST CLIPPING LOGIC ---
    buildDestructibleClipPath() {
        const baseW = 500;
        const baseH = this.height - 400;
        const slopeWidth = 600;
        const path = new Path2D();

        path.moveTo(0, 0);
        path.lineTo(this.width, 0);
        if (CONFIG.GAME_MODE !== 'DM') {
            path.lineTo(this.width, baseH);
            path.lineTo(this.width - baseW, baseH);
            path.lineTo(this.width - baseW - slopeWidth, this.height - 100);
            path.lineTo(baseW + slopeWidth, this.height - 100);
            path.lineTo(baseW, baseH);
            path.lineTo(0, baseH);
        } else {
            path.lineTo(this.width, this.height);
            path.lineTo(0, this.height);
        }
        path.closePath();
        this.destructibleClipPath = path;
    }

    clipToDestructible() {
        if (!this.destructibleClipPath) this.buildDestructibleClipPath();
        this.ctx.clip(this.destructibleClipPath);
        return;

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
            
            const dynamicCount = Math.floor(radius * (type === 'nuke' ? 1.6 : 0.9));
            const count = type === 'nuke' ? Math.max(160, Math.min(320, dynamicCount)) : Math.max(40, Math.min(160, dynamicCount));
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

        // 3. COLLISION UPDATE (Batch updates)
        this.queueCollisionUpdate(x, y, radius);
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
        this.ownerCollisionGrace = 6;
        this.bounces = type.bounces || 0;
        if (type.type === 'bounce') this.timer = 180;
        this.trail = []; 
        this.lastDrillDestroyTick = -999;
        this.piercedTargets = new Set();
        this.piercedOnce = false;
    }

    update(terrain, particleSystem, entities, game) {
        if (!this.active) return;
        if (this.ownerCollisionGrace > 0) this.ownerCollisionGrace--;
        
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
            let nearest = null;
            let minDSq = 400 * 400;
            const candidates = game.getNearbyEntities(this.pos, 400);
            for (let i = 0; i < candidates.length; i++) {
                const e = candidates[i];
                if (e.id === this.ownerId || e.dead) continue;
                if (CONFIG.GAME_MODE !== 'DM' && e.team === this.team) continue;
                const d = distSq(this.pos, e.pos);
                if (d < minDSq) { minDSq = d; nearest = e; }
            }
            if (nearest) {
                let dir = nearest.pos.sub(this.pos).normalize().mult(0.3);
                this.vel = this.vel.add(dir);
                if (this.vel.mag() > 5) this.vel = this.vel.normalize().mult(5);
            }
        }

        let trailStride = 3;
        let maxTrail = 10;
        if (this.type.type === 'blaster' || this.type.type === 'rapid') {
            trailStride = 8;
            maxTrail = 0;
        } else if (this.type.type === 'shotgun') {
            trailStride = 4;
            maxTrail = 8;
        }
        if (maxTrail > 0 && game.tick % trailStride === 0) {
            this.trail.push(this.pos.clone());
            if (this.trail.length > maxTrail) this.trail.shift();
        }

        if (this.type.type !== 'energy' && this.type.type !== 'blackhole' && this.type.type !== 'laser' && this.type.type !== 'highspeed' && this.type.type !== 'blaster' && this.type.type !== 'shotgun' && this.type.type !== 'rapid') {
             this.vel = this.vel.mult(CONFIG.PROJECTILE_DRAG);
             this.vel.y += CONFIG.PROJECTILE_GRAVITY;
        } else if (this.type.type === 'blackhole') {
             this.vel = this.vel.mult(0.98); 
             if (this.vel.mag() < 0.3) { this.explode(terrain, particleSystem, game); return; }
        } else if (this.type.type === 'highspeed') {
             this.vel.y += 0.01; 
        }

        let nextPos = this.pos.add(this.vel);
        
        // --- IMPROVED COLLISION: LINE SEGMENT CHECK ---
        let hitEntity = null;
        let closestDist = Infinity;

        const speed = this.vel.mag();
        let raycastStride = 3;
        if (this.type.type === 'highspeed' || this.type.type === 'laser' || speed > 10) {
            raycastStride = 1;
        } else if (speed > 6) {
            raycastStride = 2;
        }
        if (this.type.type === 'blaster' || this.type.type === 'rapid' || this.type.type === 'shotgun') {
            raycastStride = Math.max(raycastStride, 5);
        }
        const shouldRaycast = raycastStride === 1 || (game.tick + this.ownerId) % raycastStride === 0;
        
        // Check against terrain first to prevent shooting through walls
        let hitWall = shouldRaycast ? terrain.raycast(this.pos, nextPos) : false;
        const segmentMid = this.pos.add(nextPos).mult(0.5);
        const segmentRadius = Math.max(60, this.pos.dist(nextPos) / 2 + 30);
        const candidates = game.getNearbyEntities(segmentMid, segmentRadius);
        const shouldCheckEntities = !(this.type.type === 'blaster' || this.type.type === 'rapid') || (game.tick + this.ownerId) % 2 === 0;
        
        if (shouldCheckEntities) {
            for (let i = 0; i < candidates.length; i++) {
                const ent = candidates[i];
                if (ent.dead) continue;
                if (ent.id === this.ownerId && this.ownerCollisionGrace > 0) continue;
                if (CONFIG.GAME_MODE !== 'DM' && ent.team !== 0 && ent.team === this.team) continue;
                if (this.piercedTargets.has(ent.id)) continue;
                
                // Check distance from entity center to the movement segment
                let collisionCenter = ent.pos;
                let hitRadius = this.type.type === 'laser' ? 10 : Math.max(ent.size.x * 0.5, ent.size.y * 0.5);
                if (ent.colliderTop !== undefined && ent.colliderBottom !== undefined && ent.colliderHalfWidth !== undefined) {
                    const verticalShift = (ent.colliderTop - ent.colliderBottom) * 0.35;
                    collisionCenter = ent.pos.add(new Vector2(0, -verticalShift));
                    hitRadius = Math.max(ent.colliderHalfWidth + 3, (ent.colliderTop + ent.colliderBottom) * 0.5);
                }
                let distToTrajectory = distToSegmentSquared(collisionCenter, this.pos, nextPos);
                
                if (distToTrajectory < hitRadius * hitRadius) {
                     // Check if this hit is closer than previous hits
                     let d = distSq(this.pos, ent.pos);
                     if (d < closestDist) {
                         closestDist = d;
                         hitEntity = ent;
                     }
                }
            }
        }

        if (hitEntity && !hitWall) {
             const hitPos = hitEntity.pos.clone().sub(this.vel.normalize().mult(5));
             this.pos = hitPos;
             if (this.tryPierceEntity(hitEntity, game)) {
                 this.pos = nextPos;
                 return;
             }
             if (this.trySplitOnCollision(game, hitPos)) return;
             this.explode(terrain, particleSystem, game);
             return;
        }
        
        // If we didn't hit an entity, check terrain normally or advanced logic
        if (hitWall || terrain.isSolid(nextPos.x, nextPos.y)) {
             this.pos = nextPos;
            if (this.type.type === 'drill') {
                 // Drill logic
                 if (game.tick - this.lastDrillDestroyTick >= 2) {
                     terrain.destroy(nextPos.x, nextPos.y, 8);
                     this.lastDrillDestroyTick = game.tick;
                 }
                 this.vel = this.vel.mult(0.96); 
                 this.pos = nextPos;
                 if(Math.random() < 0.1) particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*2, -2), 10, '#fff', 'spark');
                 if (this.vel.mag() < 0.5) this.explode(terrain, particleSystem, game);
                 return;
             } 
             if (this.type.type === 'teleport') {
                 let owner = game.getEntityById(this.ownerId);
                 if(owner) {
                    owner.pos = this.pos.clone();
                    owner.vel = new Vector2(0,0);
                    particleSystem.emit(owner.pos, new Vector2(0,0), 30, '#0ff', 'glow');
                 }
                 this.active = false;
                 return;
             }

             if (this.trySplitOnCollision(game, this.pos.clone())) return;
             
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
                     this.explode(terrain, particleSystem, game);
                     return;
                 }
                 
                 if (this.type.type !== 'bounce') this.bounces--;
             } else {
                 this.pos = nextPos;
                 this.explode(terrain, particleSystem, game);
             }
        } else {
             this.pos = nextPos;
        }

        if (this.pos.y > CONFIG.WORLD_HEIGHT) {
            this.active = false;
        }
    }


    trySplitOnCollision(game, collisionPos) {
        if (this.type.type !== 'energy' || this.didSplit) return false;
        const owner = game.getEntityById(this.ownerId);
        if (!owner || !owner.perkModifiers || !owner.perkModifiers.plasmaSplit) return false;

        this.didSplit = true;
        this.active = false;
        const spawnPos = collisionPos || this.pos.clone();
        for (let i = 0; i < 2; i++) {
            const spread = i === 0 ? -0.28 : 0.28;
            const rotated = new Vector2(
                this.vel.x * Math.cos(spread) - this.vel.y * Math.sin(spread),
                this.vel.x * Math.sin(spread) + this.vel.y * Math.cos(spread)
            );
            const splitType = { ...this.type };
            const child = new Projectile(spawnPos.clone(), rotated.mult(0.9), splitType, this.ownerId, this.team);
            child.didSplit = true;
            game.projectiles.push(child);
        }
        return true;
    }

    tryPierceEntity(hitEntity, game) {
        if (this.piercedOnce) return false;
        if (this.type.type !== 'highspeed' && this.type.type !== 'laser') return false;
        const owner = game.getEntityById(this.ownerId);
        if (!owner || !owner.perkModifiers || !owner.perkModifiers.pierce) return false;

        let damage = this.type.damage;
        if (owner.damageMultiplier) damage *= owner.damageMultiplier;
        if (owner.getOutgoingDamageMultiplier) damage *= owner.getOutgoingDamageMultiplier(hitEntity, game);
        hitEntity.takeDamage(Math.max(0, damage), this.ownerId, game, this.type.type);
        const pushDir = hitEntity.pos.sub(this.pos).normalize();
        hitEntity.vel = hitEntity.vel.add(pushDir.mult(3.2));

        this.piercedOnce = true;
        this.piercedTargets.add(hitEntity.id);
        return true;
    }

    explode(terrain, particleSystem, game) {
        this.active = false;
        if (this.pos.y > CONFIG.WORLD_HEIGHT) return;

        game.shakeScreen(this.type.damage / 5); 
        if (this.type.damage > 30) game.flashScreen(); 

        if (this.type.type === 'molotov' || (this.type.burn && this.type.burn > 0)) {
             let fireCount = this.type.burn || 10;
             const owner = game.getEntityById(this.ownerId);
             if (owner && owner.perkModifiers) fireCount += owner.perkModifiers.fireTrailBonus;
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
            for(let i=0; i<50; i++) {
                let v = new Vector2((Math.random()-0.5)*15, -Math.random()*20);
                game.particleSystem.emit(this.pos.clone(), v, 100 + Math.random()*50, '#f1c40f', 'fire');
            }
        }

        const owner = game.getEntityById(this.ownerId);
        let effectiveRadius = this.type.radius;
        if (owner && owner.perkModifiers) {
            if (this.type.type === 'explosive') effectiveRadius *= owner.perkModifiers.bazookaRadius;
            if (this.type.type === 'energy' && owner.perkModifiers.plasmaSplit && !this.didSplit) {
                this.didSplit = true;
                for (let i = 0; i < 2; i++) {
                    const spread = (i === 0 ? -0.22 : 0.22);
                    const rotated = new Vector2(this.vel.x * Math.cos(spread) - this.vel.y * Math.sin(spread), this.vel.x * Math.sin(spread) + this.vel.y * Math.cos(spread));
                    const splitType = { ...this.type };
                    const p = new Projectile(this.pos.clone(), rotated.mult(0.85), splitType, this.ownerId, this.team);
                    p.didSplit = true;
                    game.projectiles.push(p);
                }
            }
        }
        if (this.type.type !== 'laser') terrain.destroy(this.pos.x, this.pos.y, effectiveRadius, this.type.type);
        
        const dmgRadius = effectiveRadius + 20;
        const dmgRadiusSq = dmgRadius * dmgRadius;
        let attacker = owner;
        const candidates = game.getNearbyEntities(this.pos, dmgRadius);
        for (let i = 0; i < candidates.length; i++) {
            const ent = candidates[i];
            if (ent.dead) continue;
            if (CONFIG.GAME_MODE !== 'DM' && ent.team !== 0 && ent.team === this.team && ent.id !== this.ownerId) continue;
            const dSq = distSq(this.pos, ent.pos);
            if (dSq < dmgRadiusSq) {
                const d = Math.sqrt(dSq);
                let damage = this.type.damage * (1 - d / dmgRadius);
                if (attacker) {
                    if (attacker.damageMultiplier) damage *= attacker.damageMultiplier;
                    if (attacker.getOutgoingDamageMultiplier) damage *= attacker.getOutgoingDamageMultiplier(ent, game);
                }

                if(this.type.type === 'laser') damage = this.type.damage; 
                const sourceType = this.type.type === 'molotov' ? 'fire' : this.type.type;
                let finalDamage = damage < 0 ? 0 : damage;
                if (attacker && ent.id === attacker.id && (sourceType === 'explosive' || sourceType === 'nuke' || sourceType === 'bounce' || sourceType === 'energy')) {
                    finalDamage *= attacker.perkModifiers.selfExplosiveTaken;
                }
                ent.takeDamage(finalDamage, this.ownerId, game, sourceType);
                let pushDir = ent.pos.sub(this.pos).normalize();
                let pushPower = 4;
                if (attacker && attacker.perkModifiers && this.type.type === 'bounce') pushPower *= attacker.perkModifiers.grenadePush;
                ent.vel = ent.vel.add(pushDir.mult(pushPower)); 
            }
        }

        if (attacker && attacker.perkModifiers && attacker.perkModifiers.pyrokinesis && Math.random() < 0.5 && this.type.type !== 'fire_droplet') {
            game.fires.push(new Fire(this.pos.clone(), 140));
        }

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
            const dir = this.vel.normalize();
            const trailLen = 38;
            const tail = this.pos.sub(dir.mult(trailLen));
            const angle = Math.atan2(dir.y, dir.x);

            ctx.strokeStyle = 'rgba(120, 200, 255, 0.25)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            ctx.strokeStyle = 'rgba(80, 170, 255, 0.7)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            ctx.strokeStyle = '#e6f7ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(this.pos.x, this.pos.y); ctx.stroke();

            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(150, 220, 255, 0.9)';
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(120, 200, 255, 0.9)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
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
        this.size = new Vector2(32, 44); 
        this.colliderHalfWidth = 16;
        this.colliderTop = 42;
        this.colliderBottom = 22;
        this.colliderCornerRadius = 6;
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
        this.perks = [];
        this.perkNextKillThreshold = 4;
        this.perkThresholdStep = 2;
        this.perkChoiceOptions = [];
        this.perkPendingChoice = false;
        this.killImpulseTimer = 0;
        this.berserkTimer = 0;
        this.fragShieldTimer = 0;
        this.regenIdleTimer = 0;
        this.regenPool = 0;
        this.lastWeaponSwitchTick = -9999;
        this.perkModifiers = {
            maxHp: 1,
            explosiveTaken: 1,
            speed: 1,
            jump: 1,
            shotgunSpread: 1,
            lowHpDamage: 1,
            fireTaken: 1,
            selfExplosiveTaken: 1,
            closeDamage: 1,
            farDamage: 1,
            blackholePull: 1,
            bazookaRadius: 1,
            powerupDuration: 1,
            supportTaken: 1,
            courierDamage: 1,
            grenadePush: 1,
            fireTrailBonus: 0,
            pyrokinesis: false,
            plasmaSplit: false,
            pierce: false,
            quickResponse: false
        };
        
        this.respawnTimer = 0; // CTF Individual Timer
    }

    applyBuff(buff) {
        this.buffs = this.buffs.filter(b => b.type !== buff.type);
        this.buffs.push({ ...buff, timeLeft: Math.floor(buff.duration * this.perkModifiers.powerupDuration) });
    }

    hasPerk(id) { return this.perks.includes(id); }

    getMaxHp() { return 100 * this.perkModifiers.maxHp; }

    addPerk(id) {
        if (!id || this.hasPerk(id)) return false;
        this.perks.push(id);
        this.rebuildPerkModifiers();
        return true;
    }

    rebuildPerkModifiers() {
        const m = {
            maxHp: 1, explosiveTaken: 1, speed: 1, jump: 1, shotgunSpread: 1,
            lowHpDamage: 1, fireTaken: 1, selfExplosiveTaken: 1, closeDamage: 1,
            farDamage: 1, blackholePull: 1, bazookaRadius: 1, powerupDuration: 1,
            supportTaken: 1, courierDamage: 1, grenadePush: 1, fireTrailBonus: 0,
            pyrokinesis: false, plasmaSplit: false, pierce: false, quickResponse: false
        };
        for (let i = 0; i < this.perks.length; i++) {
            const id = this.perks[i];
            if (id === 'tenacity') m.maxHp *= 1.1;
            else if (id === 'field_armor') m.explosiveTaken *= 0.9;
            else if (id === 'dash') m.speed *= 1.1;
            else if (id === 'high_jump') m.jump *= 1.15;
            else if (id === 'steady_hand') m.shotgunSpread *= 0.9;
            else if (id === 'combat_instinct') m.lowHpDamage *= 1.2;
            else if (id === 'pyrokinesis') m.pyrokinesis = true;
            else if (id === 'fire_resist') m.fireTaken *= 0.85;
            else if (id === 'sapper') m.selfExplosiveTaken *= 0.85;
            else if (id === 'close_damage') m.closeDamage *= 1.1;
            else if (id === 'far_focus') m.farDamage *= 1.08;
            else if (id === 'plasma_split') m.plasmaSplit = true;
            else if (id === 'tank') { m.explosiveTaken *= 0.8; m.fireTaken *= 0.8; m.speed *= 0.9; }
            else if (id === 'shrapnel') m.grenadePush *= 1.2;
            else if (id === 'fire_trail') m.fireTrailBonus += 2;
            else if (id === 'anti_grav') m.blackholePull *= 0.88;
            else if (id === 'pierce') m.pierce = true;
            else if (id === 'bazooka_radius') m.bazookaRadius *= 1.1;
            else if (id === 'spec_training') m.powerupDuration *= 1.12;
            else if (id === 'quick_response') m.quickResponse = true;
            else if (id === 'ctf_courier') m.courierDamage *= 0.95;
            else if (id === 'support') m.supportTaken *= 0.95;
        }
        this.perkModifiers = m;
        this.hp = Math.min(this.hp, this.getMaxHp());
    }

    hasNearbyAlly(game, radius) {
        if (CONFIG.GAME_MODE === 'DM' || this.team === 0) return false;
        const nearby = game.getNearbyEntities(this.pos, radius);
        for (let i = 0; i < nearby.length; i++) {
            const e = nearby[i];
            if (e !== this && !e.dead && e.team === this.team) return true;
        }
        return false;
    }

    isNearOwnFlag(game, radius) {
        if (CONFIG.GAME_MODE !== 'CTF' || this.team === 0) return false;
        for (let i = 0; i < game.flags.length; i++) {
            const f = game.flags[i];
            if (f.teamId === this.team && distSq(this.pos, f.pos) <= radius * radius) return true;
        }
        return false;
    }

    getOutgoingDamageMultiplier(target, game) {
        let mult = 1;
        if (this.hp < this.getMaxHp() * 0.35) mult *= this.perkModifiers.lowHpDamage;
        if (this.berserkTimer > 0) mult *= 1.1;
        if (target) {
            const dSq = distSq(this.pos, target.pos);
            if (dSq < 120 * 120) mult *= this.perkModifiers.closeDamage;
            if (dSq > 450 * 450) mult *= this.perkModifiers.farDamage;
            if (this.hasPerk('back_strike') && Math.abs(target.vel.x) < 0.08 && Math.abs(target.vel.y) < 0.08) mult *= 1.1;
        }
        if (CONFIG.GAME_MODE === 'CTF' && this.hasPerk('ctf_courier')) {
            for (let i = 0; i < game.flags.length; i++) {
                if (game.flags[i].carrier === this) { mult *= this.perkModifiers.courierDamage; break; }
            }
        }
        return mult;
    }

    onKill(game) {
        if (this.hasPerk('kill_impulse')) this.killImpulseTimer = 300;
        if (this.hasPerk('berserk')) this.berserkTimer = 180;
        if (this.hasPerk('frag_shield')) this.fragShieldTimer = 72;
        if (this.hasPerk('predator')) this.hp = Math.min(this.getMaxHp(), this.hp + 5);
        if (game) game.tryOfferPerk(this);
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

    takeDamage(amount, attackerId, game, sourceType = null) {
        if (this.isShielded || this.dead) return; 
        if (sourceType === 'explosive' || sourceType === 'nuke' || sourceType === 'bounce' || sourceType === 'energy') amount *= this.perkModifiers.explosiveTaken;
        if (sourceType === 'fire') amount *= this.perkModifiers.fireTaken;
        if (this.fragShieldTimer > 0) amount *= 0.8;
        if (this.hasPerk('support') && this.hasNearbyAlly(game, 170)) amount *= this.perkModifiers.supportTaken;
        if (this.hasPerk('ctf_anchor') && this.isNearOwnFlag(game, 220)) amount *= 0.9;
        this.hp -= amount;
        this.regenIdleTimer = 0;
        if (this.hp <= 0 && !this.dead) {
            this.hp = 0; this.dead = true; this.deaths++; this.vel.y = -5;
            
            // CTF Respawn Timer (20 sec)
            if (CONFIG.GAME_MODE === 'CTF') this.respawnTimer = CONFIG.CTF_RESPAWN_TIME;

            for(let i=0; i<30; i++) game.particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*5, (Math.random()-0.5)*5), 60, '#8a0303', 'blood');
            for(let i=0; i<6; i++) game.particleSystem.emit(this.pos.clone(), new Vector2((Math.random()-0.5)*6, -Math.random()*6), 100, '#660000', 'chunk');

            if (attackerId !== undefined && attackerId !== null && attackerId !== this.id) {
                let killer = game.getEntityById(attackerId);
                if (killer) {
                    killer.kills++;
                    killer.onKill(game);
                    // TDM Score logic moved to Round End
                }
            } 
            
            if (this === game.player && attackerId !== undefined && attackerId !== null) {
                const killer = game.getEntityById(attackerId);
                if (killer) game.cameraTarget = killer;
            }
            game.checkWinCondition();
        }
    }

    switchWeapon(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.inventory.length) {
            this.weapon = this.inventory[slotIndex];
            this.weaponIndex = slotIndex;
            this.lastWeaponSwitchTick = gameInstance ? gameInstance.tick : this.lastWeaponSwitchTick;
            return true;
        }
        return false;
    }

    update(terrain, projectiles, crates, game) {
        this.updateBuffs();
        this.animTimer += 0.1;
        if (this.killImpulseTimer > 0) this.killImpulseTimer--;
        if (this.berserkTimer > 0) this.berserkTimer--;
        if (this.fragShieldTimer > 0) this.fragShieldTimer--;
        
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
                let pull = e.pos.sub(this.pos).normalize().mult((200/(this.pos.dist(e.pos)+10))*0.05 * this.perkModifiers.blackholePull);
                this.vel = this.vel.add(pull);
            }
        });

        crates.forEach(c => {
            if (c.active && this.pos.dist(c.pos) < 25) {
                if (c.isMedkit) this.hp = Math.min(this.getMaxHp(), this.hp + 40 * (this.hasPerk('tenacity') ? 1.15 : 1));
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
        let maxSpeed = CONFIG.MAX_SPEED * this.speedMultiplier * this.perkModifiers.speed;
        if (this.killImpulseTimer > 0) maxSpeed *= 1.1;
        if (this.hasPerk('ctf_courier') && CONFIG.GAME_MODE === 'CTF') {
            for (let i = 0; i < game.flags.length; i++) {
                if (game.flags[i].carrier === this) { maxSpeed *= 1.08; break; }
            }
        }
        if (this.input.left) { targetSpeed = -maxSpeed; }
        if (this.input.right) { targetSpeed = maxSpeed; }
        this.facingRight = (this.input.aimTarget.x - this.pos.x) >= 0;
        let accel = this.grounded ? CONFIG.ACCELERATION : CONFIG.ACCELERATION * 0.5;
        this.vel.x += (targetSpeed - this.vel.x) * accel;
        if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
        if (this.input.jump && this.grounded) {
            this.vel.y = -CONFIG.JUMP_FORCE * this.jumpMultiplier * this.perkModifiers.jump; this.grounded = false; this.pos.y -= 2;
        }
        this.vel.y += CONFIG.GRAVITY;

        // Collision
        let nextX = this.pos.x + this.vel.x;
        let hw = this.colliderHalfWidth;
        let topExtent = this.colliderTop;
        let bottomExtent = this.colliderBottom;
        let cornerRadius = this.colliderCornerRadius;
        let topY = this.pos.y - topExtent + 2;
        let midY = this.pos.y;
        let lowerSideY = this.pos.y + bottomExtent - cornerRadius - 1;
        let sideOffset = this.vel.x > 0 ? hw : -hw;
        if (
            terrain.isSolid(nextX + sideOffset, topY) ||
            terrain.isSolid(nextX + sideOffset, midY) ||
            terrain.isSolid(nextX + sideOffset, lowerSideY)
        ) {
             let climbed = false;
             if (this.grounded) {
                 for(let s=1; s<=5; s++) {
                     if (
                        !terrain.isSolid(nextX + sideOffset, lowerSideY - s) &&
                        !terrain.isSolid(nextX, this.pos.y - s - topExtent)
                     ) {
                         this.pos.y -= s; climbed = true; break;
                     }
                 }
             }
             if (!climbed) { this.vel.x = 0; nextX = this.pos.x; }
        }
        this.pos.x = nextX;
        
        let nextY = this.pos.y + this.vel.y;
        const footProbeOffset = Math.max(2, hw - cornerRadius);
        const footProbeBlocked = (yPos) => (
            terrain.isSolid(this.pos.x, yPos) ||
            terrain.isSolid(this.pos.x - footProbeOffset, yPos) ||
            terrain.isSolid(this.pos.x + footProbeOffset, yPos)
        );
        const topProbeOffset = Math.max(2, hw - 2);
        const topBlocked = (yPos) => (
            terrain.isSolid(this.pos.x, yPos) ||
            terrain.isSolid(this.pos.x - topProbeOffset, yPos) ||
            terrain.isSolid(this.pos.x + topProbeOffset, yPos)
        );
        if (this.vel.y < 0 && topBlocked(nextY - topExtent)) { this.vel.y = 0; nextY = this.pos.y; }
        if (this.vel.y >= 0 && footProbeBlocked(nextY + bottomExtent)) {
            this.grounded = true; this.vel.y = 0;
            let t = nextY;
            let safety = 0;
            while (footProbeBlocked(t + bottomExtent) && safety < 400) {
                t--;
                safety++;
            }
            nextY = t;
        } else { this.grounded = false; }
        this.pos.y = nextY;
        
        if (this.pos.x < hw) this.pos.x = hw; if (this.pos.x > CONFIG.WORLD_WIDTH - hw) this.pos.x = CONFIG.WORLD_WIDTH - hw;

        // Shooting
        if (this.input.shoot) {
            if (this.weapon.chargeable) {
                if (!this.cooldown || this.cooldown <= 0) {
                    this.isCharging = true;
                    if (this.charge < CONFIG.MAX_CHARGE) this.charge += CONFIG.CHARGE_RATE;
                }
            } else if (!this.cooldown || this.cooldown <= 0) {
                this.fire(game);
                this.cooldown = this.weapon.cooldown;
            }
        } else {
            if (this.isCharging) {
                if (!this.cooldown || this.cooldown <= 0) {
                    this.fire(game);
                    this.cooldown = this.weapon.cooldown || 20; 
                }
                this.charge = 0; this.isCharging = false;
            }
        }
        if (this.cooldown > 0) this.cooldown--;
        this.regenIdleTimer++;
        if (this.hasPerk('regen_window') && this.regenIdleTimer > 360 && this.regenPool < 50 && this.hp < this.getMaxHp() && game.tick % 60 === 0) {
            this.hp = Math.min(this.getMaxHp(), this.hp + 1);
            this.regenPool++;
        }
    }

    fire(game) {
        let power = (this.charge / CONFIG.MAX_CHARGE) * 10 + 5; 
        if (!this.weapon.chargeable) power = 12;
        let dir = this.input.aimTarget.sub(this.pos).normalize();
        const muzzlePos = this.getMuzzlePosition(dir);

        if (this.weapon.type === 'shotgun') {
            for(let i=0; i<5; i++) {
                let spread = new Vector2(dir.y, -dir.x).mult((Math.random()-0.5)*0.5 * this.perkModifiers.shotgunSpread);
                let p = new Projectile(muzzlePos.clone(), dir.add(spread).normalize().mult(power), this.weapon, this.id, this.team);
                game.projectiles.push(p);
            }
        } else if (this.weapon.type === 'laser') {
             let p = new Projectile(muzzlePos.clone(), dir.mult(power*2), this.weapon, this.id, this.team);
             game.projectiles.push(p);
        } else {
            let p = new Projectile(muzzlePos.clone(), dir.mult(power), this.weapon, this.id, this.team);
            game.projectiles.push(p);
        }
    }

    getMuzzlePosition(dir) {
        const muzzleForward = 20;
        const muzzleUp = -4;
        const right = dir.normalize();
        const up = new Vector2(-right.y, right.x);
        return this.pos.add(right.mult(muzzleForward)).add(up.mult(muzzleUp));
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        const aimFacingRight = (this.input.aimTarget.x - this.pos.x) >= 0;
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
                   ctx.fillRect(aimFacingRight ? -20 : 10, -10, 15, 2);
                   ctx.fillRect(aimFacingRight ? -25 : 15, 0, 10, 2);
                }
            }
        });

        // Name
        let nameColor = 'white';
        if (CONFIG.GAME_MODE !== 'DM' && this.team !== 0) {
            nameColor = TEAMS[this.team]?.color || 'white';
        }
        ctx.fillStyle = nameColor; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.name, 0, -38);
        ctx.fillStyle = '#333'; ctx.fillRect(-15, -35, 30, 4);
        ctx.fillStyle = this.hp > 50 ? '#2ecc71' : '#e74c3c'; ctx.fillRect(-15, -35, 30 * (this.hp / 100), 4);

        const detailScale = 1.2;
        if (!aimFacingRight) ctx.scale(-detailScale, detailScale);
        else ctx.scale(detailScale, detailScale);
        const isMoving = Math.abs(this.vel.x) > 0.1;
        const walkCycle = isMoving ? Math.sin(this.animTimer * 2) * 4 : 0;
        const breathe = Math.sin(this.animTimer * 0.5);

        const bootsImg = getBootsImage();
        if (bootsImg && bootsImg.complete && bootsImg.naturalWidth > 0) {
            const bootW = 10;
            const bootH = 11;
            const leftX = -7 + walkCycle;
            const rightX = 1 - walkCycle;
            const footY = 6;

            // По умолчанию отражаем ботинок по горизонтали
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(bootsImg, -leftX - bootW, footY, bootW, bootH);
            ctx.drawImage(bootsImg, -rightX - bootW, footY, bootW, bootH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#34495e';
            ctx.beginPath(); ctx.ellipse(-2.5 + walkCycle, 12, 4, 5, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(2.5 - walkCycle, 12, 4, 5, 0, 0, Math.PI*2); ctx.fill();
        }

        ctx.translate(0, breathe);
        const cosmetics = this.cosmetics || defaultCosmetics();

        const bodyImg = getBodyImage(cosmetics.body);
        if (bodyImg && bodyImg.complete && bodyImg.naturalWidth > 0) {
            const bodyWidth = 28;
            const bodyHeight = 27;
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(bodyImg, -bodyWidth / 2, -17, bodyWidth, bodyHeight);
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.roundRect(-8, -10, 16, 20, 6); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-6, -8, 12, 14);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-7, -9, 5, 7);
        }

        const headImg = getHeadImage(cosmetics.head);
        if (headImg && headImg.complete && headImg.naturalWidth > 0) {
            const headSize = 32;
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(headImg, -headSize / 2, -34, headSize, headSize);
            ctx.restore();
        } else {
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(0, -24, 11, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(1, -22, 5, 2);
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
        this.blackHoles = [];
        this.selectedPerkId = null;
        this.entityGrid = new SpatialGrid(CONFIG.SPATIAL_GRID_SIZE, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.entityById = new Map();
        
        this.particleSystem = new ParticleSystem();
        this.background = new BackgroundGenerator(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.noiseCanvas = document.createElement('canvas');
        this.noiseCtx = this.noiseCanvas.getContext('2d');
        this.noisePattern = null;
        this.vignetteCanvas = document.createElement('canvas');
        this.vignetteCtx = this.vignetteCanvas.getContext('2d');
        
        this.roundOver = false;
        this.lastHpUiValue = -1;
        this.dom = {
            hpDisplay: document.getElementById('hp-display'),
            statsBody: document.getElementById('stats-body'),
            ctfRespawnTimer: document.getElementById('ctf-respawn-timer'),
            respawnTimeVal: document.getElementById('respawn-time-val'),
            scoreBlue: document.getElementById('score-blue'),
            scoreRed: document.getElementById('score-red')
        };

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
        const perkConfirmBtn = document.getElementById('perk-confirm');
        if (perkConfirmBtn) {
            perkConfirmBtn.addEventListener('click', () => this.applySelectedPerk());
        }
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
        
        const playerColor = CONFIG.GAME_MODE === 'DM' ? DEFAULT_PLAYER_COLOR : TEAMS[pTeam].color;
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
            const botColor = team === 0 ? botVisual.color : TEAMS[team].color;
            this.entities.push(new Bot(bx, by, botId, name, team, botColor, botVisual.cosmetics));
        }
        this.botCosmeticsInitialized = true;
        
        for(let i=0; i<8; i++) this.spawnCrate();

        this.gameState = 'PLAYING';
        this.paused = false;
        document.getElementById('start-screen').style.display = 'none'; 
        document.getElementById('ui-layer').style.display = 'flex';
        document.getElementById('perk-choice').style.display = 'none';
        document.getElementById('frag-goal-display').innerText = CONFIG.WIN_LIMIT;
        document.getElementById('team-hud').style.display = CONFIG.GAME_MODE === 'DM' ? 'none' : 'flex';
        
        // Hide/Show timer based on mode (Only shows during death now in CTF)
        if (this.dom.ctfRespawnTimer) this.dom.ctfRespawnTimer.style.display = 'none';
        
        if (this.dom.scoreBlue) this.dom.scoreBlue.innerText = "0";
        if (this.dom.scoreRed) this.dom.scoreRed.innerText = "0";
        
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
        if (this.dom.scoreBlue) this.dom.scoreBlue.innerText = this.scores[1];
        if (this.dom.scoreRed) this.dom.scoreRed.innerText = this.scores[2];
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
        ent.hp = ent.getMaxHp();
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
        const timer = this.dom.ctfRespawnTimer;
        if (!timer) return;
        if (CONFIG.GAME_MODE === 'CTF' && this.player && this.player.dead) {
             timer.style.display = 'block';
             const respawnVal = this.dom.respawnTimeVal;
             if (respawnVal) {
                 respawnVal.innerText = Math.ceil(this.player.respawnTimer / 60);
             }
        } else {
             timer.style.display = 'none';
        }
    }

    getNearbyEntities(pos, radius) {
        if (!this.entityGrid) return this.aliveEntities;
        return this.entityGrid.queryRadius(pos, radius);
    }

    getEntityById(id) {
        return this.entityById.get(id) || null;
    }

    shakeScreen(amount) { this.shake = amount; }
    flashScreen() { this.flash = 10; }
    
    updateInventoryUI() {
        let container = document.getElementById('inventory-container'); container.innerHTML = '';
        for(let i=0; i<CONFIG.MAX_INVENTORY; i++) {
            let div = document.createElement('div'); div.className = 'inv-slot locked';
            const keySpan = document.createElement('span');
            keySpan.className = 'slot-key';
            keySpan.textContent = `${i + 1}`;
            div.appendChild(keySpan);
            if (i < this.player.inventory.length) {
                let w = this.player.inventory[i];
                div.className = 'inv-slot' + (this.player.weaponIndex === i ? ' active' : '');
                const iconWrap = document.createElement('div');
                iconWrap.className = 'slot-icon';
                iconWrap.style.color = w.color;
                const iconImg = document.createElement('img');
                iconImg.className = 'slot-icon-img';
                iconImg.src = `Assets/Images/WeaponIcons/${w.type}.jpg`;
                iconImg.alt = w.name;
                iconWrap.appendChild(iconImg);
                div.appendChild(iconWrap);
                const nameLabel = document.createElement('div');
                nameLabel.className = 'slot-name';
                nameLabel.textContent = w.name;
                div.appendChild(nameLabel);
                div.onclick = () => { this.player.switchWeapon(i); this.updateInventoryUI(); };
            }
            container.appendChild(div);
        }
    }

    tryOfferPerk(ent) {
        if (!ent || ent.dead || ent.perkPendingChoice) return;
        if (ent.kills < ent.perkNextKillThreshold) return;
        const options = pickRandomPerks(CONFIG.GAME_MODE, ent.perks, 3);
        if (!options.length) return;
        ent.perkChoiceOptions = options;
        ent.perkPendingChoice = true;
        ent.perkNextKillThreshold += ent.perkThresholdStep;

        if (ent === this.player) {
            this.showPerkChoice(options);
        } else {
            const pick = options[Math.floor(Math.random() * options.length)];
            if (pick) ent.addPerk(pick.id);
            ent.perkPendingChoice = false;
            ent.perkChoiceOptions = [];
        }
    }

    showPerkChoice(options) {
        const wrap = document.getElementById('perk-choice');
        const list = document.getElementById('perk-options');
        const confirm = document.getElementById('perk-confirm');
        if (!wrap || !list || !confirm) return;

        this.selectedPerkId = options[0] ? options[0].id : null;
        list.innerHTML = '';
        for (let i = 0; i < options.length; i++) {
            const perk = options[i];
            const btn = document.createElement('button');
            btn.className = 'btn-main perk-option-btn';
            btn.innerHTML = `${perk.name}<br><small>${perk.desc}</small>`;
            if (i === 0) btn.classList.add('active');
            btn.addEventListener('click', () => {
                this.selectedPerkId = perk.id;
                const children = list.children;
                for (let j = 0; j < children.length; j++) children[j].classList.remove('active');
                btn.classList.add('active');
                this.applySelectedPerk();
            });
            list.appendChild(btn);
        }
        wrap.style.display = 'flex';
    }

    applySelectedPerk() {
        if (!this.player || !this.player.perkPendingChoice) return;
        const options = this.player.perkChoiceOptions || [];
        let perk = options.find(p => p.id === this.selectedPerkId) || options[0];
        if (!perk) return;
        this.player.addPerk(perk.id);
        this.player.perkPendingChoice = false;
        this.player.perkChoiceOptions = [];
        this.selectedPerkId = null;
        const wrap = document.getElementById('perk-choice');
        if (wrap) wrap.style.display = 'none';
    }
    
    loop() {
        try {
            if (this.gameState === 'PLAYING' && !this.gameOver && !this.paused) {
                this.update();
            }
            this.draw();
        } catch (err) {
            console.error('Game loop error:', err);
        } finally {
            requestAnimationFrame(() => this.loop());
        }
    }

    update() {
        this.tick++; 
        
        // --- IMPROVED CTF LOOT SPAWNING ---
        let spawnChance = (CONFIG.GAME_MODE === 'CTF') ? 0.008 : 0.003;
        if (Math.random() < spawnChance) this.spawnCrate();

        this.input.mouse.worldPos = this.input.mouse.screenPos.add(this.camera);
        this.updateWaveRespawn();

        this.aliveEntities.length = 0;
        this.entityById.clear();
        this.activeCrates.length = 0;
        this.medkits.length = 0;
        this.weaponCrates.length = 0;
        for (let i = 0; i < this.entities.length; i++) {
            const ent = this.entities[i];
            this.entityById.set(ent.id, ent);
            if (!ent.dead) this.aliveEntities.push(ent);
        }
        for (let i = 0; i < this.crates.length; i++) {
            const crate = this.crates[i];
            if (!crate.active) continue;
            this.activeCrates.push(crate);
            if (crate.isMedkit) this.medkits.push(crate);
            if (crate.crateType === 'weapon') this.weaponCrates.push(crate);
        }
        this.entityGrid.clear();
        for (let i = 0; i < this.aliveEntities.length; i++) {
            this.entityGrid.insert(this.aliveEntities[i]);
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
            let p = this.projectiles[i]; p.update(this.terrain, this.particleSystem, this.aliveEntities, this); 
            if (!p.active) this.projectiles.splice(i, 1); 
        }
        if (this.tick % CONFIG.COLLISION_BATCH_TICKS === 0) {
            this.terrain.flushCollisionUpdates();
        }
        this.fires = this.fires.filter(f => f.update(this));
        this.effects = this.effects.filter(f => f.update(this));
        this.blackHoles.length = 0;
        for (let i = 0; i < this.effects.length; i++) {
            const effect = this.effects[i];
            if (effect instanceof BlackHoleEffect) this.blackHoles.push(effect);
        }
        
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
        
        if (this.statsVisible && (this.statsDirty || this.tick % 20 === 0)) {
            let html = '';
            const sortedEntities = [...this.entities].sort((a,b)=>b.kills-a.kills);
            sortedEntities.forEach(e => {
                let cls = e.team === 1 ? 'row-blue' : (e.team === 2 ? 'row-red' : '');
                if (e === this.player) cls += ' row-me';
                html += `<tr class="${cls}"><td>${e.name}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${TEAMS[e.team].name}</td></tr>`;
            });
            const statsBody = this.dom.statsBody;
            if (statsBody) statsBody.innerHTML = html;
            this.statsDirty = false;
        }
        const hpDisplay = this.dom.hpDisplay;
        if (hpDisplay && this.player) {
            const hpVal = Math.floor(this.player.hp);
            if (hpVal !== this.lastHpUiValue) {
                hpDisplay.innerText = hpVal;
                this.lastHpUiValue = hpVal;
            }
        }
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

        for (let i = 0; i < this.bases.length; i++) this.bases[i].draw(this.ctx);
        for (let i = 0; i < this.flags.length; i++) this.flags[i].draw(this.ctx);
        for (let i = 0; i < this.crates.length; i++) { const c = this.crates[i]; if (inView(c)) c.draw(this.ctx); }
        for (let i = 0; i < this.fires.length; i++) { const f = this.fires[i]; if (inView(f)) f.draw(this.ctx); }
        for (let i = 0; i < this.effects.length; i++) { const f = this.effects[i]; if (inView(f)) f.draw(this.ctx); else if (!f.pos) f.draw(this.ctx); }
        for (let i = 0; i < this.entities.length; i++) { const e = this.entities[i]; if (inView(e)) e.draw(this.ctx); }
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];
            if (inView(p)) p.draw(this.ctx);
        }
        this.particleSystem.updateAndDraw(this.ctx, this);
        
        if (this.gameState === 'PLAYING' && this.player && !this.player.dead && !this.paused) {
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
    const cosmetics = { ...defaultCosmetics(), ...(gameInstance?.playerCosmetics || {}) };
    if (gameInstance) {
        gameInstance.playerCosmetics = { ...cosmetics };
    }
    const headSelect = document.getElementById('player-head-select');
    const bodySelect = document.getElementById('player-body-select');
    const lobbyName = document.getElementById('lobby-nickname-input');
    if (lobbyName) lobbyName.value = document.getElementById('nickname-input')?.value || '';
    populateCosmeticsSelects();
    if (headSelect) headSelect.value = cosmetics.head;
    if (bodySelect) bodySelect.value = cosmetics.body;
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
    const headSelect = document.getElementById('player-head-select');
    const bodySelect = document.getElementById('player-body-select');
    if (headSelect) cosmetics.head = headSelect.value;
    if (bodySelect) cosmetics.body = bodySelect.value;
    return cosmetics;
}

function startGameFromLobby() {
    const lobbyName = document.getElementById('lobby-nickname-input');
    const startName = document.getElementById('nickname-input');
    if (lobbyName && startName) startName.value = lobbyName.value.trim();
    closeLobby();
    startGame();
}

function populateCosmeticsSelects() {
    const headSelect = document.getElementById('player-head-select');
    const bodySelect = document.getElementById('player-body-select');
    const cosmetics = getPlayerCosmeticsFromUI(gameInstance?.playerCosmetics);
    if (headSelect && headSelect.options.length === 0) {
        COSMETICS.heads.forEach(opt => headSelect.add(new Option(opt.label, opt.id)));
        headSelect.value = cosmetics.head;
    }
    if (bodySelect && bodySelect.options.length === 0) {
        COSMETICS.bodies.forEach(opt => bodySelect.add(new Option(opt.label, opt.id)));
        bodySelect.value = cosmetics.body;
    }
    if (headSelect) headSelect.value = cosmetics.head || headSelect.value;
    if (bodySelect) bodySelect.value = cosmetics.body || bodySelect.value;
}

function updateLobbyPreview() {
    const canvas = document.getElementById('lobby-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = DEFAULT_PLAYER_COLOR;
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
