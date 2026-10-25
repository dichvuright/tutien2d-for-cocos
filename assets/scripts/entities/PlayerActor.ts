import {
    Color,
    Label,
    Node,
    Sprite,
    SpriteAtlas,
    SpriteFrame,
    UITransform,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { GameState } from '../core/GameState';
import { ResourceManager, WorldMapData } from '../core/ResourceManager';
import { UiHelper } from '../core/UiHelper';
import { VfxManager } from '../combat/VfxManager';
import { EnemyEntity, YSortableItem } from './WorldEntities';
import { Pathfinder } from '../world/Pathfinder';

export interface ActiveSkillBolt {
    x: number;
    y: number;
    vx: number;
    vy: number;
    traveled: number;
    maxRange: number;
    dmg: number;
    blastR: number;
    hitR: number;
    skillId: string;
    colorHex: string;
    effect: any | null;
    node: Node;
}

const CHAR_DIRS = ['down', 'left', 'right', 'up'];
const ANIM_COLS: Record<string, { cols: number[]; fps: number }> = {
    idle: { cols: [6, 7], fps: 1.8 },
    walk: { cols: [0, 1, 2, 3], fps: 8.5 },
    attack: { cols: [4, 5], fps: 8 },
    sit: { cols: [8, 9], fps: 1.2 },
    seal: { cols: [10, 11], fps: 6.5 },
    palm: { cols: [12, 13], fps: 7.5 },
    gather: { cols: [14, 15], fps: 3.5 },
    hurt: { cols: [20, 21], fps: 7 },
    down: { cols: [22, 23], fps: 1 },
};

export class PlayerActor implements YSortableItem {
    public node: Node;
    public x: number = 272;
    public y: number = 860;
    public dir: number = 0;
    public state: 'idle' | 'walk' | 'attack' | 'cast' | 'sit' | 'gather' | 'down' = 'idle';

    public flying: boolean = false;
    public flyRise: number = 0;
    public running: boolean = true;
    public autoCombat: boolean = false;
    public downed: boolean = false;

    public path: Array<{ x: number; y: number }> = [];
    public spellCooldowns: Record<string, number> = {};
    public globalSpellCd: number = 0;
    public hasteTimer: number = 0;
    public shieldHp: number = 0;
    public shieldTimer: number = 0;

    private _animT: number = 0;
    private _stateTimer: number = 0;
    private _moteTimer: number = 0;
    private _bpRegenDelay: number = 0;
    private _hurtIFrame: number = 0;
    private _autoPathTimer: number = 0;
    private _autoSkillCursor: number = 0;
    private _meditateStoneBonus: boolean = false;

    private _shadowNode: Node;
    private _shadowSprite: Sprite;
    private _auraNode: Node;
    private _auraSprite: Sprite;
    private _auraFrames: SpriteFrame[] = [];
    private _mountNode: Node;
    private _mountSprite: Sprite;
    private _mountFramesByDir: SpriteFrame[][] = [];
    private _mountFps: number = 1;
    private _bodyNode: Node;
    private _bodySprite: Sprite;
    private _shieldNode: Node;
    private _compassNode: Node;
    private _nameLabel: Label;
    private _realmLabel: Label;

    private _charAtlas: SpriteAtlas | null = null;
    private _charPrefix: string = 'male_bach_y';
    private _loadedVisualSig: string = '';

    public bolts: ActiveSkillBolt[] = [];
    private _boltLayer: Node;

    constructor(ySortParent: Node, boltLayer: Node) {
        this._boltLayer = boltLayer;

        // Adopt pre-assembled PlayerActor from TuTienMain.scene if present
        const existing = ySortParent.getChildByName('PlayerActor');
        this.node = existing || UiHelper.createNode('PlayerActor', ySortParent, 40, 80, 0.5, 0);

        const ensureSpriteChild = (name: string, w: number, h: number, ax: number = 0.5, ay: number = 0.5, defaultSkin?: string) => {
            let child = this.node.getChildByName(name);
            if (!child) {
                child = UiHelper.createNode(name, this.node, w, h, ax, ay);
            }
            let sp = child.getComponent(Sprite);
            if (!sp) {
                sp = child.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
            }
            if (defaultSkin && !sp.spriteFrame) {
                sp.spriteFrame = UiHelper.skin(defaultSkin);
            }
            return { node: child, sprite: sp };
        };

        const sh = ensureSpriteChild('Shadow', 24, 9, 0.5, 0.5, 'shadow_oval');
        this._shadowNode = sh.node;
        this._shadowSprite = sh.sprite;

        const cp = ensureSpriteChild('QuestCompass', 18, 18, 0.5, 0.5, 'compass_arrow');
        this._compassNode = cp.node;
        this._compassNode.active = false;

        const au = ensureSpriteChild('Aura', 72, 42, 0.5, 0.35);
        this._auraNode = au.node;
        this._auraSprite = au.sprite;
        this._auraNode.active = false;

        const mt = ensureSpriteChild('FlyingMount', 52, 28, 0.5, 0.5);
        this._mountNode = mt.node;
        this._mountSprite = mt.sprite;
        this._mountNode.active = false;

        const bd = ensureSpriteChild('CharBody', 48, 64, 0.5, 0.03125);
        bd.node.getComponent(UITransform)!.setContentSize(48, 64);
        this._bodyNode = bd.node;
        this._bodySprite = bd.sprite;

        const sf = ensureSpriteChild('ShieldFx', 52, 52, 0.5, 0.5, 'shield_bubble');
        this._shieldNode = sf.node;
        this._shieldNode.active = false;

        const existingName = this.node.getChildByName('PlayerName')?.getComponent(Label);
        this._nameLabel = existingName
            ? UiHelper.styleLabel(existingName, GameState.char.name, {
                  size: 11,
                  colorHex: '#f5d77f',
                  bold: true,
                  outlineHex: '#080604',
                  outlineWidth: 2,
              })
            : UiHelper.createLabel('PlayerName', this.node, GameState.char.name, {
                  size: 11,
                  colorHex: '#f5d77f',
                  bold: true,
                  outlineHex: '#080604',
                  outlineWidth: 2,
              });
        this._nameLabel.node.setPosition(0, 74, 0);

        const existingRealm = this.node.getChildByName('PlayerRealm')?.getComponent(Label);
        this._realmLabel = existingRealm
            ? UiHelper.styleLabel(existingRealm, GameState.realmDef().name, {
                  size: 9,
                  colorHex: '#cfe6b8',
                  outlineHex: '#080604',
                  outlineWidth: 1.8,
              })
            : UiHelper.createLabel('PlayerRealm', this.node, GameState.realmDef().name, {
                  size: 9,
                  colorHex: '#cfe6b8',
                  outlineHex: '#080604',
                  outlineWidth: 1.8,
              });
        this._realmLabel.node.setPosition(0, 62, 0);

        this.refreshAppearance();
    }

    public getSortY(): number {
        return this.y;
    }

    public clearBolts(): void {
        for (const b of this.bolts) b.node.destroy();
        this.bolts = [];
    }

    public setPosition(wx: number, wy: number): void {
        this.x = wx;
        this.y = wy;
        this.path = [];
        this.node.setPosition(this.x, -this.y, 0);
    }

    public async refreshAppearance(): Promise<void> {
        const gender = GameState.char.gender || 'male';
        const outfit = GameState.getVisualOutfit();
        const mountId = GameState.equipment.phi_hanh || '';
        const showAura = GameState.realmIndex() >= GameState.realmIndex('luyen_khi_4') ? GameState.char.linhCan : 'none';
        const sig = `${gender}|${outfit}|${mountId}|${showAura}|${GameState.char.name}|${GameState.realmId}|${GameState.sectName}`;
        if (sig === this._loadedVisualSig) return;
        this._loadedVisualSig = sig;

        const dispName = GameState.sectName ? `[${GameState.sectName}] ${GameState.char.name}` : GameState.char.name;
        this._nameLabel.string = dispName;
        this._realmLabel.string = GameState.realmDef().name;

        const { atlas, prefix } = await ResourceManager.loadCharacterAtlas(gender, outfit);
        if (!this.node.isValid) return;
        this._charAtlas = atlas;
        this._charPrefix = prefix;
        this._applyBodyFrame(6);

        if (mountId) {
            const mSheet = await ResourceManager.loadMountSheet(mountId);
            if (this.node.isValid && mSheet) {
                this._mountFramesByDir = mSheet.framesByDir;
                this._mountFps = mSheet.fps;
                const initSf = mSheet.framesByDir[this.dir]?.[0] || mSheet.framesByDir[0]?.[0] || null;
                this._mountSprite.spriteFrame = initSf;
                this._mountNode.getComponent(UITransform)!.setContentSize(mSheet.drawW, mSheet.drawH);
            }
        } else {
            this._mountFramesByDir = [];
            this._mountSprite.spriteFrame = null;
        }

        if (showAura && showAura !== 'none') {
            const aAtlas = await ResourceManager.loadAuraAtlas(showAura);
            if (this.node.isValid && aAtlas) {
                this._auraFrames = aAtlas
                    .getSpriteFrames()
                    .filter((f): f is SpriteFrame => !!f)
                    .sort((a, b) => a.name.localeCompare(b.name));
                this._auraNode.active = this._auraFrames.length > 0;
            } else {
                this._auraFrames = [];
                this._auraNode.active = false;
            }
        } else {
            this._auraFrames = [];
            this._auraNode.active = false;
        }
    }

    public toggleMeditate(onStone: boolean = false, vfx?: VfxManager): { ok: boolean; msg: string } {
        if (this.downed) return { ok: false, msg: 'Đang trọng thương!' };
        if (this.state === 'sit') {
            this.state = 'idle';
            this._meditateStoneBonus = false;
            return { ok: true, msg: 'Đã thu công đứng dậy.' };
        }
        if (!GameState.realmDef().canMeditate && !onStone) {
            return { ok: false, msg: 'Thân còn Phàm Nhân, chưa khai mở kinh mạch để Đả Tọa (hãy làm nhiệm vụ Tẩy Tuỷ)!' };
        }
        if (this.flying) this.flying = false;
        this.path = [];
        this.state = 'sit';
        this.dir = 0;
        this._animT = 0;
        this._meditateStoneBonus = onStone;
        AudioManager.playSfx('meditate');
        vfx?.spawnRing(this.x, this.y, '#9df2dd', 30, 0.55, true);
        return {
            ok: true,
            msg: onStone
                ? 'Đang Đả Tọa trên Đài Đá Linh Khí - hồi phục nhanh và tăng mạnh Đạo Hạnh!'
                : 'Bắt đầu Đả Tọa vận công - hồi phục Khí Huyết, Linh Lực và tích luỹ Đạo Hạnh.',
        };
    }

    public toggleFly(map: WorldMapData, vfx?: VfxManager): { ok: boolean; msg: string } {
        if (this.downed) return { ok: false, msg: 'Đang trọng thương!' };
        if (this.flying) {
            if (Pathfinder.rectBlocked(map, this.x - 7, this.y - 10, this.x + 7, this.y, false)) {
                const near = Pathfinder.nearestWalkable(map, Math.floor(this.x / 32), Math.floor(this.y / 32), 6, false);
                if (!near) {
                    AudioManager.playSfx('deny');
                    return { ok: false, msg: 'Bên dưới là vực hoặc nước sâu, chưa có chỗ đặt chân!' };
                }
                this.x = near.tx * 32 + 16;
                this.y = near.ty * 32 + 28;
            }
            this.flying = false;
            vfx?.spawnRing(this.x, this.y, '#8fd8ff', 24, 0.35, true);
            return { ok: true, msg: 'Đã hạ pháp khí phi hành.' };
        }

        const mountId = GameState.equipment.phi_hanh;
        if (!mountId) {
            AudioManager.playSfx('deny');
            return { ok: false, msg: 'Chưa trang bị Pháp Khí Phi Hành (Phi Diệp / Phi Kiếm) trong Hành Trang [B]!' };
        }
        const mountItem = ResourceManager.items[mountId];
        const minRealm = mountItem?.fly?.realmMin || 'luyen_khi_4';
        if (GameState.realmIndex() < GameState.realmIndex(minRealm)) {
            AudioManager.playSfx('deny');
            return { ok: false, msg: `Cần đạt ${GameState.realmDef(minRealm).name} mới ngự được ${mountItem?.name || 'pháp khí này'}!` };
        }

        if (this.state === 'sit') this.state = 'idle';
        this.flying = true;
        GameState.questFlags.da_phi_hanh = true;
        AudioManager.playSfx('portal');
        vfx?.spawnRing(this.x, this.y, '#8fd8ff', 36, 0.5, true);
        vfx?.spawnText(this.x, this.y - 54, `Ngự ${mountItem?.name || 'Phi Kiếm'}!`, '#8fd8ff');
        return { ok: true, msg: `Đang ngự ${mountItem?.name || 'Phi Hành'}!` };
    }

    public performBasicAttack(
        target: EnemyEntity | null,
        enemies: EnemyEntity[],
        vfx: VfxManager,
        onEnemyKilled: (mob: EnemyEntity) => void
    ): boolean {
        if (this.downed || this.state === 'attack' || this.state === 'cast') return false;
        if (this.state === 'sit') this.state = 'idle';

        const weaponId = GameState.equipment.vu_khi || '';
        const weaponDef = weaponId ? ResourceManager.items[weaponId] : null;
        const reach = 38 + Number(weaponDef?.reachBonus || 0);

        if (target && !target.dead) {
            this.facePoint(target.x, target.y);
        }

        this.state = 'attack';
        this._stateTimer = Number(weaponDef?.attackTime || 0.48);
        this._animT = 0;
        AudioManager.playSfx('swing');

        const dirAngles = [Math.PI * 0.5, Math.PI, 0, -Math.PI * 0.5];
        const aimAngle = target && !target.dead
            ? Math.atan2(target.y - this.y, target.x - this.x)
            : dirAngles[this.dir];

        if (weaponDef?.projectile || weaponDef?.flying || reach >= 120) {
            const tx = target && !target.dead ? target.x : this.x + Math.cos(aimAngle) * reach;
            const ty = target && !target.dead ? target.y : this.y + Math.sin(aimAngle) * reach;
            const ang = Math.atan2(ty - this.y, tx - this.x);
            this._spawnBolt({
                ang,
                speed: 310,
                range: Math.max(120, reach + 20),
                dmg: GameState.atk,
                blastR: 0,
                hitR: 18,
                skillId: 'basic_sword',
                colorHex: '#a8ecff',
                effect: null,
            });
        } else {
            vfx.spawnSlashArc(this.x, this.y, aimAngle, reach, '#dff6ff');
            const isCrit = Math.random() < 0.14;
            const dmg = Math.round(GameState.atk * (isCrit ? 1.65 : 1));
            let hitAny = false;
            for (const mob of enemies) {
                if (mob.dead) continue;
                const d = Math.hypot(mob.x - this.x, mob.y - this.y);
                if (d <= reach + 18) {
                    const angToMob = Math.atan2(mob.y - this.y, mob.x - this.x);
                    let diff = Math.abs(angToMob - aimAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    if (mob === target || diff <= 1.35 || d <= 28) {
                        mob.takeDamage(dmg, vfx, isCrit, onEnemyKilled);
                        hitAny = true;
                    }
                }
            }
            if (hitAny) {
                AudioManager.playSfx(isCrit ? 'crit' : 'hit');
                if (weaponDef?.lifesteal?.pct) {
                    const heal = Math.max(1, Math.round(GameState.hpMax * weaponDef.lifesteal.pct));
                    GameState.hp = Math.min(GameState.hpMax, GameState.hp + heal);
                }
            }
        }
        return true;
    }

    public castSkill(
        skillId: string,
        target: EnemyEntity | null,
        enemies: EnemyEntity[],
        vfx: VfxManager,
        onEnemyKilled: (mob: EnemyEntity) => void
    ): { ok: boolean; msg?: string } {
        if (this.downed) return { ok: false, msg: 'Đang trọng thương!' };
        const def = ResourceManager.activeSkills[skillId];
        if (!def) return { ok: false, msg: 'Chưa trang bị pháp quyết ở ô này!' };

        const cdLeft = this.spellCooldowns[skillId] || 0;
        if (cdLeft > 0.05) {
            return { ok: false, msg: `${def.short || def.name} đang hồi (${cdLeft.toFixed(1)}s)` };
        }
        if (this.globalSpellCd > 0.05) {
            return { ok: false };
        }

        const mpCost = Number(def.mp || 10);
        const spCost = Number(def.sp || 0);
        if (GameState.mp < mpCost) {
            AudioManager.playSfx('deny');
            return { ok: false, msg: 'Không đủ Linh Lực!' };
        }
        if (GameState.sp < spCost) {
            AudioManager.playSfx('deny');
            return { ok: false, msg: 'Không đủ Thần Thức!' };
        }

        GameState.mp -= mpCost;
        GameState.sp -= spCost;
        const cdReduction = GameState.char.linhCan === 'phong' ? 0.9 : 1.0;
        this.spellCooldowns[skillId] = Math.max(0.5, Number(def.cooldown || 5) * cdReduction);
        this.globalSpellCd = 0.55;

        if (this.state === 'sit') this.state = 'idle';
        this.state = 'cast';
        this._stateTimer = Math.max(0.28, Number(def.cast || 0.35));
        this._animT = 0;

        let aimMob = target && !target.dead ? target : null;
        const range = Number(def.range || 150);
        if (!aimMob) {
            let bestD = range + 60;
            for (const m of enemies) {
                if (m.dead) continue;
                const d = Math.hypot(m.x - this.x, m.y - this.y);
                if (d < bestD) {
                    bestD = d;
                    aimMob = m;
                }
            }
        }
        if (aimMob) this.facePoint(aimMob.x, aimMob.y);

        const coef = Math.max(1.2, Number(def.coef || 2.0));
        const baseDmg = Math.max(3, Math.round(coef * GameState.skillPower));
        const colorHex = def.colors?.mid || def.colors?.glow || '#ffd27a';

        vfx.spawnText(this.x, this.y - 58, `${def.name || skillId}!`, colorHex);

        if (def.bienHinh || def.shape === 'self') {
            AudioManager.playSfx('breakthrough');
            this.shieldHp = Math.round(GameState.hpMax * 0.35);
            this.shieldTimer = 12;
            this.hasteTimer = 10;
            vfx.spawnSkillImpact(skillId, this.x, this.y, colorHex, 52);
            return { ok: true };
        }

        const shape = def.shape || 'bolt';
        if (shape === 'bolt') {
            AudioManager.playSfx(def.element === 'Hỏa' ? 'fire' : def.element === 'Băng' ? 'ice' : 'spell');
            const dirAngles = [Math.PI * 0.5, Math.PI, 0, -Math.PI * 0.5];
            const centerAng = aimMob
                ? Math.atan2(aimMob.y - this.y, aimMob.x - this.x)
                : dirAngles[this.dir];
            const shots = Math.max(1, Number(def.shots || 1));
            const spreadDeg = Number(def.spread || 18);
            const spreadRad = (spreadDeg * Math.PI) / 180;
            for (let i = 0; i < shots; i++) {
                const offset = shots === 1 ? 0 : (i - (shots - 1) * 0.5) * (spreadRad / Math.max(1, shots - 1));
                this._spawnBolt({
                    ang: centerAng + offset,
                    speed: Math.max(160, Number(def.speed || 220)),
                    range: Math.max(110, range + 24),
                    dmg: baseDmg,
                    blastR: Number(def.blastR || 0),
                    hitR: Math.max(14, Number(def.hitR || 16)),
                    skillId,
                    colorHex,
                    effect: def.effect || null,
                });
            }
        } else {
            AudioManager.playSfx(skillId.includes('loi') ? 'thunder' : 'spell');
            const dirAngles = [Math.PI * 0.5, Math.PI, 0, -Math.PI * 0.5];
            const tx = aimMob ? aimMob.x : this.x + Math.cos(dirAngles[this.dir]) * Math.min(90, range * 0.7);
            const ty = aimMob ? aimMob.y : this.y + Math.sin(dirAngles[this.dir]) * Math.min(90, range * 0.7);
            const aoeR = Math.max(38, Number(def.radius || def.blastR || 48));

            vfx.spawnSkillImpact(skillId, tx, ty, colorHex, aoeR);
            const isCrit = Math.random() < 0.2;
            const dmg = Math.round(baseDmg * (isCrit ? 1.55 : 1));
            for (const mob of enemies) {
                if (mob.dead) continue;
                if (Math.hypot(mob.x - tx, mob.y - ty) <= aoeR + 16) {
                    if (def.effect?.kind) {
                        mob.applyStatus(def.effect.kind, def.effect.time || 2.5, Math.max(1, Math.round(GameState.skillPower * 0.35)));
                    }
                    mob.takeDamage(dmg, vfx, isCrit, onEnemyKilled);
                }
            }
        }

        return { ok: true };
    }

    private _spawnBolt(cfg: {
        ang: number;
        speed: number;
        range: number;
        dmg: number;
        blastR: number;
        hitR: number;
        skillId: string;
        colorHex: string;
        effect: any | null;
    }): void {
        const sx = this.x + Math.cos(cfg.ang) * 14;
        const sy = this.y - 18 + Math.sin(cfg.ang) * 14;
        const size = cfg.skillId === 'basic_sword' ? 16 : 22;
        const node = UiHelper.createNode('SkillBolt', this._boltLayer, size, size);
        node.setPosition(sx, -sy, 0);
        node.angle = (-cfg.ang * 180) / Math.PI;

        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = UiHelper.skin('bolt_orb');
        sp.color = UiHelper.hex(cfg.colorHex, 245);

        this.bolts.push({
            x: sx,
            y: sy,
            vx: Math.cos(cfg.ang) * cfg.speed,
            vy: Math.sin(cfg.ang) * cfg.speed,
            traveled: 0,
            maxRange: cfg.range,
            dmg: cfg.dmg,
            blastR: cfg.blastR,
            hitR: cfg.hitR,
            skillId: cfg.skillId,
            colorHex: cfg.colorHex,
            effect: cfg.effect,
            node,
        });
    }

    public takeDamage(rawDmg: number, vfx: VfxManager): void {
        if (this.downed || this._hurtIFrame > 0) return;
        this._hurtIFrame = 0.42;
        if (this.state === 'sit') this.state = 'idle';

        let dmg = Math.max(1, Math.round(rawDmg));
        if (GameState.char.linhCan === 'tho') {
            dmg = Math.max(1, Math.round(dmg * 0.88));
        }

        if (this.shieldHp > 0 && this.shieldTimer > 0) {
            const absorbed = Math.min(this.shieldHp, dmg);
            this.shieldHp -= absorbed;
            dmg -= absorbed;
            vfx.spawnText(this.x, this.y - 42, `Hộ Thuẫn -${absorbed}`, '#ffe082');
            if (dmg <= 0) return;
        }

        if (GameState.bp > 0) {
            const bpAbsorb = Math.min(Math.floor(GameState.bp), dmg);
            GameState.bp = Math.max(0, GameState.bp - bpAbsorb);
            dmg -= bpAbsorb;
            if (bpAbsorb > 0) {
                vfx.spawnText(this.x, this.y - 46, `-${bpAbsorb} Giáp`, '#f59e42');
            }
        }

        this._bpRegenDelay = 3.0;

        if (dmg > 0) {
            GameState.hp = Math.max(0, GameState.hp - dmg);
            vfx.spawnText(this.x, this.y - 56, `-${dmg}`, '#ff4d4d');
            AudioManager.playSfx('hurt');
        }

        if (GameState.hp <= 0) {
            this.downed = true;
            this.flying = false;
            this.autoCombat = false;
            this.path = [];
            this.state = 'down';
            vfx.spawnText(this.x, this.y - 64, 'TRỌNG THƯƠNG!', '#ff3b3b', true);
        }
    }

    public revive(hpRatio: number = 0.75, vfx?: VfxManager): void {
        this.downed = false;
        this.state = 'idle';
        GameState.hp = Math.max(10, Math.round(GameState.hpMax * hpRatio));
        GameState.mp = Math.max(GameState.mp, Math.round(GameState.mpMax * 0.5));
        GameState.bp = GameState.bpMax;
        this._hurtIFrame = 2.5;
        vfx?.spawnRing(this.x, this.y, '#9df2dd', 42, 0.65, true);
        GameState.save();
    }

    public facePoint(tx: number, ty: number): void {
        const dx = tx - this.x;
        const dy = ty - this.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            this.dir = dx > 0 ? 2 : 1;
        } else {
            this.dir = dy >= 0 ? 0 : 3;
        }
    }

    public update(
        dt: number,
        map: WorldMapData,
        moveInputX: number,
        moveInputY: number,
        selectedTarget: EnemyEntity | null,
        enemies: EnemyEntity[],
        questGuideTarget: { x: number; y: number } | null,
        vfx: VfxManager,
        onEnemyKilled: (mob: EnemyEntity) => void,
        onAutoSelectTarget: (mob: EnemyEntity) => void
    ): void {
        this._animT += dt;
        if (this._hurtIFrame > 0) this._hurtIFrame -= dt;
        if (this.globalSpellCd > 0) this.globalSpellCd = Math.max(0, this.globalSpellCd - dt);
        if (this.hasteTimer > 0) this.hasteTimer = Math.max(0, this.hasteTimer - dt);
        if (this.shieldTimer > 0) {
            this.shieldTimer = Math.max(0, this.shieldTimer - dt);
            if (this.shieldTimer <= 0) this.shieldHp = 0;
        }
        if (this._bpRegenDelay > 0) this._bpRegenDelay = Math.max(0, this._bpRegenDelay - dt);

        for (const k of Object.keys(this.spellCooldowns)) {
            if (this.spellCooldowns[k] > 0) {
                this.spellCooldowns[k] = Math.max(0, this.spellCooldowns[k] - dt);
            }
        }

        const targetRise = this.flying ? 1 : 0;
        if (this.flyRise !== targetRise) {
            const step = dt * 4;
            this.flyRise = this.flyRise < targetRise ? Math.min(1, this.flyRise + step) : Math.max(0, this.flyRise - step);
        }

        this._updateBolts(dt, enemies, vfx, onEnemyKilled);

        if (!this.downed) {
            const spRegen = 0.8 + (GameState.realmIndex() >= 14 ? 2.5 : 0);
            GameState.sp = Math.min(GameState.spMax, GameState.sp + spRegen * dt);
            if (GameState.questFlags.learned_dan_linh && GameState.mpMax > 0) {
                GameState.mp = Math.min(GameState.mpMax, GameState.mp + 2.0 * dt);
            }
            if (GameState.activeFood && GameState.activeFood.until > Date.now()) {
                const foodDef = ResourceManager.items[GameState.activeFood.id]?.food;
                if (foodDef) {
                    GameState.hp = Math.min(GameState.hpMax, GameState.hp + GameState.hpMax * ((foodDef.hpPct || 1) / 100) * dt);
                    GameState.mp = Math.min(GameState.mpMax, GameState.mp + (foodDef.mp || 2) * dt);
                    GameState.bp = Math.min(GameState.bpMax, GameState.bp + (foodDef.bp || 2) * dt);
                }
            }
        }

        if (this.downed) {
            this._applyVisualTransforms(questGuideTarget);
            this._applyBodyFrame(ANIM_COLS.down.cols[0]);
            return;
        }

        if (this.state === 'sit') {
            if (Math.abs(moveInputX) > 0.1 || Math.abs(moveInputY) > 0.1 || this.path.length > 0) {
                this.state = 'idle';
                this._meditateStoneBonus = false;
            } else {
                const mult = GameState.meditateMult();
                GameState.hp = Math.min(GameState.hpMax, GameState.hp + 5 * mult * dt);
                GameState.mp = Math.min(GameState.mpMax, GameState.mp + 7 * mult * dt);
                GameState.sp = Math.min(GameState.spMax, GameState.sp + 4 * mult * dt);
                if (this._bpRegenDelay <= 0) {
                    GameState.bp = Math.min(GameState.bpMax, GameState.bp + 18 * mult * dt);
                }
                const expGainRate = this._meditateStoneBonus ? 8 * mult : 2.5 * mult;
                GameState.addExp(expGainRate * dt);

                this._moteTimer -= dt;
                if (this._moteTimer <= 0) {
                    this._moteTimer = 0.28;
                    vfx.spawnGatherMote(this.x, this.y, this._meditateStoneBonus ? '#ffe28a' : '#9df2dd');
                }
                const sitCols = ANIM_COLS.sit.cols;
                const f = sitCols[Math.floor(this._animT * ANIM_COLS.sit.fps) % sitCols.length];
                this._applyBodyFrame(f);
                this._applyVisualTransforms(questGuideTarget);
                return;
            }
        }

        if (this.state === 'attack' || this.state === 'cast') {
            this._stateTimer -= dt;
            if (this._stateTimer <= 0) {
                this.state = 'idle';
            }
        }

        const hasManualMove = Math.abs(moveInputX) > 0.05 || Math.abs(moveInputY) > 0.05;
        if (this.autoCombat && !hasManualMove && this.state !== 'attack' && this.state !== 'cast') {
            this._runAutoCombat(dt, map, selectedTarget, enemies, vfx, onEnemyKilled, onAutoSelectTarget);
        }

        let vx = 0;
        let vy = 0;
        const mountItem = GameState.equipment.phi_hanh ? ResourceManager.items[GameState.equipment.phi_hanh] : null;
        const flyMult = this.flying ? Number(mountItem?.fly?.speed || 1.8) : 1.0;
        const stepMult = this.running ? 1.65 : 1.45;
        const hasteMult = this.hasteTimer > 0 ? 1.35 : 1.0;
        const speed = 68 * stepMult * flyMult * (1 + GameState.moveSpeedBonus) * hasteMult;

        if (hasManualMove) {
            this.path = [];
            const len = Math.hypot(moveInputX, moveInputY);
            vx = moveInputX / len;
            vy = moveInputY / len;
            this._tryMove(vx * speed * dt, vy * speed * dt, map);
        } else if (this.path.length > 0) {
            const wp = this.path[0];
            const dx = wp.x - this.x;
            const dy = wp.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 4) {
                this.path.shift();
            } else {
                vx = dx / dist;
                vy = dy / dist;
                const step = Math.min(dist, speed * dt);
                const moved = this._tryMove(vx * step, vy * step, map);
                if (!moved) {
                    this.path = [];
                }
            }
        }

        const isMoving = Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01;
        if (isMoving) {
            if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 2 : 1;
            else this.dir = vy >= 0 ? 0 : 3;
            if (this.state !== 'attack' && this.state !== 'cast') {
                this.state = 'walk';
            }
        } else if (this.state === 'walk') {
            this.state = 'idle';
        }

        let col = 6;
        if (this.state === 'attack') {
            col = this._stateTimer > 0.22 ? 4 : 5;
        } else if (this.state === 'cast') {
            col = this._stateTimer > 0.16 ? 10 : 12;
        } else if (this.flying) {
            const art = mountItem?.fly?.art || 'kiem';
            col = art === 'ngua' || art === 'hac' ? 8 : 6;
        } else if (this.state === 'walk') {
            const wCols = ANIM_COLS.walk.cols;
            col = wCols[Math.floor(this._animT * ANIM_COLS.walk.fps * (this.running ? 1.2 : 1)) % wCols.length];
        } else {
            const iCols = ANIM_COLS.idle.cols;
            col = iCols[Math.floor(this._animT * ANIM_COLS.idle.fps) % iCols.length];
        }

        this._applyBodyFrame(col);
        this._applyVisualTransforms(questGuideTarget);
    }

    private _runAutoCombat(
        dt: number,
        map: WorldMapData,
        selectedTarget: EnemyEntity | null,
        enemies: EnemyEntity[],
        vfx: VfxManager,
        onEnemyKilled: (mob: EnemyEntity) => void,
        onAutoSelectTarget: (mob: EnemyEntity) => void
    ): void {
        if (GameState.hp < GameState.hpMax * 0.4) {
            for (const qItem of GameState.quickslots) {
                if (qItem && GameState.hasItem(qItem, 1)) {
                    const res = GameState.useBagItem(qItem);
                    if (res.ok) {
                        vfx.spawnText(this.x, this.y - 52, res.msg, '#9df2dd');
                        break;
                    }
                }
            }
        }

        let target = selectedTarget && !selectedTarget.dead ? selectedTarget : null;
        if (!target) {
            let bestD = 420;
            for (const m of enemies) {
                if (m.dead) continue;
                const d = Math.hypot(m.x - this.x, m.y - this.y);
                if (d < bestD) {
                    bestD = d;
                    target = m;
                }
            }
            if (target) onAutoSelectTarget(target);
        }
        if (!target) return;

        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        for (let n = 0; n < 8; n++) {
            const idx = (this._autoSkillCursor + n) % 8;
            const sid = GameState.hotbar[idx];
            if (!sid) continue;
            const sdef = ResourceManager.activeSkills[sid];
            if (!sdef) continue;
            const sRange = Number(sdef.range || 120);
            if ((this.spellCooldowns[sid] || 0) <= 0.05 && GameState.mp >= (sdef.mp || 10) && dist <= sRange) {
                const res = this.castSkill(sid, target, enemies, vfx, onEnemyKilled);
                if (res.ok) {
                    this._autoSkillCursor = (idx + 1) % 8;
                    this.path = [];
                    return;
                }
            }
        }

        const weaponId = GameState.equipment.vu_khi || '';
        const reach = 38 + Number(ResourceManager.items[weaponId]?.reachBonus || 0);
        if (dist <= reach) {
            this.path = [];
            this.performBasicAttack(target, enemies, vfx, onEnemyKilled);
            return;
        }

        this._autoPathTimer -= dt;
        if (this._autoPathTimer <= 0 || this.path.length === 0) {
            this._autoPathTimer = 0.45;
            this.path = Pathfinder.findPathWaypoints(map, this.x, this.y, target.x, target.y, this.flying);
        }
    }

    private _updateBolts(
        dt: number,
        enemies: EnemyEntity[],
        vfx: VfxManager,
        onEnemyKilled: (mob: EnemyEntity) => void
    ): void {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const b = this.bolts[i];
            const stepX = b.vx * dt;
            const stepY = b.vy * dt;
            b.x += stepX;
            b.y += stepY;
            b.traveled += Math.hypot(stepX, stepY);
            b.node.setPosition(b.x, -b.y, 0);

            let hitMob: EnemyEntity | null = null;
            for (const m of enemies) {
                if (m.dead) continue;
                if (Math.hypot(m.x - b.x, (m.y - 16) - b.y) <= b.hitR + 12) {
                    hitMob = m;
                    break;
                }
            }

            if (hitMob) {
                const isCrit = Math.random() < 0.18;
                const finalDmg = Math.round(b.dmg * (isCrit ? 1.55 : 1));
                AudioManager.playSfx(isCrit ? 'crit' : 'hit');
                vfx.spawnRing(hitMob.x, hitMob.y - 12, b.colorHex, Math.max(20, b.blastR || 22), 0.3);

                if (b.blastR > 0) {
                    for (const m2 of enemies) {
                        if (m2.dead) continue;
                        if (Math.hypot(m2.x - hitMob.x, m2.y - hitMob.y) <= b.blastR + 14) {
                            if (b.effect?.kind) {
                                m2.applyStatus(b.effect.kind, b.effect.time || 2.5, Math.max(1, Math.round(GameState.skillPower * 0.3)));
                            }
                            m2.takeDamage(finalDmg, vfx, isCrit, onEnemyKilled);
                        }
                    }
                } else {
                    if (b.effect?.kind) {
                        hitMob.applyStatus(b.effect.kind, b.effect.time || 2.5, Math.max(1, Math.round(GameState.skillPower * 0.3)));
                    }
                    hitMob.takeDamage(finalDmg, vfx, isCrit, onEnemyKilled);
                }

                b.node.destroy();
                this.bolts.splice(i, 1);
                continue;
            }

            if (b.traveled >= b.maxRange) {
                b.node.destroy();
                this.bolts.splice(i, 1);
            }
        }
    }

    private _tryMove(dx: number, dy: number, map: WorldMapData): boolean {
        let moved = false;
        const hw = 7;
        const hh = 10;
        if (dx !== 0) {
            const nx = Math.max(12, Math.min(map.pxWidth - 12, this.x + dx));
            if (!Pathfinder.rectBlocked(map, nx - hw, this.y - hh, nx + hw, this.y, this.flying)) {
                this.x = nx;
                moved = true;
            }
        }
        if (dy !== 0) {
            const ny = Math.max(16, Math.min(map.pxHeight - 6, this.y + dy));
            if (!Pathfinder.rectBlocked(map, this.x - hw, ny - hh, this.x + hw, ny, this.flying)) {
                this.y = ny;
                moved = true;
            }
        }
        return moved;
    }

    private _applyBodyFrame(col: number): void {
        if (!this._charAtlas) return;
        const dName = CHAR_DIRS[this.dir] || 'down';
        const frameName = `${this._charPrefix}_${dName}_${String(col).padStart(2, '0')}`;
        const sf = this._charAtlas.getSpriteFrame(frameName);
        if (sf) {
            this._bodySprite.spriteFrame = sf;
        }
    }

    private _applyVisualTransforms(questGuideTarget: { x: number; y: number } | null): void {
        this.node.setPosition(this.x, -this.y, 0);

        const hoverY = this.flyRise * (12 + Math.sin(this._animT * 3.4) * 2.2);
        this._bodyNode.setPosition(0, hoverY, 0);
        this._nameLabel.node.setPosition(0, 72 + hoverY, 0);
        this._realmLabel.node.setPosition(0, 60 + hoverY, 0);

        const shScale = 1 - this.flyRise * 0.35;
        this._shadowNode.setScale(shScale, shScale, 1);
        this._shadowSprite.color = new Color(255, 255, 255, Math.round(230 * shScale));

        this._mountNode.active = this.flyRise > 0.05 && !!this._mountSprite.spriteFrame;
        if (this._mountNode.active) {
            if (this._mountFramesByDir.length > 0) {
                const row = this._mountFramesByDir[this.dir] || this._mountFramesByDir[0];
                if (row && row.length > 0) {
                    const mIdx = Math.floor(this._animT * this._mountFps) % row.length;
                    this._mountSprite.spriteFrame = row[mIdx];
                }
            }
            this._mountNode.setPosition(0, hoverY - 2, 0);
        }

        if (this._auraNode.active && this._auraFrames.length > 0) {
            const aIdx = Math.floor(this._animT * 10) % this._auraFrames.length;
            this._auraSprite.spriteFrame = this._auraFrames[aIdx];
            this._auraNode.setPosition(0, hoverY, 0);
        }

        const hasShield = this.shieldHp > 0 && this.shieldTimer > 0;
        this._shieldNode.active = hasShield;
        if (hasShield) {
            const sc = 1 + Math.sin(this._animT * 6) * 0.05;
            this._shieldNode.setPosition(0, 28 + hoverY, 0);
            this._shieldNode.setScale(sc, sc, 1);
        }

        if (questGuideTarget) {
            const dx = questGuideTarget.x - this.x;
            const dy = questGuideTarget.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 44) {
                const cocAng = Math.atan2(-dy, dx);
                const r = 30 + Math.sin(this._animT * 5) * 2.5;
                this._compassNode.active = true;
                this._compassNode.setPosition(Math.cos(cocAng) * r, Math.sin(cocAng) * r + 6, 0);
                this._compassNode.angle = (cocAng * 180) / Math.PI;
                return;
            }
        }
        this._compassNode.active = false;
    }
}
