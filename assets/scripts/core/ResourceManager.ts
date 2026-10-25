import {
    AudioClip,
    BitmapFont,
    JsonAsset,
    Rect,
    resources,
    Size,
    SpriteAtlas,
    SpriteFrame,
    Texture2D,
    TTFFont,
    Vec2,
} from 'cc';
import { UiHelper } from './UiHelper';

export interface ObjectDef {
    w: number;
    h: number;
    ax: number;
    ay: number;
    animated?: boolean;
    variants?: number;
    fps?: number;
    external?: boolean;
}

export interface MapPortalDef {
    tx: number;
    ty: number;
    toMap: string;
    targetSpawn: { tx: number; ty: number };
    label?: string;
}

export interface MapPropDef {
    id: string;
    type: string;
    name: string;
    art: string | null;
    variant: number;
    tx: number;
    ty: number;
    x: number;
    y: number;
    r: number;
    block: boolean;
    herb: boolean;
    shadow: boolean;
    text: string | null;
    face: number;
    npcKey: string | null;
    npcGifAtlas: string | null;
}

export interface MapInteractableDef {
    id?: string;
    x: number;
    y: number;
    r: number;
    title: string;
    text: string;
}

export interface WorldMapData {
    id: string;
    name: string;
    subtitle: string;
    scope: string;
    ambient: string;
    width: number;
    height: number;
    pxWidth: number;
    pxHeight: number;
    spawn: { tx: number; ty: number };
    blockedRows: string[];
    flyBlockedRows: string[];
    objects: Array<{
        name: string;
        variant: number;
        tx: number;
        ty: number;
        sortY: number;
        ox: number;
        oy: number;
    }>;
    props: MapPropDef[];
    interactables: MapInteractableDef[];
    portals: MapPortalDef[];
    locationLabels: Array<{ x: number; y: number; text: string; color?: string }>;
    enemySpawns: Array<{
        id?: string;
        type: string;
        tx?: number;
        ty?: number;
        x?: number;
        y?: number;
        requireStage?: number;
    }>;
    critterSpawns: Array<{
        id: string;
        type: string;
        x: number;
        y: number;
    }>;
}

const UI_FRAME_NAMES = [
    'panel_wood_gold',
    'panel_sub_dark',
    'panel_header',
    'btn_wood',
    'btn_gold',
    'btn_crimson',
    'btn_jade',
    'btn_round_atk',
    'slot_frame',
    'slot_frame_sel',
    'bar_track',
    'bar_hp',
    'bar_mp',
    'bar_sp',
    'bar_bp',
    'bar_exp',
    'bar_gold',
    'bar_fill_white',
    'dpad_up',
    'dpad_down',
    'dpad_left',
    'dpad_right',
    'dpad_center',
    'white_pixel',
    'divider_v',
    'icon_check_on',
    'icon_check_off',
    'shadow_oval',
    'target_ring',
    'portal_ring',
    'shock_ring',
    'compass_arrow',
    'bolt_orb',
    'slash_arc',
    'light_pillar',
    'shield_bubble',
    'mote_dot',
];

