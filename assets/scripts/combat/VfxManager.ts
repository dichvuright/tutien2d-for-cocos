import {
    Color,
    Label,
    Node,
    Sprite,
    SpriteAtlas,
    SpriteFrame,
    UIOpacity,
    UITransform,
} from 'cc';
import { ResourceManager } from '../core/ResourceManager';
import { UiHelper } from '../core/UiHelper';

interface FloatingTextItem {
    node: Node;
    opacity: UIOpacity;
    vx: number;
    vy: number;
    age: number;
    life: number;
}

interface RingFxItem {
    node: Node;
    opacity: UIOpacity;
    maxR: number;
    age: number;
    life: number;
}

interface ParticleFxItem {
    node: Node;
    opacity: UIOpacity;
    vx: number;
    vy: number;
    age: number;
    life: number;
}

interface AtlasFxItem {
    node: Node;
    sprite: Sprite;
    opacity: UIOpacity;
    frames: SpriteFrame[];
    fps: number;
    age: number;
    life: number;
}

export interface GroundLootDrop {
    id: number;
    itemId: string;
    qty: number;
    stones: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    age: number;
    state: 'bounce' | 'ground' | 'fly';
    flyT: number;
    node: Node;
    sortY: number;
}

const SKILL_FX_ATLAS_MAP: Record<string, string> = {
    loi_chuong: 'loi_chuong',
    bang_kiem_tran: 'bang_kiem_tran',
    huyet_kiem_tran: 'huyet_kiem_tran',
    cuu_huyet_kiem_tran: 'cuu_huyet_kiem_tran',
    thanh_lam_kiem_tru: 'thanh_lam_kiem_tru',
    kim_thuong_giang_the: 'kim_thuong_giang_the',
    bang_kiem_luan: 'bang_kiem_luan_bf',
    kim_quang_cu_kiem: 'kim_quang_cu_kiem',
    van_kiem_quy_tong: 'van_kiem_quy_tong_luoi',
    phi_long_tai_thien: 'phi_long_tai_thien',
    bich_nguc_giang_dao: 'bich_nguc_ta_dao_giang',
    am_hon: 'am_hon',
};

export class VfxManager {
    private _backLayer: Node;
    private _frontLayer: Node;
    private _ySortLayer: Node;

    private _texts: FloatingTextItem[] = [];
    private _rings: RingFxItem[] = [];
    private _particles: ParticleFxItem[] = [];
    private _atlasFxs: AtlasFxItem[] = [];
    public drops: GroundLootDrop[] = [];
    private _nextDropId: number = 1;

    constructor(backLayer: Node, ySortLayer: Node, frontLayer: Node) {
        this._backLayer = backLayer;
        this._ySortLayer = ySortLayer;
        this._frontLayer = frontLayer;
    }

    public clearAll(): void {
        for (const t of this._texts) t.node.destroy();
        for (const r of this._rings) r.node.destroy();
        for (const p of this._particles) p.node.destroy();
        for (const a of this._atlasFxs) a.node.destroy();
        for (const d of this.drops) d.node.destroy();
        this._texts = [];
        this._rings = [];
        this._particles = [];
        this._atlasFxs = [];
        this.drops = [];
    }

    public spawnText(wx: number, wy: number, text: string, colorHex: string = '#ffe89c', isBig: boolean = false): void {
        const node = UiHelper.createNode('FloatText', this._frontLayer, 200, 30);
        node.setPosition(wx + (Math.random() - 0.5) * 12, -wy, 0);
        const opacity = node.addComponent(UIOpacity);

        const isPureNumber = /^[+-]?\d+$/.test(text.trim());
        if (isPureNumber && UiHelper.dmgBitmapFont && colorHex === '#ff5c4d') {
            const lbl = node.addComponent(Label);
            lbl.useSystemFont = false;
            lbl.font = UiHelper.dmgBitmapFont;
            lbl.fontSize = isBig ? 24 : 18;
            lbl.lineHeight = 28;
            lbl.string = text;
            node.setScale(isBig ? 0.85 : 0.65, isBig ? 0.85 : 0.65, 1);
        } else {
            UiHelper.createLabel('Txt', node, text, {
                size: isBig ? 16 : 12,
                colorHex,
                bold: true,
                outlineHex: '#0a0704',
                outlineWidth: 2,
            });
        }

        this._texts.push({
            node,
            opacity,
            vx: (Math.random() - 0.5) * 16,
            vy: isBig ? 42 : 30,
            age: 0,
            life: isBig ? 1.25 : 0.95,
        });
    }

