import {
    Color,
    Label,
    Node,
    Sprite,
    SpriteAtlas,
    SpriteFrame,
    UITransform,
} from 'cc';
import { GameState } from '../core/GameState';
import { ResourceManager, WorldMapData } from '../core/ResourceManager';
import { UiHelper } from '../core/UiHelper';
import { VfxManager } from '../combat/VfxManager';
import { Pathfinder, TILE_SIZE } from '../world/Pathfinder';

export interface YSortableItem {
    node: Node;
    getSortY: () => number;
}

/**
 * Sinh vật cảnh quan (Gà, Ngựa Vàng, Chó Làng, Ổ Gà) - Thuần Sprite
 */
export class CritterEntity implements YSortableItem {
    public node: Node;
    public x: number;
    public y: number;
    private _homeX: number;
    private _homeY: number;
    private _def: any;
    private _sprite: Sprite | null = null;
    private _frames: SpriteFrame[] = [];
    private _state: 'idle' | 'walk' = 'idle';
    private _timer: number = 1;
    private _animT: number = 0;
    private _targetX: number = 0;
    private _targetY: number = 0;
    private _flipX: boolean = false;
    private _running: boolean = false;
    private _eggNode: Node | null = null;
    private _eggTimer: number = 0;

    constructor(parent: Node, spawn: { id: string; type: string; x: number; y: number }, def: any) {
        this.x = spawn.x;
        this.y = spawn.y;
        this._homeX = spawn.x;
        this._homeY = spawn.y;
        this._def = def;

        const spDef = def?.sprite || { dw: 28, dh: 24, ax: 14, ay: 22 };
        const dw = spDef.dw || spDef.w || 28;
        const dh = spDef.dh || spDef.h || 24;
        const ax = Math.max(0, Math.min(1, (spDef.ax ?? dw * 0.5) / dw));
        const ay = Math.max(0, Math.min(1, (dh - (spDef.ay ?? dh - 2)) / dh));

        this.node = UiHelper.createNode(`Critter_${spawn.id}`, parent, dw, dh, 0.5, 0);
        this.node.setPosition(this.x, -this.y, 0);

        if (!def?.noShadow) {
            const shW = (def?.shadowW || 7) * 2.1;
            const sh = UiHelper.createIconNode('Shadow', this.node, UiHelper.skin('shadow_oval'), shW, Math.max(5, shW * 0.34));
            sh.node.setPosition(0, 1, 0);
        }

        const bodyNode = UiHelper.createNode('Body', this.node, dw, dh, ax, ay);
        this._sprite = bodyNode.addComponent(Sprite);
        this._sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._sprite.trim = false;

        ResourceManager.loadCritterFrames(spawn.type, spDef).then((frames) => {
            if (!this.node.isValid) return;
            this._frames = frames;
            if (frames.length > 0 && this._sprite) {
                const initSeq: number[] = spDef.idleSeq || [0];
                this._sprite.spriteFrame = frames[initSeq[0] || 0] || frames[0];
            }
        });

        if (def?.egg) {
            const ew = def.egg.dw || 30;
            const eh = def.egg.dh || 22;
            const eggNode = UiHelper.createNode('NestEggs', this.node, ew, eh, ax, ay);
            const eggSp = eggNode.addComponent(Sprite);
            eggSp.sizeMode = Sprite.SizeMode.CUSTOM;
            eggSp.trim = false;
            eggNode.active = false;
            this._eggNode = eggNode;
            this._eggTimer = 4 + Math.random() * 8;
            ResourceManager.loadCritterFrames('chicken_eggs', { w: def.egg.w || 60, h: def.egg.h || 44, frames: 1 }).then((ef) => {
                if (eggNode.isValid && ef[0]) {
                    eggSp.spriteFrame = ef[0];
                }
            });
        }

        this._animT = Math.random() * 4.0;
        this._timer = 0.6 + Math.random() * 2.0;
    }

