import {
    _decorator,
    Component,
    EventKeyboard,
    Input,
    input,
    KeyCode,
    Label,
    Node,
    Prefab,
    Sprite,
    tween,
    UIOpacity,
    view,
} from 'cc';
import { AudioManager } from './core/AudioManager';
import { GameState } from './core/GameState';
import { ResourceManager } from './core/ResourceManager';
import { UiHelper } from './core/UiHelper';
import { HudController } from './ui/HudController';
import { ModalPanels } from './ui/ModalPanels';
import { WorldController } from './world/WorldController';

const { ccclass, property } = _decorator;

@ccclass('TuTienGameMain')
export class TuTienGameMain extends Component {
    @property({ type: Node, tooltip: 'Lớp hiển thị Bản Đồ và Thế Giới 2.5D' })
    public worldViewport: Node | null = null;

    @property({ type: Node, tooltip: 'Lớp giao diện HUD ghép ảnh Sprite' })
    public hudLayer: Node | null = null;

    @property({ type: Node, tooltip: 'Lớp cửa sổ Modal (Túi Đồ, Bí Tịch, Bản Đồ, Đối Thoại)' })
    public modalLayer: Node | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Nhân Vật Chính' })
    public playerPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab NPC Đạo Hữu' })
    public npcPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Yêu Thú / Thủ Lĩnh' })
    public enemyPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Cổng Truyền Tống' })
    public portalPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Ô Pháp Quyết [1-8]' })
    public skillSlotPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Ô Vật Phẩm Nhanh [H-L]' })
    public quickSlotPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab Ô Túi Đồ' })
    public itemCellPrefab: Prefab | null = null;

    public world!: WorldController;
    public hud!: HudController;
    public modals!: ModalPanels;

    private _ready: boolean = false;
    private _pressedKeys = new Set<KeyCode>();
    private _autosaveTimer: number = 0;