    public spawnRing(
        wx: number,
        wy: number,
        colorHex: string = '#9df2dd',
        maxRadius: number = 36,
        duration: number = 0.55,
        onBack: boolean = false,
        _lineWidth: number = 2.2
    ): void {
        const parent = onBack ? this._backLayer : this._frontLayer;
        const node = UiHelper.createNode('RingFx', parent, 64, 40);
        node.setPosition(wx, -wy, 0);
        const opacity = node.addComponent(UIOpacity);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = UiHelper.skin('shock_ring');
        sp.color = UiHelper.hex(colorHex, 240);
        node.setScale(0.15, 0.15, 1);

        this._rings.push({
            node,
            opacity,
            maxR: maxRadius,
            age: 0,
            life: Math.max(0.15, duration),
        });
    }

    public spawnClickMarker(wx: number, wy: number): void {
        this.spawnRing(wx, wy, '#ffe27a', 16, 0.36, true);
    }

    public spawnSlashArc(wx: number, wy: number, dirAngleRad: number, reach: number = 34, colorHex: string = '#dff6ff'): void {
        const cocAngle = -dirAngleRad;
        const size = Math.min(86, Math.max(44, reach * 1.35));
        const node = UiHelper.createNode('SlashArc', this._frontLayer, size, size);
        node.setPosition(wx, -(wy - 18), 0);
        node.angle = (cocAngle * 180) / Math.PI;
        const opacity = node.addComponent(UIOpacity);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = UiHelper.skin('slash_arc');
        sp.color = UiHelper.hex(colorHex, 245);

        this._particles.push({
            node,
            opacity,
            vx: Math.cos(cocAngle) * 26,
            vy: Math.sin(cocAngle) * 26,
            age: 0,
            life: 0.2,
        });
    }

    public spawnGatherMote(wx: number, wy: number, colorHex: string = '#9df2dd'): void {
        const angle = Math.random() * Math.PI * 2;
        const dist = 26 + Math.random() * 24;
        const sx = wx + Math.cos(angle) * dist;
        const sy = wy - 14 + Math.sin(angle) * dist * 0.55;

        const node = UiHelper.createNode('Mote', this._frontLayer, 8, 8);
        node.setPosition(sx, -sy, 0);
        const opacity = node.addComponent(UIOpacity);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = UiHelper.skin('mote_dot');
        sp.color = UiHelper.hex(colorHex, 235);

        const life = 0.55;
        this._particles.push({
            node,
            opacity,
            vx: (wx - sx) / life,
            vy: (-(wy - 22) - (-sy)) / life,
            age: 0,
            life,
        });
    }

    public spawnPillar(wx: number, wy: number, colorHex: string = '#e8fff6', duration: number = 1.4): void {
        const node = UiHelper.createNode('HeavenPillar', this._frontLayer, 64, 320, 0.5, 0);
        node.setPosition(wx, -wy, 0);
        const opacity = node.addComponent(UIOpacity);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        sp.spriteFrame = UiHelper.skin('light_pillar');
        sp.color = UiHelper.hex(colorHex, 235);

        this._particles.push({
            node,
            opacity,
            vx: 0,
            vy: 8,
            age: 0,
            life: duration,
        });
    }