    public getSortY(): number {
        return this.y;
    }

    public update(dt: number, map: WorldMapData): void {
        if (this._def?.stationary) {
            if (this._eggNode) {
                this._eggTimer -= dt;
                if (this._eggTimer <= 0) {
                    this._eggNode.active = !this._eggNode.active;
                    this._eggTimer = this._eggNode.active
                        ? (this._def.eggShowMin || 7) + Math.random() * 5
                        : (this._def.eggDelayMin || 10) + Math.random() * 8;
                }
            }
            return;
        }
        if (this._frames.length === 0) return;
        this._animT += dt;
        this._timer -= dt;

        const spDef = this._def.sprite || {};
        if (this._state === 'idle') {
            const seq: number[] = spDef.idleSeq || [0];
            const fps = spDef.idleFps || 3;
            const idx = seq[Math.floor(this._animT * fps) % seq.length] || 0;
            if (this._sprite && this._frames[idx]) {
                this._sprite.spriteFrame = this._frames[idx];
            }
            if (this._timer <= 0) {
                const roam = (this._def.roamTiles || 4) * TILE_SIZE;
                const ang = Math.random() * Math.PI * 2;
                const r = 16 + Math.random() * roam;
                const nx = this._homeX + Math.cos(ang) * r;
                const ny = this._homeY + Math.sin(ang) * r;
                if (!Pathfinder.rectBlocked(map, nx - 5, ny - 5, nx + 5, ny, false)) {
                    this._targetX = nx;
                    this._targetY = ny;
                    this._state = 'walk';
                    this._running = Math.random() < 0.38;
                    this._timer = 2.6;
                    this._animT = 0;
                } else {
                    this._timer = 0.8 + Math.random();
                }
            }
        } else {
            const dx = this._targetX - this.x;
            const dy = this._targetY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 4 || this._timer <= 0) {
                this._state = 'idle';
                this._running = false;
                this._timer = (this._def.pauseMin || 0.6) + Math.random() * ((this._def.pauseMax || 2.0) - (this._def.pauseMin || 0.6));
                this._animT = 0;
            } else {
                const baseSpd = this._def.speed || 22;
                const spd = baseSpd * (this._running && this._def.runMult ? this._def.runMult : 1);
                const step = Math.min(dist, spd * dt);
                const mx = (dx / dist) * step;
                const my = (dy / dist) * step;
                if (!Pathfinder.rectBlocked(map, this.x + mx - 5, this.y + my - 5, this.x + mx + 5, this.y + my, false)) {
                    this.x += mx;
                    this.y += my;
                    this.node.setPosition(this.x, -this.y, 0);
                } else {
                    this._state = 'idle';
                    this._timer = 0.8;
                }
                if (Math.abs(dx) > 0.5) {
                    this._flipX = dx < 0;
                    this._sprite?.node.setScale(this._flipX ? -1 : 1, 1, 1);
                }
                const walkCount = Math.min(this._frames.length, spDef.walkFrames || spDef.frames || 4);
                const fps = (spDef.fps || 8) * (this._running && spDef.runFps ? spDef.runFps : 1);
                const fIdx = Math.floor(this._animT * fps) % walkCount;
                if (this._sprite && this._frames[fIdx]) {
                    this._sprite.spriteFrame = this._frames[fIdx];
                }
            }
        }
    }
}

/**
 * Quái vật & Boss Tam Giới - Thuần Sprite (Shadow, Telegraph, Body, Overhead Sprite HP Bar)
 */
export class EnemyEntity implements YSortableItem {
    public id: string;
    public type: string;
    public def: any;
    public node: Node;

    public x: number;
    public y: number;
    public homeX: number;
    public homeY: number;

    public hp: number;
    public hpMax: number;
    public dead: boolean = false;
    public respawnTimer: number = 0;
    public isBoss: boolean = false;

