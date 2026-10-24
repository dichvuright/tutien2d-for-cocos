import {
    _decorator,
    Component,
    EventKeyboard,
    Input,
    input,
    KeyCode,
    Node,
    Prefab,
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

        AudioManager.init(this.node);
        await ResourceManager.preloadEssentials();
        if (!this.node.isValid) return;

        // Pure Sprite Boot Loading Screen (9-slice wood-gold + official logo + FILLED bar)
        const loadOverlay = UiHelper.createPanel('BootLoadingScreen', this.node, 520, 176, {
            skin: 'wood',
            bgAlpha: 252,
            blockInput: true,
        });
        loadOverlay.node.setSiblingIndex(this.node.children.length - 1);

        const logoNode = UiHelper.createIconNode('BootLogo', loadOverlay.node, 'logo', 124, 52);
        logoNode.node.setPosition(0, 48, 0);

        const titleLbl = UiHelper.createLabel('BootTitle', loadOverlay.node, 'TU TIÊN 2D - TAM GIỚI TIÊN ĐỒ', {
            size: 16,
            colorHex: '#ffe89c',
            serif: true,
            bold: true,
            outlineHex: '#0a0704',
            outlineWidth: 2,
        });
        titleLbl.node.setPosition(0, 8, 0);

        const statusLbl = UiHelper.createLabel('BootStatus', loadOverlay.node, 'Đang khai mở linh mạch...', {
            size: 12,
            colorHex: '#d8ccb4',
        });
        statusLbl.node.setPosition(0, -18, 0);

        const loadBar = UiHelper.createBar('BootBar', loadOverlay.node, 440, 16, 'gold', '');
        loadBar.node.setPosition(-220, -52, 0);

        await ResourceManager.initAll((ratio, status) => {
            if (!loadOverlay.node.isValid) return;
            statusLbl.string = status;
            loadBar.updateBar(Math.round(ratio * 100), 100, `${Math.round(ratio * 100)}%`);
        });

        if (!this.node.isValid) return;
        loadOverlay.node.destroy();

        const hasSave = GameState.load();

        // Adopt pre-assembled Scene Nodes (or construct if missing)
        this.world = new WorldController(this.node);
        this.hud = new HudController(this.node, this.world, {
            onOpenBag: (tab) => this.modals.openBag(tab || 'bag'),
            onOpenGacha: () => this.modals.openGacha(),
            onOpenWorldMap: () => this.modals.openWorldMap(),
            onOpenSettings: () => this.modals.openSettingsModal(),
        });
        this.modals = new ModalPanels(this.node, this.world, this.hud);

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

        // Load saved map (or starting village `tan_vien`)
        await this.world.loadMap(
            GameState.currentMapId || 'tan_vien',
            undefined,
            hasSave && GameState.savedPos ? GameState.savedPos : undefined
        );

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