    protected start(): void {
        this._bootGame();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private async _bootGame(): Promise<void> {
        (globalThis as any).__tutienMain = this;
        const edPrev = this.node.getChildByName('EditorScenePreview');
        if (edPrev) edPrev.destroy();

        // Hide uninitialized static scene layers immediately on Frame 0 so raw preview nodes never flash!
        const preWorld = this.worldViewport || this.node.getChildByName('WorldViewport');
        const preHud = this.hudLayer || this.node.getChildByName('HudLayer');
        const preModal = this.modalLayer || this.node.getChildByName('ModalLayer');
        if (preWorld) preWorld.active = false;
        if (preHud) preHud.active = false;
        if (preModal) preModal.active = false;

        AudioManager.init(this.node);
        await ResourceManager.preloadEssentials();
        if (!this.node.isValid) return;

        // Full-Screen 32-Bit Pixel Art Xianxia Loading Splash (Tiên Sơn Vân Hải)
        const vis = view.getVisibleSize();
        const bootRoot = UiHelper.createNode('BootLoadingScreen', this.node, Math.max(1280, vis.width), Math.max(720, vis.height));
        const bootOpacity = bootRoot.addComponent(UIOpacity);
        bootOpacity.opacity = 255;
        bootRoot.setSiblingIndex(this.node.children.length - 1);

        // Deep night-jade safety curtain for ultrawide aspect ratios
        UiHelper.createSolidOverlay('BootCurtain', bootRoot, 3000, 2000, '#091218', 255);

        // Crisp 16:9 32-bit pixel Tiên Sơn Vân Hải splash wallpaper
        const coverScale = Math.max(vis.width / 1280, vis.height / 720, 1);
        const splashW = Math.round(1280 * coverScale);
        const splashH = Math.round(720 * coverScale);
        const splashArt = UiHelper.createIconNode('BootSplashArt', bootRoot, 'loading-splash', splashW, splashH);
        splashArt.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        splashArt.sprite.trim = false;

        // Top-Center Rotating Eight-Trigrams Aura + 1:1 Crisp Sect Crest + Ornate Title Plaque
        const bagua = UiHelper.createIconNode('BootBagua', bootRoot, 'formation-dao', 124, 124);
        bagua.node.setPosition(0, 256, 0);
        bagua.sprite.color = UiHelper.hex('#ffe89c', 155);
        tween(bagua.node).by(20, { angle: -360 }).repeatForever().start();

        const logoNode = UiHelper.createIconNode('BootLogo', bootRoot, 'logo', 84, 84);
        logoNode.node.setPosition(0, 256, 0);

        const titlePlaque = UiHelper.createPanel('BootTitlePlaque', bootRoot, 456, 42, {
            skin: 'header',
            bgAlpha: 238,
        });
        titlePlaque.node.setPosition(0, 184, 0);

        UiHelper.createLabel('BootTitle', titlePlaque.node, 'TU TIÊN 2D - TAM GIỚI TIÊN ĐỒ', {
            size: 16,
            colorHex: '#ffe89c',
            serif: true,
            bold: true,
            outlineHex: '#090604',
            outlineWidth: 2,
        });

        // Bottom-Center Ornate Cultivation Progress Dock (leaves floating island & cliff cultivator unobstructed!)
        const loadDock = UiHelper.createPanel('BootLoadingDock', bootRoot, 624, 98, {
            skin: 'wood',
            bgAlpha: 238,
            blockInput: true,
        });
        loadDock.node.setPosition(0, -256, 0);

        const statusLbl = UiHelper.createLabel('BootStatus', loadDock.node, 'Đang khai mở linh mạch Tam Giới...', {
            size: 12,
            colorHex: '#eaf5ee',
            align: Label.HorizontalAlign.LEFT,
            ax: 0,
            outlineHex: '#080604',
            outlineWidth: 2,
        });
        statusLbl.node.setPosition(-284, 24, 0);

        const pctLbl = UiHelper.createLabel('BootPct', loadDock.node, '0%', {
            size: 13,
            colorHex: '#ffe47a',
            bold: true,
            align: Label.HorizontalAlign.RIGHT,
            ax: 1,
            outlineHex: '#080604',
            outlineWidth: 2,
        });
        pctLbl.node.setPosition(284, 24, 0);

        const barBevel = UiHelper.createPanel('BootBarBevel', loadDock.node, 574, 24, {
            skin: 'slot',
            bgAlpha: 245,
        });
        barBevel.node.setPosition(0, -2, 0);

        const loadBar = UiHelper.createBar('BootBar', loadDock.node, 566, 18, 'gold', '');
        loadBar.node.setPosition(-283, -2, 0);

        const tips = [
            'Khẩu quyết: Đọc Bia Đá Cổ Tự đầu làng để lĩnh ngộ công pháp nhập môn.',
            'Tiên duyên: Đả tọa [Q] cạnh Mạch Linh Tuyền giúp tụ linh khí nhanh gấp bội.',
            'Bí pháp: Đạt Luyện Khí Tầng 4 có thể ngự kiếm phi hành [F] vượt sông núi.',
            'Cơ duyên: Vạn Bảo Phường và Thợ Rèn trong làng rèn đúc pháp bảo hộ thân.',
        ];
        const tipLbl = UiHelper.createLabel('BootTip', loadDock.node, tips[0], {
            size: 11,
            colorHex: '#b8d8ca',
            outlineHex: '#080604',
            outlineWidth: 1.8,
        });
        tipLbl.node.setPosition(0, -30, 0);

        const setBootProgress = (ratio: number, status: string) => {
            if (!bootRoot.isValid) return;
            const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
            statusLbl.string = status;
            pctLbl.string = `${pct}%`;
            loadBar.updateBar(pct, 100, '');
            tipLbl.string = tips[Math.min(tips.length - 1, Math.floor((pct / 101) * tips.length))];
        };

        await ResourceManager.initAll((ratio, status) => {
            setBootProgress(ratio * 0.88, status);
        });

        if (!this.node.isValid) return;
        setBootProgress(0.92, 'Đang dựng cảnh giới Tam Giới...');

        const hasSave = GameState.load();

        // Adopt pre-assembled Scene Nodes (or construct if missing) while still covered by BootLoadingScreen!
        this.world = new WorldController(this.node);
        this.hud = new HudController(this.node, this.world, {
            onOpenBag: (tab) => this.modals.openBag(tab || 'bag'),
            onOpenGacha: () => this.modals.openGacha(),
            onOpenWorldMap: () => this.modals.openWorldMap(),
            onOpenSettings: () => this.modals.openSettingsModal(),
        });
        this.modals = new ModalPanels(this.node, this.world, this.hud);
        bootRoot.setSiblingIndex(this.node.children.length - 1);

        this.worldViewport = this.world.rootNode;
        this.hudLayer = this.hud.rootNode;
        this.modalLayer = this.modals.rootNode;

        // Wire World -> HUD / Modals callbacks
        this.world.onMapChanged = (map) => this.hud.onMapChanged(map);
        this.world.onToast = (msg, colorHex) => this.hud.showToast(msg, colorHex);
        this.world.onBannerAnnounce = (title, sub) => this.hud.showBanner(title, sub || '');
        this.world.onInteractProp = (prop) => this.modals.openNpcOrPropDialog(prop);
        this.world.onInteractInfo = (info) => this.modals.openInfoDialog(info);

        // Bind Keyboard Controls
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);

        // Load saved map (or starting village `tan_vien`) completely behind the splash screen!
        await this.world.loadMap(
            GameState.currentMapId || 'tan_vien',
            undefined,
            hasSave && GameState.savedPos ? GameState.savedPos : undefined
        );
        if (!this.node.isValid) return;

        this.worldViewport.active = true;
        this.hudLayer.active = true;
        setBootProgress(1.0, 'Hoàn tất khai mở Tiên Đồ!');

        this._ready = true;

        // Open Character Creation if new player
        if (!hasSave || !GameState.hasCharacter) {
            this.modals.openCharCreator(() => {
                this.world.loadMap('tan_vien');
                this.world.player.refreshAppearance();
                this.hud.showBanner('Làng Tản Viên', 'Bước đầu Phàm Nhân Tu Tiên - Hãy đọc Bia Đá Cổ Tự!');
            }, false);
        } else {
            this.hud.showToast('Chào mừng đạo hữu tái xuất Tiên Đồ! (WASD/Chuột di chuyển, Space đánh, E tương tác)', '#ffe89c');
        }

        // Keep BootLoadingScreen on top and fade out smoothly over 0.28s
        bootRoot.setSiblingIndex(this.node.children.length - 1);
        tween(bootOpacity)
            .to(0.28, { opacity: 0 })
            .call(() => {
                if (bootRoot.isValid) bootRoot.destroy();
            })
            .start();
    }