    private _state: 'idle' | 'wander' | 'chase' | 'telegraph' | 'return' = 'idle';
    private _stateTimer: number = 1;
    private _animT: number = 0;
    private _attackCd: number = 0;
    private _telegraphT: number = 0;
    private _provokedTimer: number = 0;
    private _hurtFlashT: number = 0;
    private _slowT: number = 0;
    private _stunT: number = 0;
    private _burnT: number = 0;
    private _burnDps: number = 0;
    private _burnTick: number = 0;
    private _bossSkillCd: number = 6;

    private _wanderX: number = 0;
    private _wanderY: number = 0;

    private _bodyNode: Node;
    private _sprite: Sprite;
    private _hpBarNode: Node;
    private _hpFillNode: Node;
    private _hpFillSprite: Sprite;
    private _teleNode: Node;
    private _teleSprite: Sprite;
    private _frames: SpriteFrame[] = [];
    private _isHumanSheet: boolean = false;
    private _atlasPrefix: string = '';
    private _atlas: SpriteAtlas | null = null;
    private _dir: number = 0;

    constructor(
        parent: Node,
        spawn: { id?: string; type: string; tx?: number; ty?: number; x?: number; y?: number },
        idx: number
    ) {
        this.type = spawn.type;
        this.id = spawn.id || `${spawn.type}_${idx}`;
        const rawDef = ResourceManager.enemies[this.type] || {
            name: this.type,
            level: 1,
            hp: 20,
            exp: 6,
            speed: 38,
            aggro: 95,
            contactDmg: 5,
            hitCooldown: 1.0,
        };
        this.def = rawDef;
        this.isBoss = !!rawDef.isBoss || (rawDef.hp || 0) >= 2500;

        const sx = spawn.x !== undefined ? spawn.x : (spawn.tx || 10) * TILE_SIZE + TILE_SIZE * 0.5;
        const sy = spawn.y !== undefined ? spawn.y : (spawn.ty || 10) * TILE_SIZE + TILE_SIZE - 4;
        this.x = sx;
        this.y = sy;
        this.homeX = sx;
        this.homeY = sy;

        this.hpMax = Math.max(5, Number(rawDef.hp || 20));
        this.hp = this.hpMax;

        const spCfg = rawDef.sprite || { w: 48, h: 48, ax: 24, ay: 44 };
        const w = spCfg.w || (this.isBoss ? 96 : 44);
        const h = spCfg.h || (this.isBoss ? 96 : 44);
        const ax = (spCfg.ax ?? w * 0.5) / w;
        const ay = Math.max(0, Math.min(1, (h - (spCfg.ay ?? h - 4)) / h));

        this.node = UiHelper.createNode(`Mob_${this.id}`, parent, w, h, 0.5, 0);
        this.node.setPosition(this.x, -this.y, 0);

        const shRx = rawDef.shadow?.rx || (this.isBoss ? 26 : 12);
        const shRy = rawDef.shadow?.ry || (this.isBoss ? 8 : 4);
        UiHelper.createIconNode('Shadow', this.node, UiHelper.skin('shadow_oval'), shRx * 2, shRy * 2);

        const hitR = Number(rawDef.hitRadius || (this.isBoss ? 42 : 28));
        const tele = UiHelper.createIconNode('Telegraph', this.node, UiHelper.skin('target_ring'), hitR * 2, hitR * 1.15);
        this._teleNode = tele.node;
        this._teleSprite = tele.sprite;
        this._teleSprite.color = new Color(235, 55, 45, 195);
        this._teleNode.active = false;

        this._bodyNode = UiHelper.createNode('Body', this.node, w, h, ax, ay);
        this._sprite = this._bodyNode.addComponent(Sprite);
        this._sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._sprite.trim = false;

        // Overhead Sprite HP Bar & Name
        const barY = (rawDef.barY || h) + 6;
        const bw = this.isBoss ? 68 : 38;
        const bh = this.isBoss ? 8 : 6;
        this._hpBarNode = UiHelper.createNode('HpBar', this.node, bw, bh);
        this._hpBarNode.setPosition(0, barY, 0);
        const trackSp = this._hpBarNode.addComponent(Sprite);
        trackSp.sizeMode = Sprite.SizeMode.CUSTOM;
        trackSp.trim = false;
        const trackSf = UiHelper.skin('bar_track');
        trackSp.spriteFrame = trackSf;
        trackSp.type = trackSf ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;

        this._hpFillNode = UiHelper.createNode('HpFill', this._hpBarNode, bw - 2, bh - 2, 0, 0.5);
        this._hpFillNode.setPosition(-(bw - 2) * 0.5, 0, 0);
        this._hpFillSprite = this._hpFillNode.addComponent(Sprite);
        this._hpFillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._hpFillSprite.trim = false;
        const fillSf = UiHelper.skin(this.isBoss ? 'bar_gold' : 'bar_hp');
        this._hpFillSprite.spriteFrame = fillSf;
        if (fillSf) {
            this._hpFillSprite.type = Sprite.Type.FILLED;
            this._hpFillSprite.fillType = Sprite.FillType.HORIZONTAL;
            this._hpFillSprite.fillStart = 0;
            this._hpFillSprite.fillRange = 1;
        }

        const titleColor = this.isBoss ? '#ffd26a' : (rawDef.aggro > 0 ? '#ffad99' : '#d6e8c4');
        const cleanMobName = String(rawDef.name || this.type).replace(/\s*[\u00B7\u2014\u2013]\s*/g, ' - ');
        const nameLbl = UiHelper.createLabel(
            'MobName',
            this._hpBarNode,
            this.isBoss ? `[Thủ Lĩnh] ${cleanMobName}` : cleanMobName,
            {
                size: this.isBoss ? 11 : 9,
                colorHex: titleColor,
                bold: this.isBoss,
                outlineHex: '#090604',
                outlineWidth: 1.8,
            }
        );
        nameLbl.node.setPosition(0, this.isBoss ? 12 : 9, 0);

        this._redrawHpBar();
        this._loadVisuals(w, h);
    }