const CORE_ICON_MAP: Record<string, string> = {
    'hud-auto': 'textures/ui/hud-icons/icon-hud-tu-dong',
    'hud-fly': 'textures/ui/hud-icons/icon-hud-phi-hanh',
    'hud-sit': 'textures/ui/hud-icons/icon-hud-toa',
    'hud-target': 'textures/ui/hud-icons/icon-hud-doi',
    'hud-gear': 'textures/ui/hud-icons/icon-hud-gear',
    'hud-event': 'textures/ui/hud-icons/icon-hud-event',
    'hud-sect': 'textures/ui/hud-icons/icon-hud-sect',
    'hud-inspect': 'textures/ui/hud-icons/icon-hud-inspect',
    'hud-exchange': 'textures/ui/hud-icons/icon-hud-exchange',
    'hud-settings': 'textures/ui/hud-icons/icon-hud-settings',
    'hud-mail': 'textures/ui/hud-icons/icon-hud-mail',
    'ic-bag': 'textures/items/icon_tui_can_khon',
    'ic-book': 'textures/items/icon_bi_tich',
    'ic-stone': 'textures/items/icon_spirit_stone',
    'ic-pill': 'textures/items/icon_tu_khi_dan',
    'ic-pill-gold': 'textures/items/icon_pill_gold',
    'ic-gift': 'textures/items/icon_hop_qua_tan_thu',
    'ic-gacha': 'textures/items/icon_hop_van_bao',
    'ic-map': 'textures/items/icon_formation_board_dao_gia',
    'ic-sword': 'textures/items/icon_iron_sword',
    'ic-bamboo-sword': 'textures/items/icon_bamboo_sword',
    'ic-ore': 'textures/items/icon_ore',
    'ic-herb': 'textures/items/icon_herb_linh',
    'ic-bowl': 'textures/items/icon_com_bowl',
    'ic-fish': 'textures/items/icon_fish',
    'ic-gourd': 'textures/items/icon_gourd',
    'ic-hat': 'textures/items/icon_non_la',
    'ic-leaf': 'textures/items/icon_phi_diep',
    'logo': 'textures/ui/branding/logo-256',
    'logo-icon': 'textures/ui/branding/tu-tien-2d-icon',
    'loading-splash': 'textures/ui/branding/hero-gameplay-poster',
    'formation-dao': 'textures/ui/formations/dao-gia',
    'formation-fire': 'textures/ui/formations/liet-hoa',
    'formation-spirit': 'textures/ui/formations/tu-linh',
};

export class ResourceManager {
    public static realms: any[] = [];
    public static items: Record<string, any> = {};
    public static enemies: Record<string, any> = {};
    public static activeSkills: Record<string, any> = {};
    public static passiveSkills: Record<string, any> = {};
    public static talismans: Record<string, any> = {};
    public static formations: Record<string, any> = {};
    public static charOptions: any = {};
    public static worldMaps: Record<string, WorldMapData> = {};
    public static objectDefs: Record<string, ObjectDef> = {};
    public static gameplaySystems: any = {};

    private static _sfCache = new Map<string, SpriteFrame | null>();
    private static _atlasCache = new Map<string, SpriteAtlas | null>();
    private static _framesCache = new Map<string, SpriteFrame[]>();
    private static _bgmCache = new Map<string, AudioClip | null>();
    private static _inflight = new Map<string, Promise<any>>();
    private static _essReady: Promise<void> | null = null;
    private static _activeLoads: number = 0;
    private static _loadQueue: Array<() => void> = [];

    private static _acquireSlot(): Promise<void> {
        if (ResourceManager._activeLoads < 32) {
            ResourceManager._activeLoads++;
            return Promise.resolve();
        }
        return new Promise((resolve) => ResourceManager._loadQueue.push(resolve));
    }

    private static _releaseSlot(): void {
        const next = ResourceManager._loadQueue.shift();
        if (next) {
            next();
        } else {
            ResourceManager._activeLoads = Math.max(0, ResourceManager._activeLoads - 1);
        }
    }

