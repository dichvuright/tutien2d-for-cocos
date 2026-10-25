import {
    BlockInputEvents,
    BitmapFont,
    Color,
    EventTouch,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    TTFFont,
    UITransform,
    Vec3,
    Widget,
    tween,
} from 'cc';

export const UI_LAYER = Layers.Enum.UI_2D;

export type PanelSkinType = 'wood' | 'sub' | 'header' | 'slot' | 'slot_sel' | 'solid';
export type ButtonSkinType = 'wood' | 'gold' | 'crimson' | 'jade' | 'round_atk' | 'dpad_center';
export type BarSkinKind = 'hp' | 'mp' | 'sp' | 'bp' | 'exp' | 'gold';

export class UiHelper {
    public static pixelFont: TTFFont | null = null;
    public static serifFont: TTFFont | null = null;
    public static dmgBitmapFont: BitmapFont | null = null;

    private static _skins = new Map<string, SpriteFrame>();
    private static _icons = new Map<string, SpriteFrame>();

    public static registerSkin(name: string, sf: SpriteFrame): void {
        UiHelper._skins.set(name, sf);
    }

    public static skin(name: string): SpriteFrame | null {
        return UiHelper._skins.get(name) || null;
    }

    public static registerIcon(key: string, sf: SpriteFrame): void {
        UiHelper._icons.set(key, sf);
    }

    public static icon(key: string): SpriteFrame | null {
        return UiHelper._icons.get(key) || null;
    }

    public static hex(hexStr: string, alphaOverride?: number): Color {
        let s = (hexStr || '#ffffff').trim();
        if (s.startsWith('#')) s = s.slice(1);
        if (s.length === 3) {
            s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        }
        const r = parseInt(s.slice(0, 2), 16) || 0;
        const g = parseInt(s.slice(2, 4), 16) || 0;
        const b = parseInt(s.slice(4, 6), 16) || 0;
        const a = alphaOverride !== undefined
            ? alphaOverride
            : (s.length >= 8 ? (parseInt(s.slice(6, 8), 16) || 255) : 255);
        return new Color(r, g, b, a);
    }

    public static createNode(name: string, parent?: Node | null, w: number = 0, h: number = 0, ax: number = 0.5, ay: number = 0.5): Node {
        const node = new Node(name);
        node.layer = UI_LAYER;
        const ut = node.addComponent(UITransform);
        ut.setContentSize(w, h);
        ut.setAnchorPoint(ax, ay);
        if (parent) parent.addChild(node);
        return node;
    }

    public static findOrCreateNode(name: string, parent: Node, w: number = 0, h: number = 0, ax: number = 0.5, ay: number = 0.5): Node {
        const existing = parent.getChildByName(name);
        if (existing) {
            existing.layer = UI_LAYER;
            if (w > 0 || h > 0) {
                const ut = existing.getComponent(UITransform) || existing.addComponent(UITransform);
                ut.setContentSize(w, h);
                ut.setAnchorPoint(ax, ay);
            }
            return existing;
        }
        return UiHelper.createNode(name, parent, w, h, ax, ay);
    }

    /**
     * Khung UI ghép từ Sprite 9-slice chuẩn Cổ Phong Mộc Kim
     */
    public static createPanel(
        name: string,
        parent: Node,
        w: number,
        h: number,
        opts?: {
            skin?: PanelSkinType;
            tintHex?: string;
            bgAlpha?: number;
            blockInput?: boolean;
            ax?: number;
            ay?: number;
        }
    ): { node: Node; sprite: Sprite } {
        const ax = opts?.ax ?? 0.5;
        const ay = opts?.ay ?? 0.5;
        const node = UiHelper.createNode(name, parent, w, h, ax, ay);
        if (opts?.blockInput) {
            node.addComponent(BlockInputEvents);
        }

        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;

        const skinType = opts?.skin || 'wood';
        const frameMap: Record<PanelSkinType, string> = {
            wood: 'panel_wood_gold',
            sub: 'panel_sub_dark',
            header: 'panel_header',
            slot: 'slot_frame',
            slot_sel: 'slot_frame_sel',
            solid: 'white_pixel',
        };
        const sf = UiHelper.skin(frameMap[skinType]);
        sp.spriteFrame = sf;
        sp.type = (skinType === 'solid' || !sf) ? Sprite.Type.SIMPLE : Sprite.Type.SLICED;

        const alpha = opts?.bgAlpha ?? 255;
        if (opts?.tintHex) {
            sp.color = UiHelper.hex(opts.tintHex, alpha);
        } else {
            sp.color = new Color(255, 255, 255, alpha);
        }

        return { node, sprite: sp };
    }