    private async _loadVisuals(w: number, h: number): Promise<void> {
        const hum = this.def?.human || this.def?.tuSi;
        if (hum) {
            const outfitFallbackMap: Record<string, string> = {
                ao_thon_lac: 'quan_dui',
                lu_hanh_moc: 'thanh_y',
                hoat_tu_y: 'ta_tu_y',
                hau_toc_y: 'man_ho_tu_y',
                xa_toc_y: 'ta_tu_y_xanh',
            };
            const outfitKey = outfitFallbackMap[hum.outfit] || hum.outfit || 'hac_y';
            const { atlas, prefix } = await ResourceManager.loadCharacterAtlas(hum.gender || 'male', outfitKey);
            if (!this.node.isValid) return;
            if (atlas) {
                this._atlas = atlas;
                this._isHumanSheet = true;
                this._atlasPrefix = prefix;
                this._bodyNode.getComponent(UITransform)!.setContentSize(35, 64);
                this._bodyNode.getComponent(UITransform)!.setAnchorPoint(0.5, 0.03125);
                const sf = atlas.getSpriteFrame(`${prefix}_down_06`) || atlas.getSpriteFrames()[0];
                if (sf) this._sprite.spriteFrame = sf;
                return;
            }
        }

        const mobKey = this.def?.thanDa
            ? 'thach_quy'
            : (this.def?.anhMob === 'thach_than' ? 'thach_quy' : (this.def?.anhMob || this.type));
        const atlas = await ResourceManager.loadMobAtlas(mobKey);
        if (!this.node.isValid) return;
        if (atlas) {
            this._atlas = atlas;
            const all = atlas
                .getSpriteFrames()
                .filter((f): f is SpriteFrame => !!f)
                .sort((a, b) => a.name.localeCompare(b.name));
            this._frames = all;
            if (all.length >= 140 && all.some((f) => f.name.includes('_down_'))) {
                this._isHumanSheet = true;
                const first = all[0].name;
                this._atlasPrefix = first.replace(/_(down|left|right|up)_\d+$/, '');
                this._bodyNode.getComponent(UITransform)!.setContentSize(35, 64);
                this._bodyNode.getComponent(UITransform)!.setAnchorPoint(0.5, 0.03125);
                const sf = atlas.getSpriteFrame(`${this._atlasPrefix}_down_06`) || all[0];
                if (sf) this._sprite.spriteFrame = sf;
            } else if (all.length > 0) {
                const f0 = all[0];
                if (f0.rect.width === 128 && f0.rect.height === 128 && !this.def?.sheet) {
                    this._bodyNode.getComponent(UITransform)!.setContentSize(128, 128);
                    this._bodyNode.getComponent(UITransform)!.setAnchorPoint(0.5, 0.125);
                } else if (this.def?.thanDa || this.def?.anhMob === 'thach_than') {
                    const scale = this.def?.drawScale || (this.isBoss ? 0.82 : 0.56);
                    this._bodyNode.getComponent(UITransform)!.setContentSize(Math.round(110 * scale), Math.round(100 * scale));
                }
                this._sprite.spriteFrame = f0;
            }
            return;
        }
        this._sprite.spriteFrame = UiHelper.skin('bolt_orb');
        this._sprite.color = UiHelper.hex(this.isBoss ? '#c93b2b' : '#7a4b3a', 235);
        this._bodyNode.getComponent(UITransform)!.setContentSize(w * 0.7, h * 0.7);
    }