    public async spawnLightning(wx: number, wy: number, colorHex: string = '#d9b8ff'): Promise<void> {
        this.spawnRing(wx, wy, colorHex, 34, 0.35, false);
        const atlas = await ResourceManager.loadFxAtlas('loi_chuong');
        if (atlas) {
            const frames = atlas
                .getSpriteFrames()
                .filter((f): f is SpriteFrame => !!f)
                .sort((a, b) => a.name.localeCompare(b.name));
            if (frames.length > 0) {
                const node = UiHelper.createNode('LightningAtlasFx', this._frontLayer, 128, 128, 0.5, 0.25);
                node.setPosition(wx, -wy, 0);
                const opacity = node.addComponent(UIOpacity);
                const sp = node.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.RAW;
                sp.trim = false;
                sp.spriteFrame = frames[0];
                this._atlasFxs.push({
                    node,
                    sprite: sp,
                    opacity,
                    frames,
                    fps: 18,
                    age: 0,
                    life: frames.length / 18,
                });
                return;
            }
        }
        this.spawnPillar(wx, wy, colorHex, 0.32);
    }

    public async spawnSkillImpact(skillId: string, wx: number, wy: number, colorHex: string = '#ffd27a', radius: number = 32): Promise<void> {
        this.spawnRing(wx, wy, colorHex, Math.max(22, radius), 0.42, false);
        const fxName = SKILL_FX_ATLAS_MAP[skillId];
        if (!fxName) {
            if (skillId.includes('loi')) {
                this.spawnLightning(wx, wy, '#d8b4ff');
            }
            return;
        }
        const atlas: SpriteAtlas | null = await ResourceManager.loadFxAtlas(fxName);
        if (!atlas) return;
        const frames = atlas
            .getSpriteFrames()
            .filter((f): f is SpriteFrame => !!f)
            .sort((a, b) => a.name.localeCompare(b.name));
        if (frames.length === 0) return;

        const node = UiHelper.createNode('AtlasSkillFx', this._frontLayer, 128, 128, 0.5, 0.35);
        node.setPosition(wx, -wy, 0);
        const opacity = node.addComponent(UIOpacity);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.RAW;
        sp.trim = false;
        sp.spriteFrame = frames[0];
        const scale = Math.min(1.15, Math.max(0.55, (radius * 2.4) / Math.max(64, frames[0].rect.width)));
        node.setScale(scale, scale, 1);

        const fps = 16;
        this._atlasFxs.push({
            node,
            sprite: sp,
            opacity,
            frames,
            fps,
            age: 0,
            life: frames.length / fps,
        });
    }

    public async spawnLootDrop(wx: number, wy: number, itemId: string, qty: number = 1, stones: number = 0): Promise<void> {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 18;
        const tx = wx + Math.cos(angle) * dist;
        const ty = wy + Math.sin(angle) * dist * 0.7;

        const node = UiHelper.createNode('LootDrop', this._ySortLayer, 28, 28, 0.5, 0.25);
        node.setPosition(wx, -wy, 0);

        const itemDef = itemId ? ResourceManager.items[itemId] : null;
        const rarityHex = stones > 0 && !itemId ? '#7ee8ff' : UiHelper.gradeColor(itemDef?.grade);

        const sh = UiHelper.createIconNode('Shadow', node, UiHelper.skin('shadow_oval'), 22, 8);
        sh.node.setPosition(0, 0, 0);

        const ring = UiHelper.createIconNode('RarityRing', node, UiHelper.skin('target_ring'), 24, 14);
        ring.node.setPosition(0, 2, 0);
        ring.sprite.color = UiHelper.hex(rarityHex, 210);

        const iconNode = UiHelper.createNode('Icon', node, 20, 20);
        iconNode.setPosition(0, 11, 0);
        const iconName = itemId || 'linh_thach';
        ResourceManager.loadItemIcon(iconName).then((sf) => {
            if (!node.isValid) return;
            UiHelper.attachSprite(iconNode, sf || UiHelper.icon('ic-stone') || UiHelper.skin('bolt_orb'), 20, 20);
        });

        const labelText = stones > 0 && !itemId ? `${stones} Linh Thạch` : (itemDef?.name || itemId);
        const lbl = UiHelper.createLabel('DropName', node, labelText, {
            size: 9,
            colorHex: rarityHex,
            outlineHex: '#080604',
            outlineWidth: 1.5,
        });
        lbl.node.setPosition(0, 26, 0);

        this.drops.push({
            id: this._nextDropId++,
            itemId,
            qty,
            stones,
            x: wx,
            y: wy,
            startX: wx,
            startY: wy,
            targetX: tx,
            targetY: ty,
            age: 0,
            state: 'bounce',
            flyT: 0,
            node,
            sortY: ty,
        });
    }