    public static createSolidOverlay(name: string, parent: Node, w: number, h: number, colorHex: string, alpha: number = 185): { node: Node; sprite: Sprite } {
        return UiHelper.createPanel(name, parent, w, h, {
            skin: 'solid',
            tintHex: colorHex,
            bgAlpha: alpha,
        });
    }

    public static createIconNode(name: string, parent: Node, iconKeyOrSf: string | SpriteFrame | null, w: number, h: number): { node: Node; sprite: Sprite } {
        const node = UiHelper.createNode(name, parent, w, h);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.trim = false;
        if (typeof iconKeyOrSf === 'string') {
            sp.spriteFrame = UiHelper.icon(iconKeyOrSf) || UiHelper.skin(iconKeyOrSf);
        } else {
            sp.spriteFrame = iconKeyOrSf;
        }
        return { node, sprite: sp };
    }

    public static createLabel(
        name: string,
        parent: Node,
        text: string,
        opts?: {
            size?: number;
            lineHeight?: number;
            colorHex?: string;
            serif?: boolean;
            bold?: boolean;
            align?: number;
            valign?: number;
            width?: number;
            overflow?: number;
            ax?: number;
            ay?: number;
            outlineHex?: string;
            outlineWidth?: number;
        }
    ): Label {
        const ax = opts?.ax ?? 0.5;
        const ay = opts?.ay ?? 0.5;
        const w = opts?.width ?? 0;
        const sz = opts?.size ?? 14;
        const node = UiHelper.createNode(name, parent, w || 120, opts?.lineHeight ?? (sz + 6), ax, ay);
        const lbl = node.addComponent(Label);
        UiHelper.styleLabel(lbl, text, opts);
        return lbl;
    }

    public static styleLabel(
        lbl: Label,
        text: string,
        opts?: {
            size?: number;
            lineHeight?: number;
            colorHex?: string;
            serif?: boolean;
            bold?: boolean;
            align?: number;
            valign?: number;
            width?: number;
            overflow?: number;
            outlineHex?: string;
            outlineWidth?: number;
        }
    ): Label {
        const sz = opts?.size ?? 14;
        lbl.useSystemFont = false;
        const chosenFont = UiHelper.pixelFont || UiHelper.serifFont;
        if (chosenFont) {
            lbl.font = chosenFont;
        } else {
            lbl.useSystemFont = true;
            lbl.fontFamily = 'monospace';
        }
        lbl.fontSize = Math.round(sz);
        lbl.lineHeight = Math.round(opts?.lineHeight ?? (sz + 5));
        lbl.isBold = !!opts?.bold;
        lbl.color = UiHelper.hex(opts?.colorHex || '#f0f7f4');
        lbl.horizontalAlign = opts?.align ?? Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = opts?.valign ?? Label.VerticalAlign.CENTER;

        if (opts?.width && opts.width > 0) {
            lbl.overflow = opts.overflow ?? Label.Overflow.CLAMP;
            const ut = lbl.node.getComponent(UITransform);
            if (ut) ut.width = opts.width;
        } else {
            lbl.overflow = Label.Overflow.NONE;
        }

        if (opts?.outlineHex !== undefined || (opts?.outlineWidth && opts.outlineWidth > 0)) {
            lbl.enableOutline = true;
            lbl.outlineColor = UiHelper.hex(opts?.outlineHex || '#0b0805', 240);
            lbl.outlineWidth = opts?.outlineWidth ?? 2;
        }
        lbl.string = text;
        return lbl;
    }