    public getSortY(): number {
        return this.y;
    }

    public applyStatus(kind: string, dur: number, val: number = 0): void {
        if (this.dead) return;
        if (kind === 'slow') this._slowT = Math.max(this._slowT, dur);
        else if (kind === 'stun' || kind === 'root' || kind === 'freeze') this._stunT = Math.max(this._stunT, dur);
        else if (kind === 'burn' || kind === 'poison') {
            this._burnT = Math.max(this._burnT, dur);
            this._burnDps = Math.max(1, val);
        }
    }

    public takeDamage(
        dmg: number,
        vfx: VfxManager,
        isCrit: boolean = false,
        onKilled?: (mob: EnemyEntity) => void
    ): boolean {
        if (this.dead) return false;
        const actual = Math.max(1, Math.round(dmg));
        this.hp = Math.max(0, this.hp - actual);
        this._provokedTimer = 10;
        this._hurtFlashT = 0.16;

        vfx.spawnText(
            this.x,
            this.y - (this.def.barY || 36),
            isCrit ? `Bạo kích -${actual}` : `-${actual}`,
            isCrit ? '#ffd447' : '#ff5c4d',
            isCrit
        );
        this._redrawHpBar();

        if (this.hp <= 0) {
            this.dead = true;
            this.node.active = false;
            this._teleNode.active = false;
            const baseRespawn = Number(this.def.respawnSec || 12);
            this.respawnTimer = this.isBoss ? Math.min(45, baseRespawn) : Math.min(14, Math.max(5, baseRespawn));
            onKilled?.(this);
            return true;
        }
        return false;
    }

    private _redrawHpBar(): void {
        const ratio = this.hpMax > 0 ? Math.max(0, Math.min(1, this.hp / this.hpMax)) : 0;
        this._hpFillNode.active = ratio > 0.004;
        this._hpFillSprite.fillRange = ratio;
    }

    public update(
        dt: number,
        map: WorldMapData,
        playerX: number,
        playerY: number,
        playerDowned: boolean,
        vfx: VfxManager,
        onHitPlayer: (dmg: number, mob: EnemyEntity) => void,
        onKilled: (mob: EnemyEntity) => void
    ): void {
        if (this.dead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.dead = false;
                this.hp = this.hpMax;
                this.x = this.homeX;
                this.y = this.homeY;
                this._state = 'idle';
                this._provokedTimer = 0;
                this._telegraphT = 0;
                this._teleNode.active = false;
                this.node.setPosition(this.x, -this.y, 0);
                this.node.active = true;
                this._redrawHpBar();
                vfx.spawnRing(this.x, this.y, '#9df2dd', 22, 0.4, true);
            }
            return;
        }