    public update(
        dt: number,
        playerX: number,
        playerY: number,
        onCollectDrop: (drop: GroundLootDrop) => void
    ): void {
        for (let i = this._texts.length - 1; i >= 0; i--) {
            const t = this._texts[i];
            t.age += dt;
            if (t.age >= t.life) {
                t.node.destroy();
                this._texts.splice(i, 1);
                continue;
            }
            const pos = t.node.position;
            t.node.setPosition(pos.x + t.vx * dt, pos.y + t.vy * dt, 0);
            t.vy *= 0.96;
            const fadeStart = t.life * 0.6;
            if (t.age > fadeStart) {
                t.opacity.opacity = Math.max(0, Math.round(255 * (1 - (t.age - fadeStart) / (t.life - fadeStart))));
            }
        }

        for (let i = this._rings.length - 1; i >= 0; i--) {
            const r = this._rings[i];
            r.age += dt;
            if (r.age >= r.life) {
                r.node.destroy();
                this._rings.splice(i, 1);
                continue;
            }
            const p = r.age / r.life;
            const curR = 4 + (r.maxR - 4) * (1 - Math.pow(1 - p, 2));
            const s = curR / 30;
            r.node.setScale(s, s, 1);
            r.opacity.opacity = Math.max(0, Math.round(240 * (1 - p)));
        }

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                p.node.destroy();
                this._particles.splice(i, 1);
                continue;
            }
            const pos = p.node.position;
            p.node.setPosition(pos.x + p.vx * dt, pos.y + p.vy * dt, 0);
            p.opacity.opacity = Math.max(0, Math.round(255 * (1 - p.age / p.life)));
        }

        for (let i = this._atlasFxs.length - 1; i >= 0; i--) {
            const fx = this._atlasFxs[i];
            fx.age += dt;
            if (fx.age >= fx.life) {
                fx.node.destroy();
                this._atlasFxs.splice(i, 1);
                continue;
            }
            const idx = Math.min(fx.frames.length - 1, Math.floor(fx.age * fx.fps));
            fx.sprite.spriteFrame = fx.frames[idx];
            if (fx.age > fx.life * 0.8) {
                fx.opacity.opacity = Math.round(255 * (1 - (fx.age - fx.life * 0.8) / (fx.life * 0.2)));
            }
        }

        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.age += dt;
            if (d.state === 'bounce') {
                const dur = 0.34;
                const u = Math.min(1, d.age / dur);
                d.x = d.startX + (d.targetX - d.startX) * u;
                const arcH = 22 * 4 * u * (1 - u);
                d.y = d.startY + (d.targetY - d.startY) * u - arcH;
                d.sortY = d.targetY;
                d.node.setPosition(d.x, -d.y, 0);
                if (u >= 1) {
                    d.state = 'ground';
                    d.x = d.targetX;
                    d.y = d.targetY;
                }
            } else if (d.state === 'ground') {
                const bob = Math.sin(d.age * 4) * 2;
                d.node.setPosition(d.x, -d.y + bob, 0);
                const dist = Math.hypot(playerX - d.x, playerY - d.y);
                if (dist <= 44 || d.age >= 2.8) {
                    d.state = 'fly';
                    d.flyT = 0;
                } else if (d.age > 120) {
                    d.node.destroy();
                    this.drops.splice(i, 1);
                }
            } else if (d.state === 'fly') {
                d.flyT += dt;
                const tx = playerX;
                const ty = playerY - 18;
                const lerp = Math.min(1, dt * (9 + d.flyT * 18));
                d.x += (tx - d.x) * lerp;
                d.y += (ty - d.y) * lerp;
                d.sortY = d.y + 16;
                d.node.setPosition(d.x, -d.y, 0);
                if (Math.hypot(tx - d.x, ty - d.y) < 10 || d.flyT > 1.1) {
                    onCollectDrop(d);
                    d.node.destroy();
                    this.drops.splice(i, 1);
                }
            }
        }
    }
}
