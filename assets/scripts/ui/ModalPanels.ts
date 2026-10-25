import {
    BlockInputEvents,
    Color,
    EditBox,
    EventTouch,
    Label,
    Node,
    Sprite,
    UITransform,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import {
    BREW_RECIPES,
    CharacterConfig,
    EquipSlot,
    FARM_SEEDS,
    GameState,
    LINH_CAN_LIST,
} from '../core/GameState';
import {
    MapInteractableDef,
    MapPropDef,
    ResourceManager,
} from '../core/ResourceManager';
import { ButtonSkinType, UiHelper } from '../core/UiHelper';
import { HudController } from './HudController';
import { WorldController } from '../world/WorldController';

const DAO_NAME_PRESETS = [
    'Hàn Lập',
    'Bạch Tiểu Thuần',
    'Tiêu Viêm',
    'Nam Cung Uyển',
    'Lục Tuyết Kỳ',
    'Diệp Phàm',
    'Lâm Động',
    'Vương Lâm',
    'Mạnh Hạo',
    'Tiểu Tu Tiên',
];

const OUTFIT_CHOICES: Array<{ id: string; label: string }> = [
    { id: 'bach_y', label: 'Bạch Y' },
    { id: 'thanh_y', label: 'Thanh Y' },
    { id: 'lam_y', label: 'Lam Y' },
    { id: 'hac_y', label: 'Hắc Y' },
    { id: 'tu_quang_y', label: 'Tử Quang Y' },
    { id: 'huyet_anh_y', label: 'Huyết Ảnh Y' },
];

const EQUIP_SLOT_LIST: Array<{ slot: EquipSlot; label: string }> = [
    { slot: 'vu_khi', label: 'Vũ Khí' },
    { slot: 'ao', label: 'Y Phục' },
    { slot: 'giap', label: 'Hộ Giáp' },
    { slot: 'mu', label: 'Mũ / Quan' },
    { slot: 'giay', label: 'Hành Ngoa' },
    { slot: 'nhan', label: 'Linh Giới' },
    { slot: 'phap_boi', label: 'Pháp Bội' },
    { slot: 'phi_hanh', label: 'Phi Hành' },
];

const DAO_QUIZ_BANK: Array<{ q: string; opts: string[]; ans: number }> = [
    {
        q: 'Phàm nhân muốn bước vào con đường Tu Tiên trước tiên cần làm gì?',
        opts: ['Tẩy Tuỷ Phạt Mao rửa sạch trọc khí', 'Nhảy xuống vực tìm kỳ ngộ', 'Ngủ ba ngày ba đêm'],
        ans: 0,
    },
    {
        q: 'Khi ngồi Đả Tọa [Q], tu sĩ nhận được lợi ích nào sau đây?',
        opts: ['Mất Linh Thạch', 'Hồi Khí Huyết, Linh Lực và tăng Đạo Hạnh', 'Tăng sát nghiệp'],
        ans: 1,
    },
    {
        q: 'Pháp khí Phi Hành (Phi Diệp) yêu cầu tối thiểu cảnh giới nào để ngự không?',
        opts: ['Phàm Nhân', 'Luyện Khí Tầng 4', 'Hoá Thần Kỳ'],
        ans: 1,
    },
    {
        q: 'Đan dược nào dùng để phá quan từ Luyện Khí Tầng 13 lên Trúc Cơ Sơ Kỳ?',
        opts: ['Bát Cơm Linh Mễ', 'Tẩy Tuỷ Thang', 'Trúc Cơ Đan'],
        ans: 2,
    },
    {
        q: 'Đạo tâm của người tu hành quý nhất ở điều gì?',
        opts: ['Kiên định, sáng suốt, không loạn trước ngoại cảnh', 'Tham thắng bất chấp', 'Ỷ mạnh hiếp yếu'],
        ans: 0,
    },
];

const SHOP_FOOD_ITEMS: Array<{ id: string; price: number }> = [
    { id: 'bat_com_linh_me', price: 15 },
    { id: 'linh_ke_can', price: 35 },
    { id: 'phu_thanh_tam', price: 25 },
    { id: 'phu_toc_hanh', price: 30 },
    { id: 'phu_kim_giap', price: 40 },
    { id: 'phu_hoa', price: 35 },
    { id: 'dan_ngu_hanh', price: 180 },
];

const SHOP_VAN_BAO_ITEMS: Array<{ id: string; price: number }> = [
    { id: 'tay_ue_thao', price: 12 },
    { id: 'linh_diep', price: 18 },
    { id: 'huyet_thao', price: 18 },
    { id: 'linh_thuy', price: 45 },
    { id: 'tu_khi_dan', price: 140 },
    { id: 'luyen_khi_dan', price: 320 },
    { id: 'pha_canh_dan', price: 680 },
    { id: 'truc_co_dan', price: 3500 },
    { id: 'huyen_thiet_khoang', price: 35 },
    { id: 'yeu_cot', price: 25 },
    { id: 'doc_dang_doc_dich', price: 28 },
    { id: 'phong_linh_thao', price: 30 },
    { id: 'nam_linh_chi', price: 40 },
    { id: 'hat_linh_diep', price: 15 },
    { id: 'hat_huyet_thao', price: 15 },
    { id: 'hat_truc_co_thao', price: 120 },
];

export class ModalPanels {
    public rootNode: Node;
    private _world: WorldController;
    private _hud: HudController;

    private _backdrop: Node;
    private _windowHolder: Node;
    private _activeKind: string = '';

    private _previewSprite: Sprite | null = null;
    private _previewPedestal: Node | null = null;
    private _previewAtlas: any = null;
    private _previewPrefix: string = '';
    private _previewTimer: number = 0;

    constructor(canvasNode: Node, world: WorldController, hud: HudController) {
        this._world = world;
        this._hud = hud;

        this.rootNode = UiHelper.findOrCreateNode('ModalLayer', canvasNode, 1280, 720);
        UiHelper.pinWidget(this.rootNode, { top: 0, bottom: 0, left: 0, right: 0 });
        this.rootNode.active = false;

        let bd = this.rootNode.getChildByName('DimBackdrop');
        if (!bd) {
            bd = UiHelper.createSolidOverlay('DimBackdrop', this.rootNode, 3000, 2000, '#060504', 188).node;
        }
        if (!bd.getComponent(BlockInputEvents)) bd.addComponent(BlockInputEvents);
        this._backdrop = bd;

        this._windowHolder = UiHelper.findOrCreateNode('WindowHolder', this.rootNode, 1280, 720);
    }

    public get isOpen(): boolean {
        return this.rootNode.active;
    }

    public get activeKind(): string {
        return this._activeKind;
    }

    public close(): void {
        if (this._activeKind === 'char_create' && !GameState.hasCharacter) {
            return;
        }
        this._previewSprite = null;
        this._previewPedestal = null;
        this._previewAtlas = null;
        for (const c of this._windowHolder.children.slice()) {
            c.destroy();
        }
        this._activeKind = '';
        this.rootNode.active = false;
    }

    public update(dt: number): void {
        if (this._world.player.downed && this._activeKind !== 'downed' && this._activeKind !== 'char_create') {
            this.openDownedModal();
        }

        if (this._previewSprite && this._previewSprite.isValid && this._previewAtlas) {
            this._previewTimer += dt;
            const walkCols = [0, 1, 2, 3, 6, 7, 4, 5];
            const col = walkCols[Math.floor(this._previewTimer * 4.5) % walkCols.length];
            const sf = this._previewAtlas.getSpriteFrame(`${this._previewPrefix}_down_${String(col).padStart(2, '0')}`);
            if (sf) this._previewSprite.spriteFrame = sf;
        }
        if (this._previewPedestal && this._previewPedestal.isValid) {
            this._previewPedestal.angle = (this._previewPedestal.angle + dt * 16) % 360;
        }
    }

    private _prepareWindow(
        kind: string,
        title: string,
        w: number,
        h: number,
        allowClose: boolean = true,
        headerIconKey: string = 'logo-icon'
    ): Node {
        this._previewSprite = null;
        this._previewPedestal = null;
        this._previewAtlas = null;
        for (const c of this._windowHolder.children.slice()) {
            c.destroy();
        }
        this._activeKind = kind;
        this.rootNode.active = true;

        const { node: win } = UiHelper.createPanel(`Modal_${kind}`, this._windowHolder, w, h, {
            skin: 'wood',
            bgAlpha: 252,
            blockInput: true,
        });

        const hdr = UiHelper.createPanel('Header', win, w - 16, 38, {
            skin: 'header',
        });
        hdr.node.setPosition(0, h * 0.5 - 26, 0);

        const hIcon = UiHelper.createIconNode('HeaderEmblem', hdr.node, headerIconKey, 22, 22);
        hIcon.node.setPosition(-(w - 16) * 0.5 + 22, 0, 0);

        UiHelper.createLabel('Title', hdr.node, title, {
            size: 16,
            colorHex: '#ffe89c',
            serif: true,
            bold: true,
            outlineHex: '#0a0704',
            outlineWidth: 2,
            width: w - 160,
            overflow: Label.Overflow.SHRINK,
        });

        if (allowClose) {
            const closeBtn = UiHelper.createButton(
                'CloseBtn',
                win,
                'Đóng',
                66,
                28,
                () => {
                    AudioManager.playSfx('ui_click');
                    this.close();
                },
                {
                    skin: 'crimson',
                    textHex: '#ffe2d6',
                    fontSize: 11,
                }
            );
            closeBtn.node.setPosition(w * 0.5 - 46, h * 0.5 - 26, 0);
        }

        return win;
    }

    // =========================================================================
    // 1. CHARACTER CREATION MODAL
    // =========================================================================
    public openCharCreator(onCreated: () => void, allowCancel: boolean = false): void {
        const draft: CharacterConfig = {
            ...GameState.char,
            name: GameState.hasCharacter ? GameState.char.name : DAO_NAME_PRESETS[0],
        };
        let nameIdx = 0;

        const render = () => {
            const w = 780;
            const h = 490;
            const win = this._prepareWindow(
                'char_create',
                'KHAI MỞ TIÊN ĐỒ - KHỞI TẠO NHÂN VẬT',
                w,
                h,
                allowCancel,
                'logo-icon'
            );

            const prevCard = UiHelper.createPanel('PreviewCard', win, 228, 360, {
                skin: 'sub',
            });
            prevCard.node.setPosition(-255, -8, 0);

            UiHelper.createLabel('PrevHdr', prevCard.node, 'HÌNH HÀI ĐẠO HỮU', {
                size: 12,
                colorHex: '#ffd970',
                bold: true,
            }).node.setPosition(0, 152, 0);

            // Authentic Dao Formation Pedestal Sprite
            const pedestalRoot = UiHelper.createNode('PedestalHolder', prevCard.node, 140, 64);
            pedestalRoot.setPosition(0, -32, 0);
            pedestalRoot.setScale(1, 0.45, 1);
            const formArt = UiHelper.createIconNode('DaoFormation', pedestalRoot, 'formation-dao', 132, 132);
            formArt.sprite.color = new Color(255, 255, 255, 215);
            this._previewPedestal = formArt.node;

            const spNode = UiHelper.createNode('PreviewChar', prevCard.node, 96, 128, 0.5, 0.03);
            spNode.setPosition(0, -34, 0);
            this._previewSprite = spNode.addComponent(Sprite);
            this._previewSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this._previewSprite.trim = false;

            const chosenOutfit = OUTFIT_CHOICES.some((o) => o.id === draft.outfit) ? draft.outfit : 'bach_y';
            ResourceManager.loadCharacterAtlas(draft.gender, chosenOutfit).then(({ atlas, prefix }) => {
                if (!spNode.isValid || !atlas) return;
                this._previewAtlas = atlas;
                this._previewPrefix = prefix;
                const sf = atlas.getSpriteFrame(`${prefix}_down_06`) || atlas.getSpriteFrames()[0];
                if (sf && this._previewSprite) {
                    this._previewSprite.spriteFrame = sf;
                    spNode.getComponent(UITransform)?.setContentSize(96, 128);
                }
            });

            const lcObj = LINH_CAN_LIST.find((l) => l.id === draft.linhCan) || LINH_CAN_LIST[0];
            UiHelper.createLabel('LcTitle', prevCard.node, lcObj.name, {
                size: 13,
                colorHex: lcObj.color,
                bold: true,
                outlineHex: '#080503',
                outlineWidth: 2,
            }).node.setPosition(0, -78, 0);

            UiHelper.createLabel('LcBonus', prevCard.node, lcObj.bonusDesc, {
                size: 10,
                lineHeight: 14,
                colorHex: '#dcd2be',
                width: 204,
                overflow: Label.Overflow.SHRINK,
            }).node.setPosition(0, -104, 0);

            UiHelper.createButton(
                'RandomBtn',
                prevCard.node,
                'Ngẫu Nhiên Tiên Duyên',
                196,
                30,
                () => {
                    AudioManager.playSfx('ui_click');
                    draft.gender = Math.random() < 0.5 ? 'male' : 'female';
                    draft.outfit = OUTFIT_CHOICES[Math.floor(Math.random() * OUTFIT_CHOICES.length)].id;
                    draft.linhCan = LINH_CAN_LIST[Math.floor(Math.random() * LINH_CAN_LIST.length)].id;
                    draft.name = DAO_NAME_PRESETS[Math.floor(Math.random() * DAO_NAME_PRESETS.length)];
                    render();
                },
                { skin: 'wood', iconKey: 'hud-exchange', iconSize: 16, fontSize: 11 }
            ).node.setPosition(0, -148, 0);

            // 1. Đạo Hiệu
            UiHelper.createLabel('LblName', win, 'Đạo Hiệu:', {
                size: 12,
                colorHex: '#ffd970',
                bold: true,
                ax: 0,
                align: Label.HorizontalAlign.LEFT,
            }).node.setPosition(-122, 162, 0);

            const nameBoxPanel = UiHelper.createPanel('NameInputBg', win, 230, 32, {
                skin: 'slot',
            });
            nameBoxPanel.node.setPosition(62, 162, 0);

            const nameDisplayLbl = UiHelper.createLabel('NameDisplay', nameBoxPanel.node, draft.name, {
                size: 13,
                colorHex: '#fff0c2',
                bold: true,
                width: 214,
                overflow: Label.Overflow.SHRINK,
                outlineHex: '#080503',
                outlineWidth: 2,
            });

            const ebNode = UiHelper.createNode('NameEditBox', nameBoxPanel.node, 224, 30);
            const editBox = ebNode.addComponent(EditBox);
            editBox.maxLength = 18;
            editBox.string = draft.name;
            if (editBox.textLabel) {
                editBox.textLabel.color = new Color(255, 255, 255, 0);
            }
            if (editBox.placeholderLabel) {
                editBox.placeholderLabel.color = new Color(255, 255, 255, 0);
            }
            ebNode.on('text-changed', (eb: EditBox) => {
                draft.name = (eb.string || '').trim() || 'Tiểu Tu Tiên';
                nameDisplayLbl.string = draft.name;
            });

            UiHelper.createButton(
                'CycleNameBtn',
                win,
                'Đổi Tên Khác',
                110,
                30,
                () => {
                    AudioManager.playSfx('ui_click');
                    nameIdx = (nameIdx + 1) % DAO_NAME_PRESETS.length;
                    draft.name = DAO_NAME_PRESETS[nameIdx];
                    render();
                },
                { skin: 'wood', fontSize: 11 }
            ).node.setPosition(244, 162, 0);

            // 2. Giới Tính & Nón Lá
            UiHelper.createLabel('LblGender', win, 'Căn Cốt:', {
                size: 12,
                colorHex: '#ffd970',
                bold: true,
                ax: 0,
                align: Label.HorizontalAlign.LEFT,
            }).node.setPosition(-122, 118, 0);

            const bMale = UiHelper.createButton('BtnMale', win, 'Nam Tu', 102, 30, () => {
                AudioManager.playSfx('ui_click');
                draft.gender = 'male';
                render();
            }, { skin: 'wood', fontSize: 11 });
            bMale.node.setPosition(-2, 118, 0);
            bMale.setActiveStyle(draft.gender === 'male');

            const bFem = UiHelper.createButton('BtnFemale', win, 'Nữ Tu', 102, 30, () => {
                AudioManager.playSfx('ui_click');
                draft.gender = 'female';
                render();
            }, { skin: 'wood', fontSize: 11 });
            bFem.node.setPosition(110, 118, 0);
            bFem.setActiveStyle(draft.gender === 'female');

            const bHat = UiHelper.createButton(
                'BtnHat',
                win,
                draft.hat === 'straw' ? 'Có Nón Lá' : 'Không Nón',
                126,
                30,
                () => {
                    AudioManager.playSfx('ui_click');
                    draft.hat = draft.hat === 'straw' ? 'none' : 'straw';
                    render();
                },
                { skin: 'wood', iconKey: 'ic-hat', iconSize: 16, fontSize: 11 }
            );
            bHat.node.setPosition(236, 118, 0);
            bHat.setActiveStyle(draft.hat === 'straw');

            // 3. Y Phục Khởi Đầu
            UiHelper.createLabel('LblOutfit', win, 'Y Phục Khởi Đầu:', {
                size: 12,
                colorHex: '#ffd970',
                bold: true,
                ax: 0,
                align: Label.HorizontalAlign.LEFT,
            }).node.setPosition(-122, 74, 0);

            for (let i = 0; i < OUTFIT_CHOICES.length; i++) {
                const oc = OUTFIT_CHOICES[i];
                const col = i % 3;
                const row = Math.floor(i / 3);
                const ob = UiHelper.createButton(`Outfit_${oc.id}`, win, oc.label, 138, 28, () => {
                    AudioManager.playSfx('ui_click');
                    draft.outfit = oc.id;
                    render();
                }, { skin: 'wood', fontSize: 11 });
                ob.node.setPosition(-46 + col * 146, 42 - row * 34, 0);
                ob.setActiveStyle(draft.outfit === oc.id);
            }

            // 4. Thiên Phú Linh Căn
            UiHelper.createLabel('LblLc', win, 'Thiên Phú Linh Căn (Khai mở khi Tẩy Tuỷ):', {
                size: 12,
                colorHex: '#ffd970',
                bold: true,
                ax: 0,
                align: Label.HorizontalAlign.LEFT,
            }).node.setPosition(-122, -26, 0);

            for (let i = 0; i < LINH_CAN_LIST.length; i++) {
                const lc = LINH_CAN_LIST[i];
                const col = i % 4;
                const row = Math.floor(i / 4);
                const lb = UiHelper.createButton(
                    `Lc_${lc.id}`,
                    win,
                    lc.name.replace(' Linh Căn', '').replace(' Dị', ''),
                    106,
                    30,
                    () => {
                        AudioManager.playSfx('ui_click');
                        draft.linhCan = lc.id;
                        render();
                    },
                    { skin: 'wood', textHex: lc.color, fontSize: 11 }
                );
                lb.node.setPosition(-64 + col * 112, -58 - row * 36, 0);
                lb.setActiveStyle(draft.linhCan === lc.id);
            }

            // Bottom Start Buttons
            const startNormalBtn = UiHelper.createButton(
                'StartNormalBtn',
                win,
                'BƯỚC VÀO TIÊN ĐỒ (Chuẩn Cốt Truyện)',
                292,
                40,
                () => {
                    AudioManager.playSfx('breakthrough');
                    GameState.createNewCharacter(draft);
                    this.close();
                    onCreated();
                },
                {
                    skin: 'gold',
                    iconKey: 'ic-sword',
                    iconSize: 20,
                    textHex: '#fff5c2',
                    fontSize: 12,
                }
            );
            startNormalBtn.node.setPosition(-20, -196, 0);

            const startBoostBtn = UiHelper.createButton(
                'StartBoostBtn',
                win,
                'Vào + Gói Tân Thủ',
                206,
                40,
                () => {
                    AudioManager.playSfx('breakthrough');
                    GameState.createNewCharacter(draft);
                    const msg = GameState.grantExperienceBoostPack();
                    this.close();
                    onCreated();
                    this._hud.showToast(msg, '#ffe89c');
                },
                {
                    skin: 'jade',
                    iconKey: 'ic-gift',
                    iconSize: 20,
                    textHex: '#dcffdf',
                    fontSize: 11,
                }
            );
            startBoostBtn.node.setPosition(244, -196, 0);
        };

        render();
    }

    // =========================================================================
    // 2. BAG / CHARACTER / SKILLS / CULTIVATION MODAL
    // =========================================================================
    public openBag(initialTab: 'bag' | 'skills' | 'cultivate' | 'stats' = 'bag'): void {
        let curTab = initialTab;
        let bagFilter: 'all' | 'equip' | 'consumable' | 'mat' = 'all';
        let bagPage = 0;
        let selectedItemId: string = '';

        let skillMode: 'active' | 'passive' = 'active';
        let skillOnlyLearned = false;
        let skillPage = 0;
        let selectedSkillId: string = '';

        const render = () => {
            const w = 880;
            const h = 540;
            const win = this._prepareWindow('bag', 'HÀNH TRANG - BÍ TỊCH - ĐẠO CƠ', w, h, true, 'ic-bag');

            const tabs: Array<{ id: 'bag' | 'skills' | 'cultivate' | 'stats'; label: string; icon: string }> = [
                { id: 'bag', label: 'Trang Bị & Túi Đồ', icon: 'ic-bag' },
                { id: 'skills', label: 'Bí Tịch & Kỹ Năng', icon: 'ic-book' },
                { id: 'cultivate', label: 'Tu Luyện & Đột Phá', icon: 'ic-pill' },
                { id: 'stats', label: 'Chỉ Số Nhân Vật', icon: 'hud-inspect' },
            ];
            for (let i = 0; i < tabs.length; i++) {
                const t = tabs[i];
                const tb = UiHelper.createButton(`Tab_${t.id}`, win, t.label, 198, 30, () => {
                    AudioManager.playSfx('ui_click');
                    curTab = t.id;
                    render();
                }, { skin: 'wood', iconKey: t.icon, iconSize: 16, fontSize: 11 });
                tb.node.setPosition(-306 + i * 204, h * 0.5 - 64, 0);
                tb.setActiveStyle(curTab === t.id);
            }

            const bodyNode = UiHelper.createNode('TabBody', win, w - 24, h - 104);
            bodyNode.setPosition(0, -36, 0);

            if (curTab === 'bag') {
                this._renderBagTab(
                    bodyNode,
                    bagFilter,
                    bagPage,
                    selectedItemId,
                    (nf) => { bagFilter = nf; bagPage = 0; render(); },
                    (np) => { bagPage = np; render(); },
                    (sel) => { selectedItemId = sel; render(); },
                    () => render()
                );
            } else if (curTab === 'skills') {
                this._renderSkillsTab(
                    bodyNode,
                    skillMode,
                    skillOnlyLearned,
                    skillPage,
                    selectedSkillId,
                    (m, ol) => { skillMode = m; skillOnlyLearned = ol; skillPage = 0; render(); },
                    (np) => { skillPage = np; render(); },
                    (sid) => { selectedSkillId = sid; render(); },
                    () => render()
                );
            } else if (curTab === 'cultivate') {
                this._renderCultivateTab(bodyNode, () => render());
            } else {
                this._renderStatsTab(bodyNode);
            }
        };

        render();
    }

    private _renderBagTab(
        parent: Node,
        filter: 'all' | 'equip' | 'consumable' | 'mat',
        page: number,
        selectedId: string,
        onFilter: (f: 'all' | 'equip' | 'consumable' | 'mat') => void,
        onPage: (p: number) => void,
        onSelect: (id: string) => void,
        onRefresh: () => void
    ): void {
        const eqPanel = UiHelper.createPanel('EquipCol', parent, 246, 412, {
            skin: 'sub',
        });
        eqPanel.node.setPosition(-302, 0, 0);

        UiHelper.createLabel('EqTitle', eqPanel.node, 'TRANG BỊ ĐANG MẶC', {
            size: 12,
            colorHex: '#ffd970',
            bold: true,
        }).node.setPosition(0, 184, 0);

        for (let i = 0; i < EQUIP_SLOT_LIST.length; i++) {
            const es = EQUIP_SLOT_LIST[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const eqItemId = GameState.equipment[es.slot] || '';
            const eqDef = eqItemId ? ResourceManager.items[eqItemId] : null;

            const card = UiHelper.createPanel(`Eq_${es.slot}`, eqPanel.node, 108, 76, {
                skin: eqItemId ? 'slot_sel' : 'slot',
                blockInput: true,
            });
            card.node.setPosition(-56 + col * 112, 118 - row * 84, 0);

            UiHelper.createLabel('SlotName', card.node, es.label, {
                size: 9,
                colorHex: '#b8a88a',
            }).node.setPosition(0, 27, 0);

            if (eqItemId) {
                const ic = UiHelper.createNode('Icon', card.node, 32, 32);
                ic.setPosition(0, 1, 0);
                const sp = ic.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                ResourceManager.loadItemIcon(eqItemId).then((sf) => {
                    if (sp.isValid) sp.spriteFrame = sf;
                });

                UiHelper.createLabel('ItemName', card.node, eqDef?.name || eqItemId, {
                    size: 9,
                    colorHex: '#ffe89c',
                    width: 100,
                    overflow: Label.Overflow.SHRINK,
                }).node.setPosition(0, -26, 0);

                card.node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
                    ev.propagationStopped = true;
                    AudioManager.playSfx('ui_click');
                    GameState.unequipSlot(es.slot);
                    this._world.player.refreshAppearance();
                    this._hud.showToast(`Đã tháo ${eqDef?.name || eqItemId}.`);
                    onRefresh();
                });
            } else {
                UiHelper.createLabel('Empty', card.node, 'Trống', {
                    size: 10,
                    colorHex: '#6c6050',
                }).node.setPosition(0, -4, 0);
            }
        }

        const midPanel = UiHelper.createPanel('BagGridCol', parent, 344, 412, {
            skin: 'sub',
        });
        midPanel.node.setPosition(2, 0, 0);

        const filters: Array<{ id: 'all' | 'equip' | 'consumable' | 'mat'; label: string }> = [
            { id: 'all', label: 'Tất Cả' },
            { id: 'equip', label: 'Trang Bị' },
            { id: 'consumable', label: 'Đan / Sách' },
            { id: 'mat', label: 'Nguyên Liệu' },
        ];
        for (let f = 0; f < filters.length; f++) {
            const fb = UiHelper.createButton(`Flt_${filters[f].id}`, midPanel.node, filters[f].label, 78, 24, () => {
                AudioManager.playSfx('ui_click');
                onFilter(filters[f].id);
            }, { skin: 'wood', fontSize: 10 });
            fb.node.setPosition(-123 + f * 82, 184, 0);
            fb.setActiveStyle(filter === filters[f].id);
        }

        const allBagIds = Object.keys(GameState.bag).filter((id) => {
            if (GameState.countItem(id) <= 0) return false;
            if (filter === 'all') return true;
            const it = ResourceManager.items[id] || {};
            const isEq = !!GameState.detectEquipSlot(id);
            const isBookOrConsume = !!GameState.findSkillByBook(id) || !!it.food || it.type === 'dan_duoc' || id.startsWith('phu_') || id.startsWith('bi_tich_');
            if (filter === 'equip') return isEq;
            if (filter === 'consumable') return !isEq && isBookOrConsume;
            return !isEq && !isBookOrConsume;
        });

        const perPage = 16;
        const maxPage = Math.max(0, Math.ceil(allBagIds.length / perPage) - 1);
        const curP = Math.min(page, maxPage);
        const pageItems = allBagIds.slice(curP * perPage, (curP + 1) * perPage);

        if (!selectedId && pageItems.length > 0) {
            selectedId = pageItems[0];
        }

        for (let i = 0; i < perPage; i++) {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const iid = pageItems[i] || '';
            const isSel = iid !== '' && iid === selectedId;
            const cell = UiHelper.createPanel(`Cell_${i}`, midPanel.node, 74, 72, {
                skin: isSel ? 'slot_sel' : 'slot',
                blockInput: true,
            });
            cell.node.setPosition(-120 + col * 80, 118 - row * 78, 0);

            if (iid) {
                const def = ResourceManager.items[iid];
                const ic = UiHelper.createNode('Ic', cell.node, 34, 34);
                ic.setPosition(0, 8, 0);
                const sp = ic.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                ResourceManager.loadItemIcon(iid).then((sf) => {
                    if (sp.isValid) sp.spriteFrame = sf;
                });

                UiHelper.createLabel('Nm', cell.node, def?.name || iid, {
                    size: 9,
                    colorHex: '#ebdcb9',
                    width: 66,
                    overflow: Label.Overflow.SHRINK,
                }).node.setPosition(0, -22, 0);

                UiHelper.createLabel('Qty', cell.node, `x${GameState.countItem(iid)}`, {
                    size: 9,
                    colorHex: '#ffe070',
                    bold: true,
                    ax: 1,
                    ay: 1,
                    outlineHex: '#000000',
                    outlineWidth: 2,
                }).node.setPosition(33, 32, 0);

                cell.node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
                    ev.propagationStopped = true;
                    AudioManager.playSfx('ui_click');
                    onSelect(iid);
                });
            }
        }

        UiHelper.createButton('PrevP', midPanel.node, 'Trang Trước', 84, 26, () => {
            if (curP > 0) onPage(curP - 1);
        }, { skin: 'wood', fontSize: 10 }).node.setPosition(-112, -182, 0);

        UiHelper.createLabel('PageTxt', midPanel.node, `Trang ${curP + 1} / ${maxPage + 1} (${allBagIds.length})`, {
            size: 10,
            colorHex: '#cbbba0',
        }).node.setPosition(0, -182, 0);

        UiHelper.createButton('NextP', midPanel.node, 'Trang Sau', 84, 26, () => {
            if (curP < maxPage) onPage(curP + 1);
        }, { skin: 'wood', fontSize: 10 }).node.setPosition(112, -182, 0);

        const detPanel = UiHelper.createPanel('DetailCol', parent, 242, 412, {
            skin: 'sub',
        });
        detPanel.node.setPosition(305, 0, 0);

        if (!selectedId || !GameState.hasItem(selectedId, 1)) {
            UiHelper.createLabel('EmptySel', detPanel.node, 'Chọn một vật phẩm\ntrong túi đồ để xem\nchi tiết và sử dụng.', {
                size: 12,
                lineHeight: 18,
                colorHex: '#8c7e68',
            });
            return;
        }

        const it = ResourceManager.items[selectedId] || { name: selectedId, desc: '' };
        const iconSlot = UiHelper.createPanel('BigIconFrame', detPanel.node, 64, 64, { skin: 'slot_sel' });
        iconSlot.node.setPosition(0, 150, 0);

        const bigIc = UiHelper.createNode('BigIcon', iconSlot.node, 48, 48);
        const bigSp = bigIc.addComponent(Sprite);
        bigSp.sizeMode = Sprite.SizeMode.CUSTOM;
        bigSp.trim = false;
        ResourceManager.loadItemIcon(selectedId).then((sf) => {
            if (bigSp.isValid) bigSp.spriteFrame = sf;
        });

        UiHelper.createLabel('SelTitle', detPanel.node, it.name || selectedId, {
            size: 14,
            colorHex: UiHelper.gradeColor(it.grade || it.tier),
            bold: true,
            width: 220,
            overflow: Label.Overflow.SHRINK,
        }).node.setPosition(0, 104, 0);

        UiHelper.createLabel('SelQty', detPanel.node, `Số lượng đang có: ${GameState.countItem(selectedId)}`, {
            size: 11,
            colorHex: '#7ee8ff',
        }).node.setPosition(0, 82, 0);

        const statParts: string[] = [];
        if (it.damage || it.atkBonus) statParts.push(`+${it.damage || it.atkBonus} Công`);
        if (it.hpBonus) statParts.push(`+${it.hpBonus} Khí Huyết`);
        if (it.mpBonus) statParts.push(`+${it.mpBonus} Linh Lực`);
        if (it.spBonus) statParts.push(`+${it.spBonus} Thần Thức`);
        if (it.bpBonus) statParts.push(`+${it.bpBonus} Hộ Giáp`);
        if (it.fly) statParts.push(`Phi Hành x${it.fly.speed || 1.8}`);

        const fullDesc = `${statParts.length ? `[${statParts.join(' | ')}]\n` : ''}${it.desc || it.note || 'Vật phẩm tu tiên giới.'}`;
        const descLbl = UiHelper.createLabel('SelDesc', detPanel.node, fullDesc, {
            size: 11,
            lineHeight: 15,
            colorHex: '#e2d6be',
            align: Label.HorizontalAlign.LEFT,
            valign: Label.VerticalAlign.TOP,
            ax: 0.5,
            ay: 1,
            width: 214,
            overflow: Label.Overflow.CLAMP,
        });
        descLbl.node.getComponent(UITransform)!.height = 124;
        descLbl.node.setPosition(0, 62, 0);

        const isEquip = !!GameState.detectEquipSlot(selectedId);
        UiHelper.createButton(
            'UseItemBtn',
            detPanel.node,
            isEquip ? 'Trang Bị Ngay' : 'Sử Dụng / Lĩnh Ngộ',
            208,
            34,
            () => {
                const res = GameState.useBagItem(selectedId);
                if (res.ok) {
                    AudioManager.playSfx('pickup');
                    this._hud.showToast(res.msg, '#9df2dd');
                    this._world.applyItemTrigger(res.triggerAction);
                    this._world.player.refreshAppearance();
                    onRefresh();
                } else {
                    AudioManager.playSfx('deny');
                    this._hud.showToast(res.msg, '#ff9c7a');
                }
            },
            {
                skin: 'gold',
                iconKey: isEquip ? 'ic-sword' : 'ic-pill',
                iconSize: 18,
                fontSize: 12,
            }
        ).node.setPosition(0, -86, 0);

        const qKeys = ['H', 'J', 'K', 'L'];
        for (let q = 0; q < 4; q++) {
            UiHelper.createButton(
                `BindQ_${q}`,
                detPanel.node,
                `Gán [${qKeys[q]}]`,
                49,
                28,
                () => {
                    AudioManager.playSfx('ui_click');
                    GameState.quickslots[q] = selectedId;
                    GameState.save();
                    this._hud.showToast(`Đã gán ${it.name} vào phím [${qKeys[q]}]!`, '#ffe89c');
                },
                { skin: 'wood', fontSize: 10 }
            ).node.setPosition(-78 + q * 52, -128, 0);
        }

        const sellVal = Math.max(5, Math.round(Number(it.sell || it.price || 16) * 0.5));
        UiHelper.createButton(
            'SellBtn',
            detPanel.node,
            `Bán 1 món (+${sellVal} Linh Thạch)`,
            208,
            28,
            () => {
                if (GameState.removeItem(selectedId, 1)) {
                    AudioManager.playSfx('coin');
                    GameState.addStones(sellVal);
                    this._hud.showToast(`Đã bán ${it.name} nhận +${sellVal} Linh Thạch!`, '#7ee8ff');
                    onRefresh();
                }
            },
            { skin: 'wood', iconKey: 'ic-stone', iconSize: 15, fontSize: 10 }
        ).node.setPosition(0, -168, 0);
    }

    private _renderSkillsTab(
        parent: Node,
        mode: 'active' | 'passive',
        onlyLearned: boolean,
        page: number,
        selectedSkillId: string,
        onMode: (m: 'active' | 'passive', ol: boolean) => void,
        onPage: (p: number) => void,
        onSelect: (sid: string) => void,
        onRefresh: () => void
    ): void {
        const leftPanel = UiHelper.createPanel('SkillListPanel', parent, 520, 412, {
            skin: 'sub',
        });
        leftPanel.node.setPosition(-164, 0, 0);

        const bAct = UiHelper.createButton('BtnAct', leftPanel.node, 'Pháp Quyết Chủ Động', 172, 26, () => {
            AudioManager.playSfx('ui_click');
            onMode('active', onlyLearned);
        }, { skin: 'wood', iconKey: 'ic-sword', iconSize: 15, fontSize: 11 });
        bAct.node.setPosition(-160, 182, 0);
        bAct.setActiveStyle(mode === 'active');

        const bPas = UiHelper.createButton('BtnPas', leftPanel.node, 'Tâm Pháp Bị Động', 164, 26, () => {
            AudioManager.playSfx('ui_click');
            onMode('passive', onlyLearned);
        }, { skin: 'wood', iconKey: 'ic-book', iconSize: 15, fontSize: 11 });
        bPas.node.setPosition(14, 182, 0);
        bPas.setActiveStyle(mode === 'passive');

        const bFlt = UiHelper.createButton('BtnLearned', leftPanel.node, onlyLearned ? 'Chỉ Đã Học' : 'Hiện Tất Cả', 136, 26, () => {
            AudioManager.playSfx('ui_click');
            onMode(mode, !onlyLearned);
        }, {
            skin: 'wood',
            iconKey: onlyLearned ? 'icon_check_on' : 'icon_check_off',
            iconSize: 13,
            fontSize: 10,
        });
        bFlt.node.setPosition(174, 182, 0);
        bFlt.setActiveStyle(onlyLearned);

        const dict = mode === 'active' ? ResourceManager.activeSkills : ResourceManager.passiveSkills;
        const learnedArr = mode === 'active' ? GameState.learnedActives : GameState.learnedPassives;
        const allIds = Object.keys(dict).filter((k) => !onlyLearned || learnedArr.includes(k));
        allIds.sort((a, b) => (learnedArr.includes(b) ? 1 : 0) - (learnedArr.includes(a) ? 1 : 0));

        const perPage = 9;
        const maxPage = Math.max(0, Math.ceil(allIds.length / perPage) - 1);
        const curP = Math.min(page, maxPage);
        const slice = allIds.slice(curP * perPage, (curP + 1) * perPage);
        if (!selectedSkillId && slice.length > 0) selectedSkillId = slice[0];

        for (let i = 0; i < slice.length; i++) {
            const sid = slice[i];
            const def = dict[sid];
            const isLearned = learnedArr.includes(sid);
            const col = i % 3;
            const row = Math.floor(i / 3);
            const card = UiHelper.createPanel(`Sk_${sid}`, leftPanel.node, 160, 96, {
                skin: sid === selectedSkillId ? 'slot_sel' : 'slot',
                blockInput: true,
            });
            card.node.setPosition(-166 + col * 166, 106 - row * 104, 0);

            const ic = UiHelper.createNode('Ic', card.node, 36, 36);
            ic.setPosition(-52, 12, 0);
            const sp = ic.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            ResourceManager.loadSkillIcon(sid).then((sf) => {
                if (sp.isValid) sp.spriteFrame = sf;
            });

            UiHelper.createLabel('Nm', card.node, def.name || sid, {
                size: 11,
                colorHex: isLearned ? '#ffe89c' : '#9c9282',
                bold: true,
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                width: 102,
                overflow: Label.Overflow.SHRINK,
            }).node.setPosition(-28, 22, 0);

            UiHelper.createLabel('Tier', card.node, isLearned ? 'Đã lĩnh ngộ' : 'Chưa lĩnh ngộ', {
                size: 9,
                colorHex: isLearned ? '#8ef5a2' : '#8a7262',
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
            }).node.setPosition(-28, 2, 0);

            const subTxt = mode === 'active'
                ? `Linh Lực: ${def.mp || 10} | Hồi: ${def.cooldown || 5}s`
                : 'Tâm pháp bị động';
            UiHelper.createLabel('Sub', card.node, subTxt, {
                size: 9,
                colorHex: '#7ed0ff',
            }).node.setPosition(0, -32, 0);

            card.node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
                ev.propagationStopped = true;
                AudioManager.playSfx('ui_click');
                onSelect(sid);
            });
        }

        UiHelper.createButton('PrevSk', leftPanel.node, 'Trang Trước', 100, 26, () => {
            if (curP > 0) onPage(curP - 1);
        }, { skin: 'wood', fontSize: 10 }).node.setPosition(-140, -182, 0);

        UiHelper.createLabel('SkPg', leftPanel.node, `Trang ${curP + 1} / ${maxPage + 1}`, {
            size: 11,
            colorHex: '#d8cbb4',
        }).node.setPosition(0, -182, 0);

        UiHelper.createButton('NextSk', leftPanel.node, 'Trang Sau', 100, 26, () => {
            if (curP < maxPage) onPage(curP + 1);
        }, { skin: 'wood', fontSize: 10 }).node.setPosition(140, -182, 0);

        // Right Inspector with Authentic Illustrated Bí Tịch Card
        const rightPanel = UiHelper.createPanel('SkillDetail', parent, 314, 412, {
            skin: 'sub',
        });
        rightPanel.node.setPosition(268, 0, 0);

        const sdef = dict[selectedSkillId];
        if (!sdef) return;
        const learned = learnedArr.includes(selectedSkillId);

        const cardFrame = UiHelper.createPanel('BiTichArtFrame', rightPanel.node, 74, 96, { skin: 'slot_sel' });
        cardFrame.node.setPosition(-102, 138, 0);
        const cardArt = UiHelper.createNode('CardArt', cardFrame.node, 64, 86);
        const cardSp = cardArt.addComponent(Sprite);
        cardSp.sizeMode = Sprite.SizeMode.CUSTOM;
        cardSp.trim = false;
        ResourceManager.loadBiTichCard(selectedSkillId).then((sf) => {
            if (cardSp.isValid) cardSp.spriteFrame = sf;
        });

        UiHelper.createLabel('Title', rightPanel.node, sdef.name || selectedSkillId, {
            size: 14,
            colorHex: '#ffe89c',
            bold: true,
            align: Label.HorizontalAlign.LEFT,
            ax: 0,
            width: 196,
            overflow: Label.Overflow.SHRINK,
        }).node.setPosition(-54, 170, 0);

        const statBrief = mode === 'active'
            ? `Hệ số: x${sdef.coef || 2.0}\nTầm xa: ${sdef.range || 140}px\nLinh Lực: ${sdef.mp || 10} | Hồi: ${sdef.cooldown || 5}s`
            : `Tâm pháp bị động\nĐang vận chuyển: ${GameState.equippedPassives.length}/5`;
        UiHelper.createLabel('Brief', rightPanel.node, statBrief, {
            size: 10,
            lineHeight: 15,
            colorHex: '#8fd8ff',
            align: Label.HorizontalAlign.LEFT,
            ax: 0,
            width: 196,
        }).node.setPosition(-54, 126, 0);

        const dLbl = UiHelper.createLabel('Desc', rightPanel.node, sdef.desc || 'Tuyệt kỹ pháp quyết cổ truyền.', {
            size: 11,
            lineHeight: 16,
            colorHex: '#e5dac4',
            align: Label.HorizontalAlign.LEFT,
            valign: Label.VerticalAlign.TOP,
            ax: 0.5,
            ay: 1,
            width: 284,
            overflow: Label.Overflow.CLAMP,
        });
        dLbl.node.getComponent(UITransform)!.height = 104;
        dLbl.node.setPosition(0, 74, 0);

        if (!learned) {
            UiHelper.createButton(
                'GoGachaBtn',
                rightPanel.node,
                'Mở Tàng Kinh Các Rút Bí Tịch',
                264,
                36,
                () => {
                    AudioManager.playSfx('ui_click');
                    this.openGacha();
                },
                { skin: 'gold', iconKey: 'ic-gacha', iconSize: 18, fontSize: 12 }
            ).node.setPosition(0, -110, 0);
        } else if (mode === 'active') {
            UiHelper.createLabel('BindHint', rightPanel.node, 'Chọn ô phím tắt [1 - 8] để gắn Pháp Quyết:', {
                size: 11,
                colorHex: '#ffd970',
            }).node.setPosition(0, -52, 0);

            for (let s = 0; s < 8; s++) {
                const col = s % 4;
                const row = Math.floor(s / 4);
                const isCur = GameState.hotbar[s] === selectedSkillId;
                const sb = UiHelper.createButton(`Bind_${s}`, rightPanel.node, `Ô [${s + 1}]`, 64, 32, () => {
                    AudioManager.playSfx('ui_click');
                    for (let k = 0; k < 8; k++) {
                        if (GameState.hotbar[k] === selectedSkillId) GameState.hotbar[k] = null;
                    }
                    GameState.hotbar[s] = selectedSkillId;
                    GameState.save();
                    this._hud.showToast(`Đã gắn ${sdef.name} vào phím [${s + 1}]!`, '#9df2dd');
                    onRefresh();
                }, { skin: 'wood', fontSize: 11 });
                sb.node.setPosition(-102 + col * 68, -90 - row * 40, 0);
                sb.setActiveStyle(isCur);
            }
        } else {
            const eq = GameState.equippedPassives.includes(selectedSkillId);
            UiHelper.createButton(
                'TogglePassiveBtn',
                rightPanel.node,
                eq ? 'Gỡ Tâm Pháp Này' : 'Vận Chuyển Tâm Pháp Này',
                252,
                36,
                () => {
                    AudioManager.playSfx('ui_click');
                    if (eq) {
                        GameState.equippedPassives = GameState.equippedPassives.filter((x) => x !== selectedSkillId);
                    } else {
                        if (GameState.equippedPassives.length >= 5) {
                            this._hud.showToast('Tối đa vận chuyển 5 Tâm Pháp cùng lúc!', '#ff9c7a');
                            return;
                        }
                        GameState.equippedPassives.push(selectedSkillId);
                    }
                    GameState.recalcStats(false);
                    GameState.save();
                    onRefresh();
                },
                { skin: eq ? 'crimson' : 'jade', iconKey: 'ic-book', iconSize: 17, fontSize: 12 }
            ).node.setPosition(0, -104, 0);
        }
    }

    private _renderCultivateTab(parent: Node, onRefresh: () => void): void {
        const curR = GameState.realmDef();
        const nextR = GameState.nextRealmDef();
        const chk = GameState.checkBreakthrough();

        const card = UiHelper.createPanel('CultivateCard', parent, 820, 408, {
            skin: 'sub',
        });

        UiHelper.createLabel('CurRealm', card.node, `Cảnh Giới Hiện Tại: ${curR.name}`, {
            size: 18,
            colorHex: '#ffe89c',
            serif: true,
            bold: true,
        }).node.setPosition(0, 162, 0);

        UiHelper.createLabel('SubRealm', card.node, curR.sub || 'Đạo cơ vững chắc, linh khí tuần hoàn.', {
            size: 12,
            colorHex: '#b8e0b8',
        }).node.setPosition(0, 134, 0);

        const nextInfo = nextR
            ? `Cửa Quan Kế Tiếp: ${nextR.name}  (Khí Huyết tối đa: ${nextR.hpMax}, Linh Lực: ${nextR.mpMax}, Thần Thức: ${nextR.spMax})`
            : 'Đã đạt đỉnh phong cảnh giới hiện mở!';
        UiHelper.createLabel('NextRealm', card.node, nextInfo, {
            size: 13,
            colorHex: '#7ee8ff',
            bold: true,
        }).node.setPosition(0, 92, 0);

        const expBar = UiHelper.createBar('BigExpBar', card.node, 560, 22, 'exp', 'Đạo Hạnh Tích Luỹ');
        expBar.node.setPosition(-280, 46, 0);
        if (GameState.expMax > 0) {
            expBar.updateBar(GameState.exp, GameState.expMax, `${Math.floor(GameState.exp)} / ${GameState.expMax}`);
        } else {
            expBar.updateBar(1, 1, 'Phàm Nhân - Cần Tẩy Tuỷ Thang');
        }

        UiHelper.createLabel('StatusReason', card.node, chk.reason, {
            size: 13,
            lineHeight: 19,
            colorHex: chk.canBreak ? '#9df5a6' : '#ffd28a',
            bold: true,
            width: 720,
            overflow: Label.Overflow.SHRINK,
        }).node.setPosition(0, -4, 0);

        UiHelper.createButton(
            'DoBreakBtn',
            card.node,
            chk.isRitual ? 'KHAI MỞ TẨY TUỶ PHẠT MAO' : 'PHÁ QUAN ĐỘT PHÁ CẢNH GIỚI',
            344,
            46,
            () => {
                if (this._world.tryBreakthroughNow()) {
                    onRefresh();
                }
            },
            {
                skin: chk.canBreak ? 'gold' : 'wood',
                iconKey: 'ic-pill-gold',
                iconSize: 22,
                textHex: chk.canBreak ? '#fff5c0' : '#9c8f7a',
                fontSize: 13,
            }
        ).node.setPosition(0, -68, 0);

        UiHelper.createButton('BtnSitNow', card.node, 'Ngồi Đả Tọa Tích Luỹ [Q]', 236, 34, () => {
            this.close();
            const res = this._world.player.toggleMeditate(false, this._world.vfx);
            this._hud.showToast(res.msg, '#9df2dd');
        }, { skin: 'wood', iconKey: 'hud-sit', iconSize: 17, fontSize: 11 }).node.setPosition(-252, -142, 0);

        UiHelper.createButton('BtnOpenAlchemy', card.node, 'Mở Đan Lô Tùy Thân', 236, 34, () => {
            AudioManager.playSfx('ui_click');
            this.openAlchemyModal();
        }, { skin: 'wood', iconKey: 'ic-pill', iconSize: 17, fontSize: 11 }).node.setPosition(0, -142, 0);

        UiHelper.createButton('BtnQuestGuide', card.node, 'Dẫn Đường Nhiệm Vụ', 236, 34, () => {
            this.close();
            this._world.guideToQuest(true);
        }, { skin: 'wood', iconKey: 'hud-target', iconSize: 17, fontSize: 11 }).node.setPosition(252, -142, 0);
    }

    private _renderStatsTab(parent: Node): void {
        const card = UiHelper.createPanel('StatsCard', parent, 820, 408, {
            skin: 'sub',
        });

        const lc = LINH_CAN_LIST.find((l) => l.id === GameState.char.linhCan);
        const linesLeft = [
            `Đạo Hiệu: ${GameState.char.name}`,
            `Cảnh Giới: ${GameState.realmDef().name}`,
            `Tông Môn: ${GameState.sectName || 'Tán Tu Tự Do'}`,
            `Thiên Phú: ${lc?.name || GameState.char.linhCan} (${lc?.bonusDesc || ''})`,
            `Linh Thạch: ${GameState.stones.toLocaleString('vi-VN')}`,
            `Dược Công: ${GameState.duocCong}`,
            `Nhiệm Vụ Chính: Giai đoạn ${GameState.questStage} / 24`,
        ];
        const linesRight = [
            `Khí Huyết: ${Math.round(GameState.hp)} / ${GameState.hpMax}`,
            `Linh Lực: ${Math.round(GameState.mp)} / ${GameState.mpMax}`,
            `Thần Thức: ${Math.round(GameState.sp)} / ${GameState.spMax}`,
            `Hộ Giáp: ${Math.round(GameState.bp)} / ${GameState.bpMax}`,
            `Công Cơ Bản (Vật Lý / Phi Kiếm): ${GameState.atk}`,
            `Uy Lực Pháp Quyết: ${GameState.skillPower}`,
            `Pháp Quyết Đã Lĩnh Ngộ: ${GameState.learnedActives.length} chủ động, ${GameState.learnedPassives.length} tâm pháp`,
        ];

        UiHelper.createLabel('LeftStats', card.node, linesLeft.join('\n'), {
            size: 13,
            lineHeight: 28,
            colorHex: '#f5e8cc',
            align: Label.HorizontalAlign.LEFT,
            ax: 0,
            width: 380,
        }).node.setPosition(-380, 10, 0);

        UiHelper.createLabel('RightStats', card.node, linesRight.join('\n'), {
            size: 13,
            lineHeight: 28,
            colorHex: '#bfe8ff',
            align: Label.HorizontalAlign.LEFT,
            ax: 0,
            width: 380,
        }).node.setPosition(20, 10, 0);
    }

    // =========================================================================
    // 3. NPC / PROP / ALCHEMY / FORGE / FARM / SHOP DIALOGS
    // =========================================================================
    public openInfoDialog(info: MapInteractableDef): void {
        const titleLower = (info.title || '').toLowerCase();
        if (titleLower.includes('truyền tống') || info.id?.startsWith('tt_')) {
            const destMap = this._world.mapData.id === 'tan_vien' ? 'bat_quai_thach_phan' : 'tan_vien';
            const destName = ResourceManager.worldMaps[destMap]?.name || destMap;
            this._openSimpleDialog(info.title || 'Cổ Truyền Tống Trận', info.text || 'Trận bàn khắc bát quái cổ xưa nối liền hai miền.', [
                {
                    label: `Khởi Động Truyền Tống tới ${destName}`,
                    iconKey: 'ic-map',
                    onClick: () => {
                        this.close();
                        AudioManager.playSfx('portal');
                        this._world.loadMap(destMap);
                    },
                },
                { label: 'Để sau', onClick: () => this.close() },
            ]);
            return;
        }

        if (info.id === 'bia_da' || titleLower.includes('bia đá')) {
            GameState.questFlags.doc_bia_da = true;
            const adv = GameState.checkQuestAutoAdvance();
            GameState.save();
            if (adv) AudioManager.playSfx('quest_complete');
        }

        this._openSimpleDialog(info.title || 'Cổ Bia', info.text || 'Dòng chữ cổ khắc sâu trên phiến đá rêu phong.', [
            { label: 'Đã lĩnh hội', onClick: () => this.close() },
        ]);
    }

    public openNpcOrPropDialog(prop: MapPropDef): void {
        const pid = prop.id;

        if (pid === 'dan_lo' || pid === 'dan_lo_vuon' || prop.type === 'cauldron') {
            this.openAlchemyModal();
            return;
        }

        if (pid === 'dai_da' || pid === 'dai_da_duoc' || pid === 'linh_tuyen') {
            const chk = GameState.checkBreakthrough();
            const actions: Array<{ label: string; iconKey?: string; onClick: () => void }> = [];
            if (chk.canBreak) {
                actions.push({
                    label: chk.isRitual ? 'Uống Tẩy Tuỷ Thang - Khai Mở Luyện Khí Tầng 1' : `Phá Quan Đột Phá lên ${chk.nextRealm?.name}`,
                    iconKey: 'ic-pill-gold',
                    onClick: () => {
                        this.close();
                        this._world.tryBreakthroughNow();
                    },
                });
            }
            if (GameState.hasItem('tu_khi_duoc', 1)) {
                actions.push({
                    label: 'Uống Linh Dược Tụ Khí (Viên mãn Đạo Hạnh)',
                    iconKey: 'ic-gourd',
                    onClick: () => {
                        const r = GameState.useBagItem('tu_khi_duoc');
                        this._hud.showToast(r.msg, '#9df2dd');
                        this.openNpcOrPropDialog(prop);
                    },
                });
            }
            actions.push({
                label: 'Ngồi Đả Tọa Trên Đài Đá (Nhân 3 Đạo Hạnh)',
                iconKey: 'hud-sit',
                onClick: () => {
                    this.close();
                    const res = this._world.player.toggleMeditate(true, this._world.vfx);
                    this._hud.showToast(res.msg, '#ffe89c');
                },
            });
            actions.push({ label: 'Rời đi', onClick: () => this.close() });

            this._openSimpleDialog(
                prop.name || 'Đài Đá Linh Khí',
                `${prop.text || 'Phiến đá phẳng cạnh dòng suối trong, linh khí tụ hội dày đặc.'}\n\nTrạng thái: ${chk.reason}`,
                actions
            );
            return;
        }

        if (prop.type === 'herb_plot' || pid.startsWith('plot_')) {
            this.openFarmPlotModal(pid, prop.name || 'Luống Linh Điền');
            return;
        }
        if (pid === 'ho_bich_thuy' || pid.includes('suoi') || prop.type === 'fishing_spot') {
            this._openSimpleDialog(prop.name || 'Hồ Bích Thủy', 'Mặt hồ linh tuyền trong vắt, cá linh ngư bơi lội dưới đáy.', [
                {
                    label: 'Thả Câu Linh Ngư',
                    iconKey: 'ic-fish',
                    onClick: () => {
                        this.close();
                        AudioManager.playSfx('pickup');
                        GameState.addItem('linh_ngu', 1);
                        GameState.questFlags.caught_linh_ngu = true;
                        GameState.checkQuestAutoAdvance();
                        this._world.vfx.spawnText(this._world.player.x, this._world.player.y - 48, '+1 Linh Ngư!', '#7ee8ff');
                        this._hud.showToast('Câu được 1 con Linh Ngư tươi rói!', '#7ee8ff');
                    },
                },
                {
                    label: 'Múc Nước Tưới Tất Cả Luống Cây',
                    iconKey: 'ic-gourd',
                    onClick: () => {
                        let count = 0;
                        for (const k of Object.keys(GameState.plots)) {
                            const pl = GameState.plots[k];
                            if (pl && !pl.wet) {
                                pl.wet = true;
                                pl.durMs = Math.round(pl.durMs * 0.45);
                                count++;
                            }
                        }
                        GameState.save();
                        this.close();
                        AudioManager.playSfx('spell');
                        this._hud.showToast(`Đã tưới mát ${count} luống linh thảo!`, '#8fd8ff');
                    },
                },
            ]);
            return;
        }

        if (pid === 'bia_da') {
            GameState.questFlags.doc_bia_da = true;
            const adv = GameState.checkQuestAutoAdvance();
            GameState.save();
            if (adv) AudioManager.playSfx('quest_complete');
            this._openSimpleDialog(
                'Bia Đá Cổ Tự',
                '"Phàm cốt trọc khí, muốn bước lên tiên đồ ắt phải hái ba ngọn Tẩy Uế Thảo bên bờ suối, mượn lửa Đan Lô sắc thành Tẩy Tuỷ Thang, rồi ra Đài Đá vận khí tẩy trần..."',
                [{ label: 'Lĩnh mệnh (Bắt đầu Hái Tẩy Uế Thảo)', iconKey: 'ic-herb', onClick: () => this.close() }]
            );
            return;
        }

        if (pid === 'tho_ren') {
            if (GameState.questStage === 23 && GameState.questFlags.ha_xich_long && !GameState.questFlags.turnin_23) {
                GameState.questFlags.turnin_23 = true;
                GameState.addStones(500);
                GameState.checkQuestAutoAdvance();
                GameState.save();
                AudioManager.playSfx('quest_complete');
                this._hud.showToast('Báo công hạ Xích Long thành công! +500 Linh Thạch!', '#ffe89c');
            }
            this.openForgeModal();
            return;
        }

        if (pid === 'ba_hang_com' || pid.startsWith('tieu_nhi')) {
            this.openShopModal(prop.name || 'Quán Cơm Linh Mễ', SHOP_FOOD_ITEMS);
            return;
        }

        if (pid === 'van_bao_phuong') {
            this.openShopModal('Vạn Bảo Phường - Thương Hội Tu Tiên', SHOP_VAN_BAO_ITEMS);
            return;
        }

        const daoLines: string[] = ResourceManager.gameplaySystems?.npcDaoLy?.[pid] || [];
        const greet = daoLines.length > 0
            ? `"${daoLines[Math.floor(Math.random() * daoLines.length)]}"`
            : (prop.text || 'Đạo hữu dừng bước, hữu duyên tương ngộ.');

        if (pid === 'su_phu') {
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = [];
            if (GameState.questStage <= 1 && !GameState.questFlags.hoi_su_phu) {
                opts.push({
                    label: 'Thỉnh giáo pháp môn Nhập Đạo Tẩy Tuỷ',
                    iconKey: 'ic-book',
                    onClick: () => {
                        GameState.questFlags.hoi_su_phu = true;
                        GameState.checkQuestAutoAdvance();
                        GameState.save();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Thầy Ông Nội chỉ điểm: Hãy hái 3 Tẩy Uế Thảo ven suối!', '#ffe89c');
                    },
                });
            }
            opts.push({
                label: `Hỏi Đạo Bách Khoa (${Math.min(5, GameState.questFlags.quiz_count || 0)}/5 câu - Thưởng 300 Linh Thạch)`,
                iconKey: 'ic-stone',
                onClick: () => this._openDaoQuizModal(),
            });
            opts.push({ label: 'Cáo từ', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Thầy Ông Nội', greet, opts);
            return;
        }

        if (pid === 'ly_thanh') {
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = [];
            if (GameState.questStage === 5 && !GameState.questFlags.nhan_viec_ly_thanh) {
                opts.push({
                    label: 'Nhận Trúc Kiếm và Nhiệm Vụ Dọn Rừng Trúc',
                    iconKey: 'ic-bamboo-sword',
                    onClick: () => {
                        GameState.questFlags.nhan_viec_ly_thanh = true;
                        GameState.addItem('truc_kiem', 1);
                        GameState.equipItem('truc_kiem');
                        this._world.player.refreshAppearance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Đã nhận và trang bị Trúc Kiếm! Hãy diệt 5 Bọ Ngựa / Sơn Chuột.', '#ffe89c');
                    },
                });
            }
            if (GameState.questStage === 6 && GameState.patrolKills >= 5 && !GameState.questFlags.turnin_6) {
                opts.push({
                    label: 'Báo công Tuần Tra Rừng Trúc (Nhận Trúc Diệp Bội)',
                    iconKey: 'ic-gift',
                    onClick: () => {
                        GameState.questFlags.turnin_6 = true;
                        GameState.addItem('truc_diep_boi', 1);
                        GameState.addStones(80);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Nhận thưởng Trúc Diệp Bội và +80 Linh Thạch!', '#ffe89c');
                    },
                });
            }
            opts.push({ label: 'Đa tạ sư huynh', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Huấn Sư Huynh', greet, opts);
            return;
        }

        if (pid === 'dai_phu') {
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = [];
            if (GameState.questStage === 7 && !GameState.questFlags.bai_kien_dai_phu) {
                opts.push({
                    label: 'Bái kiến Đại Phu và Nhận Hạt Giống Linh Thảo',
                    iconKey: 'ic-herb',
                    onClick: () => {
                        GameState.questFlags.bai_kien_dai_phu = true;
                        GameState.addItem('hat_linh_diep', 6);
                        GameState.addItem('hat_huyet_thao', 6);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._world.loadMap('vuon_ca_nhan');
                        this._hud.showToast('Nhận 6 Hạt Linh Diệp + 6 Hạt Huyết Thảo, đã vào Vườn Cá Nhân!', '#9df2dd');
                    },
                });
            }
            if (GameState.questStage === 13 && GameState.realmIndex() >= 3 && !GameState.questFlags.turnin_13) {
                opts.push({
                    label: 'Báo công Đột Phá Tầng 3 (Nhận Dược Y Bội)',
                    iconKey: 'ic-gift',
                    onClick: () => {
                        GameState.questFlags.turnin_13 = true;
                        GameState.addItem('duoc_y_boi', 1);
                        GameState.addItem('bi_tich_dan_linh', 1);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Nhận Dược Y Bội và Bí Tịch Dẫn Linh Quyết!', '#ffe89c');
                    },
                });
            }
            if (GameState.questStage === 14 && !GameState.questFlags.nhan_binh_khi) {
                for (const [wid, wname] of [['thiet_kiem', 'Thiết Kiếm'], ['thiet_dao', 'Thiết Đao'], ['thiet_thuong', 'Thiết Thương']]) {
                    opts.push({
                        label: `Nhận miễn phí: ${wname}`,
                        iconKey: 'ic-sword',
                        onClick: () => {
                            GameState.questFlags.nhan_binh_khi = true;
                            GameState.addItem(wid, 1);
                            GameState.equipItem(wid);
                            GameState.checkQuestAutoAdvance();
                            this._world.player.refreshAppearance();
                            AudioManager.playSfx('quest_complete');
                            this.close();
                            this._hud.showToast(`Đã nhận và trang bị ${wname}!`, '#ffe89c');
                        },
                    });
                }
            }
            if (GameState.questStage === 16 && GameState.hasItem('doc_dang_doc_dich', 10) && !GameState.questFlags.turnin_16) {
                opts.push({
                    label: 'Giao 10 Độc Dịch và Linh Ngư cho Đại Phu',
                    iconKey: 'ic-pill',
                    onClick: () => {
                        GameState.removeItem('doc_dang_doc_dich', 10);
                        GameState.removeItem('linh_ngu', 1);
                        GameState.questFlags.turnin_16 = true;
                        GameState.addStones(180);
                        GameState.addItem('luyen_khi_dan', 1);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Hoàn thành! Nhận +180 Linh Thạch và 1 Luyện Khí Đan!', '#ffe89c');
                    },
                });
            }
            opts.push({
                label: 'Vào Vườn Linh Thảo Cá Nhân',
                iconKey: 'ic-herb',
                onClick: () => {
                    this.close();
                    this._world.loadMap('vuon_ca_nhan');
                },
            });
            opts.push({
                label: 'Mua Hạt Giống và Đan Dược',
                iconKey: 'ic-stone',
                onClick: () => this.openShopModal('Dược Đường Đại Phu', SHOP_VAN_BAO_ITEMS),
            });
            opts.push({ label: 'Cáo từ', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Đại Phu Dược Cốc', greet, opts);
            return;
        }

        if (pid === 'tang_kinh_lao_nhan') {
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = [];
            if (GameState.questStage === 14 && !GameState.questFlags.bi_tich_nhan_viec) {
                opts.push({
                    label: 'Nhận Pháp Khí Phi Diệp và Nhiệm Vụ Bí Tịch',
                    iconKey: 'ic-leaf',
                    onClick: () => {
                        GameState.questFlags.bi_tich_nhan_viec = true;
                        GameState.addItem('phi_diep', 1);
                        GameState.equipItem('phi_diep');
                        GameState.checkQuestAutoAdvance();
                        this._world.player.refreshAppearance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Đã nhận Phi Diệp! Bấm [F] để Ngự Phi Diệp bay sang Miếu Hoang!', '#8fd8ff');
                    },
                });
            }
            if (GameState.hasItem('manh_bi_tich_thuong') && GameState.hasItem('manh_bi_tich_ha') && !GameState.questFlags.bi_tich_hoan_thanh) {
                const starterBooks: Array<[string, string]> = [
                    ['bi_tich_hoa_cau', 'Hỏa Cầu Thuật'],
                    ['bi_tich_phong_nhan', 'Phong Nhẫn Thuật'],
                    ['bi_tich_bang_thau', 'Băng Thấu Thuật'],
                    ['bi_tich_dia_thich', 'Địa Thích Thuật'],
                ];
                for (const [bid, bname] of starterBooks) {
                    opts.push({
                        label: `Đổi Mảnh Bí Tịch lấy: ${bname}`,
                        iconKey: 'ic-book',
                        onClick: () => {
                            GameState.removeItem('manh_bi_tich_thuong', 1);
                            GameState.removeItem('manh_bi_tich_ha', 1);
                            GameState.questFlags.bi_tich_hoan_thanh = true;
                            GameState.addItem(bid, 1);
                            GameState.useBagItem(bid);
                            GameState.checkQuestAutoAdvance();
                            AudioManager.playSfx('quest_complete');
                            this.close();
                            this._hud.showToast(`Lĩnh ngộ thành công ${bname} (đã gắn vào phím 1)!`, '#ffe89c');
                        },
                    });
                }
            }
            if (GameState.questStage === 15 && GameState.hasItem('yeu_cot', 10) && !GameState.questFlags.turnin_15) {
                opts.push({
                    label: 'Giao 10 Yêu Cốt Vụn cho Lão Nhân (+150 Linh Thạch)',
                    iconKey: 'ic-stone',
                    onClick: () => {
                        GameState.removeItem('yeu_cot', 10);
                        GameState.questFlags.turnin_15 = true;
                        GameState.addStones(150);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this.close();
                        this._hud.showToast('Hoàn thành nhiệm vụ Yêu Cốt Miếu Hoang (+150 Linh Thạch)!', '#ffe89c');
                    },
                });
            }
            opts.push({
                label: 'Mở Tàng Kinh Các - Rút Bí Tịch Pháp Quyết [G]',
                iconKey: 'ic-gacha',
                onClick: () => this.openGacha(),
            });
            opts.push({ label: 'Cáo từ', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Tàng Kinh Lão Nhân', greet, opts);
            return;
        }

        if (pid === 'tong_mon_quan_su' || pid.startsWith('tgt_') || pid.startsWith('ma_dao_')) {
            const sects = ['Thiên Kiếm Tông', 'Thanh Vân Môn', 'Trường Sinh Cốc', 'Vạn Phù Các', 'Huyền Ma Đạo'];
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = sects.map((s) => ({
                label: `Gia nhập ${s}`,
                iconKey: 'hud-sect',
                onClick: () => {
                    GameState.sectName = s;
                    GameState.save();
                    this._world.player.refreshAppearance();
                    AudioManager.playSfx('breakthrough');
                    this.close();
                    this._hud.showToast(`Chúc mừng đạo hữu đã bái nhập [${s}]!`, '#ffe89c');
                },
            }));
            opts.push({ label: 'Giữ thân Tán Tu', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Tông Môn Quản Sự', greet, opts);
            return;
        }

        if (pid === 'chap_su_dai_hoi' || pid === 'nu_tu_mieu_hoang' || pid === 'lao_dao_hang_cave') {
            const bossRealms: Array<[string, string]> = [
                ['long_uyen', 'Tiến vào Long Uyên Cốc (Xích Long)'],
                ['dam_lay_boss', 'Tiến vào Đầm Lầy Tử Khí (Thủ Lĩnh)'],
                ['yen_lang_son', 'Tiến vào Yên Lãng Sơn'],
                ['dai_hoi_dau', 'Lên Lôi Đài Luận Võ'],
            ];
            const opts: Array<{ label: string; iconKey?: string; onClick: () => void }> = bossRealms.map(([mid, label]) => ({
                label,
                iconKey: 'ic-sword',
                onClick: () => {
                    this.close();
                    AudioManager.playSfx('portal');
                    this._world.loadMap(mid);
                },
            }));
            opts.push({ label: 'Để sau', onClick: () => this.close() });
            this._openSimpleDialog(prop.name || 'Bí Cảnh Dẫn Lộ', greet, opts);
            return;
        }

        this._openSimpleDialog(prop.name || 'Đạo Hữu Tu Tiên', greet, [
            { label: 'Đa tạ chỉ giáo', onClick: () => this.close() },
        ]);
    }

    private _openSimpleDialog(
        title: string,
        bodyText: string,
        buttons: Array<{ label: string; iconKey?: string; onClick: () => void }>
    ): void {
        const btnCount = buttons.length;
        const h = Math.min(540, 200 + btnCount * 42);
        const w = 580;
        const win = this._prepareWindow('dialog', title, w, h, true, 'logo-icon');

        const bodyLbl = UiHelper.createLabel('BodyTxt', win, bodyText, {
            size: 13,
            lineHeight: 20,
            colorHex: '#f0e5ce',
            align: Label.HorizontalAlign.LEFT,
            valign: Label.VerticalAlign.TOP,
            ax: 0.5,
            ay: 1,
            width: w - 48,
            overflow: Label.Overflow.CLAMP,
        });
        bodyLbl.node.getComponent(UITransform)!.height = 104;
        bodyLbl.node.setPosition(0, h * 0.5 - 56, 0);

        const startY = h * 0.5 - 178;
        for (let i = 0; i < buttons.length; i++) {
            const b = UiHelper.createButton(`Opt_${i}`, win, buttons[i].label, w - 56, 34, () => {
                AudioManager.playSfx('ui_click');
                buttons[i].onClick();
            }, {
                skin: i === 0 ? 'gold' : 'wood',
                iconKey: buttons[i].iconKey,
                iconSize: 18,
                fontSize: 12,
            });
            b.node.setPosition(0, startY - i * 40, 0);
        }
    }

    private _openDaoQuizModal(): void {
        const qIdx = Number(GameState.questFlags.quiz_count || 0) % DAO_QUIZ_BANK.length;
        const item = DAO_QUIZ_BANK[qIdx];
        this._openSimpleDialog(
            `HỎI ĐẠO BÁCH KHOA (Câu ${(GameState.questFlags.quiz_count || 0) + 1})`,
            item.q,
            item.opts.map((opt, idx) => ({
                label: `${idx + 1}. ${opt}`,
                onClick: () => {
                    if (idx === item.ans) {
                        GameState.questFlags.quiz_count = Number(GameState.questFlags.quiz_count || 0) + 1;
                        const reward = GameState.questFlags.quiz_count === 5 ? 300 : 40;
                        GameState.addStones(reward);
                        GameState.checkQuestAutoAdvance();
                        AudioManager.playSfx('quest_complete');
                        this._hud.showToast(`Đạo lý thông suốt! Nhận +${reward} Linh Thạch!`, '#9df5a6');
                        if ((GameState.questFlags.quiz_count || 0) < 5) {
                            this._openDaoQuizModal();
                        } else {
                            this.close();
                        }
                    } else {
                        AudioManager.playSfx('deny');
                        this._hud.showToast('Chưa đúng đạo lý, hãy suy ngẫm lại!', '#ff9c7a');
                    }
                },
            }))
        );
    }

    // =========================================================================
    // 4. ALCHEMY MODAL (`Đan Lô Luyện Đan`)
    // =========================================================================
    public openAlchemyModal(): void {
        let selIdx = 0;
        const render = () => {
            const w = 780;
            const h = 480;
            const win = this._prepareWindow('alchemy', 'ĐAN LÔ - KHAI HỎA LUYỆN ĐAN', w, h, true, 'ic-pill');

            for (let i = 0; i < BREW_RECIPES.length; i++) {
                const rec = BREW_RECIPES[i];
                const canCraft = rec.ingredients.every((ing) => GameState.hasItem(ing.id, ing.qty));
                const b = UiHelper.createButton(
                    `Rec_${rec.id}`,
                    win,
                    rec.name,
                    250,
                    36,
                    () => {
                        AudioManager.playSfx('ui_click');
                        selIdx = i;
                        render();
                    },
                    {
                        skin: 'wood',
                        iconKey: canCraft ? 'icon_check_on' : 'ic-pill',
                        iconSize: 16,
                        textHex: canCraft ? '#9df5a6' : '#e6dac2',
                        fontSize: 12,
                    }
                );
                b.node.setPosition(-238, 162 - i * 44, 0);
                b.setActiveStyle(selIdx === i);
            }

            const cur = BREW_RECIPES[selIdx];
            const det = UiHelper.createPanel('AlchemyDet', win, 456, 382, {
                skin: 'sub',
            });
            det.node.setPosition(136, -16, 0);

            const icBox = UiHelper.createPanel('PillFrame', det.node, 66, 66, { skin: 'slot_sel' });
            icBox.node.setPosition(0, 140, 0);
            const ic = UiHelper.createNode('PillIcon', icBox.node, 48, 48);
            const sp = ic.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            ResourceManager.loadItemIcon(cur.resultId).then((sf) => {
                if (sp.isValid) sp.spriteFrame = sf;
            });

            UiHelper.createLabel('RecTitle', det.node, cur.name, {
                size: 16,
                colorHex: '#ffe89c',
                bold: true,
            }).node.setPosition(0, 92, 0);

            UiHelper.createLabel('RecNote', det.node, cur.note, {
                size: 11,
                lineHeight: 16,
                colorHex: '#dcd0b8',
                width: 410,
                overflow: Label.Overflow.SHRINK,
            }).node.setPosition(0, 54, 0);

            const ingLines = cur.ingredients.map((ing) => {
                const have = GameState.countItem(ing.id);
                const nm = ResourceManager.items[ing.id]?.name || ing.id;
                return `${have >= ing.qty ? '[Đủ]' : '[Thiếu]'} ${nm}: ${have} / ${ing.qty}`;
            });
            const allEnough = cur.ingredients.every((ing) => GameState.hasItem(ing.id, ing.qty));

            UiHelper.createLabel('IngList', det.node, `Dược liệu cần thiết:\n${ingLines.join('\n')}`, {
                size: 12,
                lineHeight: 20,
                colorHex: allEnough ? '#9df5a6' : '#ffcf96',
                width: 380,
            }).node.setPosition(0, -18, 0);

            UiHelper.createButton(
                'BrewBtn',
                det.node,
                `KHAI LÒ LUYỆN: ${cur.name.toUpperCase()}`,
                344,
                42,
                () => {
                    if (!allEnough) {
                        AudioManager.playSfx('deny');
                        this._hud.showToast('Chưa đủ dược liệu để khai lò!', '#ff9c7a');
                        return;
                    }
                    for (const ing of cur.ingredients) {
                        GameState.removeItem(ing.id, ing.qty);
                    }
                    const prevSt = GameState.questStage;
                    GameState.duocCong += 2;
                    GameState.addItem(cur.resultId, 1);
                    AudioManager.playSfx('fire');
                    this._world.vfx.spawnRing(this._world.player.x, this._world.player.y, '#ff9c4d', 44, 0.6, true);
                    this._world.vfx.spawnText(this._world.player.x, this._world.player.y - 52, `+1 ${cur.name}!`, '#ffe89c', true);
                    this._hud.showToast(`Luyện thành công 1 ${cur.name}!`, '#9df5a6');
                    if (GameState.questStage > prevSt) {
                        AudioManager.playSfx('quest_complete');
                    }
                    render();
                },
                {
                    skin: allEnough ? 'gold' : 'wood',
                    iconKey: 'ic-pill-gold',
                    iconSize: 20,
                    fontSize: 12,
                }
            ).node.setPosition(0, -132, 0);
        };
        render();
    }

    // =========================================================================
    // 5. PERSONAL FARM PLOT MODAL (`Vườn Linh Thảo`)
    // =========================================================================
    public openFarmPlotModal(plotId: string, plotTitle: string): void {
        const render = () => {
            const pl = GameState.plots[plotId];
            const now = Date.now();
            const w = 620;
            const h = 440;
            const win = this._prepareWindow('farm', plotTitle.toUpperCase(), w, h, true, 'ic-herb');

            if (!pl) {
                UiHelper.createLabel('Hint', win, 'Luống linh điền đang trống, hãy chọn hạt giống trong túi để gieo:', {
                    size: 12,
                    colorHex: '#e6dac2',
                }).node.setPosition(0, 152, 0);

                for (let i = 0; i < FARM_SEEDS.length; i++) {
                    const sd = FARM_SEEDS[i];
                    const have = GameState.countItem(sd.seed);
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const btn = UiHelper.createButton(
                        `Sow_${sd.seed}`,
                        win,
                        `${sd.name} (Có: ${have})`,
                        266,
                        34,
                        () => {
                            if (have <= 0) {
                                AudioManager.playSfx('deny');
                                this._hud.showToast(`Chưa có ${sd.name} (mua tại Đại Phu)!`, '#ff9c7a');
                                return;
                            }
                            GameState.removeItem(sd.seed, 1);
                            GameState.plots[plotId] = {
                                seed: sd.seed,
                                plantedAt: Date.now(),
                                durMs: sd.growSec * 1000,
                                wet: false,
                            };
                            GameState.save();
                            AudioManager.playSfx('pickup');
                            render();
                        },
                        {
                            skin: have > 0 ? 'jade' : 'wood',
                            iconKey: 'ic-herb',
                            iconSize: 16,
                            textHex: have > 0 ? '#d8ffde' : '#8f8474',
                            fontSize: 11,
                        }
                    );
                    btn.node.setPosition(-140 + col * 280, 108 - row * 42, 0);
                }
            } else {
                const sd = FARM_SEEDS.find((s) => s.seed === pl.seed) || FARM_SEEDS[0];
                const remSec = Math.max(0, Math.ceil((pl.plantedAt + pl.durMs - now) / 1000));
                const cropName = ResourceManager.items[sd.crop]?.name || sd.crop;

                UiHelper.createLabel(
                    'PlotStatus',
                    win,
                    remSec <= 0
                        ? `[CHÍN RỘ] ${cropName} đã sẵn sàng thu hoạch!`
                        : `Đang trồng: ${cropName}\nThời gian còn lại: ${remSec} giây (${pl.wet ? 'Đã tưới linh tuyền' : 'Chưa tưới nước'})`,
                    {
                        size: 14,
                        lineHeight: 22,
                        colorHex: remSec <= 0 ? '#ffe066' : '#9df2dd',
                        bold: true,
                    }
                ).node.setPosition(0, 72, 0);

                if (remSec <= 0) {
                    UiHelper.createButton('HarvestBtn', win, `Thu Hoạch Ngay (+3 ${cropName})`, 320, 44, () => {
                        delete GameState.plots[plotId];
                        GameState.addItem(sd.crop, 3);
                        AudioManager.playSfx('quest_complete');
                        this._hud.showToast(`Thu hoạch được +3 ${cropName}!`, '#ffe89c');
                        this.close();
                    }, { skin: 'gold', iconKey: 'ic-herb', iconSize: 18, fontSize: 13 }).node.setPosition(0, -24, 0);
                } else {
                    if (!pl.wet) {
                        UiHelper.createButton('WaterBtn', win, 'Tưới Nước Linh Tuyền (Giảm 60% thời gian)', 340, 40, () => {
                            pl.wet = true;
                            pl.durMs = Math.max(5000, Math.round((pl.plantedAt + pl.durMs - Date.now()) * 0.4) + (Date.now() - pl.plantedAt));
                            GameState.save();
                            AudioManager.playSfx('spell');
                            render();
                        }, { skin: 'jade', iconKey: 'ic-gourd', iconSize: 18, fontSize: 12 }).node.setPosition(0, -12, 0);
                    }
                    UiHelper.createButton('FastGrowBtn', win, 'Thúc Chín Tức Thì (10 Linh Thạch)', 340, 38, () => {
                        if (!GameState.spendStones(10)) {
                            this._hud.showToast('Không đủ 10 Linh Thạch!', '#ff9c7a');
                            return;
                        }
                        pl.durMs = 0;
                        GameState.save();
                        AudioManager.playSfx('breakthrough');
                        render();
                    }, { skin: 'wood', iconKey: 'ic-stone', iconSize: 16, fontSize: 12 }).node.setPosition(0, -64, 0);
                }
            }
        };
        render();
    }

    // =========================================================================
    // 6. BLACKSMITH FORGE MODAL (`Lò Rèn Binh Khí`)
    // =========================================================================
    public openForgeModal(): void {
        const allRecipes: any[] = (ResourceManager.gameplaySystems?.forgeRecipes || []).filter(
            (r: any) => !r.dropOnly && !r.rewardOnly
        );
        const matDefs: any[] = ResourceManager.gameplaySystems?.forgeMaterials || [];
        let page = 0;
        let selIdx = 0;

        const render = () => {
            const w = 820;
            const h = 500;
            const win = this._prepareWindow('forge', 'THỢ RÈN - ĐÚC PHÁP KHÍ & BINH KHÍ', w, h, true, 'ic-sword');

            const perPage = 8;
            const maxPage = Math.max(0, Math.ceil(allRecipes.length / perPage) - 1);
            const slice = allRecipes.slice(page * perPage, (page + 1) * perPage);

            for (let i = 0; i < slice.length; i++) {
                const gIdx = page * perPage + i;
                const rec = slice[i];
                const b = UiHelper.createButton(`Frg_${rec.id}`, win, rec.name, 260, 36, () => {
                    AudioManager.playSfx('ui_click');
                    selIdx = gIdx;
                    render();
                }, { skin: 'wood', iconKey: 'ic-sword', iconSize: 16, fontSize: 12 });
                b.node.setPosition(-254, 168 - i * 42, 0);
                b.setActiveStyle(selIdx === gIdx);
            }

            if (maxPage > 0) {
                UiHelper.createButton('PrevF', win, 'Trước', 64, 26, () => {
                    if (page > 0) { page--; render(); }
                }, { skin: 'wood', fontSize: 10 }).node.setPosition(-330, -186, 0);
                UiHelper.createLabel('PgF', win, `${page + 1}/${maxPage + 1}`, { size: 11 }).node.setPosition(-254, -186, 0);
                UiHelper.createButton('NextF', win, 'Sau', 64, 26, () => {
                    if (page < maxPage) { page++; render(); }
                }, { skin: 'wood', fontSize: 10 }).node.setPosition(-178, -186, 0);
            }

            const cur = allRecipes[selIdx];
            if (!cur) return;

            const det = UiHelper.createPanel('ForgeDet', win, 480, 404, {
                skin: 'sub',
            });
            det.node.setPosition(142, -16, 0);

            const icBox = UiHelper.createPanel('ForgeFrame', det.node, 66, 66, { skin: 'slot_sel' });
            icBox.node.setPosition(0, 150, 0);
            const ic = UiHelper.createNode('ForgeIc', icBox.node, 48, 48);
            const sp = ic.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            ResourceManager.loadItemIcon(cur.id).then((sf) => {
                if (sp.isValid) sp.spriteFrame = sf;
            });

            UiHelper.createLabel('Nm', det.node, cur.name, {
                size: 16,
                colorHex: '#ffe89c',
                bold: true,
            }).node.setPosition(0, 104, 0);

            UiHelper.createLabel('Nt', det.node, cur.note || '', {
                size: 11,
                lineHeight: 16,
                colorHex: '#dcd0b8',
                width: 430,
                overflow: Label.Overflow.SHRINK,
            }).node.setPosition(0, 66, 0);

            const reqLines: string[] = [];
            let canForge = true;

            if (cur.stones > 0) {
                const ok = GameState.stones >= cur.stones;
                if (!ok) canForge = false;
                reqLines.push(`${ok ? '[Đủ]' : '[Thiếu]'} Linh Thạch: ${GameState.stones} / ${cur.stones}`);
            }
            for (const md of matDefs) {
                const reqAmt = Number(cur[md.key] || 0);
                if (reqAmt > 0) {
                    const have = GameState.countItem(md.item);
                    if (have < reqAmt) canForge = false;
                    reqLines.push(`${have >= reqAmt ? '[Đủ]' : '[Thiếu]'} ${md.name}: ${have} / ${reqAmt}`);
                }
            }
            if (cur.vatPham) {
                for (const [vid, vqty] of Object.entries(cur.vatPham)) {
                    const need = Number(vqty || 1);
                    const have = GameState.countItem(vid);
                    if (have < need) canForge = false;
                    reqLines.push(`${have >= need ? '[Đủ]' : '[Thiếu]'} ${ResourceManager.items[vid]?.name || vid}: ${have} / ${need}`);
                }
            }

            UiHelper.createLabel('Reqs', det.node, reqLines.join('\n') || 'Không tốn nguyên liệu phụ', {
                size: 12,
                lineHeight: 19,
                colorHex: canForge ? '#9df5a6' : '#ffcf96',
                width: 420,
            }).node.setPosition(0, -18, 0);

            UiHelper.createButton(
                'DoForgeBtn',
                det.node,
                `KHAI BÚA ĐÚC: ${cur.name.toUpperCase()}`,
                354,
                42,
                () => {
                    if (!canForge) {
                        AudioManager.playSfx('deny');
                        this._hud.showToast('Chưa đủ khoáng thạch / Linh Thạch để rèn!', '#ff9c7a');
                        return;
                    }
                    if (cur.stones > 0) GameState.spendStones(cur.stones);
                    for (const md of matDefs) {
                        const reqAmt = Number(cur[md.key] || 0);
                        if (reqAmt > 0) GameState.removeItem(md.item, reqAmt);
                    }
                    if (cur.vatPham) {
                        for (const [vid, vqty] of Object.entries(cur.vatPham)) {
                            GameState.removeItem(vid, Number(vqty || 1));
                        }
                    }
                    GameState.questFlags.forged_weapon = true;
                    GameState.addItem(cur.id, 1);
                    AudioManager.playSfx('crit');
                    this._world.shakeCamera(4, 0.25);
                    this._hud.showToast(`Rèn thành công bảo vật: ${cur.name}!`, '#ffe89c');
                    render();
                },
                {
                    skin: canForge ? 'gold' : 'wood',
                    iconKey: 'ic-ore',
                    iconSize: 18,
                    fontSize: 12,
                }
            ).node.setPosition(0, -148, 0);
        };
        render();
    }

    // =========================================================================
    // 7. SHOP MODAL
    // =========================================================================
    public openShopModal(shopTitle: string, catalog: Array<{ id: string; price: number }>): void {
        let page = 0;
        const render = () => {
            const w = 780;
            const h = 490;
            const win = this._prepareWindow(
                'shop',
                `${shopTitle} (Linh Thạch: ${GameState.stones.toLocaleString('vi-VN')})`,
                w,
                h,
                true,
                'ic-stone'
            );

            const perPage = 8;
            const maxPage = Math.max(0, Math.ceil(catalog.length / perPage) - 1);
            const slice = catalog.slice(page * perPage, (page + 1) * perPage);

            for (let i = 0; i < slice.length; i++) {
                const entry = slice[i];
                const it = ResourceManager.items[entry.id] || { name: entry.id, desc: '' };
                const col = i % 2;
                const row = Math.floor(i / 2);

                const card = UiHelper.createPanel(`ShopItem_${entry.id}`, win, 356, 82, {
                    skin: 'sub',
                });
                card.node.setPosition(-186 + col * 372, 134 - row * 90, 0);

                const slotF = UiHelper.createPanel('SlotF', card.node, 52, 52, { skin: 'slot' });
                slotF.node.setPosition(-144, 0, 0);
                const ic = UiHelper.createNode('Ic', slotF.node, 38, 38);
                const sp = ic.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.trim = false;
                ResourceManager.loadItemIcon(entry.id).then((sf) => {
                    if (sp.isValid) sp.spriteFrame = sf;
                });

                UiHelper.createLabel('Nm', card.node, `${it.name || entry.id} (Túi: ${GameState.countItem(entry.id)})`, {
                    size: 12,
                    colorHex: '#ffe89c',
                    bold: true,
                    align: Label.HorizontalAlign.LEFT,
                    ax: 0,
                    width: 196,
                    overflow: Label.Overflow.SHRINK,
                }).node.setPosition(-110, 16, 0);

                const stIcon = UiHelper.createIconNode('StIc', card.node, 'ic-stone', 14, 14);
                stIcon.node.setPosition(-102, -13, 0);

                UiHelper.createLabel('Pr', card.node, `${entry.price} Linh Thạch`, {
                    size: 11,
                    colorHex: '#7ee8ff',
                    align: Label.HorizontalAlign.LEFT,
                    ax: 0,
                }).node.setPosition(-90, -13, 0);

                UiHelper.createButton('Buy1', card.node, 'Mua x1', 80, 32, () => {
                    if (!GameState.spendStones(entry.price)) {
                        AudioManager.playSfx('deny');
                        this._hud.showToast('Không đủ Linh Thạch!', '#ff9c7a');
                        return;
                    }
                    AudioManager.playSfx('coin');
                    GameState.addItem(entry.id, 1);
                    this._hud.showToast(`Đã mua +1 ${it.name || entry.id}!`, '#9df5a6');
                    render();
                }, { skin: 'gold', fontSize: 11 }).node.setPosition(128, 0, 0);
            }

            if (maxPage > 0) {
                UiHelper.createButton('PrevS', win, 'Trang Trước', 110, 28, () => {
                    if (page > 0) { page--; render(); }
                }, { skin: 'wood', fontSize: 11 }).node.setPosition(-130, -206, 0);
                UiHelper.createLabel('PgS', win, `Trang ${page + 1} / ${maxPage + 1}`, { size: 11 }).node.setPosition(0, -206, 0);
                UiHelper.createButton('NextS', win, 'Trang Sau', 110, 28, () => {
                    if (page < maxPage) { page++; render(); }
                }, { skin: 'wood', fontSize: 11 }).node.setPosition(130, -206, 0);
            }
        };
        render();
    }

    // =========================================================================
    // 8. TÀNG KINH CÁC GACHA MODAL (`openGacha`)
    // =========================================================================
    public openGacha(): void {
        const pools = ResourceManager.gameplaySystems?.gachaPools || {};
        const poolKeys = ['so_cap', 'bi_dong', 'trung_cap', 'thuong_pham'].filter((k) => !!pools[k]);
        let curKey = poolKeys[0] || 'so_cap';
        let lastResults: string[] = [];

        const rollOne = (poolObj: any): string => {
            const list: any[] = poolObj?.pool || [];
            if (list.length === 0) return 'bi_tich_hoa_cau';
            const totalW = list.reduce((acc, x) => acc + Number(x.weight || 10), 0);
            let r = Math.random() * totalW;
            for (const entry of list) {
                r -= Number(entry.weight || 10);
                if (r <= 0) return entry.id;
            }
            return list[list.length - 1].id;
        };

        const render = () => {
            const w = 800;
            const h = 490;
            const win = this._prepareWindow(
                'gacha',
                `TÀNG KINH CÁC - CẦU DUYÊN BÍ TỊCH (Linh Thạch: ${GameState.stones.toLocaleString('vi-VN')})`,
                w,
                h,
                true,
                'ic-gacha'
            );

            for (let i = 0; i < poolKeys.length; i++) {
                const pk = poolKeys[i];
                const po = pools[pk];
                const tb = UiHelper.createButton(`Pool_${pk}`, win, po.label || pk, 182, 32, () => {
                    AudioManager.playSfx('ui_click');
                    curKey = pk;
                    lastResults = [];
                    render();
                }, { skin: 'wood', iconKey: 'ic-book', iconSize: 15, fontSize: 11 });
                tb.node.setPosition(-282 + i * 188, 166, 0);
                tb.setActiveStyle(curKey === pk);
            }

            const curPool = pools[curKey];
            if (!curPool) return;

            const cost1 = Number(curPool.cost || 100);
            const cost10 = Number(curPool.bulkCost || cost1 * 10);

            UiHelper.createLabel(
                'PoolDesc',
                win,
                `${curPool.label} - Nơi lưu giữ công pháp cổ truyền (${(curPool.pool || []).length} loại Bí Tịch).\nBí Tịch rút được sẽ tự động lĩnh ngộ ngay hoặc cất vào Túi Đồ!`,
                {
                    size: 12,
                    lineHeight: 18,
                    colorHex: '#e6dac2',
                }
            ).node.setPosition(0, 114, 0);

            const resBox = UiHelper.createPanel('ResultsBox', win, 730, 198, {
                skin: 'sub',
            });
            resBox.node.setPosition(0, -10, 0);

            if (lastResults.length === 0) {
                UiHelper.createLabel('WaitPull', resBox.node, 'Chọn [Thỉnh 1 Quyển] hoặc [Thỉnh 10 Quyển] bên dưới để khai mở cơ duyên!', {
                    size: 13,
                    colorHex: '#9c8e78',
                });
            } else {
                for (let i = 0; i < lastResults.length; i++) {
                    const bid = lastResults[i];
                    const bDef = ResourceManager.items[bid];
                    const col = i % 5;
                    const row = Math.floor(i / 5);
                    const cell = UiHelper.createPanel(`Pulled_${i}`, resBox.node, 134, 84, {
                        skin: 'slot_sel',
                    });
                    cell.node.setPosition(-280 + col * 140, (lastResults.length > 5 ? 46 : 0) - row * 90, 0);

                    const ic = UiHelper.createNode('Ic', cell.node, 44, 54);
                    ic.setPosition(0, 10, 0);
                    const sp = ic.addComponent(Sprite);
                    sp.sizeMode = Sprite.SizeMode.CUSTOM;
                    sp.trim = false;
                    ResourceManager.loadBiTichCard(bid).then((sf) => {
                        if (sp.isValid) sp.spriteFrame = sf;
                    });

                    UiHelper.createLabel('Nm', cell.node, bDef?.name || bid, {
                        size: 9,
                        colorHex: '#fff0bd',
                        bold: true,
                        width: 124,
                        overflow: Label.Overflow.SHRINK,
                    }).node.setPosition(0, -28, 0);
                }
            }

            const doPull = (count: number, totalCost: number) => {
                if (!GameState.spendStones(totalCost)) {
                    AudioManager.playSfx('deny');
                    this._hud.showToast(`Cần ${totalCost} Linh Thạch để thỉnh kinh!`, '#ff9c7a');
                    return;
                }
                AudioManager.playSfx('breakthrough');
                lastResults = [];
                let learnedCount = 0;
                for (let k = 0; k < count; k++) {
                    const bookId = rollOne(curPool);
                    lastResults.push(bookId);
                    GameState.addItem(bookId, 1);
                    const learnRes = GameState.useBagItem(bookId);
                    if (learnRes.ok) learnedCount++;
                }
                GameState.questFlags.pulled_gacha = true;
                GameState.checkQuestAutoAdvance();
                GameState.save();
                this._hud.showToast(
                    `Đã thỉnh ${count} Bí Tịch (Tự động lĩnh ngộ mới: ${learnedCount} pháp quyết)!`,
                    '#ffe89c'
                );
                render();
            };

            UiHelper.createButton(
                'Pull1Btn',
                win,
                `Thỉnh 1 Quyển (${cost1} Linh Thạch)`,
                258,
                42,
                () => doPull(1, cost1),
                { skin: 'wood', iconKey: 'ic-book', iconSize: 18, fontSize: 12 }
            ).node.setPosition(-150, -168, 0);

            UiHelper.createButton(
                'Pull10Btn',
                win,
                `Thỉnh 10 Quyển (${cost10} Linh Thạch)`,
                274,
                42,
                () => doPull(10, cost10),
                { skin: 'gold', iconKey: 'ic-gacha', iconSize: 20, textHex: '#fff4bd', fontSize: 12 }
            ).node.setPosition(150, -168, 0);
        };
        render();
    }

    // =========================================================================
    // 9. WORLD MAP MODAL (ALL 34 MAPS)
    // =========================================================================
    public openWorldMap(): void {
        const allMapIds = Object.keys(ResourceManager.worldMaps);
        let page = 0;
        let selectedMapId = this._world.mapData?.id || 'tan_vien';
        const qMeta = GameState.getQuestMeta();

        const render = () => {
            const w = 880;
            const h = 530;
            const win = this._prepareWindow('worldmap', 'BẢN ĐỒ TAM GIỚI - 34 ĐỊA VỰC TU TIÊN', w, h, true, 'ic-map');

            const perPage = 12;
            const maxPage = Math.max(0, Math.ceil(allMapIds.length / perPage) - 1);
            const slice = allMapIds.slice(page * perPage, (page + 1) * perPage);

            for (let i = 0; i < slice.length; i++) {
                const mid = slice[i];
                const m = ResourceManager.worldMaps[mid];
                const isHere = mid === this._world.mapData?.id;
                const isQuest = mid === qMeta.mapId;
                const col = i % 3;
                const row = Math.floor(i / 3);

                const card = UiHelper.createPanel(`MapCard_${mid}`, win, 172, 82, {
                    skin: mid === selectedMapId ? 'slot_sel' : 'slot',
                    blockInput: true,
                });
                card.node.setPosition(-330 + col * 180, 148 - row * 90, 0);

                const badge = isHere ? '[Đang Ở] ' : (isQuest ? '[Nhiệm Vụ] ' : '');
                UiHelper.createLabel('Nm', card.node, `${badge}${m.name}`, {
                    size: 11,
                    colorHex: isHere ? '#9df5a6' : (isQuest ? '#ffb878' : '#ffe89c'),
                    bold: true,
                    width: 158,
                    overflow: Label.Overflow.SHRINK,
                }).node.setPosition(0, 16, 0);

                UiHelper.createLabel('Sub', card.node, `${(m.enemySpawns || []).length} yêu thú | ${(m.portals || []).length} lối đi`, {
                    size: 9,
                    colorHex: '#bfb299',
                }).node.setPosition(0, -14, 0);

                card.node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
                    ev.propagationStopped = true;
                    AudioManager.playSfx('ui_click');
                    selectedMapId = mid;
                    render();
                });
            }

            UiHelper.createButton('PrevM', win, 'Trang Trước', 96, 28, () => {
                if (page > 0) { page--; render(); }
            }, { skin: 'wood', fontSize: 10 }).node.setPosition(-280, -214, 0);

            UiHelper.createLabel('PgM', win, `Trang ${page + 1} / ${maxPage + 1} (${allMapIds.length} bản đồ)`, {
                size: 11,
                colorHex: '#d8cbb4',
            }).node.setPosition(-150, -214, 0);

            UiHelper.createButton('NextM', win, 'Trang Sau', 96, 28, () => {
                if (page < maxPage) { page++; render(); }
            }, { skin: 'wood', fontSize: 10 }).node.setPosition(-20, -214, 0);

            const det = UiHelper.createPanel('MapDetail', win, 286, 412, {
                skin: 'sub',
            });
            det.node.setPosition(276, -16, 0);

            const selMap = ResourceManager.worldMaps[selectedMapId];
            if (!selMap) return;

            const thumbFrame = UiHelper.createPanel('ThumbFrame', det.node, 254, 172, { skin: 'slot' });
            thumbFrame.node.setPosition(0, 102, 0);

            const thumb = UiHelper.createNode('Thumb', thumbFrame.node, 244, 162);
            const sp = thumb.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.trim = false;
            ResourceManager.loadMinimapSprite(selectedMapId).then((sf) => {
                if (sp.isValid) sp.spriteFrame = sf;
            });

            UiHelper.createLabel('Title', det.node, selMap.name, {
                size: 15,
                colorHex: '#ffe89c',
                bold: true,
                width: 260,
                overflow: Label.Overflow.SHRINK,
            }).node.setPosition(0, -2, 0);

            UiHelper.createLabel('Sub', det.node, `${selMap.subtitle || 'Địa vực Tu Tiên'}\nKích thước: ${selMap.width}x${selMap.height} ô | Yêu thú: ${(selMap.enemySpawns || []).length}`, {
                size: 11,
                lineHeight: 16,
                colorHex: '#cfc2aa',
                width: 256,
            }).node.setPosition(0, -44, 0);

            UiHelper.createButton('WalkMapBtn', det.node, 'Tự Động Dẫn Đường Tới Đây', 248, 36, () => {
                this.close();
                this._world.navigateToMap(selectedMapId, false);
            }, { skin: 'wood', iconKey: 'hud-target', iconSize: 17, fontSize: 11 }).node.setPosition(0, -108, 0);

            UiHelper.createButton('TpMapBtn', det.node, 'Truyền Tống Tức Thì', 248, 38, () => {
                this.close();
                this._world.navigateToMap(selectedMapId, true);
            }, { skin: 'gold', iconKey: 'ic-map', iconSize: 18, fontSize: 12 }).node.setPosition(0, -156, 0);
        };
        render();
    }

    // =========================================================================
    // 10. DOWNED & SETTINGS MODALS
    // =========================================================================
    public openDownedModal(): void {
        const win = this._prepareWindow('downed', 'ĐẠO CƠ TRỌNG THƯƠNG', 480, 260, false, 'ic-pill');

        UiHelper.createLabel(
            'DownTxt',
            win,
            'Khí huyết đã cạn, đạo hữu đang trọng thương hôn mê.\nHãy chọn cách hồi phục nguyên khí:',
            {
                size: 13,
                lineHeight: 20,
                colorHex: '#f5d5cc',
            }
        ).node.setPosition(0, 42, 0);

        UiHelper.createButton('ReviveHere', win, 'Hồi Phục Nguyên Khí Tại Chỗ', 340, 38, () => {
            AudioManager.playSfx('breakthrough');
            this._world.player.revive(0.8, this._world.vfx);
            this.close();
            this._hud.showToast('Đã vận công trị thương đứng dậy!', '#9df2dd');
        }, { skin: 'gold', iconKey: 'ic-pill', iconSize: 18, fontSize: 12 }).node.setPosition(0, -24, 0);

        UiHelper.createButton('ReviveTown', win, 'Hồi Thành Về Làng Tản Viên (100% Khí Huyết)', 340, 38, () => {
            AudioManager.playSfx('portal');
            this._world.player.revive(1.0, this._world.vfx);
            this.close();
            this._world.loadMap('tan_vien');
        }, { skin: 'jade', iconKey: 'ic-map', iconSize: 18, fontSize: 11 }).node.setPosition(0, -72, 0);
    }

    public openSettingsModal(): void {
        const render = () => {
            const w = 540;
            const h = 440;
            const win = this._prepareWindow('settings', 'CÀI ĐẶT & HỖ TRỢ TIÊN ĐỒ', w, h, true, 'hud-gear');

            const items: Array<{ label: string; iconKey: string; skin?: ButtonSkinType; onClick: () => void }> = [
                {
                    label: `Nhạc Nền BGM: ${AudioManager.musicOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}`,
                    iconKey: AudioManager.musicOn ? 'icon_check_on' : 'icon_check_off',
                    onClick: () => {
                        AudioManager.setMusicOn(!AudioManager.musicOn);
                        render();
                    },
                },
                {
                    label: `Hiệu Ứng Âm Thanh (SFX): ${AudioManager.sfxOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}`,
                    iconKey: AudioManager.sfxOn ? 'icon_check_on' : 'icon_check_off',
                    onClick: () => {
                        AudioManager.setSfxOn(!AudioManager.sfxOn);
                        render();
                    },
                },
                {
                    label: `Mức Âm Lượng: ${Math.round(AudioManager.volume * 100)}% (Bấm để đổi)`,
                    iconKey: 'hud-settings',
                    onClick: () => {
                        const nm = AudioManager.cycleVolume();
                        this._hud.showToast(`Âm lượng: ${nm}`);
                        render();
                    },
                },
                {
                    label: `Góc Nhìn Camera (Zoom x${this._world.zoom.toFixed(2)}) - Bấm đổi`,
                    iconKey: 'hud-inspect',
                    onClick: () => {
                        const zName = this._world.cycleZoomPreset();
                        this._hud.showToast(`Góc nhìn: ${zName}`);
                        render();
                    },
                },
                {
                    label: `Phím Ảo Di Chuyển D-Pad: ${this._hud.dpadVisible ? 'HIỆN' : 'ẨN'}`,
                    iconKey: this._hud.dpadVisible ? 'icon_check_on' : 'icon_check_off',
                    onClick: () => {
                        this._hud.setDpadVisible(!this._hud.dpadVisible);
                        render();
                    },
                },
                {
                    label: 'Thoát Kẹt - Truyền Tống Về Làng Tản Viên',
                    iconKey: 'ic-map',
                    onClick: () => {
                        this.close();
                        this._world.loadMap('tan_vien');
                    },
                },
                {
                    label: 'Nhận Gói Quà Trải Nghiệm Tiên Đồ (+25.000 Linh Thạch, Kỹ Năng)',
                    iconKey: 'ic-gift',
                    skin: 'jade',
                    onClick: () => {
                        AudioManager.playSfx('breakthrough');
                        const msg = GameState.grantExperienceBoostPack();
                        this._world.player.refreshAppearance();
                        this.close();
                        this._hud.showToast(msg, '#ffe89c');
                    },
                },
                {
                    label: 'Tạo Lại Nhân Vật Mới',
                    iconKey: 'hud-exchange',
                    skin: 'crimson',
                    onClick: () => {
                        this.openCharCreator(() => {
                            this._world.loadMap('tan_vien');
                            this._world.player.refreshAppearance();
                        }, true);
                    },
                },
            ];

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const b = UiHelper.createButton(`Set_${i}`, win, it.label, w - 64, 36, () => {
                    AudioManager.playSfx('ui_click');
                    it.onClick();
                }, {
                    skin: it.skin || 'wood',
                    iconKey: it.iconKey,
                    iconSize: 16,
                    fontSize: 11,
                });
                b.node.setPosition(0, 144 - i * 44, 0);
            }
        };
        render();
    }
}