    private static _dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const existing = ResourceManager._inflight.get(key);
        if (existing) return existing as Promise<T>;
        const p = (async () => {
            await ResourceManager._acquireSlot();
            try {
                return await fn();
            } finally {
                ResourceManager._releaseSlot();
                ResourceManager._inflight.delete(key);
            }
        })();
        ResourceManager._inflight.set(key, p);
        return p;
    }

    public static preloadEssentials(): Promise<void> {
        if (!ResourceManager._essReady) {
            ResourceManager._essReady = Promise.all([
                ResourceManager._loadFonts(),
                ResourceManager._preloadUiSkinAndIcons(),
            ]).then(() => undefined);
        }
        return ResourceManager._essReady;
    }

    public static async initAll(onProgress?: (ratio: number, status: string) => void): Promise<void> {
        await ResourceManager.preloadEssentials();

        const steps: Array<[string, () => Promise<void>]> = [
            ['Đang nạp Cảnh Giới và Vật Phẩm...', async () => {
                const [rJson, iJson] = await Promise.all([
                    ResourceManager._loadJson('data/realms'),
                    ResourceManager._loadJson('data/items'),
                ]);
                ResourceManager.realms = rJson?.realms || [];
                ResourceManager.items = iJson?.items || iJson || {};
            }],
            ['Đang nạp Pháp Quyết, Phù Chú và Yêu Thú...', async () => {
                const [sJson, eJson, tfJson, coJson] = await Promise.all([
                    ResourceManager._loadJson('data/skills'),
                    ResourceManager._loadJson('data/enemies'),
                    ResourceManager._loadJson('data/talismans_formations'),
                    ResourceManager._loadJson('data/character_options'),
                ]);
                ResourceManager.activeSkills = sJson?.activeDefs || {};
                ResourceManager.passiveSkills = sJson?.passiveDefs || {};
                ResourceManager.enemies = eJson?.enemies || {};
                ResourceManager.talismans = tfJson?.talismans || {};
                ResourceManager.formations = tfJson?.formations || {};
                ResourceManager.charOptions = coJson || {};
            }],
            ['Đang nạp Tam Giới Bản Đồ và Cảnh Vật...', async () => {
                const [wmJson, odJson, gsJson] = await Promise.all([
                    ResourceManager._loadJson('data/world_maps_full'),
                    ResourceManager._loadJson('data/object_defs'),
                    ResourceManager._loadJson('data/gameplay_systems'),
                ]);
                ResourceManager.worldMaps = wmJson || {};
                ResourceManager.objectDefs = odJson || {};
                ResourceManager.gameplaySystems = gsJson || {};
                const starterOutfits = ['bach_y', 'thanh_y', 'lam_y', 'hac_y', 'tu_quang_y', 'huyet_anh_y'];
                await Promise.all(
                    starterOutfits.flatMap((o) => [
                        ResourceManager.loadCharacterAtlas('male', o),
                        ResourceManager.loadCharacterAtlas('female', o),
                    ])
                );
            }],
        ];

        for (let i = 0; i < steps.length; i++) {
            const [label, fn] = steps[i];
            onProgress?.(i / steps.length, label);
            await fn();
        }
        onProgress?.(1, 'Hoàn tất khai mở Tiên Đồ!');
    }

    private static async _preloadUiSkinAndIcons(): Promise<void> {
        const frameTasks = UI_FRAME_NAMES.map(async (name) => {
            const sf = await ResourceManager.loadSpriteFrame(`textures/ui/frames/${name}`);
            if (sf) UiHelper.registerSkin(name, sf);
        });
        const iconTasks = Object.entries(CORE_ICON_MAP).map(async ([key, path]) => {
            const sf = await ResourceManager.loadSpriteFrame(path);
            if (sf) UiHelper.registerIcon(key, sf);
        });
        await Promise.all([...frameTasks, ...iconTasks]);
    }

    private static async _loadFonts(): Promise<void> {
        const loadFont = <T extends TTFFont | BitmapFont>(path: string, type: new () => T): Promise<T | null> =>
            new Promise((resolve) => {
                resources.load(path, type as any, (err, asset) => resolve(err ? null : (asset as unknown as T)));
            });

        const [pixel, serif, bmp] = await Promise.all([
            loadFont('fonts/Galmuri11-vi', TTFFont),
            loadFont('fonts/Baloo2-Vietnamese', TTFFont),
            loadFont('fonts/font90', BitmapFont),
        ]);
        UiHelper.pixelFont = pixel;
        UiHelper.serifFont = serif;
        UiHelper.dmgBitmapFont = bmp;
    }

    private static _loadJson(path: string): Promise<any> {
        return new Promise((resolve) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err || !asset) {
                    resolve({});
                    return;
                }
                resolve(asset.json);
            });
        });
    }

    public static loadSpriteFrame(resPathWithoutSuffix: string): Promise<SpriteFrame | null> {
        if (ResourceManager._sfCache.has(resPathWithoutSuffix)) {
            return Promise.resolve(ResourceManager._sfCache.get(resPathWithoutSuffix) || null);
        }
        return ResourceManager._dedupe(`sf:${resPathWithoutSuffix}`, () =>
            new Promise((resolve) => {
                resources.load(`${resPathWithoutSuffix}/spriteFrame`, SpriteFrame, (err, sf) => {
                    if (!err && sf) {
                        ResourceManager._sfCache.set(resPathWithoutSuffix, sf);
                        resolve(sf);
                        return;
                    }
                    ResourceManager._sfCache.set(resPathWithoutSuffix, null);
                    resolve(null);
                });
            })
        );
    }

    public static loadTexture(resPath: string): Promise<Texture2D | null> {
        return ResourceManager._dedupe(`tex:${resPath}`, () =>
            new Promise((resolve) => {
                resources.load(`${resPath}/texture`, Texture2D, (err, tex) => {
                    if (!err && tex) {
                        resolve(tex);
                        return;
                    }
                    resources.load(`${resPath}/spriteFrame`, SpriteFrame, (err2, sf) => {
                        if (!err2 && sf && sf.texture) {
                            resolve(sf.texture as Texture2D);
                        } else {
                            resolve(null);
                        }
                    });
                });
            })
        );
    }

    public static loadAtlas(resPath: string): Promise<SpriteAtlas | null> {
        if (ResourceManager._atlasCache.has(resPath)) {
            return Promise.resolve(ResourceManager._atlasCache.get(resPath) || null);
        }
        return ResourceManager._dedupe(`atlas:${resPath}`, () =>
            new Promise((resolve) => {
                resources.load(resPath, SpriteAtlas, (err, atlas) => {
                    const res = !err && atlas ? atlas : null;
                    ResourceManager._atlasCache.set(resPath, res);
                    resolve(res);
                });
            })
        );
    }

    public static loadWorldMapSprite(mapId: string): Promise<SpriteFrame | null> {
        return ResourceManager.loadSpriteFrame(`textures/world_maps/${mapId}`);
    }

    public static loadMinimapSprite(mapId: string): Promise<SpriteFrame | null> {
        return ResourceManager.loadSpriteFrame(`textures/minimaps/${mapId}`);
    }

    public static async loadCharacterAtlas(gender: string, outfit: string): Promise<{ atlas: SpriteAtlas | null; prefix: string }> {
        const g = gender === 'female' ? 'female' : 'male';
        const candidates = [outfit || 'bach_y', 'bach_y', 'thanh_y', 'lam_y', 'quan_dui'];
        for (const o of candidates) {
            const key = `${g}_${o}`;
            const atlas = await ResourceManager.loadAtlas(`textures/procedural/characters/${key}`);
            if (atlas) return { atlas, prefix: key };
        }
        return { atlas: null, prefix: `${g}_bach_y` };
    }

    public static async loadNpcAtlas(npcKey: string): Promise<SpriteAtlas | null> {
        if (npcKey.startsWith('nu_tu_mieu_hoang')) {
            return ResourceManager.loadAtlas(`textures/npc/${npcKey}`);
        }
        return ResourceManager.loadAtlas(`textures/procedural/npcs/${npcKey}`);
    }

    public static async loadMobAtlas(mobType: string): Promise<SpriteAtlas | null> {
        const a1 = await ResourceManager.loadAtlas(`textures/mob/${mobType}`);
        if (a1) return a1;
        return ResourceManager.loadAtlas(`textures/procedural/mobs/${mobType}`);
    }

    public static async loadItemIcon(iconOrItemId: string): Promise<SpriteFrame | null> {
        if (!iconOrItemId) return null;
        if (iconOrItemId === 'linh_thach' || iconOrItemId === 'spirit_stone') {
            return ResourceManager.loadSpriteFrame('textures/items/icon_spirit_stone');
        }
        const item = ResourceManager.items[iconOrItemId];
        const rawIcon = item?.icon || iconOrItemId;
        const clean = rawIcon.startsWith('icon_') ? rawIcon : `icon_${rawIcon}`;
        const s1 = await ResourceManager.loadSpriteFrame(`textures/items/${clean}`);
        if (s1) return s1;
        const s2 = await ResourceManager.loadSpriteFrame(`textures/procedural/items/${clean}`);
        if (s2) return s2;
        if (iconOrItemId !== rawIcon) {
            const alt = iconOrItemId.startsWith('icon_') ? iconOrItemId : `icon_${iconOrItemId}`;
            const s3 = await ResourceManager.loadSpriteFrame(`textures/items/${alt}`);
            if (s3) return s3;
            const s4 = await ResourceManager.loadSpriteFrame(`textures/procedural/items/${alt}`);
            if (s4) return s4;
        }
        return null;
    }

    public static async loadSkillIcon(skillId: string): Promise<SpriteFrame | null> {
        const folders = ['so-cap', 'trung-cap', 'thuong-pham'];
        const aliases = [skillId, skillId === 'so_xich_chan' ? 'xich_chan' : skillId];
        for (const alias of aliases) {
            for (const folder of folders) {
                const sf = await ResourceManager.loadSpriteFrame(`textures/ui/skill-icons/${folder}/${alias}`);
                if (sf) return sf;
            }
        }
        const def = ResourceManager.activeSkills[skillId] || ResourceManager.passiveSkills[skillId];
        if (def?.book) {
            return ResourceManager.loadItemIcon(def.book);
        }
        return ResourceManager.loadSpriteFrame('textures/items/icon_bi_tich');
    }

    public static async loadBiTichCard(skillIdOrBookId: string): Promise<SpriteFrame | null> {
        const clean = skillIdOrBookId.replace(/^bi_tich_/, '');
        const aliases = [clean, clean === 'so_xich_chan' ? 'xich_chan' : clean];
        for (const alias of aliases) {
            const card = await ResourceManager.loadSpriteFrame(`textures/ui/bi-tich-cards/${alias}`);
            if (card) return card;
        }
        return ResourceManager.loadSkillIcon(clean);
    }

    public static makeSubFrame(tex: Texture2D, rx: number, ry: number, rw: number, rh: number): SpriteFrame {
        const cw = Math.max(1, Math.min(rw, tex.width - rx));
        const ch = Math.max(1, Math.min(rh, tex.height - ry));
        const sf = new SpriteFrame();
        sf.reset({
            texture: tex,
            rect: new Rect(rx, ry, cw, ch),
            originalSize: new Size(cw, ch),
            offset: new Vec2(0, 0),
            isRotate: false,
        });
        sf.packable = false;
        return sf;
    }

    public static async loadMountSheet(mountId: string): Promise<{
        framesByDir: SpriteFrame[][];
        drawW: number;
        drawH: number;
        fps: number;
    } | null> {
        if (!mountId) return null;
        const sheetConfigs: Record<string, {
            texPath: string;
            fw: number;
            fh: number;
            cols: number;
            rows: number;
            drawW: number;
            drawH: number;
            fps: number;
        }> = {
            ngua_hac_tho: { texPath: 'textures/mount/ngua_hac_tho_2', fw: 176, fh: 128, cols: 6, rows: 4, drawW: 88, drawH: 64, fps: 10 },
            hac_tien: { texPath: 'textures/mount/hac_tien', fw: 154, fh: 120, cols: 2, rows: 4, drawW: 77, drawH: 60, fps: 4 },
            huyet_nguyet_ung: { texPath: 'textures/mount/huyet_nguyet_ung', fw: 220, fh: 188, cols: 8, rows: 4, drawW: 110, drawH: 94, fps: 8 },
            kim_phi_kiem: { texPath: 'textures/mount/kim_phi_kiem', fw: 128, fh: 96, cols: 1, rows: 4, drawW: 64, drawH: 48, fps: 1 },
            phi_hanh_ho_lo: { texPath: 'textures/mount/phi_hanh_ho_lo', fw: 192, fh: 144, cols: 1, rows: 4, drawW: 64, drawH: 48, fps: 1 },
            tham_than: { texPath: 'textures/mount/tham_than', fw: 104, fh: 80, cols: 6, rows: 4, drawW: 52, drawH: 40, fps: 8 },
        };

        const cfg = sheetConfigs[mountId];
        if (cfg) {
            const tex = await ResourceManager.loadTexture(cfg.texPath);
            if (tex) {
                const framesByDir: SpriteFrame[][] = [];
                for (let r = 0; r < cfg.rows; r++) {
                    const rowFrames: SpriteFrame[] = [];
                    for (let c = 0; c < cfg.cols; c++) {
                        rowFrames.push(ResourceManager.makeSubFrame(tex, c * cfg.fw, r * cfg.fh, cfg.fw, cfg.fh));
                    }
                    framesByDir.push(rowFrames);
                }
                return { framesByDir, drawW: cfg.drawW, drawH: cfg.drawH, fps: cfg.fps };
            }
        }

        const iconSf = await ResourceManager.loadItemIcon(mountId);
        if (iconSf) {
            return {
                framesByDir: [[iconSf], [iconSf], [iconSf], [iconSf]],
                drawW: 36,
                drawH: 26,
                fps: 1,
            };
        }
        return null;
    }

    public static async loadMountSprite(mountId: string): Promise<SpriteFrame | null> {
        const sheet = await ResourceManager.loadMountSheet(mountId);
        return sheet?.framesByDir[0]?.[0] || null;
    }

    public static async loadAuraAtlas(he: string): Promise<SpriteAtlas | null> {
        if (!he || he === 'none') return null;
        return ResourceManager.loadAtlas(`textures/aura/aura_he_${he}`);
    }

    public static async loadFxAtlas(fxName: string): Promise<SpriteAtlas | null> {
        return ResourceManager.loadAtlas(`textures/fx/${fxName}`);
    }

    public static async loadHudIcon(iconName: string): Promise<SpriteFrame | null> {
        return ResourceManager.loadSpriteFrame(`textures/ui/hud-icons/${iconName}`);
    }

    public static async loadObjectFrames(objName: string): Promise<SpriteFrame[]> {
        if (ResourceManager._framesCache.has(`obj:${objName}`)) {
            return ResourceManager._framesCache.get(`obj:${objName}`)!;
        }
        const def = ResourceManager.objectDefs[objName];
        let tex = await ResourceManager.loadTexture(`textures/objects/${objName}`);
        if (!tex) {
            tex = await ResourceManager.loadTexture(`textures/procedural/objects/${objName}`);
        }
        if (!tex) {
            ResourceManager._framesCache.set(`obj:${objName}`, []);
            return [];
        }

        const tw = tex.width;
        const th = tex.height;
        const defW = def?.w || tw;
        const defH = def?.h || th;
        const variants = Math.max(1, def?.variants || 1);
        const frames: SpriteFrame[] = [];

        if (variants === 9 && tw >= defW * 2.3 && th >= defH * 2.3) {
            const cw = Math.floor(tw / 3);
            const ch = Math.floor(th / 3);
            for (let i = 0; i < 9; i++) {
                frames.push(ResourceManager.makeSubFrame(tex, (i % 3) * cw, Math.floor(i / 3) * ch, cw, ch));
            }
        } else if (variants > 1 && tw >= defW * 1.75) {
            const cw = Math.floor(tw / variants);
            for (let i = 0; i < variants; i++) {
                frames.push(ResourceManager.makeSubFrame(tex, i * cw, 0, cw, th));
            }
        } else {
            frames.push(ResourceManager.makeSubFrame(tex, 0, 0, tw, th));
        }

        ResourceManager._framesCache.set(`obj:${objName}`, frames);
        return frames;
    }

    public static async loadCritterFrames(critterType: string, spriteDef: any): Promise<SpriteFrame[]> {
        const key = `critter:${critterType}`;
        if (ResourceManager._framesCache.has(key)) {
            return ResourceManager._framesCache.get(key)!;
        }
        const tex = await ResourceManager.loadTexture(`textures/mob/${critterType}`);
        if (!tex) {
            ResourceManager._framesCache.set(key, []);
            return [];
        }
        const count = Math.max(1, spriteDef?.frames || 1);
        const horizontal = !!spriteDef?.horizontal;
        const tw = tex.width;
        const th = tex.height;
        const frames: SpriteFrame[] = [];

        if (count <= 1) {
            frames.push(ResourceManager.makeSubFrame(tex, 0, 0, spriteDef?.w || tw, spriteDef?.h || th));
        } else if (horizontal || tw > th * 2) {
            const cw = spriteDef?.w || Math.floor(tw / count);
            const ch = spriteDef?.h || th;
            for (let i = 0; i < count; i++) {
                frames.push(ResourceManager.makeSubFrame(tex, i * cw, 0, cw, ch));
            }
        } else {
            const cw = spriteDef?.w || tw;
            const ch = spriteDef?.h || Math.floor(th / count);
            for (let i = 0; i < count; i++) {
                frames.push(ResourceManager.makeSubFrame(tex, 0, i * ch, cw, ch));
            }
        }

        ResourceManager._framesCache.set(key, frames);
        return frames;
    }

    public static loadBgm(trackName: string): Promise<AudioClip | null> {
        if (ResourceManager._bgmCache.has(trackName)) {
            return Promise.resolve(ResourceManager._bgmCache.get(trackName) || null);
        }
        return new Promise((resolve) => {
            resources.load(`audio/bgm/${trackName}`, AudioClip, (err, clip) => {
                const res = !err && clip ? clip : null;
                ResourceManager._bgmCache.set(trackName, res);
                resolve(res);
            });
        });
    }
}