        this._animT += dt;
        if (this._attackCd > 0) this._attackCd -= dt;
        if (this._provokedTimer > 0) this._provokedTimer -= dt;
        if (this._slowT > 0) this._slowT -= dt;
        if (this._stunT > 0) this._stunT -= dt;

        if (this._hurtFlashT > 0) {
            this._hurtFlashT -= dt;
            this._sprite.color = this._hurtFlashT > 0 ? new Color(255, 165, 165, 255) : Color.WHITE;
        }

        if (this._burnT > 0) {
            this._burnT -= dt;
            this._burnTick -= dt;
            if (this._burnTick <= 0) {
                this._burnTick = 1.0;
                if (this.takeDamage(this._burnDps, vfx, false, onKilled)) return;
            }
        }

        if (this._stunT > 0) {
            this._teleNode.active = false;
            this._updateAnimFrame('idle');
            return;
        }

        const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
        const distFromHome = Math.hypot(this.x - this.homeX, this.y - this.homeY);
        const aggroR = this._provokedTimer > 0 ? 420 : Number(this.def.aggro || 0);
        const leashR = this.isBoss ? 420 : Number(this.def.leashRange || 260);
        const hitR = Number(this.def.hitRadius || (this.isBoss ? 42 : 28));
        const moveSpd = Number(this.def.speed || 42) * (this._slowT > 0 ? 0.55 : 1);

        if (playerDowned && this._state !== 'return') {
            this._state = 'return';
        }

        if (this._state === 'telegraph') {
            this._telegraphT -= dt;
            const p = 1 - Math.max(0, this._telegraphT / 0.22);
            this._teleNode.active = true;
            this._teleSprite.color = new Color(255, 75, 55, Math.round(110 + 125 * p));
            const sc = 0.8 + 0.22 * p;
            this._teleNode.setScale(sc, sc, 1);

            if (this._telegraphT <= 0) {
                this._teleNode.active = false;
                this._state = 'chase';
                this._attackCd = Number(this.def.hitCooldown || 1.0);
                if (!playerDowned && Math.hypot(playerX - this.x, playerY - this.y) <= hitR + 10) {
                    const dmg = Math.max(1, Number(this.def.contactDmg || this.def.dmg || Math.max(4, (this.def.level || 1) * 3)));
                    onHitPlayer(dmg, this);
                }
            }
            this._updateAnimFrame('attack');
            return;
        }

        if (this._state === 'return') {
            if (distFromHome < 10) {
                this._state = 'idle';
                this._stateTimer = 1.2;
                this.hp = Math.min(this.hpMax, this.hp + Math.round(this.hpMax * 0.25));
                this._redrawHpBar();
            } else {
                this._moveToward(this.homeX, this.homeY, moveSpd * 1.35 * dt, map, true);
                this._updateAnimFrame('run');
            }
            return;
        }

        if (!playerDowned && aggroR > 0 && distToPlayer <= aggroR && distFromHome < leashR) {
            this._state = 'chase';
        }

