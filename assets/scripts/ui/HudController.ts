import {
    BlockInputEvents,
    Color,
    EventTouch,
    Label,
    Node,
    Sprite,
    UIOpacity,
    UITransform,
    Vec3,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { GameState, LINH_CAN_LIST } from '../core/GameState';
import { ResourceManager, WorldMapData } from '../core/ResourceManager';
import { UiHelper } from '../core/UiHelper';
import { TILE_SIZE } from '../world/Pathfinder';
import { WorldController } from '../world/WorldController';

export interface HudCallbacks {
    onOpenBag: (tab?: 'bag' | 'skills' | 'cultivate' | 'stats') => void;
    onOpenGacha: () => void;
    onOpenWorldMap: () => void;
    onOpenSettings: () => void;
}

interface HotbarSlotUI {
    node: Node;
    slotSprite: Sprite;
    iconSprite: Sprite;
    cdOverlay: Node;
    cdLabel: Label;
    mpLabel: Label;
    loadedSkillId: string;
}

interface QuickSlotUI {
    node: Node;
    iconSprite: Sprite;
    qtyLabel: Label;
    loadedItemId: string;
}

interface BoundButtonHandle {
    node: Node;
    label: Label;
    sprite: Sprite;
    iconSprite: Sprite | null;
    setActiveStyle: (active: boolean) => void;
}

export class HudController {
    public rootNode: Node;
    public dpadX: number = 0;
    public dpadY: number = 0;
    public dpadVisible: boolean = true;

    private _world: WorldController;
    private _cb: HudCallbacks;

    // Top-Left Vitals
    private _avatarSprite!: Sprite;
    private _loadedAvatarSig: string = '';
    private _nameLbl!: Label;
    private _stonesLbl!: Label;
    private _realmLbl!: Label;
    private _linhCanLbl!: Label;
    private _hpBar!: ReturnType<typeof UiHelper.createBar>;
    private _mpBar!: ReturnType<typeof UiHelper.createBar>;
    private _spBar!: ReturnType<typeof UiHelper.createBar>;
    private _bpBar!: ReturnType<typeof UiHelper.createBar>;
    private _expBar!: ReturnType<typeof UiHelper.createBar>;
    private _breakBtn!: BoundButtonHandle;

    // Quest Tracker
    private _questTitleLbl!: Label;
    private _questObjLbl!: Label;
    private _lastQuestSig: string = '';

    // Top-Center Target, Banner & Toast
    private _targetPanel!: Node;
    private _targetTitleLbl!: Label;
    private _targetBar!: ReturnType<typeof UiHelper.createBar>;

    private _bannerNode!: Node;
    private _bannerOpacity!: UIOpacity;
    private _bannerTitleLbl!: Label;
    private _bannerSubLbl!: Label;
    private _bannerTimer: number = 0;

    private _toastNode!: Node;
    private _toastOpacity!: UIOpacity;
    private _toastLbl!: Label;
    private _toastTimer: number = 0;

    // Top-Right Minimap (pure Sprite dots)
    private _mapNameLbl!: Label;
    private _coordLbl!: Label;
    private _minimapSprite!: Sprite;
    private _minimapDotsRoot!: Node;
    private _dotPool: Array<{ node: Node; sp: Sprite }> = [];
    private _playerRingNode!: Node;
    private _playerDotNode!: Node;
    private _loadedMinimapId: string = '';

    // Bottom Hotbar & Quickslots
    private _hotbarSlots: HotbarSlotUI[] = [];
    private _quickSlots: QuickSlotUI[] = [];

    // D-Pad & Action Toggles
    private _dpadRoot!: Node;
    private _atkBtn!: BoundButtonHandle;
    private _loadedWeaponIcon: string = '';
    private _runBtn!: BoundButtonHandle;
    private _autoBtn!: BoundButtonHandle;
    private _flyBtn!: BoundButtonHandle;
    private _sitBtn!: BoundButtonHandle;

    private _pulseT: number = 0;

    constructor(canvasNode: Node, world: WorldController, callbacks: HudCallbacks) {
        this._world = world;
        this._cb = callbacks;

        this.rootNode = UiHelper.findOrCreateNode('HudLayer', canvasNode, 1280, 720);
        UiHelper.pinWidget(this.rootNode, { top: 0, bottom: 0, left: 0, right: 0 });

        this._buildTopLeftPanel();
        this._buildQuestTracker();
        this._buildTopCenterOverlays();
        this._buildTopRightMinimapAndMenu();
        this._buildBottomHotbar();
        this._buildBottomLeftDpad();
        this._buildBottomRightActions();
    }

    private _adoptOrCreateButton(
        parent: Node,
        name: string,
        labelStr: string,
        w: number,
        h: number,
        pos: [number, number],
        onClick: () => void,
        opts?: Parameters<typeof UiHelper.createButton>[6]
    ): BoundButtonHandle {
        const existing = parent.getChildByName(name);
        if (existing) {
            const sp = existing.getComponent(Sprite) || existing.addComponent(Sprite);
            const lblNode = existing.getChildByName('BtnLabel');
            const lbl = lblNode?.getComponent(Label) || UiHelper.createLabel('BtnLabel', existing, labelStr, {
                size: opts?.fontSize ?? 12,
                colorHex: opts?.textHex || '#f6e4b8',
                bold: true,
                outlineHex: '#0f0a06',
                outlineWidth: 2,
            });
            const icNode = existing.getChildByName('Icon');
            const iconSprite = icNode ? icNode.getComponent(Sprite) : null;
            const skinMap: Record<string, string> = {
                wood: 'btn_wood',
                gold: 'btn_gold',
                crimson: 'btn_crimson',
                jade: 'btn_jade',
                round_atk: 'btn_round_atk',
                dpad_center: 'dpad_center',
            };
            const baseSkin = opts?.skin || 'wood';
            const baseFrameName = skinMap[baseSkin] || 'btn_wood';
            const isSliced = baseSkin !== 'round_atk' && baseSkin !== 'dpad_center';
            const ctrl = UiHelper.bindButtonEvents(existing, sp, lbl, onClick, {
                baseFrameName,
                isSliced,
                textHex: opts?.textHex || '#f6e4b8',
            });
            return {
                node: existing,
                label: lbl,
                sprite: sp,
                iconSprite,
                setActiveStyle: ctrl.setActiveStyle,
            };
        }

        const created = UiHelper.createButton(name, parent, labelStr, w, h, onClick, opts);
        created.node.setPosition(pos[0], pos[1], 0);
        return created;
    }

    public setDpadVisible(vis: boolean): void {
        this.dpadVisible = vis;
        if (this._dpadRoot) {
            this._dpadRoot.active = vis;
        }
        if (!vis) {
            this.dpadX = 0;
            this.dpadY = 0;
        }
    }

    public showToast(msg: string, colorHex: string = '#ffe89c'): void {
        if (!msg) return;
        this._toastLbl.string = msg;
        this._toastLbl.color = UiHelper.hex(colorHex);
        this._toastNode.active = true;
        this._toastOpacity.opacity = 255;
        this._toastTimer = 2.8;
    }

    public showBanner(title: string, subtitle: string = ''): void {
        this._bannerTitleLbl.string = title;
        this._bannerSubLbl.string = subtitle;
        this._bannerNode.active = true;
        this._bannerOpacity.opacity = 255;
        this._bannerTimer = 2.5;
    }

    public onMapChanged(map: WorldMapData): void {
        this._mapNameLbl.string = map.name || map.id;
        if (this._loadedMinimapId !== map.id) {
            this._loadedMinimapId = map.id;
            ResourceManager.loadMinimapSprite(map.id).then((sf) => {
                if (this._minimapSprite?.isValid && this._loadedMinimapId === map.id) {
                    this._minimapSprite.spriteFrame = sf;
                }
            });
        }
    }

    private _buildTopLeftPanel(): void {
        const w = 256;
        const h = 160;
        let node = this.rootNode.getChildByName('HudLeftPanel');
        if (!node) {
            node = UiHelper.createPanel('HudLeftPanel', this.rootNode, w, h, {
                skin: 'wood',
                bgAlpha: 245,
                blockInput: true,
                ax: 0,
                ay: 1,
            }).node;
            UiHelper.pinWidget(node, { top: 8, left: 10 });

            const avBox = UiHelper.createPanel('AvatarFrame', node, 42, 48, {
                skin: 'slot',
                ax: 0,
                ay: 1,
            });
            avBox.node.setPosition(8, -6, 0);

            const avNode = UiHelper.createNode('AvatarSprite', avBox.node, 33, 44, 0.5, 0.05);
            avNode.setPosition(21, -45, 0);
            const avSp = avNode.addComponent(Sprite);
            avSp.sizeMode = Sprite.SizeMode.CUSTOM;
            avSp.trim = false;

            const nm = UiHelper.createLabel('CharName', node, GameState.char.name, {
                size: 13,
                colorHex: '#ffe89c',
                bold: true,
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 0.5,
                width: 120,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#0a0704',
                outlineWidth: 2,
            });
            nm.enableWrapText = false;
            nm.node.setPosition(54, -17, 0);

            const stIc = UiHelper.createIconNode('StoneIcon', node, 'ic-stone', 15, 15);
            stIc.node.setPosition(w - 58, -17, 0);

            const stLbl = UiHelper.createLabel('Stones', node, '250', {
                size: 12,
                colorHex: '#7ee8ff',
                bold: true,
                align: Label.HorizontalAlign.RIGHT,
                ax: 1,
                ay: 0.5,
                outlineHex: '#0a0704',
                outlineWidth: 2,
            });
            stLbl.node.setPosition(w - 8, -17, 0);

            const rlm = UiHelper.createLabel('RealmName', node, 'Phàm Nhân', {
                size: 11,
                colorHex: '#b8f2a6',
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 0.5,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            });
            rlm.node.setPosition(54, -37, 0);

            const lc = UiHelper.createLabel('LinhCan', node, 'Kim Linh Căn', {
                size: 10,
                colorHex: '#ffd970',
                align: Label.HorizontalAlign.RIGHT,
                ax: 1,
                ay: 0.5,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            });
            lc.node.setPosition(w - 8, -37, 0);

            const barW = w - 16;
            UiHelper.createBar('HpBar', node, barW, 14, 'hp', 'Khí Huyết').node.setPosition(8, -62, 0);
            UiHelper.createBar('MpBar', node, barW, 14, 'mp', 'Linh Lực').node.setPosition(8, -81, 0);
            UiHelper.createBar('SpBar', node, barW, 13, 'sp', 'Thần Thức').node.setPosition(8, -99, 0);
            UiHelper.createBar('BpBar', node, barW, 13, 'bp', 'Hộ Giáp').node.setPosition(8, -116, 0);
            UiHelper.createBar('ExpBar', node, barW, 14, 'exp', 'Đạo Hạnh').node.setPosition(8, -135, 0);
        }

        if (!node.getComponent(BlockInputEvents)) node.addComponent(BlockInputEvents);
        node.targetOff(node);
        node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
            ev.propagationStopped = true;
            AudioManager.playSfx('ui_click');
            this._cb.onOpenBag('bag');
        });

        this._avatarSprite = node.getChildByName('AvatarFrame')!.getChildByName('AvatarSprite')!.getComponent(Sprite)!;
        this._nameLbl = node.getChildByName('CharName')!.getComponent(Label)!;
        this._stonesLbl = node.getChildByName('Stones')!.getComponent(Label)!;
        this._realmLbl = node.getChildByName('RealmName')!.getComponent(Label)!;
        this._linhCanLbl = node.getChildByName('LinhCan')!.getComponent(Label)!;

        this._hpBar = UiHelper.bindExistingBar(node.getChildByName('HpBar')!, 'hp');
        this._mpBar = UiHelper.bindExistingBar(node.getChildByName('MpBar')!, 'mp');
        this._spBar = UiHelper.bindExistingBar(node.getChildByName('SpBar')!, 'sp');
        this._bpBar = UiHelper.bindExistingBar(node.getChildByName('BpBar')!, 'bp');
        this._expBar = UiHelper.bindExistingBar(node.getChildByName('ExpBar')!, 'exp');

        const brkHolder = UiHelper.findOrCreateNode('BreakBtnHolder', this.rootNode, w, 28, 0, 1);
        UiHelper.pinWidget(brkHolder, { top: 172, left: 10 });
        this._breakBtn = this._adoptOrCreateButton(
            brkHolder,
            'BreakthroughQuickBtn',
            'ĐỘT PHÁ CẢNH GIỚI NGAY',
            w,
            26,
            [w * 0.5, -13],
            () => {
                AudioManager.playSfx('ui_click');
                if (!this._world.tryBreakthroughNow()) {
                    this._cb.onOpenBag('cultivate');
                }
            },
            {
                skin: 'gold',
                iconKey: 'ic-pill',
                iconSize: 16,
                textHex: '#fff3ba',
                fontSize: 11,
            }
        );
        this._breakBtn.node.active = false;
    }

    private _buildQuestTracker(): void {
        const w = 256;
        const h = 144;
        let node = this.rootNode.getChildByName('QuestTracker');
        if (!node) {
            node = UiHelper.createPanel('QuestTracker', this.rootNode, w, h, {
                skin: 'wood',
                bgAlpha: 232,
                blockInput: true,
                ax: 0,
                ay: 1,
            }).node;
            UiHelper.pinWidget(node, { top: 204, left: 10 });

            const qIc = UiHelper.createIconNode('QuestIcon', node, 'hud-event', 15, 15);
            qIc.node.setPosition(16, -15, 0);

            const hdr = UiHelper.createLabel('QuestHdr', node, 'NHIỆM VỤ CHÍNH TUYẾN', {
                size: 10,
                colorHex: '#ffd970',
                bold: true,
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 0.5,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            });
            hdr.node.setPosition(28, -15, 0);

            const qt = UiHelper.createLabel('QuestTitle', node, '', {
                size: 11,
                lineHeight: 15,
                colorHex: '#fff0c2',
                bold: true,
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 0.5,
                width: w - 16,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            });
            qt.enableWrapText = false;
            qt.node.setPosition(8, -34, 0);

            const qo = UiHelper.createLabel('QuestObjs', node, '', {
                size: 10,
                lineHeight: 14,
                colorHex: '#e6dcc8',
                align: Label.HorizontalAlign.LEFT,
                valign: Label.VerticalAlign.TOP,
                ax: 0,
                ay: 0.5,
                width: w - 16,
                overflow: Label.Overflow.CLAMP,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            });
            qo.node.getComponent(UITransform)!.height = 56;
            qo.node.setPosition(8, -75, 0);
        }

        this._questTitleLbl = node.getChildByName('QuestTitle')!.getComponent(Label)!;
        this._questObjLbl = node.getChildByName('QuestObjs')!.getComponent(Label)!;

        this._adoptOrCreateButton(
            node,
            'QuestGuideBtn',
            'Tự Đi Làm Nhiệm Vụ',
            w - 16,
            24,
            [w * 0.5, -h + 16],
            () => {
                AudioManager.playSfx('ui_click');
                this._world.guideToQuest(true);
            },
            {
                skin: 'gold',
                iconKey: 'hud-target',
                iconSize: 15,
                textHex: '#fff0b8',
                fontSize: 11,
            }
        );
    }

    private _buildTopCenterOverlays(): void {
        const tw = 288;
        const th = 48;
        let tNode = this.rootNode.getChildByName('TargetFrame');
        if (!tNode) {
            tNode = UiHelper.createPanel('TargetFrame', this.rootNode, tw, th, {
                skin: 'wood',
                bgAlpha: 238,
                blockInput: false,
            }).node;
            UiHelper.pinWidget(tNode, { top: 8, hCenter: 0 });

            UiHelper.createLabel('TargetName', tNode, '', {
                size: 12,
                colorHex: '#ffe4c4',
                bold: true,
                width: tw - 16,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#0a0605',
                outlineWidth: 2,
            }).node.setPosition(0, 11, 0);

            UiHelper.createBar('TargetHp', tNode, tw - 20, 14, 'hp', '').node.setPosition(-(tw - 20) * 0.5, -9, 0);
        }
        this._targetPanel = tNode;
        this._targetPanel.active = false;
        this._targetTitleLbl = tNode.getChildByName('TargetName')!.getComponent(Label)!;
        this._targetBar = UiHelper.bindExistingBar(tNode.getChildByName('TargetHp')!, 'hp');

        const bw = 356;
        const bh = 54;
        let bNode = this.rootNode.getChildByName('ZoneBanner');
        if (!bNode) {
            bNode = UiHelper.createPanel('ZoneBanner', this.rootNode, bw, bh, {
                skin: 'header',
                bgAlpha: 236,
                blockInput: false,
            }).node;
            UiHelper.pinWidget(bNode, { top: 64, hCenter: 0 });

            UiHelper.createLabel('BannerTitle', bNode, '', {
                size: 16,
                colorHex: '#ffe89c',
                serif: true,
                bold: true,
                width: bw - 20,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#090604',
                outlineWidth: 2,
            }).node.setPosition(0, 9, 0);

            UiHelper.createLabel('BannerSub', bNode, '', {
                size: 11,
                colorHex: '#d8ceb8',
                width: bw - 20,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#090604',
                outlineWidth: 1.5,
            }).node.setPosition(0, -11, 0);
        }
        this._bannerNode = bNode;
        this._bannerOpacity = bNode.getComponent(UIOpacity) || bNode.addComponent(UIOpacity);
        this._bannerNode.active = false;
        this._bannerTitleLbl = bNode.getChildByName('BannerTitle')!.getComponent(Label)!;
        this._bannerSubLbl = bNode.getChildByName('BannerSub')!.getComponent(Label)!;

        let tstNode = this.rootNode.getChildByName('ToastBar');
        if (!tstNode) {
            tstNode = UiHelper.createPanel('ToastBar', this.rootNode, 472, 30, {
                skin: 'sub',
                bgAlpha: 236,
                blockInput: false,
            }).node;
            UiHelper.pinWidget(tstNode, { top: 126, hCenter: 0 });

            UiHelper.createLabel('ToastTxt', tstNode, '', {
                size: 12,
                colorHex: '#ffe89c',
                bold: true,
                width: 452,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#080503',
                outlineWidth: 2,
            });
        }
        this._toastNode = tstNode;
        this._toastOpacity = tstNode.getComponent(UIOpacity) || tstNode.addComponent(UIOpacity);
        this._toastNode.active = false;
        this._toastLbl = tstNode.getChildByName('ToastTxt')!.getComponent(Label)!;
    }

    private _buildTopRightMinimapAndMenu(): void {
        const w = 196;
        const h = 242;
        const cluster = UiHelper.findOrCreateNode('TopRightCluster', this.rootNode, w, h, 1, 1);
        UiHelper.pinWidget(cluster, { top: 8, right: 10 });

        const mmW = 196;
        const mmH = 150;
        const mapImgW = 182;
        const mapImgH = 118;

        let mmPanel = cluster.getChildByName('MinimapPanel');
        if (!mmPanel) {
            mmPanel = UiHelper.createPanel('MinimapPanel', cluster, mmW, mmH, {
                skin: 'wood',
                bgAlpha: 245,
                blockInput: true,
                ax: 1,
                ay: 1,
            }).node;
            mmPanel.setPosition(0, 0, 0);

            UiHelper.createLabel('MapTitle', mmPanel, 'Làng Tản Viên', {
                size: 11,
                colorHex: '#ffe89c',
                bold: true,
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 1,
                width: 122,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            }).node.setPosition(-mmW + 8, -6, 0);

            UiHelper.createLabel('MapCoord', mmPanel, '(0, 0)', {
                size: 10,
                colorHex: '#b8d8be',
                align: Label.HorizontalAlign.RIGHT,
                ax: 1,
                ay: 1,
                outlineHex: '#0a0704',
                outlineWidth: 1.5,
            }).node.setPosition(-7, -7, 0);

            const mapBox = UiHelper.createNode('MinimapViewport', mmPanel, mapImgW, mapImgH, 0, 1);
            mapBox.setPosition(-mmW + 7, -24, 0);
            const mmSp = mapBox.addComponent(Sprite);
            mmSp.sizeMode = Sprite.SizeMode.CUSTOM;
            mmSp.trim = false;

            UiHelper.createNode('MinimapDots', mapBox, mapImgW, mapImgH, 0, 1);
        }

        this._mapNameLbl = mmPanel.getChildByName('MapTitle')!.getComponent(Label)!;
        this._coordLbl = mmPanel.getChildByName('MapCoord')!.getComponent(Label)!;
        const mapBox = mmPanel.getChildByName('MinimapViewport')!;
        this._minimapSprite = mapBox.getComponent(Sprite)!;
        this._minimapDotsRoot = UiHelper.findOrCreateNode('MinimapDots', mapBox, mapImgW, mapImgH, 0, 1);

        // Player minimap marker (pure Sprites: ring + dot)
        const pRing = UiHelper.findOrCreateNode('PlayerRing', this._minimapDotsRoot, 9, 9);
        const pRingSp = UiHelper.attachSprite(pRing, UiHelper.skin('target_ring'), 9, 9);
        pRingSp.color = Color.WHITE;
        this._playerRingNode = pRing;

        const pDot = UiHelper.findOrCreateNode('PlayerDot', this._minimapDotsRoot, 6, 6);
        const pDotSp = UiHelper.attachSprite(pDot, UiHelper.skin('mote_dot'), 6, 6);
        pDotSp.color = UiHelper.hex('#5eff82');
        this._playerDotNode = pDot;

        mapBox.targetOff(mapBox);
        mapBox.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
            ev.propagationStopped = true;
            if (!this._world.mapData) return;
            const ut = mapBox.getComponent(UITransform)!;
            const uiLoc = ev.getUILocation();
            const loc = ut.convertToNodeSpaceAR(new Vec3(uiLoc.x, uiLoc.y, 0));
            const u = Math.max(0, Math.min(1, loc.x / mapImgW));
            const v = Math.max(0, Math.min(1, -loc.y / mapImgH));
            const wx = u * this._world.mapData.pxWidth;
            const wy = v * this._world.mapData.pxHeight;
            AudioManager.playSfx('ui_click');
            this._world.handleWorldTap(wx, wy);
        });

        const menus: Array<{ label: string; icon: string; fn: () => void }> = [
            { label: 'Túi Đồ [B]', icon: 'ic-bag', fn: () => this._cb.onOpenBag('bag') },
            { label: 'Bí Tịch [N]', icon: 'ic-book', fn: () => this._cb.onOpenBag('skills') },
            { label: 'Tu Luyện', icon: 'ic-pill', fn: () => this._cb.onOpenBag('cultivate') },
            { label: 'Rút Sách [G]', icon: 'ic-gacha', fn: () => this._cb.onOpenGacha() },
            { label: 'Bản Đồ [M]', icon: 'ic-map', fn: () => this._cb.onOpenWorldMap() },
            { label: 'Cài Đặt', icon: 'hud-gear', fn: () => this._cb.onOpenSettings() },
        ];

        const btnW = 95;
        const btnH = 26;
        for (let i = 0; i < menus.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const bx = -mmW + btnW * 0.5 + col * (btnW + 6);
            const by = -mmH - 16 - row * (btnH + 4);
            this._adoptOrCreateButton(
                cluster,
                `TopMenu_${i}`,
                menus[i].label,
                btnW,
                btnH,
                [bx, by],
                () => {
                    AudioManager.playSfx('ui_click');
                    menus[i].fn();
                },
                {
                    skin: 'wood',
                    iconKey: menus[i].icon,
                    iconSize: 15,
                    fontSize: 10,
                }
            );
        }
    }

    private _buildBottomHotbar(): void {
        const barW = 580;
        const barH = 60;
        let node = this.rootNode.getChildByName('BottomSkillBar');
        if (!node) {
            node = UiHelper.createPanel('BottomSkillBar', this.rootNode, barW, barH, {
                skin: 'wood',
                bgAlpha: 245,
                blockInput: true,
            }).node;
            UiHelper.pinWidget(node, { bottom: 10, hCenter: -18 });
        }

        const slotSize = 44;
        const gap = 4;
        const startX = -barW * 0.5 + 11 + slotSize * 0.5;

        for (let i = 0; i < 8; i++) {
            const sx = startX + i * (slotSize + gap);
            let sNode = node.getChildByName(`SkillSlot_${i + 1}`);
            if (!sNode) {
                sNode = UiHelper.createPanel(`SkillSlot_${i + 1}`, node, slotSize, slotSize, {
                    skin: 'slot',
                    blockInput: true,
                }).node;
                sNode.setPosition(sx, 0, 0);

                const iconNode = UiHelper.createNode('Icon', sNode, slotSize - 8, slotSize - 8);
                const iconSprite = iconNode.addComponent(Sprite);
                iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                iconSprite.trim = false;

                const cdOverlay = UiHelper.createSolidOverlay('CdMask', sNode, slotSize - 6, slotSize - 6, '#080605', 190).node;
                cdOverlay.active = false;
                UiHelper.createLabel('CdTxt', cdOverlay, '', {
                    size: 11,
                    colorHex: '#ffd978',
                    bold: true,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                });

                const keyLbl = UiHelper.createLabel('KeyNum', sNode, `${i + 1}`, {
                    size: 9,
                    colorHex: '#ffe29a',
                    bold: true,
                    ax: 0,
                    ay: 1,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                });
                keyLbl.node.setPosition(-slotSize * 0.5 + 3, slotSize * 0.5 - 2, 0);

                const mpLabel = UiHelper.createLabel('MpCost', sNode, '', {
                    size: 9,
                    colorHex: '#7ed0ff',
                    bold: true,
                    ax: 1,
                    ay: 0,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                });
                mpLabel.node.setPosition(slotSize * 0.5 - 2, -slotSize * 0.5 + 2, 0);
            }

            if (!sNode.getComponent(BlockInputEvents)) sNode.addComponent(BlockInputEvents);
            const slotIdx = i;
            sNode.targetOff(sNode);
            sNode.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
                ev.propagationStopped = true;
                if (GameState.hotbar[slotIdx]) {
                    this._world.castHotbarSlot(slotIdx);
                } else {
                    AudioManager.playSfx('ui_click');
                    this._cb.onOpenBag('skills');
                }
            });

            const cdOverlay = sNode.getChildByName('CdMask')!;
            this._hotbarSlots.push({
                node: sNode,
                slotSprite: sNode.getComponent(Sprite)!,
                iconSprite: sNode.getChildByName('Icon')!.getComponent(Sprite)!,
                cdOverlay,
                cdLabel: cdOverlay.getChildByName('CdTxt')!.getComponent(Label)!,
                mpLabel: sNode.getChildByName('MpCost')!.getComponent(Label)!,
                loadedSkillId: '',
            });
        }

        const divX = startX + 8 * (slotSize + gap) - slotSize * 0.5 + 4;
        if (!node.getChildByName('Divider')) {
            const div = UiHelper.createIconNode('Divider', node, 'divider_v', 4, 40);
            div.node.setPosition(divX, 0, 0);
        }

        const qKeys = ['H', 'J', 'K', 'L'];
        const qSize = 42;
        const qStartX = divX + 10 + qSize * 0.5;
        for (let q = 0; q < 4; q++) {
            const qx = qStartX + q * (qSize + 4);
            let qNode = node.getChildByName(`QuickSlot_${qKeys[q]}`);
            if (!qNode) {
                qNode = UiHelper.createPanel(`QuickSlot_${qKeys[q]}`, node, qSize, qSize, {
                    skin: 'slot',
                    blockInput: true,
                }).node;
                qNode.setPosition(qx, 0, 0);

                const iconNode = UiHelper.createNode('Icon', qNode, qSize - 8, qSize - 8);
                const iconSprite = iconNode.addComponent(Sprite);
                iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                iconSprite.trim = false;

                const kLbl = UiHelper.createLabel('KeyChar', qNode, qKeys[q], {
                    size: 9,
                    colorHex: '#d8cfa8',
                    bold: true,
                    ax: 0,
                    ay: 1,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                });
                kLbl.node.setPosition(-qSize * 0.5 + 3, qSize * 0.5 - 2, 0);

                const qtyLabel = UiHelper.createLabel('Qty', qNode, '', {
                    size: 9,
                    colorHex: '#ffe89c',
                    bold: true,
                    ax: 1,
                    ay: 0,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                });
                qtyLabel.node.setPosition(qSize * 0.5 - 2, -qSize * 0.5 + 2, 0);
            }

            if (!qNode.getComponent(BlockInputEvents)) qNode.addComponent(BlockInputEvents);
            const qIdx = q;
            qNode.targetOff(qNode);
            qNode.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
                ev.propagationStopped = true;
                if (GameState.quickslots[qIdx]) {
                    this._world.useQuickslot(qIdx);
                } else {
                    AudioManager.playSfx('ui_click');
                    this._cb.onOpenBag('bag');
                }
            });

            this._quickSlots.push({
                node: qNode,
                iconSprite: qNode.getChildByName('Icon')!.getComponent(Sprite)!,
                qtyLabel: qNode.getChildByName('Qty')!.getComponent(Label)!,
                loadedItemId: '',
            });
        }
    }

    private _buildBottomLeftDpad(): void {
        const size = 136;
        const root = UiHelper.findOrCreateNode('DpadCluster', this.rootNode, size, size, 0, 0);
        UiHelper.pinWidget(root, { bottom: 12, left: 14 });
        this._dpadRoot = root;

        const bindDirBtn = (name: string, skinKey: string, cx: number, cy: number, dx: number, dy: number) => {
            let btn = root.getChildByName(name);
            if (!btn) {
                btn = UiHelper.createIconNode(name, root, skinKey, 42, 42).node;
                btn.setPosition(cx, cy, 0);
            }
            if (!btn.getComponent(BlockInputEvents)) btn.addComponent(BlockInputEvents);
            const sp = btn.getComponent(Sprite)!;

            btn.targetOff(btn);
            btn.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
                ev.propagationStopped = true;
                AudioManager.unlockAudio();
                sp.color = UiHelper.hex('#ffe89c');
                this.dpadX = dx;
                this.dpadY = dy;
            });
            const release = (ev: EventTouch) => {
                ev.propagationStopped = true;
                sp.color = Color.WHITE;
                if (this.dpadX === dx) this.dpadX = 0;
                if (this.dpadY === dy) this.dpadY = 0;
            };
            btn.on(Node.EventType.TOUCH_END, release);
            btn.on(Node.EventType.TOUCH_CANCEL, release);
        };

        const c = size * 0.5;
        bindDirBtn('DpadUp', 'dpad_up', c, c + 44, 0, -1);
        bindDirBtn('DpadDown', 'dpad_down', c, c - 44, 0, 1);
        bindDirBtn('DpadLeft', 'dpad_left', c - 44, c, -1, 0);
        bindDirBtn('DpadRight', 'dpad_right', c + 44, c, 1, 0);

        this._runBtn = this._adoptOrCreateButton(
            root,
            'RunToggle',
            'Chạy',
            44,
            44,
            [c, c],
            () => {
                AudioManager.playSfx('ui_click');
                this._world.player.running = !this._world.player.running;
                this.showToast(this._world.player.running ? 'Chế độ: Chạy nhanh' : 'Chế độ: Đi bộ');
            },
            {
                skin: 'dpad_center',
                fontSize: 10,
            }
        );
    }

    private _buildBottomRightActions(): void {
        const w = 256;
        const h = 168;
        const root = UiHelper.findOrCreateNode('ActionCluster', this.rootNode, w, h, 1, 0);
        UiHelper.pinWidget(root, { bottom: 10, right: 12 });

        this._atkBtn = this._adoptOrCreateButton(
            root,
            'PrimaryAttackBtn',
            'CÔNG\n[Space]',
            84,
            84,
            [-48, 48],
            () => {
                this._world.interactOrAttackNearest();
            },
            {
                skin: 'round_atk',
                iconKey: 'ic-bamboo-sword',
                iconSize: 28,
                iconTop: true,
                textHex: '#fff5c8',
                fontSize: 11,
            }
        );

        this._flyBtn = this._adoptOrCreateButton(
            root,
            'FlyBtn',
            'Phi Hành',
            92,
            30,
            [-150, 24],
            () => {
                const res = this._world.player.toggleFly(this._world.mapData, this._world.vfx);
                this.showToast(res.msg, res.ok ? '#8fd8ff' : '#ff9c7a');
            },
            {
                skin: 'wood',
                iconKey: 'hud-fly',
                iconSize: 17,
                fontSize: 10,
            }
        );

        this._autoBtn = this._adoptOrCreateButton(
            root,
            'AutoBtn',
            'Tự Động',
            92,
            30,
            [-158, 64],
            () => {
                AudioManager.playSfx('ui_click');
                this._world.player.autoCombat = !this._world.player.autoCombat;
                this.showToast(
                    this._world.player.autoCombat
                        ? 'Đã bật Tự Động Chiến Đấu [T]!'
                        : 'Đã tắt Tự Động Chiến Đấu.'
                );
            },
            {
                skin: 'wood',
                iconKey: 'hud-auto',
                iconSize: 17,
                fontSize: 10,
            }
        );

        this._sitBtn = this._adoptOrCreateButton(
            root,
            'MeditateBtn',
            'Đả Tọa',
            90,
            30,
            [-132, 104],
            () => {
                const res = this._world.player.toggleMeditate(false, this._world.vfx);
                this.showToast(res.msg, res.ok ? '#9df2dd' : '#ff9c7a');
            },
            {
                skin: 'wood',
                iconKey: 'hud-sit',
                iconSize: 17,
                fontSize: 10,
            }
        );

        this._adoptOrCreateButton(
            root,
            'TargetCycleBtn',
            'Mục Tiêu',
            86,
            30,
            [-46, 114],
            () => {
                this._world.cycleTarget();
            },
            {
                skin: 'wood',
                iconKey: 'hud-target',
                iconSize: 16,
                fontSize: 10,
            }
        );
    }

    public update(dt: number): void {
        this._pulseT += dt;

        // 1. Update Top-Left Vitals & Avatar
        const charSig = `${GameState.char.gender}|${GameState.getVisualOutfit()}`;
        if (charSig !== this._loadedAvatarSig) {
            this._loadedAvatarSig = charSig;
            ResourceManager.loadCharacterAtlas(GameState.char.gender, GameState.getVisualOutfit()).then(({ atlas, prefix }) => {
                if (!this._avatarSprite?.isValid || !atlas) return;
                const sf = atlas.getSpriteFrame(`${prefix}_down_06`);
                if (sf) this._avatarSprite.spriteFrame = sf;
            });
        }

        // Dynamic weapon icon on Attack Medallion
        const eqWeapon = GameState.equipment.vu_khi || 'ic-bamboo-sword';
        if (eqWeapon !== this._loadedWeaponIcon && this._atkBtn.iconSprite) {
            this._loadedWeaponIcon = eqWeapon;
            if (eqWeapon === 'ic-bamboo-sword') {
                this._atkBtn.iconSprite.spriteFrame = UiHelper.icon('ic-bamboo-sword');
            } else {
                ResourceManager.loadItemIcon(eqWeapon).then((sf) => {
                    if (this._atkBtn.iconSprite?.isValid && sf) {
                        this._atkBtn.iconSprite.spriteFrame = sf;
                    }
                });
            }
        }

        this._nameLbl.string = GameState.sectName ? `[${GameState.sectName}] ${GameState.char.name}` : GameState.char.name;
        this._stonesLbl.string = GameState.stones.toLocaleString('vi-VN');
        const rDef = GameState.realmDef();
        this._realmLbl.string = rDef.name || GameState.realmId;

        const lcInfo = LINH_CAN_LIST.find((l) => l.id === GameState.char.linhCan);
        this._linhCanLbl.string = lcInfo ? lcInfo.name : 'Ngũ Linh Căn';
        if (lcInfo) this._linhCanLbl.color = UiHelper.hex(lcInfo.color);

        this._hpBar.updateBar(GameState.hp, GameState.hpMax);
        this._mpBar.updateBar(
            GameState.mp,
            Math.max(1, GameState.mpMax),
            GameState.mpMax > 0 ? `${Math.round(GameState.mp)}/${GameState.mpMax}` : 'Phàm Thể'
        );
        this._spBar.updateBar(GameState.sp, GameState.spMax);
        this._bpBar.updateBar(GameState.bp, Math.max(1, GameState.bpMax));

        if (GameState.expMax > 0) {
            const isFull = GameState.exp >= GameState.expMax;
            this._expBar.updateBar(
                GameState.exp,
                GameState.expMax,
                isFull ? 'VIÊN MÃN (Đột Phá!)' : `${Math.floor(GameState.exp)}/${GameState.expMax}`,
                isFull ? 'gold' : 'exp'
            );
        } else {
            this._expBar.updateBar(1, 1, 'Chưa Khai Mạch', 'exp');
        }

        const brk = GameState.checkBreakthrough();
        this._breakBtn.node.active = brk.canBreak;
        if (brk.canBreak) {
            const s = 1 + Math.sin(this._pulseT * 6) * 0.03;
            this._breakBtn.node.setScale(s, s, 1);
            this._breakBtn.label.string = brk.isRitual
                ? 'TẨY TUỶ PHẠT MAO NGAY'
                : `ĐỘT PHÁ: ${brk.nextRealm?.name || ''}`;
        }

        // 2. Update Quest Tracker (pure Vietnamese text, zero dingbats)
        const qMeta = GameState.getQuestMeta();
        const objLines = qMeta.objectives.map((o) => {
            const isDone = o.max !== undefined ? (o.cur || 0) >= o.max : !!o.done;
            const prog = o.max !== undefined ? ` (${o.cur || 0}/${o.max})` : '';
            return `${isDone ? '[Xong]' : '-'} ${o.text}${prog}`;
        });
        const qSig = `${qMeta.stage}|${qMeta.name}|${objLines.join('\n')}`;
        if (qSig !== this._lastQuestSig) {
            this._lastQuestSig = qSig;
            this._questTitleLbl.string = qMeta.name;
            this._questObjLbl.string = objLines.join('\n');
        }

        // 3. Update Selected Target Frame
        const selMob = this._world.selectedEnemy;
        const selProp = this._world.selectedProp;
        if (selMob && !selMob.dead) {
            this._targetPanel.active = true;
            const prefix = selMob.isBoss ? '[Thủ Lĩnh] ' : `Cấp ${selMob.def.level || 1} - `;
            this._targetTitleLbl.string = `${prefix}${selMob.def.name || selMob.type}`;
            this._targetBar.updateBar(
                selMob.hp,
                selMob.hpMax,
                `${Math.ceil(selMob.hp)} / ${selMob.hpMax}`,
                'hp'
            );
        } else if (selProp && selProp.node.active) {
            this._targetPanel.active = true;
            this._targetTitleLbl.string = selProp.def.name || selProp.def.id;
            this._targetBar.updateBar(1, 1, 'Nhấp chuột / Phím [E] để tương tác', 'mp');
        } else {
            this._targetPanel.active = false;
        }

        // 4. Banner & Toast fade timers
        if (this._bannerNode.active) {
            this._bannerTimer -= dt;
            if (this._bannerTimer <= 0) {
                this._bannerNode.active = false;
            } else if (this._bannerTimer < 0.6) {
                this._bannerOpacity.opacity = Math.round((this._bannerTimer / 0.6) * 255);
            }
        }
        if (this._toastNode.active) {
            this._toastTimer -= dt;
            if (this._toastTimer <= 0) {
                this._toastNode.active = false;
            } else if (this._toastTimer < 0.5) {
                this._toastOpacity.opacity = Math.round((this._toastTimer / 0.5) * 255);
            }
        }

        // 5. Update Minimap Live Dots & Coordinates
        if (this._world.mapData) {
            const ptx = Math.floor(this._world.player.x / TILE_SIZE);
            const pty = Math.floor(this._world.player.y / TILE_SIZE);
            this._coordLbl.string = `(${ptx}, ${pty})`;
            this._updateMinimapDots();
        }

        // 6. Update Hotbar Slots (1..8)
        for (let i = 0; i < 8; i++) {
            const ui = this._hotbarSlots[i];
            const sid = GameState.hotbar[i] || '';
            if (ui.loadedSkillId !== sid) {
                ui.loadedSkillId = sid;
                if (!sid) {
                    ui.iconSprite.spriteFrame = null;
                    ui.mpLabel.string = '';
                } else {
                    const sdef = ResourceManager.activeSkills[sid];
                    ui.mpLabel.string = sdef?.mp ? `${sdef.mp}` : '';
                    ResourceManager.loadSkillIcon(sid).then((sf) => {
                        if (ui.iconSprite.isValid && ui.loadedSkillId === sid) {
                            ui.iconSprite.spriteFrame = sf;
                        }
                    });
                }
            }
            if (sid) {
                const cd = this._world.player.spellCooldowns[sid] || 0;
                if (cd > 0.05) {
                    ui.cdOverlay.active = true;
                    ui.cdLabel.string = cd >= 10 ? `${Math.ceil(cd)}s` : `${cd.toFixed(1)}`;
                } else {
                    ui.cdOverlay.active = false;
                }
            } else {
                ui.cdOverlay.active = false;
            }
        }

        // 7. Update Quickslots (H, J, K, L)
        for (let q = 0; q < 4; q++) {
            const qu = this._quickSlots[q];
            const iid = GameState.quickslots[q] || '';
            if (qu.loadedItemId !== iid) {
                qu.loadedItemId = iid;
                if (!iid) {
                    qu.iconSprite.spriteFrame = null;
                } else {
                    ResourceManager.loadItemIcon(iid).then((sf) => {
                        if (qu.iconSprite.isValid && qu.loadedItemId === iid) {
                            qu.iconSprite.spriteFrame = sf;
                        }
                    });
                }
            }
            if (iid) {
                const cnt = GameState.countItem(iid);
                qu.qtyLabel.string = `${cnt}`;
                qu.iconSprite.color = cnt > 0 ? Color.WHITE : new Color(110, 110, 110, 150);
            } else {
                qu.qtyLabel.string = '';
            }
        }

        // 8. Action Toggle Active Highlights
        this._runBtn.setActiveStyle(this._world.player.running);
        this._autoBtn.setActiveStyle(this._world.player.autoCombat);
        this._flyBtn.setActiveStyle(this._world.player.flying);
        this._sitBtn.setActiveStyle(this._world.player.state === 'sit');
    }

    private _acquireDot(idx: number, sz: number, colorHex: string): void {
        while (this._dotPool.length <= idx) {
            const n = UiHelper.createNode(`Dot_${this._dotPool.length}`, this._minimapDotsRoot, 5, 5);
            const sp = UiHelper.attachSprite(n, UiHelper.skin('mote_dot'), 5, 5);
            this._dotPool.push({ node: n, sp });
        }
        const entry = this._dotPool[idx];
        entry.node.active = true;
        entry.node.getComponent(UITransform)!.setContentSize(sz, sz);
        entry.sp.color = UiHelper.hex(colorHex, 240);
    }

    private _updateMinimapDots(): void {
        const map = this._world.mapData;
        if (!this._minimapDotsRoot || !map || map.pxWidth <= 0 || map.pxHeight <= 0) return;

        const w = 182;
        const h = 118;
        const sx = w / map.pxWidth;
        const sy = h / map.pxHeight;

        let used = 0;

        // Portals (Cyan)
        for (const pt of map.portals || []) {
            this._acquireDot(used, 5, '#5ef2ff');
            this._dotPool[used].node.setPosition((pt.tx * TILE_SIZE + 16) * sx, -(pt.ty * TILE_SIZE + 16) * sy, 0);
            used++;
        }

        // NPCs & Quest Props (Gold)
        for (const pr of this._world.props) {
            if (!pr.node.active) continue;
            if (pr.def.type === 'npc' || GameState.getNpcMarker(pr.def.id)) {
                this._acquireDot(used, 5, '#ffd95e');
                this._dotPool[used].node.setPosition(pr.def.x * sx, -pr.def.y * sy, 0);
                used++;
            }
        }

        // Alive Enemies (Red / Boss Orange)
        for (const m of this._world.enemies) {
            if (m.dead) continue;
            this._acquireDot(used, m.isBoss ? 8 : 4, m.isBoss ? '#ff9838' : '#ff5247');
            this._dotPool[used].node.setPosition(m.x * sx, -m.y * sy, 0);
            used++;
        }

        for (let i = used; i < this._dotPool.length; i++) {
            this._dotPool[i].node.active = false;
        }

        // Player Dot & Ring on top
        const plX = this._world.player.x * sx;
        const plY = -this._world.player.y * sy;
        this._playerRingNode.setPosition(plX, plY, 0);
        this._playerDotNode.setPosition(plX, plY, 0);
        this._playerRingNode.setSiblingIndex(this._minimapDotsRoot.children.length - 1);
        this._playerDotNode.setSiblingIndex(this._minimapDotsRoot.children.length - 1);
    }
}
