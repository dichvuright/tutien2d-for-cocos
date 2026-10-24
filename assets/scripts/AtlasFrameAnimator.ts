import { _decorator, Component, Sprite, SpriteAtlas, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AtlasFrameAnimator')
export class AtlasFrameAnimator extends Component {
    @property({ type: SpriteAtlas })
    public atlas: SpriteAtlas | null = null;

    @property
    public framePrefix: string = '';

    @property
    public startFrame: number = 0;

    @property
    public frameCount: number = 4;

    @property
    public fps: number = 8;

    @property
    public loop: boolean = true;

    private _sprite: Sprite | null = null;
    private _frames: SpriteFrame[] = [];
    private _timer: number = 0;
    private _index: number = 0;

    protected onLoad(): void {
        this._sprite = this.getComponent(Sprite);
        this.rebuildFrames();
    }

    public rebuildFrames(): void {
        this._frames = [];
        if (!this.atlas) return;
        const all = this.atlas.getSpriteFrames();
        if (this.framePrefix) {
            const filtered = all
                .filter(f => f && f.name.startsWith(this.framePrefix))
                .sort((a, b) => a.name.localeCompare(b.name));
            this._frames = filtered.slice(this.startFrame, this.startFrame + Math.max(1, this.frameCount));
        } else {
            const sorted = all.slice().sort((a, b) => a.name.localeCompare(b.name));
            this._frames = sorted.slice(this.startFrame, this.startFrame + Math.max(1, this.frameCount));
        }
        if (this._frames.length > 0 && this._sprite) {
            this._sprite.spriteFrame = this._frames[0];
        }
    }

    protected update(dt: number): void {
        if (!this._sprite || this._frames.length <= 1 || this.fps <= 0) return;
        this._timer += dt * this.fps;
        if (this._timer >= 1) {
            const step = Math.floor(this._timer);
            this._timer -= step;
            if (this.loop) {
                this._index = (this._index + step) % this._frames.length;
            } else {
                this._index = Math.min(this._frames.length - 1, this._index + step);
            }
            this._sprite.spriteFrame = this._frames[this._index];
        }
    }
}