        if (this._state === 'chase') {
            if (playerDowned || distFromHome > leashR || distToPlayer > Math.max(aggroR + 100, 320)) {
                this._state = 'return';
                return;
            }

            if (this.isBoss) {
                this._bossSkillCd -= dt;
                if (this._bossSkillCd <= 0 && distToPlayer < 160) {
                    this._bossSkillCd = 7.5;
                    vfx.spawnRing(this.x, this.y, '#ff5938', 110, 0.65, false);
                    if (distToPlayer <= 110) {
                        const novaDmg = Math.max(8, Math.round(Number(this.def.contactDmg || 25) * 1.25));
                        onHitPlayer(novaDmg, this);
                    }
                }
            }

            if (distToPlayer <= hitR) {
                if (this._attackCd <= 0) {
                    this._state = 'telegraph';
                    this._telegraphT = 0.22;
                    this._animT = 0;
                } else {
                    this._facePoint(playerX, playerY);
                    this._updateAnimFrame('idle');
                }
            } else {
                this._moveToward(playerX, playerY, moveSpd * dt, map, false);
                this._updateAnimFrame('run');
            }
            return;
        }

        this._stateTimer -= dt;
        if (this._state === 'idle') {
            this._updateAnimFrame('idle');
            if (this._stateTimer <= 0) {
                const wr = Number(this.def.wanderRadius || 36);
                const ang = Math.random() * Math.PI * 2;
                const d = 10 + Math.random() * wr;
                this._wanderX = this.homeX + Math.cos(ang) * d;
                this._wanderY = this.homeY + Math.sin(ang) * d;
                this._state = 'wander';
                this._stateTimer = 2.2;
            }
        } else {
            const d = Math.hypot(this._wanderX - this.x, this._wanderY - this.y);
            if (d < 5 || this._stateTimer <= 0) {
                this._state = 'idle';
                this._stateTimer = 1.2 + Math.random() * 2.2;
            } else {
                this._moveToward(this._wanderX, this._wanderY, moveSpd * 0.55 * dt, map, false);
                this._updateAnimFrame('run');
            }
        }
    }

    private _facePoint(tx: number, ty: number): void {
        const dx = tx - this.x;
        const dy = ty - this.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            this._dir = dx > 0 ? 2 : 1;
        } else {
            this._dir = dy >= 0 ? 0 : 3;
        }
        if (!this._isHumanSheet && Math.abs(dx) > 1) {
            this._bodyNode.setScale(dx < 0 ? -1 : 1, 1, 1);
        }
    }

    private _moveToward(tx: number, ty: number, step: number, map: WorldMapData, ignoreBlock: boolean): void {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) return;
        this._facePoint(tx, ty);
        const mx = (dx / dist) * Math.min(dist, step);
        const my = (dy / dist) * Math.min(dist, step);
        if (ignoreBlock || !Pathfinder.rectBlocked(map, this.x + mx - 7, this.y + my - 8, this.x + mx + 7, this.y + my, false)) {
            this.x += mx;
            this.y += my;
        } else if (!Pathfinder.rectBlocked(map, this.x + mx - 7, this.y - 8, this.x + mx + 7, this.y, false)) {
            this.x += mx;
        } else if (!Pathfinder.rectBlocked(map, this.x - 7, this.y + my - 8, this.x + 7, this.y + my, false)) {
            this.y += my;
        }
        this.node.setPosition(this.x, -this.y, 0);
    }

    private _updateAnimFrame(anim: 'idle' | 'run' | 'attack'): void {
        if (this._isHumanSheet && this._atlas) {
            const dirs = ['down', 'left', 'right', 'up'];
            const cols = anim === 'run' ? [0, 1, 2, 3] : anim === 'attack' ? [4, 5] : [6, 7];
            const fps = anim === 'run' ? 8 : anim === 'attack' ? 7 : 2;
            const col = cols[Math.floor(this._animT * fps) % cols.length];
            const frameName = `${this._atlasPrefix}_${dirs[this._dir]}_${String(col).padStart(2, '0')}`;
            const sf = this._atlas.getSpriteFrame(frameName);
            if (sf) this._sprite.spriteFrame = sf;
            return;
        }

        if (this._frames.length === 0) return;
        const sheet = this.def.sheet;
        const animDef = sheet?.anims?.[anim] || sheet?.anims?.idle;
        const fps = sheet?.fps || 6;
        if (Array.isArray(animDef) && animDef.length >= 2) {
            const start = animDef[0];
            const count = Math.max(1, animDef[1]);
            const idx = Math.min(this._frames.length - 1, start + (Math.floor(this._animT * fps) % count));
            this._sprite.spriteFrame = this._frames[idx];
        } else {
            const idx = Math.floor(this._animT * fps) % this._frames.length;
            this._sprite.spriteFrame = this._frames[idx];
        }
    }

    public rollDrops(): Array<{ itemId: string; qty: number; stones: number }> {
        const out: Array<{ itemId: string; qty: number; stones: number }> = [];
        const lvl = Math.max(1, Number(this.def.level || 1));

        if (this.isBoss || Math.random() < 0.65) {
            const st = this.isBoss ? 120 + lvl * 25 : Math.max(1, Math.round(lvl * (0.8 + Math.random() * 1.4)));
            out.push({ itemId: '', qty: 0, stones: st });
        }

        if (this.type === 'duoc_linh_thu') {
            out.push({ itemId: 'linh_thuy', qty: 1, stones: 0 });
        } else if (this.type === 'yeu_quai_ha_pham' || this.type.includes('yeu_quai')) {
            if (GameState.questStage === 14 && !GameState.hasItem('manh_bi_tich_ha', 1) && Math.random() < 0.85) {
                out.push({ itemId: 'manh_bi_tich_ha', qty: 1, stones: 0 });
            }
            if (Math.random() < 0.75) out.push({ itemId: 'yeu_cot', qty: 1, stones: 0 });
        } else if (this.type === 'doc_dang_yeu') {
            if (Math.random() < 0.8) out.push({ itemId: 'doc_dang_doc_dich', qty: 1, stones: 0 });
        } else if (this.type === 'thach_giap_yeu') {
            if (!GameState.hasItem('thach_giap_tinh_hach', 1)) {
                out.push({ itemId: 'thach_giap_tinh_hach', qty: 1, stones: 0 });
            }
            out.push({ itemId: 'huyen_thiet_khoang', qty: 1, stones: 0 });
        } else if (this.type === 'thach_yeu' || this.type === 'thach_ma') {
            if (Math.random() < 0.75) out.push({ itemId: 'huyen_thiet_khoang', qty: 1, stones: 0 });
        } else if (this.type.includes('nguu')) {
            if (Math.random() < 0.55) out.push({ itemId: 'nguu_sung', qty: 1, stones: 0 });
            if (Math.random() < 0.35) out.push({ itemId: 'yeu_dan_cap_1', qty: 1, stones: 0 });
        } else if (this.type.includes('ho')) {
            if (Math.random() < 0.55) out.push({ itemId: 'nanh_ho', qty: 1, stones: 0 });
            if (Math.random() < 0.4) out.push({ itemId: 'yeu_dan_cap_1', qty: 1, stones: 0 });
        } else if (this.type.includes('xuyen_son')) {
            if (Math.random() < 0.55) out.push({ itemId: 'xuyen_son_giap_phien', qty: 1, stones: 0 });
        }

        if (this.isBoss) {
            const bossLootPool = ['yeu_dan_cap_2', 'yeu_dan_cap_3', 'co_bich_moc', 'tran_than_thach', 'giap_moc_tam', 'tu_linh_ngoc_boi'];
            const pick = bossLootPool[Math.floor(Math.random() * bossLootPool.length)];
            if (ResourceManager.items[pick]) {
                out.push({ itemId: pick, qty: 1, stones: 0 });
            }
        } else if (lvl >= 4 && Math.random() < 0.08) {
            const rareEquip = ['mu_tieu_dao', 'giap_moc_tam', 'giay_van_bo', 'nhan_tu_than', 'tu_linh_ngoc_boi'];
            const pick = rareEquip[Math.floor(Math.random() * rareEquip.length)];
            if (ResourceManager.items[pick]) {
                out.push({ itemId: pick, qty: 1, stones: 0 });
            }
        }

        return out;
    }
}