    private _onKeyDown(ev: EventKeyboard): void {
        AudioManager.unlockAudio();
        const code = ev.keyCode;
        this._pressedKeys.add(code);

        if (!this._ready) return;

        if (code === KeyCode.ESCAPE) {
            if (this.modals.isOpen) {
                this.modals.close();
            } else {
                this.modals.openSettingsModal();
            }
            return;
        }

        if (this.modals.isOpen && this.modals.activeKind === 'char_create') {
            return;
        }

        if (code === KeyCode.KEY_B || code === KeyCode.KEY_I) {
            if (this.modals.isOpen && this.modals.activeKind === 'bag') this.modals.close();
            else this.modals.openBag('bag');
            return;
        }
        if (code === KeyCode.KEY_N) {
            if (this.modals.isOpen && this.modals.activeKind === 'bag') this.modals.close();
            else this.modals.openBag('skills');
            return;
        }
        if (code === KeyCode.KEY_P) {
            if (this.modals.isOpen && this.modals.activeKind === 'bag') this.modals.close();
            else this.modals.openBag('cultivate');
            return;
        }
        if (code === KeyCode.KEY_C) {
            if (this.modals.isOpen && this.modals.activeKind === 'bag') this.modals.close();
            else this.modals.openBag('stats');
            return;
        }
        if (code === KeyCode.KEY_G) {
            if (this.modals.isOpen && this.modals.activeKind === 'gacha') this.modals.close();
            else this.modals.openGacha();
            return;
        }
        if (code === KeyCode.KEY_M) {
            if (this.modals.isOpen && this.modals.activeKind === 'worldmap') this.modals.close();
            else this.modals.openWorldMap();
            return;
        }

        if (this.modals.isOpen) return;

        switch (code) {
            case KeyCode.SPACE:
                this.world.interactOrAttackNearest();
                break;
            case KeyCode.KEY_E:
            case KeyCode.ENTER:
                this.world.interactNearestOnly();
                break;
            case KeyCode.TAB:
                this.world.cycleTarget();
                break;
            case KeyCode.KEY_Q: {
                const r = this.world.player.toggleMeditate(false, this.world.vfx);
                this.hud.showToast(r.msg, r.ok ? '#9df2dd' : '#ff9c7a');
                break;
            }
            case KeyCode.KEY_F: {
                const r = this.world.player.toggleFly(this.world.mapData, this.world.vfx);
                this.hud.showToast(r.msg, r.ok ? '#8fd8ff' : '#ff9c7a');
                break;
            }
            case KeyCode.KEY_T:
            case KeyCode.KEY_R:
                this.world.player.autoCombat = !this.world.player.autoCombat;
                this.hud.showToast(
                    this.world.player.autoCombat
                        ? 'Đã bật Tự Động Chiến Đấu [T]!'
                        : 'Đã tắt Tự Động Chiến Đấu.'
                );
                break;
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.world.player.running = !this.world.player.running;
                this.hud.showToast(this.world.player.running ? 'Chế độ: Chạy nhanh' : 'Chế độ: Đi bộ');
                break;
            case KeyCode.DIGIT_1:
                this.world.castHotbarSlot(0);
                break;
            case KeyCode.DIGIT_2:
                this.world.castHotbarSlot(1);
                break;
            case KeyCode.DIGIT_3:
                this.world.castHotbarSlot(2);
                break;
            case KeyCode.DIGIT_4:
                this.world.castHotbarSlot(3);
                break;
            case KeyCode.DIGIT_5:
                this.world.castHotbarSlot(4);
                break;
            case KeyCode.DIGIT_6:
                this.world.castHotbarSlot(5);
                break;
            case KeyCode.DIGIT_7:
                this.world.castHotbarSlot(6);
                break;
            case KeyCode.DIGIT_8:
                this.world.castHotbarSlot(7);
                break;
            case KeyCode.KEY_H:
                this.world.useQuickslot(0);
                break;
            case KeyCode.KEY_J:
                this.world.useQuickslot(1);
                break;
            case KeyCode.KEY_K:
                this.world.useQuickslot(2);
                break;
            case KeyCode.KEY_L:
                this.world.useQuickslot(3);
                break;
        }
    }