    public static createButton(
        name: string,
        parent: Node,
        labelStr: string,
        w: number,
        h: number,
        onClick: () => void,
        opts?: {
            skin?: ButtonSkinType;
            iconKey?: string;
            iconSf?: SpriteFrame | null;
            iconSize?: number;
            iconTop?: boolean;
            textHex?: string;
            fontSize?: number;
            serif?: boolean;
        }
    ): {
        node: Node;
        label: Label;
        sprite: Sprite;
        iconSprite: Sprite | null;
        setActiveStyle: (active: boolean) => void;
    } {
        const baseSkin: ButtonSkinType = opts?.skin || 'wood';
        const skinFrameMap: Record<ButtonSkinType, string> = {
            wood: 'btn_wood',
            gold: 'btn_gold',
            crimson: 'btn_crimson',
            jade: 'btn_jade',
            round_atk: 'btn_round_atk',
            dpad_center: 'dpad_center',
        };
        const isSliced = baseSkin !== 'round_atk' && baseSkin !== 'dpad_center';

        const node = UiHelper.createNode(name, parent, w, h, 0.5, 0.5);
        node.addComponent(BlockInputEvents);

        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        const btnSf = UiHelper.skin(skinFrameMap[baseSkin]);
        sprite.spriteFrame = btnSf;
        sprite.type = (isSliced && btnSf) ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;

        let iconSprite: Sprite | null = null;
        const hasIcon = !!(opts?.iconKey || opts?.iconSf);
        const icSz = opts?.iconSize ?? Math.min(20, Math.max(14, h - 10));

        if (hasIcon) {
            const icSf = opts?.iconSf ?? (opts?.iconKey ? (UiHelper.icon(opts.iconKey) || UiHelper.skin(opts.iconKey)) : null);
            const ic = UiHelper.createIconNode('Icon', node, icSf, icSz, icSz);
            iconSprite = ic.sprite;
            if (opts?.iconTop) {
                ic.node.setPosition(0, h * 0.16, 0);
            } else {
                ic.node.setPosition(-w * 0.5 + 6 + icSz * 0.5, 0, 0);
            }
        }

        const labelWidth = hasIcon && !opts?.iconTop ? Math.max(24, w - icSz - 14) : Math.max(24, w - 10);
        const label = UiHelper.createLabel('BtnLabel', node, labelStr, {
            size: opts?.fontSize ?? 12,
            colorHex: opts?.textHex || '#f6e4b8',
            serif: opts?.serif ?? false,
            bold: true,
            outlineHex: '#0f0a06',
            outlineWidth: 2,
            width: labelWidth,
            overflow: Label.Overflow.SHRINK,
        });
        label.enableWrapText = labelStr.includes('\n');
        if (hasIcon) {
            if (opts?.iconTop) {
                label.node.setPosition(0, -h * 0.22, 0);
            } else {
                label.node.setPosition((icSz + 4) * 0.5, 0, 0);
            }
        }

        const ctrl = UiHelper.bindButtonEvents(node, sprite, label, onClick, {
            baseFrameName: skinFrameMap[baseSkin],
            isSliced,
            textHex: opts?.textHex || '#f6e4b8',
        });

        return {
            node,
            label,
            sprite,
            iconSprite,
            setActiveStyle: ctrl.setActiveStyle,
        };
    }

