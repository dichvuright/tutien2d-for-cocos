import {
    Color,
    EventMouse,
    EventTouch,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { FARM_SEEDS, GameState } from '../core/GameState';
import {
    MapInteractableDef,
    MapPortalDef,
    MapPropDef,
    ResourceManager,
    WorldMapData,
} from '../core/ResourceManager';
import { UiHelper } from '../core/UiHelper';
import { GroundLootDrop, VfxManager } from '../combat/VfxManager';
import { PlayerActor } from '../entities/PlayerActor';
import { CritterEntity, EnemyEntity, YSortableItem } from '../entities/WorldEntities';
import { Pathfinder, TILE_SIZE } from './Pathfinder';

interface AnimatedMapObject {
    sprite: Sprite;
    frames: SpriteFrame[];
    fps: number;
    offset: number;
}

export interface RuntimePropEntry extends YSortableItem {
    def: MapPropDef;
    node: Node;
    sprite: Sprite | null;
    frames: SpriteFrame[];
    fps: number;
    markerLabel: Label | null;
    subLabel: Label | null;
    hiddenUntil: number;
}

export class WorldController {
    public rootNode: Node;
    public worldContainer: Node;
    public mapData!: WorldMapData;
    public player: PlayerActor;
    public vfx: VfxManager;

    public enemies: EnemyEntity[] = [];
    public critters: CritterEntity[] = [];
    public props: RuntimePropEntry[] = [];
    public selectedEnemy: EnemyEntity | null = null;
    public selectedProp: RuntimePropEntry | null = null;

    public zoom: number = 2.0;
    private _zoomPresets: number[] = [1.0, 1.5, 2.0, 3.0];
    private _zoomNames: string[] = ['Toàn cảnh', 'Rộng', 'Chuẩn Pixel (2x)', 'Cận cảnh (3x)'];
    private _zoomIdx: number = 2;

    private _ambientSprite: Sprite;
    private _groundNode: Node;
    private _groundSprite: Sprite;
    private _backFxLayer: Node;
    private _portalLayer: Node;
    private _ySortLayer: Node;
    private _boltLayer: Node;
    private _frontFxLayer: Node;
    private _reticleNode: Node;
    private _reticleSprite: Sprite;
    private _chatterNode: Node;
    private _chatterLabel: Label;
    private _chatterTimer: number = 6;
    private _chatterHideTimer: number = 0;

    private _animObjects: AnimatedMapObject[] = [];
    private _staticYSortItems: YSortableItem[] = [];
    private _portalMarkers: Array<{ node: Node; baseY: number }> = [];

    private _camX: number = 272;
    private _camY: number = 860;
    private _shakeTimer: number = 0;
    private _shakeMag: number = 0;
    private _portalCooldown: number = 0;
    private _transitioning: boolean = false;
    private _loadSeq: number = 0;
    private _time: number = 0;

    private _pendingInteractProp: RuntimePropEntry | null = null;
    private _pendingInteractInfo: MapInteractableDef | null = null;
    private _autoNavTargetMap: string | null = null;

    public onInteractProp?: (prop: MapPropDef) => void;
    public onInteractInfo?: (info: MapInteractableDef) => void;
    public onMapChanged?: (map: WorldMapData) => void;
    public onToast?: (msg: string, colorHex?: string) => void;
    public onBannerAnnounce?: (title: string, sub?: string) => void;

    constructor(canvasNode: Node) {
        // Adopt pre-built WorldViewport hierarchy from TuTienMain.scene if present
        this.rootNode = UiHelper.findOrCreateNode('WorldViewport', canvasNode, 1280, 720);

        const bgNode = UiHelper.findOrCreateNode('AmbientBackdrop', this.rootNode, 3200, 2200);
        this._ambientSprite = bgNode.getComponent(Sprite) || bgNode.addComponent(Sprite);
        this._ambientSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._ambientSprite.trim = false;
        if (!this._ambientSprite.spriteFrame) {
            this._ambientSprite.spriteFrame = UiHelper.skin('white_pixel');
        }

        this.worldContainer = UiHelper.findOrCreateNode('WorldContainer', this.rootNode, 1280, 960, 0, 1);

        this._groundNode = UiHelper.findOrCreateNode('MapGround', this.worldContainer, 1280, 960, 0, 1);
        this._groundSprite = this._groundNode.getComponent(Sprite) || this._groundNode.addComponent(Sprite);
        this._groundSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._groundSprite.trim = false;

        this._portalLayer = UiHelper.findOrCreateNode('PortalLayer', this.worldContainer, 0, 0, 0, 1);
        this._backFxLayer = UiHelper.findOrCreateNode('BackFxLayer', this.worldContainer, 0, 0, 0, 1);

        this._reticleNode = UiHelper.findOrCreateNode('TargetReticle', this._backFxLayer, 44, 25);
        this._reticleSprite = this._reticleNode.getComponent(Sprite) || this._reticleNode.addComponent(Sprite);
        this._reticleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._reticleSprite.trim = false;
        if (!this._reticleSprite.spriteFrame) {
            this._reticleSprite.spriteFrame = UiHelper.skin('target_ring');
        }
        this._reticleNode.active = false;

        this._ySortLayer = UiHelper.findOrCreateNode('YSortLayer', this.worldContainer, 0, 0, 0, 1);
        this._boltLayer = UiHelper.findOrCreateNode('BoltLayer', this.worldContainer, 0, 0, 0, 1);
        this._frontFxLayer = UiHelper.findOrCreateNode('FrontFxLayer', this.worldContainer, 0, 0, 0, 1);

        const existingChatter = this._frontFxLayer.getChildByName('NpcChatterBubble');
        if (existingChatter) {
            this._chatterNode = existingChatter;
            const existLbl = existingChatter.getChildByName('ChatterTxt')?.getComponent(Label);
            this._chatterLabel = existLbl
                ? UiHelper.styleLabel(existLbl, '', {
                      size: 10,
                      lineHeight: 13,
                      colorHex: '#f6ebd2',
                      width: 214,
                      overflow: Label.Overflow.SHRINK,
                  })
                : UiHelper.createLabel('ChatterTxt', this._chatterNode, '', {
                      size: 10,
                      lineHeight: 13,
                      colorHex: '#f6ebd2',
                      width: 214,
                      overflow: Label.Overflow.SHRINK,
                  });
        } else {
            const chatPanel = UiHelper.createPanel('NpcChatterBubble', this._frontFxLayer, 230, 42, {
                skin: 'sub',
            });
            this._chatterNode = chatPanel.node;
            this._chatterLabel = UiHelper.createLabel('ChatterTxt', this._chatterNode, '', {
                size: 10,
                lineHeight: 13,
                colorHex: '#f6ebd2',
                width: 214,
                overflow: Label.Overflow.SHRINK,
            });
        }
        this._chatterNode.active = false;

        this.vfx = new VfxManager(this._backFxLayer, this._ySortLayer, this._frontFxLayer);
        this.player = new PlayerActor(this._ySortLayer, this._boltLayer);

        this._bindWorldInput();
    }

    private _bindWorldInput(): void {
        this.rootNode.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
            AudioManager.unlockAudio();
            const uiLoc = ev.getUILocation();
            const vis = view.getVisibleSize();
            const screenX = uiLoc.x - vis.width * 0.5;
            const screenY = uiLoc.y - vis.height * 0.5;

            const wPos = this.worldContainer.position;
            const wx = (screenX - wPos.x) / this.zoom;
            const wy = -(screenY - wPos.y) / this.zoom;
            this.handleWorldTap(wx, wy);
        });

        this.rootNode.on(Node.EventType.MOUSE_WHEEL, (ev: EventMouse) => {
            const dy = ev.getScrollY();
            if (Math.abs(dy) > 1) {
                const nextZoom = this.zoom + (dy > 0 ? 0.12 : -0.12);
                this.zoom = Math.max(1.0, Math.min(2.6, nextZoom));
            }
        });
    }

    public cycleZoomPreset(): string {
        this._zoomIdx = (this._zoomIdx + 1) % this._zoomPresets.length;
        this.zoom = this._zoomPresets[this._zoomIdx];
        return this._zoomNames[this._zoomIdx];
    }

    public shakeCamera(mag: number = 4, dur: number = 0.28): void {
        this._shakeMag = Math.max(this._shakeMag, mag);
        this._shakeTimer = Math.max(this._shakeTimer, dur);
    }

    public async loadMap(
        mapId: string,
        spawnTile?: { tx: number; ty: number },
        exactPos?: { x: number; y: number }
    ): Promise<void> {
        const targetMap = ResourceManager.worldMaps[mapId] || ResourceManager.worldMaps['tan_vien'];
        if (!targetMap) return;

        const seq = ++this._loadSeq;
        this._transitioning = true;
        this.mapData = targetMap;
        GameState.currentMapId = targetMap.id;

        this.vfx.clearAll();
        this.player.clearBolts();
        this.selectedEnemy = null;
        this.selectedProp = null;
        this._pendingInteractProp = null;
        this._pendingInteractInfo = null;

        for (const c of this._portalLayer.children.slice()) c.destroy();
        for (const c of this._ySortLayer.children.slice()) {
            if (c !== this.player.node) c.destroy();
        }

        this.enemies = [];
        this.critters = [];
        this.props = [];
        this._animObjects = [];
        this._staticYSortItems = [];
        this._portalMarkers = [];
        this._chatterNode.active = false;

        this._ambientSprite.color = UiHelper.hex(targetMap.ambient || '#182218', 255);

        this._groundNode.getComponent(UITransform)!.setContentSize(targetMap.pxWidth, targetMap.pxHeight);
        this._groundNode.setPosition(0, 0, 0);
        const groundSf = await ResourceManager.loadWorldMapSprite(targetMap.id);
        if (seq !== this._loadSeq) return;
        if (groundSf) {
            this._groundSprite.spriteFrame = groundSf;
        }

        // 1. Spawn Map Objects
        for (let i = 0; i < (targetMap.objects || []).length; i++) {
            const o = targetMap.objects[i];
            const def = ResourceManager.objectDefs[o.name];
            if (!def) continue;

            const w = def.w || 32;
            const h = def.h || 32;
            const ax = Math.max(0, Math.min(1, (def.ax ?? w * 0.5) / w));
            const ay = Math.max(0, Math.min(1, (h - (def.ay ?? h)) / h));
            const wx = o.tx * TILE_SIZE + 16 + (o.ox || 0);
            const wy = (o.ty + 1) * TILE_SIZE + (o.oy || 0);

            const objNode = UiHelper.createNode(`Obj_${o.name}_${i}`, this._ySortLayer, w, h, ax, ay);
            objNode.setPosition(wx, -wy, 0);
            const sp = objNode.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;

            const sortYVal = o.sortY || wy;
            this._staticYSortItems.push({
                node: objNode,
                getSortY: () => sortYVal,
            });

            ResourceManager.loadObjectFrames(o.name).then((frames) => {
                if (!objNode.isValid || frames.length === 0) return;
                if (def.animated && frames.length > 1) {
                    sp.spriteFrame = frames[0];
                    this._animObjects.push({
                        sprite: sp,
                        frames,
                        fps: def.fps || 6,
                        offset: (i * 0.37) % 5,
                    });
                } else {
                    const vIdx = Math.min(frames.length - 1, Math.max(0, o.variant || 0));
                    sp.spriteFrame = frames[vIdx];
                }
            });
        }

        // 2. Spawn Map Props & NPCs
        for (const p of targetMap.props || []) {
            this._spawnProp(p);
        }

        // 3. Spawn Portals
        this._spawnPortalVisuals(targetMap.portals || []);

        // 4. Spawn Critters
        const critterDefs = ResourceManager.gameplaySystems?.critterDefs || {};
        for (const cs of targetMap.critterSpawns || []) {
            const cDef = critterDefs[cs.type];
            if (cDef) {
                this.critters.push(new CritterEntity(this._ySortLayer, cs, cDef));
            }
        }

        // 5. Spawn Enemies & Bosses (respecting quest stage gates)
        const spawns = targetMap.enemySpawns || [];
        for (let i = 0; i < spawns.length; i++) {
            const sp = spawns[i];
            if (sp.requireStage && GameState.questStage < sp.requireStage) {
                continue;
            }
            this.enemies.push(new EnemyEntity(this._ySortLayer, sp, i));
        }

        // 6. Place Player & Snap Camera
        let px = (targetMap.spawn?.tx ?? 8) * TILE_SIZE + 16;
        let py = (targetMap.spawn?.ty ?? 10) * TILE_SIZE + 28;
        if (exactPos) {
            px = exactPos.x;
            py = exactPos.y;
        } else if (spawnTile) {
            px = spawnTile.tx * TILE_SIZE + 16;
            py = spawnTile.ty * TILE_SIZE + 28;
        }
        const safeTile = Pathfinder.nearestWalkable(targetMap, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE), 5, this.player.flying);
        if (safeTile && Pathfinder.rectBlocked(targetMap, px - 7, py - 10, px + 7, py, this.player.flying)) {
            px = safeTile.tx * TILE_SIZE + 16;
            py = safeTile.ty * TILE_SIZE + 28;
        }
        this.player.setPosition(px, py);
        this.player.refreshAppearance();
        GameState.savedPos = { x: Math.round(px), y: Math.round(py) };
        GameState.save();

        this._camX = px;
        this._camY = py;
        this._updateCamera(0, true);

        this._portalCooldown = 0.85;
        this._transitioning = false;

        AudioManager.setMap(targetMap.id);
        this.onMapChanged?.(targetMap);
        this.onBannerAnnounce?.(targetMap.name, targetMap.subtitle || 'Tam Giới Tu Tiên');

        if (this._autoNavTargetMap) {
            if (this._autoNavTargetMap === targetMap.id) {
                this._autoNavTargetMap = null;
                this.guideToQuest(false);
            } else {
                const hop = Pathfinder.findNextPortalHop(targetMap.id, this._autoNavTargetMap);
                if (hop) {
                    this.player.path = Pathfinder.findPathWaypoints(
                        targetMap,
                        this.player.x,
                        this.player.y,
                        hop.tx * TILE_SIZE + 16,
                        hop.ty * TILE_SIZE + 16,
                        this.player.flying
                    );
                } else {
                    this._autoNavTargetMap = null;
                }
            }
        }
    }

    private _spawnProp(p: MapPropDef): void {
        const isNpc = p.type === 'npc';
        const artKey = p.art || p.type;
        const objDef = ResourceManager.objectDefs[artKey];

        const w = isNpc ? (p.npcGifAtlas ? 80 : 56) : (objDef?.w || 40);
        const h = isNpc ? (p.npcGifAtlas ? 80 : 68) : (objDef?.h || 40);
        const ax = isNpc ? 0.5 : Math.max(0, Math.min(1, ((objDef?.ax ?? w * 0.5) / w)));
        const ay = isNpc ? 0.03 : Math.max(0, Math.min(1, (h - (objDef?.ay ?? h)) / h));

        const node = UiHelper.createNode(`Prop_${p.id}`, this._ySortLayer, w, h, 0.5, 0);
        node.setPosition(p.x, -p.y, 0);

        if (isNpc || p.shadow) {
            UiHelper.createIconNode('Shadow', node, UiHelper.skin('shadow_oval'), 24, 9);
        }

        if (p.herb || p.type === 'meditate_stone' || p.type === 'cauldron' || p.type === 'spring') {
            const glow = UiHelper.createIconNode('PropGlow', node, UiHelper.skin('target_ring'), 30, 17);
            glow.node.setPosition(0, 2, 0);
            const col = p.herb ? '#8ef5b5' : p.type === 'cauldron' ? '#ffaa5c' : '#8fd8ff';
            glow.sprite.color = UiHelper.hex(col, 165);
        }

        const body = UiHelper.createNode('Body', node, w, h, ax, ay);
        const sp = body.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;

        let markerLbl: Label | null = null;
        let subLbl: Label | null = null;

        if (p.name) {
            const nameColor = isNpc ? '#ffd978' : p.herb ? '#a6f2be' : '#d8e8f8';
            const topY = isNpc ? h + 4 : h + 6;
            const nLbl = UiHelper.createLabel('PropName', node, p.name, {
                size: isNpc ? 10.5 : 9.5,
                colorHex: nameColor,
                bold: isNpc,
                outlineHex: '#090604',
                outlineWidth: 1.8,
            });
            nLbl.node.setPosition(0, topY, 0);

            if (p.type === 'herb_plot') {
                subLbl = UiHelper.createLabel('PlotStatus', node, 'Luống trống', {
                    size: 8.5,
                    colorHex: '#cfe6b8',
                    outlineHex: '#090604',
                    outlineWidth: 1.5,
                });
                subLbl.node.setPosition(0, topY + 12, 0);
            }

            markerLbl = UiHelper.createLabel('QuestMarker', node, '', {
                size: 16,
                colorHex: '#ffe047',
                bold: true,
                outlineHex: '#1a0d02',
                outlineWidth: 2.4,
            });
            markerLbl.node.setPosition(0, topY + 16, 0);
        }

        const entry: RuntimePropEntry = {
            def: p,
            node,
            sprite: sp,
            frames: [],
            fps: isNpc ? 2.2 : (objDef?.fps || 5),
            markerLabel: markerLbl,
            subLabel: subLbl,
            hiddenUntil: GameState.harvested[p.id] || 0,
            getSortY: () => p.y,
        };
        this.props.push(entry);

        if (isNpc) {
            const key = p.npcGifAtlas || p.npcKey || `npc_${p.id}`;
            ResourceManager.loadNpcAtlas(key).then((atlas) => {
                if (!node.isValid) return;
                if (atlas) {
                    const frames = atlas
                        .getSpriteFrames()
                        .filter((f): f is SpriteFrame => !!f)
                        .sort((a, b) => a.name.localeCompare(b.name));
                    entry.frames = frames;
                    if (p.npcGifAtlas) entry.fps = 8;
                    if (frames.length > 0) sp.spriteFrame = frames[0];
                } else {
                    ResourceManager.loadCharacterAtlas('male', 'thanh_y').then(({ atlas: cAtlas, prefix }) => {
                        if (!node.isValid || !cAtlas) return;
                        const f0 = cAtlas.getSpriteFrame(`${prefix}_down_06`);
                        const f1 = cAtlas.getSpriteFrame(`${prefix}_down_07`);
                        entry.frames = [f0, f1].filter((x): x is SpriteFrame => !!x);
                        body.getComponent(UITransform)!.setContentSize(48, 64);
                        if (entry.frames[0]) sp.spriteFrame = entry.frames[0];
                    });
                }
            });
        } else {
            ResourceManager.loadObjectFrames(artKey).then((frames) => {
                if (!node.isValid || frames.length === 0) return;
                entry.frames = frames;
                const vIdx = Math.min(frames.length - 1, Math.max(0, p.variant || 0));
                sp.spriteFrame = frames[vIdx];
            });
        }
    }

    private _spawnPortalVisuals(portals: MapPortalDef[]): void {
        const grouped = new Map<string, { sumX: number; sumY: number; count: number; toMap: string; label: string }>();
        for (const pt of portals) {
            const g = grouped.get(pt.toMap);
            const wx = pt.tx * TILE_SIZE + 16;
            const wy = pt.ty * TILE_SIZE + 16;
            if (!g) {
                grouped.set(pt.toMap, { sumX: wx, sumY: wy, count: 1, toMap: pt.toMap, label: pt.label || '' });
            } else {
                g.sumX += wx;
                g.sumY += wy;
                g.count++;
            }
        }

        for (const g of grouped.values()) {
            const cx = g.sumX / g.count;
            const cy = g.sumY / g.count;
            const destMap = ResourceManager.worldMaps[g.toMap];
            const title = g.label || destMap?.name || g.toMap;

            const dispX = Math.max(44, Math.min(this.mapData.pxWidth - 44, cx));
            const dispY = Math.max(36, Math.min(this.mapData.pxHeight - 22, cy));

            const pNode = UiHelper.createNode(`Portal_${g.toMap}`, this._portalLayer, 90, 40);
            pNode.setPosition(dispX, -dispY, 0);

            UiHelper.createIconNode('PortalRing', pNode, UiHelper.skin('portal_ring'), 46, 26);

            const lbl = UiHelper.createLabel('PortalLbl', pNode, title, {
                size: 9.5,
                colorHex: '#9df2ff',
                bold: true,
                outlineHex: '#070a0d',
                outlineWidth: 2,
            });
            lbl.node.setPosition(0, 17, 0);

            this._portalMarkers.push({ node: pNode, baseY: -dispY });
        }
    }

    public handleWorldTap(wx: number, wy: number): void {
        if (this._transitioning || this.player.downed) return;
        this._autoNavTargetMap = null;

        let bestMob: EnemyEntity | null = null;
        let bestMobDist = 36;
        for (const m of this.enemies) {
            if (m.dead) continue;
            const d = Math.hypot(m.x - wx, (m.y - 18) - wy);
            if (d < bestMobDist) {
                bestMobDist = d;
                bestMob = m;
            }
        }
        if (bestMob) {
            this.selectedEnemy = bestMob;
            this.selectedProp = null;
            this._pendingInteractProp = null;
            this._pendingInteractInfo = null;
            const distFromPlayer = Math.hypot(bestMob.x - this.player.x, bestMob.y - this.player.y);
            const weaponId = GameState.equipment.vu_khi || '';
            const reach = 38 + Number(ResourceManager.items[weaponId]?.reachBonus || 0);
            if (distFromPlayer <= reach + 8) {
                this.player.performBasicAttack(bestMob, this.enemies, this.vfx, (k) => this._handleEnemyKilled(k));
            } else {
                this.player.path = Pathfinder.findPathWaypoints(
                    this.mapData,
                    this.player.x,
                    this.player.y,
                    bestMob.x,
                    bestMob.y,
                    this.player.flying
                );
            }
            return;
        }

        let bestProp: RuntimePropEntry | null = null;
        let bestPropDist = 38;
        for (const p of this.props) {
            if (!p.node.active) continue;
            const d = Math.hypot(p.def.x - wx, (p.def.y - 20) - wy);
            if (d < bestPropDist) {
                bestPropDist = d;
                bestProp = p;
            }
        }
        if (bestProp) {
            this.selectedProp = bestProp;
            this.selectedEnemy = null;
            this._pendingInteractInfo = null;
            const dPlayer = Math.hypot(bestProp.def.x - this.player.x, bestProp.def.y - this.player.y);
            if (dPlayer <= (bestProp.def.r || 46) + 12) {
                this._triggerPropInteraction(bestProp);
            } else {
                this._pendingInteractProp = bestProp;
                this.player.path = Pathfinder.findPathWaypoints(
                    this.mapData,
                    this.player.x,
                    this.player.y,
                    bestProp.def.x,
                    bestProp.def.y + 12,
                    this.player.flying
                );
            }
            return;
        }

        for (const info of this.mapData.interactables || []) {
            if (Math.hypot(info.x - wx, info.y - wy) <= (info.r || 42)) {
                this._pendingInteractProp = null;
                const dp = Math.hypot(info.x - this.player.x, info.y - this.player.y);
                if (dp <= (info.r || 42) + 16) {
                    this.onInteractInfo?.(info);
                } else {
                    this._pendingInteractInfo = info;
                    this.player.path = Pathfinder.findPathWaypoints(
                        this.mapData,
                        this.player.x,
                        this.player.y,
                        info.x,
                        info.y + 10,
                        this.player.flying
                    );
                }
                return;
            }
        }

        this._pendingInteractProp = null;
        this._pendingInteractInfo = null;
        const clampedX = Math.max(16, Math.min(this.mapData.pxWidth - 16, wx));
        const clampedY = Math.max(20, Math.min(this.mapData.pxHeight - 8, wy));
        this.vfx.spawnClickMarker(clampedX, clampedY);
        this.player.path = Pathfinder.findPathWaypoints(
            this.mapData,
            this.player.x,
            this.player.y,
            clampedX,
            clampedY,
            this.player.flying
        );
    }

    public cycleTarget(): void {
        const alive = this.enemies
            .filter((e) => !e.dead && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 260)
            .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
        if (alive.length === 0) {
            this.selectedEnemy = null;
            this.onToast?.('Không có mục tiêu quanh đây.');
            return;
        }
        const curIdx = this.selectedEnemy ? alive.indexOf(this.selectedEnemy) : -1;
        this.selectedEnemy = alive[(curIdx + 1) % alive.length];
        AudioManager.playSfx('ui_click');
    }

    public interactOrAttackNearest(): void {
        if (this.player.downed) return;

        let nearProp: RuntimePropEntry | null = null;
        let nearDist = 56;
        for (const p of this.props) {
            if (!p.node.active) continue;
            const d = Math.hypot(p.def.x - this.player.x, p.def.y - this.player.y);
            if (d <= Math.max(48, p.def.r || 44) && d < nearDist) {
                nearDist = d;
                nearProp = p;
            }
        }

        if (this.selectedEnemy && !this.selectedEnemy.dead) {
            const dEnemy = Math.hypot(this.selectedEnemy.x - this.player.x, this.selectedEnemy.y - this.player.y);
            if (dEnemy <= 160) {
                const weaponId = GameState.equipment.vu_khi || '';
                const reach = 38 + Number(ResourceManager.items[weaponId]?.reachBonus || 0);
                if (dEnemy <= reach + 10) {
                    this.player.performBasicAttack(this.selectedEnemy, this.enemies, this.vfx, (k) => this._handleEnemyKilled(k));
                } else {
                    this.player.path = Pathfinder.findPathWaypoints(
                        this.mapData,
                        this.player.x,
                        this.player.y,
                        this.selectedEnemy.x,
                        this.selectedEnemy.y,
                        this.player.flying
                    );
                }
                return;
            }
        }

        if (nearProp) {
            this._triggerPropInteraction(nearProp);
            return;
        }

        for (const info of this.mapData.interactables || []) {
            if (Math.hypot(info.x - this.player.x, info.y - this.player.y) <= (info.r || 46) + 8) {
                this.onInteractInfo?.(info);
                return;
            }
        }

        let closestMob: EnemyEntity | null = null;
        let bestD = 160;
        for (const m of this.enemies) {
            if (m.dead) continue;
            const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (d < bestD) {
                bestD = d;
                closestMob = m;
            }
        }
        if (closestMob) this.selectedEnemy = closestMob;
        this.player.performBasicAttack(this.selectedEnemy, this.enemies, this.vfx, (k) => this._handleEnemyKilled(k));
    }

    public interactNearestOnly(): void {
        for (const p of this.props) {
            if (!p.node.active) continue;
            if (Math.hypot(p.def.x - this.player.x, p.def.y - this.player.y) <= (p.def.r || 48) + 14) {
                this._triggerPropInteraction(p);
                return;
            }
        }
        for (const info of this.mapData.interactables || []) {
            if (Math.hypot(info.x - this.player.x, info.y - this.player.y) <= (info.r || 48) + 14) {
                this.onInteractInfo?.(info);
                return;
            }
        }
        this.onToast?.('Không có vật thể hay đạo hữu nào ở gần để tương tác.');
    }

    public castHotbarSlot(slotIndex: number): void {
        if (this.player.downed) return;
        const skillId = GameState.hotbar[slotIndex];
        if (!skillId) {
            this.onToast?.(`Ô kỹ năng [${slotIndex + 1}] chưa gắn pháp quyết (mở Bí Tịch [N] để gắn).`, '#ffd978');
            return;
        }
        const res = this.player.castSkill(skillId, this.selectedEnemy, this.enemies, this.vfx, (k) => this._handleEnemyKilled(k));
        if (!res.ok && res.msg) {
            this.onToast?.(res.msg, '#ff9c7a');
        }
    }

    public useQuickslot(qIndex: number): void {
        if (this.player.downed) return;
        const itemId = GameState.quickslots[qIndex];
        const keyNames = ['H', 'J', 'K', 'L'];
        if (!itemId || !GameState.hasItem(itemId, 1)) {
            this.onToast?.(`Ô phím tắt [${keyNames[qIndex] || ''}] đang trống.`, '#ffd978');
            return;
        }
        const res = GameState.useBagItem(itemId);
        if (res.ok) {
            AudioManager.playSfx('pickup');
            this.vfx.spawnRing(this.player.x, this.player.y, '#9df2dd', 28, 0.4, true);
            this.onToast?.(res.msg, '#9df2dd');
            this.applyItemTrigger(res.triggerAction);
            this.player.refreshAppearance();
        } else {
            AudioManager.playSfx('deny');
            this.onToast?.(res.msg, '#ff9c7a');
        }
    }

    public applyItemTrigger(triggerAction?: string): void {
        if (!triggerAction) return;
        switch (triggerAction) {
            case 'ritual_tay_tuy':
            case 'try_breakthrough':
                this.tryBreakthroughNow();
                break;
            case 'buff_haste':
                this.player.hasteTimer = 10;
                this.vfx.spawnRing(this.player.x, this.player.y, '#8ef5d8', 38, 0.5, true);
                this.vfx.spawnText(this.player.x, this.player.y - 52, 'Tốc Hành +35%!', '#8ef5d8');
                break;
            case 'buff_shield':
                this.player.shieldHp = Math.max(40, Math.round(GameState.hpMax * 0.45));
                this.player.shieldTimer = 15;
                this.vfx.spawnRing(this.player.x, this.player.y, '#ffe082', 42, 0.55, true);
                this.vfx.spawnText(this.player.x, this.player.y - 52, 'Kim Giáp Hộ Thân!', '#ffe082');
                break;
            case 'cast_talisman_fire': {
                AudioManager.playSfx('fire');
                const target = this.selectedEnemy && !this.selectedEnemy.dead ? this.selectedEnemy : null;
                const cx = target ? target.x : this.player.x;
                const cy = target ? target.y : this.player.y;
                const dmg = Math.max(18, GameState.skillPower * 4);
                this.vfx.spawnSkillImpact('hoa_cau', cx, cy, '#ff6a3d', 56);
                for (const m of this.enemies) {
                    if (m.dead) continue;
                    if (Math.hypot(m.x - cx, m.y - cy) <= 78) {
                        m.applyStatus('burn', 4, Math.max(2, Math.round(GameState.skillPower * 0.5)));
                        m.takeDamage(dmg, this.vfx, true, (k) => this._handleEnemyKilled(k));
                    }
                }
                break;
            }
        }
    }

    public tryBreakthroughNow(): boolean {
        const res = GameState.performBreakthrough();
        if (!res.ok) {
            AudioManager.playSfx('deny');
            this.onToast?.(res.msg, '#ffad7a');
            return false;
        }
        this.triggerBreakthroughFx(res.newRealm?.name || 'Cảnh Giới Mới');
        this.onToast?.(res.msg, '#ffe89c');
        this.onBannerAnnounce?.(`ĐỘT PHÁ: ${res.newRealm?.name || ''}`, res.newRealm?.sub || 'Đạo cơ thăng hoa!');
        return true;
    }

    public triggerBreakthroughFx(realmName: string = ''): void {
        AudioManager.playSfx('breakthrough');
        this.vfx.spawnPillar(this.player.x, this.player.y, '#ffe89c', 1.8);
        this.vfx.spawnLightning(this.player.x, this.player.y, '#ffd970');
        this.vfx.spawnRing(this.player.x, this.player.y, '#ffd970', 72, 0.85, true);
        this.vfx.spawnRing(this.player.x, this.player.y, '#9df2dd', 48, 0.65, false);
        if (realmName) {
            this.vfx.spawnText(this.player.x, this.player.y - 72, `ĐỘT PHÁ: ${realmName}!`, '#ffe89c', true);
        }
        this.shakeCamera(6.5, 0.45);
        this.player.refreshAppearance();
    }

    private _triggerPropInteraction(prop: RuntimePropEntry): void {
        this.player.path = [];
        this.player.facePoint(prop.def.x, prop.def.y);

        if (prop.def.herb || prop.def.type === 'clue_prop' || prop.def.type === 'bi_tich_prop') {
            this._harvestProp(prop);
            return;
        }

        this.onInteractProp?.(prop.def);
    }

    private _harvestProp(prop: RuntimePropEntry): void {
        const p = prop.def;
        let itemId = 'tay_ue_thao';
        if (p.id.startsWith('linh_chi') || p.type === 'ling_chi_prop') itemId = 'nam_linh_chi';
        else if (p.id.startsWith('phong_thao') || p.type === 'phong_linh_thao') itemId = 'phong_linh_thao';
        else if (p.id.startsWith('clue_')) {
            GameState.questFlags[p.id] = true;
            GameState.checkQuestAutoAdvance();
            GameState.save();
            prop.hiddenUntil = Date.now() + 25000;
            prop.node.active = false;
            AudioManager.playSfx('pickup');
            this.vfx.spawnText(p.x, p.y - 30, '+1 Manh Mối Rừng Trúc!', '#ffd978');
            this.vfx.spawnRing(p.x, p.y, '#ffd978', 26, 0.45);
            return;
        } else if (p.id === 'manh_bi_tich_thuong' || p.type === 'bi_tich_prop') {
            itemId = 'manh_bi_tich_thuong';
        } else if (p.type.includes('han_tinh')) itemId = 'han_tinh_thach';
        else if (p.type.includes('tu_tinh')) itemId = 'tu_tinh_thach';
        else if (p.type.includes('luc_tinh')) itemId = 'luc_tinh_thach';
        else if (p.type.includes('phong_tinh')) itemId = 'phong_tinh_thach';
        else if (p.type === 'truc_co_thao') itemId = 'truc_co_thao';

        GameState.addItem(itemId, 1);
        const itemName = ResourceManager.items[itemId]?.name || p.name || itemId;
        prop.hiddenUntil = Date.now() + 18000;
        GameState.harvested[p.id] = prop.hiddenUntil;
        prop.node.active = false;
        GameState.save();

        AudioManager.playSfx('pickup');
        this.vfx.spawnRing(p.x, p.y, '#9df2dd', 24, 0.4);
        this.vfx.spawnText(p.x, p.y - 30, `+1 ${itemName}`, '#9df2dd');
    }

    public guideToQuest(announce: boolean = true): void {
        const q = GameState.getQuestMeta();
        if (q.mapId && q.mapId !== this.mapData.id) {
            this._autoNavTargetMap = q.mapId;
            const hop = Pathfinder.findNextPortalHop(this.mapData.id, q.mapId);
            if (hop) {
                const destName = ResourceManager.worldMaps[q.mapId]?.name || q.mapId;
                if (announce) this.onToast?.(`Đang tự động dẫn đường sang ${destName}...`, '#ffd978');
                this.player.path = Pathfinder.findPathWaypoints(
                    this.mapData,
                    this.player.x,
                    this.player.y,
                    hop.tx * TILE_SIZE + 16,
                    hop.ty * TILE_SIZE + 16,
                    this.player.flying
                );
            } else {
                if (announce) this.onToast?.(`Truyền tống tới ${ResourceManager.worldMaps[q.mapId]?.name || q.mapId}!`, '#8fd8ff');
                this.loadMap(q.mapId);
            }
            return;
        }

        const goal = this._computeLocalQuestGuidePoint();
        if (goal) {
            if (announce) this.onToast?.('Đang di chuyển tới mục tiêu nhiệm vụ...', '#ffd978');
            this.player.path = Pathfinder.findPathWaypoints(
                this.mapData,
                this.player.x,
                this.player.y,
                goal.x,
                goal.y,
                this.player.flying
            );
            if (this.enemies.some((e) => !e.dead && Math.hypot(e.x - goal.x, e.y - goal.y) < 40)) {
                this.player.autoCombat = true;
            }
        }
    }

    public navigateToMap(destMapId: string, instantTeleport: boolean = false): void {
        if (!ResourceManager.worldMaps[destMapId]) return;
        if (instantTeleport || destMapId === this.mapData.id) {
            AudioManager.playSfx('portal');
            this.loadMap(destMapId);
            return;
        }
        this._autoNavTargetMap = destMapId;
        const hop = Pathfinder.findNextPortalHop(this.mapData.id, destMapId);
        if (hop) {
            this.onToast?.(`Đang dẫn đường tới ${ResourceManager.worldMaps[destMapId].name}...`, '#ffd978');
            this.player.path = Pathfinder.findPathWaypoints(
                this.mapData,
                this.player.x,
                this.player.y,
                hop.tx * TILE_SIZE + 16,
                hop.ty * TILE_SIZE + 16,
                this.player.flying
            );
        } else {
            AudioManager.playSfx('portal');
            this.loadMap(destMapId);
        }
    }

    private _computeLocalQuestGuidePoint(): { x: number; y: number } | null {
        const q = GameState.getQuestMeta();
        if (q.mapId && q.mapId !== this.mapData.id) {
            const hop = Pathfinder.findNextPortalHop(this.mapData.id, q.mapId);
            if (hop) return { x: hop.tx * TILE_SIZE + 16, y: hop.ty * TILE_SIZE + 16 };
            return null;
        }

        if (q.targetIds && q.targetIds.length > 0) {
            for (const tid of q.targetIds) {
                const pr = this.props.find((p) => p.def.id === tid && p.node.active);
                if (pr) return { x: pr.def.x, y: pr.def.y + 8 };
                const inf = (this.mapData.interactables || []).find((it) => it.id === tid);
                if (inf) return { x: inf.x, y: inf.y + 8 };
            }
        }

        let bestMob: EnemyEntity | null = null;
        let bestD = Infinity;
        for (const m of this.enemies) {
            if (m.dead) continue;
            const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (d < bestD) {
                bestD = d;
                bestMob = m;
            }
        }
        return bestMob ? { x: bestMob.x, y: bestMob.y } : null;
    }

    private _handleEnemyKilled(mob: EnemyEntity): void {
        AudioManager.playSfx('coin');
        const prevStage = GameState.questStage;
        const expVal = Math.max(2, Number(mob.def.exp || 5));
        const { gained, fullNow } = GameState.addExp(expVal);
        if (gained > 0) {
            this.vfx.spawnText(this.player.x, this.player.y - 44, `+${Math.round(gained)} Đạo Hạnh`, '#dcff79');
        }
        if (fullNow) {
            this.vfx.spawnRing(this.player.x, this.player.y, '#ffd970', 44, 0.7, true);
            this.onToast?.('Đạo Hạnh đã VIÊN MÃN - có thể Đột Phá Cảnh Giới!', '#ffd970');
        }

        GameState.recordMobKill(mob.type);
        if (GameState.questStage > prevStage) {
            AudioManager.playSfx('quest_complete');
            this.vfx.spawnPillar(this.player.x, this.player.y, '#ffe89c', 1.1);
            this.onToast?.(`Hoàn thành nhiệm vụ! Sang ${GameState.getQuestMeta().name}`, '#ffe89c');
        }

        const drops = mob.rollDrops();
        for (const d of drops) {
            this.vfx.spawnLootDrop(mob.x, mob.y, d.itemId, d.qty, d.stones);
        }

        if (this.selectedEnemy === mob) {
            this.selectedEnemy = null;
        }
    }

    private _handleCollectLoot(drop: GroundLootDrop): void {
        if (drop.stones > 0) {
            AudioManager.playSfx('coin');
            GameState.addStones(drop.stones);
            this.vfx.spawnText(this.player.x, this.player.y - 48, `+${drop.stones} Linh Thạch`, '#7ee8ff');
        }
        if (drop.itemId && drop.qty > 0) {
            AudioManager.playSfx('pickup');
            const prevSt = GameState.questStage;
            GameState.addItem(drop.itemId, drop.qty);
            const name = ResourceManager.items[drop.itemId]?.name || drop.itemId;
            this.vfx.spawnText(this.player.x, this.player.y - 58, `+${drop.qty} ${name}`, '#ffe89c');
            if (GameState.questStage > prevSt) {
                AudioManager.playSfx('quest_complete');
                this.onToast?.(`Chuyển giai đoạn: ${GameState.getQuestMeta().name}`, '#ffe89c');
            }
        }
    }

    public update(dt: number, moveInputX: number, moveInputY: number): void {
        if (!this.mapData || this._transitioning) return;
        this._time += dt;
        if (this._portalCooldown > 0) this._portalCooldown -= dt;

        for (const ao of this._animObjects) {
            if (!ao.sprite.isValid || ao.frames.length === 0) continue;
            const idx = Math.floor((this._time + ao.offset) * ao.fps) % ao.frames.length;
            ao.sprite.spriteFrame = ao.frames[idx];
        }

        const now = Date.now();
        for (const p of this.props) {
            if (p.hiddenUntil > 0 && now >= p.hiddenUntil) {
                p.hiddenUntil = 0;
                delete GameState.harvested[p.def.id];
                p.node.active = true;
            } else if (p.hiddenUntil > now && p.node.active) {
                p.node.active = false;
            }
            if (!p.node.active) continue;

            if (p.def.type === 'npc' && p.frames.length > 1 && p.sprite) {
                const idx = Math.floor(this._time * p.fps) % p.frames.length;
                p.sprite.spriteFrame = p.frames[idx];
            } else if (p.def.type === 'herb_plot') {
                const pl = GameState.plots[p.def.id];
                if (p.subLabel) {
                    if (!pl) {
                        p.subLabel.string = 'Luống trống';
                        p.subLabel.color = UiHelper.hex('#a8b89a');
                    } else {
                        const rem = Math.max(0, Math.ceil((pl.plantedAt + pl.durMs - now) / 1000));
                        const sDef = FARM_SEEDS.find((s) => s.seed === pl.seed);
                        if (rem <= 0) {
                            p.subLabel.string = `[Chín] ${ResourceManager.items[sDef?.crop || '']?.name || 'Thu hoạch'}`;
                            p.subLabel.color = UiHelper.hex('#ffe066');
                        } else {
                            p.subLabel.string = `${pl.wet ? 'Đã tưới' : 'Khô'} - Còn ${rem}s`;
                            p.subLabel.color = UiHelper.hex('#9df2dd');
                        }
                    }
                }
            }

            if (p.markerLabel) {
                const mk = GameState.getNpcMarker(p.def.id);
                if (mk) {
                    p.markerLabel.string = mk;
                    p.markerLabel.color = UiHelper.hex(mk === '!' ? '#ffe047' : '#7ef29d');
                    p.markerLabel.node.setPosition(0, (p.def.type === 'npc' ? 82 : 58) + Math.sin(this._time * 5.5) * 3, 0);
                } else if (p.markerLabel.string !== '') {
                    p.markerLabel.string = '';
                }
            }
        }

        this._updateNpcChatter(dt);

        for (const c of this.critters) {
            c.update(dt, this.mapData);
        }

        let bossFighting = false;
        for (const m of this.enemies) {
            m.update(
                dt,
                this.mapData,
                this.player.x,
                this.player.y,
                this.player.downed,
                this.vfx,
                (dmg) => {
                    this.player.takeDamage(dmg, this.vfx);
                    this.shakeCamera(3, 0.14);
                },
                (killed) => this._handleEnemyKilled(killed)
            );
            if (!m.dead && m.isBoss && Math.hypot(m.x - this.player.x, m.y - this.player.y) < 340) {
                bossFighting = true;
            }
        }
        AudioManager.setBossCombat(bossFighting);

        const guidePt = this._computeLocalQuestGuidePoint();
        this.player.update(
            dt,
            this.mapData,
            moveInputX,
            moveInputY,
            this.selectedEnemy,
            this.enemies,
            guidePt,
            this.vfx,
            (killed) => this._handleEnemyKilled(killed),
            (autoMob) => {
                this.selectedEnemy = autoMob;
            }
        );

        if (this._pendingInteractProp && this._pendingInteractProp.node.active) {
            const p = this._pendingInteractProp;
            if (Math.hypot(p.def.x - this.player.x, p.def.y - this.player.y) <= (p.def.r || 46) + 14) {
                this._pendingInteractProp = null;
                this._triggerPropInteraction(p);
            }
        }
        if (this._pendingInteractInfo) {
            const inf = this._pendingInteractInfo;
            if (Math.hypot(inf.x - this.player.x, inf.y - this.player.y) <= (inf.r || 46) + 16) {
                this._pendingInteractInfo = null;
                this.player.path = [];
                this.onInteractInfo?.(inf);
            }
        }

        if (this._portalCooldown <= 0 && !this.player.downed) {
            const ptx = Math.floor(this.player.x / TILE_SIZE);
            const pty = Math.floor(this.player.y / TILE_SIZE);
            for (const pt of this.mapData.portals || []) {
                if (Math.abs(pt.tx - ptx) <= 0 && Math.abs(pt.ty - pty) <= 0) {
                    AudioManager.playSfx('portal');
                    this.loadMap(pt.toMap, pt.targetSpawn);
                    return;
                }
                const pwx = pt.tx * TILE_SIZE + 16;
                const pwy = pt.ty * TILE_SIZE + 16;
                if (Math.hypot(this.player.x - pwx, this.player.y - pwy) <= 22) {
                    AudioManager.playSfx('portal');
                    this.loadMap(pt.toMap, pt.targetSpawn);
                    return;
                }
            }
        }

        for (const pm of this._portalMarkers) {
            pm.node.setPosition(pm.node.position.x, pm.baseY + Math.sin(this._time * 3.2) * 2.5, 0);
        }

        this._updateReticle();
        this.vfx.update(dt, this.player.x, this.player.y, (drop) => this._handleCollectLoot(drop));
        this._performYSort();
        this._updateCamera(dt, false);
    }

    private _updateNpcChatter(dt: number): void {
        if (this._chatterHideTimer > 0) {
            this._chatterHideTimer -= dt;
            if (this._chatterHideTimer <= 0) {
                this._chatterNode.active = false;
            }
        }
        this._chatterTimer -= dt;
        if (this._chatterTimer > 0) return;
        this._chatterTimer = 16 + Math.random() * 14;

        const daoLy = ResourceManager.gameplaySystems?.npcDaoLy || {};
        const nearNpcs = this.props.filter(
            (p) => p.def.type === 'npc' && Math.hypot(p.def.x - this.player.x, p.def.y - this.player.y) < 360
        );
        if (nearNpcs.length === 0) return;
        const pick = nearNpcs[Math.floor(Math.random() * nearNpcs.length)];
        const lines: string[] = daoLy[pick.def.id] || [];
        if (lines.length === 0) return;
        const line = lines[Math.floor(Math.random() * lines.length)];
        this._chatterLabel.string = `"${line}"`;
        this._chatterNode.setPosition(pick.def.x, -(pick.def.y - 102), 0);
        this._chatterNode.active = true;
        this._chatterHideTimer = 5.5;
    }

    private _updateReticle(): void {
        let tx = 0;
        let ty = 0;
        let isEnemy = false;
        if (this.selectedEnemy && !this.selectedEnemy.dead) {
            tx = this.selectedEnemy.x;
            ty = this.selectedEnemy.y;
            isEnemy = true;
        } else if (this.selectedProp && this.selectedProp.node.active) {
            tx = this.selectedProp.def.x;
            ty = this.selectedProp.def.y;
        } else {
            this._reticleNode.active = false;
            return;
        }

        this._reticleNode.active = true;
        this._reticleNode.setPosition(tx, -ty, 0);
        const baseScale = isEnemy && this.selectedEnemy?.isBoss ? 1.55 : 1.0;
        const pulse = baseScale + Math.sin(this._time * 6) * 0.08;
        this._reticleNode.setScale(pulse, pulse, 1);
        this._reticleSprite.color = UiHelper.hex(isEnemy ? '#ff6a4d' : '#ffd64a', 240);
    }

    private _performYSort(): void {
        const list: Array<{ node: Node; y: number }> = [];
        for (const s of this._staticYSortItems) {
            if (s.node.active) list.push({ node: s.node, y: s.getSortY() });
        }
        for (const p of this.props) {
            if (p.node.active) list.push({ node: p.node, y: p.getSortY() });
        }
        for (const c of this.critters) {
            if (c.node.active) list.push({ node: c.node, y: c.getSortY() });
        }
        for (const e of this.enemies) {
            if (e.node.active) list.push({ node: e.node, y: e.getSortY() });
        }
        for (const d of this.vfx.drops) {
            if (d.node.active) list.push({ node: d.node, y: d.sortY });
        }
        list.push({ node: this.player.node, y: this.player.getSortY() });

        list.sort((a, b) => a.y - b.y);
        for (let i = 0; i < list.length; i++) {
            if (list[i].node.getSiblingIndex() !== i) {
                list[i].node.setSiblingIndex(i);
            }
        }
    }

    private _updateCamera(dt: number, snap: boolean): void {
        const targetX = this.player.x;
        const targetY = this.player.y - 16 - this.player.flyRise * 10;

        if (snap) {
            this._camX = targetX;
            this._camY = targetY;
        } else {
            const lerp = 1 - Math.exp(-7.5 * dt);
            this._camX += (targetX - this._camX) * lerp;
            this._camY += (targetY - this._camY) * lerp;
        }

        const vis = view.getVisibleSize();
        const halfViewW = (vis.width * 0.5) / this.zoom;
        const halfViewH = (vis.height * 0.5) / this.zoom;

        if (this.mapData.pxWidth > halfViewW * 2) {
            this._camX = Math.max(halfViewW, Math.min(this.mapData.pxWidth - halfViewW, this._camX));
        } else {
            this._camX = this.mapData.pxWidth * 0.5;
        }

        if (this.mapData.pxHeight > halfViewH * 2) {
            this._camY = Math.max(halfViewH, Math.min(this.mapData.pxHeight - halfViewH, this._camY));
        } else {
            this._camY = this.mapData.pxHeight * 0.5;
        }

        let shakeX = 0;
        let shakeY = 0;
        if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
            shakeX = (Math.random() - 0.5) * 2 * this._shakeMag;
            shakeY = (Math.random() - 0.5) * 2 * this._shakeMag;
            if (this._shakeTimer <= 0) this._shakeMag = 0;
        }

        this.worldContainer.setScale(new Vec3(this.zoom, this.zoom, 1));
        this.worldContainer.setPosition(
            Math.round(-this._camX * this.zoom + shakeX),
            Math.round(this._camY * this.zoom + shakeY),
            0
        );
    }
}