    private _onKeyUp(ev: EventKeyboard): void {
        this._pressedKeys.delete(ev.keyCode);
    }

    private _computeMoveVector(): { x: number; y: number } {
        if (this.modals && this.modals.isOpen) {
            return { x: 0, y: 0 };
        }
        let mx = this.hud ? this.hud.dpadX : 0;
        let my = this.hud ? this.hud.dpadY : 0;

        if (this._pressedKeys.has(KeyCode.KEY_A) || this._pressedKeys.has(KeyCode.ARROW_LEFT)) mx -= 1;
        if (this._pressedKeys.has(KeyCode.KEY_D) || this._pressedKeys.has(KeyCode.ARROW_RIGHT)) mx += 1;
        if (this._pressedKeys.has(KeyCode.KEY_W) || this._pressedKeys.has(KeyCode.ARROW_UP)) my -= 1;
        if (this._pressedKeys.has(KeyCode.KEY_S) || this._pressedKeys.has(KeyCode.ARROW_DOWN)) my += 1;

        mx = Math.max(-1, Math.min(1, mx));
        my = Math.max(-1, Math.min(1, my));
        return { x: mx, y: my };
    }

    protected update(dt: number): void {
        if (!this._ready) return;
        const safeDt = Math.min(0.05, Math.max(0.001, dt));

        const mv = this._computeMoveVector();
        this.world.update(safeDt, mv.x, mv.y);
        this.hud.update(safeDt);
        this.modals.update(safeDt);

        this._autosaveTimer += safeDt;
        if (this._autosaveTimer >= 5.0) {
            this._autosaveTimer = 0;
            if (GameState.hasCharacter && !this.world.player.downed) {
                GameState.savedPos = {
                    x: Math.round(this.world.player.x),
                    y: Math.round(this.world.player.y),
                };
                GameState.save();
            }
        }
    }
}