    public static bindButtonEvents(
        node: Node,
        sprite: Sprite,
        label: Label,
        onClick: () => void,
        cfg?: { baseFrameName?: string; isSliced?: boolean; textHex?: string }
    ): { setActiveStyle: (active: boolean) => void } {
        if (!node.getComponent(BlockInputEvents)) {
            node.addComponent(BlockInputEvents);
        }
        const baseFrame = cfg?.baseFrameName || 'btn_wood';
        const isSliced = cfg?.isSliced ?? (baseFrame !== 'btn_round_atk' && baseFrame !== 'dpad_center');
        const normalTextHex = cfg?.textHex || '#f6e4b8';
        let isHighlighted = false;

        const applyVisual = (pressed: boolean) => {
            if (isSliced) {
                const targetSkin = isHighlighted ? 'btn_gold' : baseFrame;
                const sf = UiHelper.skin(targetSkin);
                if (sf) sprite.spriteFrame = sf;
            }
            sprite.color = pressed
                ? new Color(215, 205, 190, 255)
                : (isHighlighted && !isSliced ? UiHelper.hex('#ffe89c') : Color.WHITE);
        };

        node.targetOff(node);
        node.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
            ev.propagationStopped = true;
            applyVisual(true);
            tween(node).to(0.05, { scale: new Vec3(0.95, 0.95, 1) }).start();
        });
        node.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
            ev.propagationStopped = true;
            applyVisual(false);
            tween(node).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            onClick();
        });
        node.on(Node.EventType.TOUCH_CANCEL, () => {
            applyVisual(false);
            tween(node).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        });

        return {
            setActiveStyle: (active: boolean) => {
                isHighlighted = active;
                label.color = UiHelper.hex(active ? '#fff2b2' : normalTextHex);
                applyVisual(false);
            },
        };
    }

    private static _resolveBarSkin(kindOrHex: string): string {
        const k = (kindOrHex || '').toLowerCase();
        if (k === 'hp' || k.includes('c938') || k.includes('d136') || k.includes('e03e')) return 'bar_hp';
        if (k === 'mp' || k.includes('2e7b') || k.includes('3d7e')) return 'bar_mp';
        if (k === 'sp' || k.includes('8348')) return 'bar_sp';
        if (k === 'bp' || k.includes('cf88')) return 'bar_bp';
        if (k === 'gold' || k.includes('d9a4') || k.includes('d6ad')) return 'bar_gold';
        if (k === 'exp' || k.includes('3da8')) return 'bar_exp';
        return 'bar_exp';
    }

    /**
     * Thanh chỉ số ghép từ Sprite 9-slice Track + Sprite.Type.FILLED Fill
     */
    public static createBar(
        name: string,
        parent: Node,
        w: number,
        h: number,
        kindOrHex: string,
        leftTitle: string = ''
    ): {
        node: Node;
        updateBar: (cur: number, max: number, rightText?: string, overrideKindOrHex?: string) => void;
    } {
        const node = UiHelper.createNode(name, parent, w, h, 0, 0.5);
        const trackSp = node.addComponent(Sprite);
        trackSp.sizeMode = Sprite.SizeMode.CUSTOM;
        trackSp.trim = false;
        const trackSf = UiHelper.skin('bar_track');
        trackSp.spriteFrame = trackSf;
        trackSp.type = trackSf ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;

        const fillNode = UiHelper.createNode('Fill', node, Math.max(4, w - 4), Math.max(4, h - 4), 0, 0.5);
        fillNode.setPosition(2, 0, 0);
        const fillSp = fillNode.addComponent(Sprite);
        fillSp.sizeMode = Sprite.SizeMode.CUSTOM;
        fillSp.trim = false;
        const fillSf = UiHelper.skin(UiHelper._resolveBarSkin(kindOrHex)) || UiHelper.skin('bar_fill_white');
        fillSp.spriteFrame = fillSf;
        if (fillSf) {
            fillSp.type = Sprite.Type.FILLED;
            fillSp.fillType = Sprite.FillType.HORIZONTAL;
            fillSp.fillStart = 0;
            fillSp.fillRange = 1;
        }

        if (leftTitle) {
            const titleLbl = UiHelper.createLabel('Title', node, leftTitle, {
                size: Math.max(9, h - 3),
                colorHex: '#f5ecd8',
                align: Label.HorizontalAlign.LEFT,
                ax: 0,
                ay: 0.5,
                outlineHex: '#090604',
                outlineWidth: 1.5,
            });
            titleLbl.node.setPosition(5, 0, 0);
        }

        const valLbl = UiHelper.createLabel('Value', node, '', {
            size: Math.max(9, h - 3),
            colorHex: '#ffffff',
            align: leftTitle ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER,
            ax: leftTitle ? 1 : 0.5,
            ay: 0.5,
            outlineHex: '#090604',
            outlineWidth: 1.5,
        });
        valLbl.node.setPosition(leftTitle ? w - 5 : w * 0.5, 0, 0);

        return UiHelper.bindExistingBar(node, kindOrHex);
    }

    public static bindExistingBar(
        node: Node,
        defaultKindOrHex: string
    ): {
        node: Node;
        updateBar: (cur: number, max: number, rightText?: string, overrideKindOrHex?: string) => void;
    } {
        const fillNode = node.getChildByName('Fill')!;
        const fillSp = fillNode.getComponent(Sprite)!;
        const valLbl = node.getChildByName('Value')!.getComponent(Label)!;

        let lastSig = '';
        const updateBar = (cur: number, max: number, rightText?: string, overrideKindOrHex?: string) => {
            const ratio = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
            const skinKey = UiHelper._resolveBarSkin(overrideKindOrHex || defaultKindOrHex);
            const txt = rightText !== undefined ? rightText : `${Math.round(cur)}/${Math.round(max)}`;
            const sig = `${ratio.toFixed(3)}|${txt}|${skinKey}`;
            if (sig === lastSig) return;
            lastSig = sig;

            const sf = UiHelper.skin(skinKey);
            if (sf && fillSp.spriteFrame !== sf) {
                fillSp.spriteFrame = sf;
            }
            if (fillSp.spriteFrame) {
                if (fillSp.type !== Sprite.Type.FILLED) {
                    fillSp.type = Sprite.Type.FILLED;
                    fillSp.fillType = Sprite.FillType.HORIZONTAL;
                    fillSp.fillStart = 0;
                }
                fillSp.fillRange = ratio;
            }
            fillNode.active = ratio > 0.003;
            valLbl.string = txt;
        };

        return { node, updateBar };
    }

    public static attachSprite(node: Node, sf: SpriteFrame | null, w?: number, h?: number): Sprite {
        let sp = node.getComponent(Sprite);
        if (!sp) sp = node.addComponent(Sprite);
        sp.sizeMode = (w !== undefined && h !== undefined) ? Sprite.SizeMode.CUSTOM : Sprite.SizeMode.RAW;
        sp.trim = false;
        sp.spriteFrame = sf;
        if (w !== undefined && h !== undefined) {
            const ut = node.getComponent(UITransform) || node.addComponent(UITransform);
            ut.setContentSize(w, h);
        }
        return sp;
    }

    public static pinWidget(
        node: Node,
        edges: { top?: number; bottom?: number; left?: number; right?: number; hCenter?: number; vCenter?: number }
    ): Widget {
        const w = node.getComponent(Widget) || node.addComponent(Widget);
        w.isAlignTop = edges.top !== undefined;
        if (edges.top !== undefined) w.top = edges.top;
        w.isAlignBottom = edges.bottom !== undefined;
        if (edges.bottom !== undefined) w.bottom = edges.bottom;
        w.isAlignLeft = edges.left !== undefined;
        if (edges.left !== undefined) w.left = edges.left;
        w.isAlignRight = edges.right !== undefined;
        if (edges.right !== undefined) w.right = edges.right;
        w.isAlignHorizontalCenter = edges.hCenter !== undefined;
        if (edges.hCenter !== undefined) w.horizontalCenter = edges.hCenter;
        w.isAlignVerticalCenter = edges.vCenter !== undefined;
        if (edges.vCenter !== undefined) w.verticalCenter = edges.vCenter;
        w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        return w;
    }

    public static gradeColor(grade?: string): string {
        if (!grade) return '#d8d4c8';
        const g = grade.toLowerCase();
        if (g.includes('thiên') || g.includes('thượng phẩm') || g.includes('kim')) return '#ffaa3b';
        if (g.includes('địa') || g.includes('trúc cơ')) return '#c285ff';
        if (g.includes('huyền') || g.includes('hiếm')) return '#5ec9ff';
        if (g.includes('linh') || g.includes('thượng')) return '#7ee08f';
        return '#d8d4c8';
    }
}
