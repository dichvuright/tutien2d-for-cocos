import { _decorator, AudioClip, BitmapFont, Component, JsonAsset, resources, SpriteAtlas, SpriteFrame, TTFFont } from 'cc';
const { ccclass } = _decorator;

/**
 * Trung tam truy cap tai nguyen & du lieu Tu Tien 2D trong Cocos Creator 3.8
 */
@ccclass('TuTienAssetRegistry')
export class TuTienAssetRegistry extends Component {
    public static loadJson<T = any>(dataName: 'realms' | 'items' | 'enemies' | 'skills' | 'talismans_formations' | 'maps' | 'character_options'): Promise<T> {
        return new Promise((resolve, reject) => {
            resources.load(`data/${dataName}`, JsonAsset, (err, asset) => {
                if (err || !asset) return reject(err);
                resolve(asset.json as T);
            });
        });
    }

    public static loadItemIcon(iconName: string): Promise<SpriteFrame> {
        const clean = iconName.startsWith('icon_') ? iconName : `icon_${iconName}`;
        return new Promise((resolve, reject) => {
            resources.load(`textures/items/${clean}/spriteFrame`, SpriteFrame, (err, sf) => {
                if (!err && sf) return resolve(sf);
                resources.load(`textures/procedural/items/${clean}/spriteFrame`, SpriteFrame, (err2, sf2) => {
                    if (err2 || !sf2) return reject(err2 || err);
                    resolve(sf2);
                });
            });
        });
    }

    public static loadMobAtlas(mobName: string): Promise<SpriteAtlas> {
        return new Promise((resolve, reject) => {
            resources.load(`textures/mob/${mobName}`, SpriteAtlas, (err, atlas) => {
                if (!err && atlas) return resolve(atlas);
                resources.load(`textures/procedural/mobs/${mobName}`, SpriteAtlas, (err2, atlas2) => {
                    if (err2 || !atlas2) return reject(err2 || err);
                    resolve(atlas2);
                });
            });
        });
    }

    public static loadBgm(trackName: string): Promise<AudioClip> {
        return new Promise((resolve, reject) => {
            resources.load(`audio/bgm/${trackName}`, AudioClip, (err, clip) => {
                if (err || !clip) return reject(err);
                resolve(clip);
            });
        });
    }
}
