import { AudioSource, Node } from 'cc';
import { ResourceManager } from './ResourceManager';

const MAP_BGM_TABLE: Record<string, string> = {
    tan_vien: 'tien-tran-thanh-xuan',
    thanh_truc_lam: 'tien-tran-thanh-xuan',
    mieu_hoang: 'tien-tran-thanh-xuan',
    duoc_vien: 'tien-tran-thanh-xuan',
    vuon_ca_nhan: 'tien-tran-thanh-xuan',
    long_uyen: 'son-thuy-hanh-lu',
    bai_da_hang_gio: 'son-thuy-hanh-lu',
    mo_linh_thach: 'son-thuy-hanh-lu',
    hang_dong_co: 'cam-son-tham-u',
    thach_phong_thung_lung: 'son-thuy-hanh-lu',
    dong_mach_ngam: 'mieu-truong-con',
    bat_quai_thach_phan: 'van-cung-thang-thien',
    thien_dao_khuyet: 'van-cung-thang-thien',
    u_uynh_vuc: 'cam-son-tham-u',
    hac_phong_linh: 'cam-son-tham-u',
    hac_thi: 'cam-son-tham-u',
    yen_lang_son: 'tu-tien-luc',
    lam_lang: 'tu-tien-luc',
    rung_mang_xa: 'tu-tien-luc',
    mach_dat_dong: 'cam-son-tham-u',
    dam_lay_boss: 'boss-toc-truong',
    dai_hoi_cho: 'suc-the-dai-phat',
    dai_hoi_dau: 'boss-toc-truong',
    chien_bang_dai: 'boss-toc-truong',
    san_dau_vip: 'boss-toc-truong',
    tmc_cho: 'suc-the-dai-phat',
    chien_truong_cho: 'suc-the-dai-phat',
    chien_truong: 'boss-toc-truong',
};

export type SfxKind =
    | 'swing'
    | 'hit'
    | 'crit'
    | 'spell'
    | 'fire'
    | 'ice'
    | 'thunder'
    | 'pickup'
    | 'coin'
    | 'meditate'
    | 'breakthrough'
    | 'quest_complete'
    | 'portal'
    | 'hurt'
    | 'deny'
    | 'ui_click';

export class AudioManager {
    public static musicOn: boolean = true;
    public static sfxOn: boolean = true;
    public static volume: number = 0.55;

    private static _bgmSource: AudioSource | null = null;
    private static _currentTrack: string = '';
    private static _mapId: string = 'tan_vien';
    private static _bossActive: boolean = false;
    private static _ctx: AudioContext | null = null;

    public static init(hostNode: Node): void {
        let src = hostNode.getComponent(AudioSource);
        if (!src) src = hostNode.addComponent(AudioSource);
        src.loop = true;
        src.playOnAwake = false;
        src.volume = AudioManager.musicOn ? AudioManager.volume * 0.65 : 0;
        AudioManager._bgmSource = src;
    }

    public static unlockAudio(): void {
        try {
            const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
            if (AC && !AudioManager._ctx) {
                AudioManager._ctx = new AC();
            }
            if (AudioManager._ctx && AudioManager._ctx.state === 'suspended') {
                AudioManager._ctx.resume();
            }
            if (AudioManager._bgmSource && AudioManager.musicOn && AudioManager._bgmSource.clip && !AudioManager._bgmSource.playing) {
                AudioManager._bgmSource.play();
            }
        } catch {
            // Ignore browser autoplay restrictions until next user gesture
        }
    }

    public static setMusicOn(on: boolean): void {
        AudioManager.musicOn = on;
        if (!AudioManager._bgmSource) return;
        if (!on) {
            AudioManager._bgmSource.volume = 0;
            AudioManager._bgmSource.pause();
        } else {
            AudioManager._bgmSource.volume = AudioManager.volume * 0.65;
            if (AudioManager._bgmSource.clip) {
                AudioManager._bgmSource.play();
            } else {
                AudioManager._refreshBgm();
            }
        }
    }

    public static setSfxOn(on: boolean): void {
        AudioManager.sfxOn = on;
    }

    public static cycleVolume(): string {
        const steps = [0.25, 0.55, 0.85, 1.0];
        const names = ['Nhỏ (25%)', 'Vừa (55%)', 'Lớn (85%)', 'Tối đa (100%)'];
        let idx = steps.findIndex((v) => Math.abs(v - AudioManager.volume) < 0.08);
        idx = (idx + 1) % steps.length;
        AudioManager.volume = steps[idx];
        if (AudioManager._bgmSource && AudioManager.musicOn) {
            AudioManager._bgmSource.volume = AudioManager.volume * 0.65;
        }
        return names[idx];
    }

    public static setMap(mapId: string): void {
        AudioManager._mapId = mapId;
        AudioManager._bossActive = false;
        AudioManager._refreshBgm();
    }

    public static setBossCombat(active: boolean): void {
        if (AudioManager._bossActive === active) return;
        AudioManager._bossActive = active;
        AudioManager._refreshBgm();
    }

    private static async _refreshBgm(): Promise<void> {
        const desired = AudioManager._bossActive
            ? 'boss-toc-truong'
            : (MAP_BGM_TABLE[AudioManager._mapId] || 'tu-tien-luc');
        if (desired === AudioManager._currentTrack && AudioManager._bgmSource?.playing) return;
        AudioManager._currentTrack = desired;
        const clip = await ResourceManager.loadBgm(desired);
        if (!clip || desired !== AudioManager._currentTrack || !AudioManager._bgmSource) return;
        AudioManager._bgmSource.stop();
        AudioManager._bgmSource.clip = clip;
        AudioManager._bgmSource.loop = true;
        AudioManager._bgmSource.volume = AudioManager.musicOn ? AudioManager.volume * 0.65 : 0;
        if (AudioManager.musicOn) {
            try {
                AudioManager._bgmSource.play();
            } catch {
                // Will start on first input
            }
        }
    }

    public static playSfx(kind: SfxKind): void {
        if (!AudioManager.sfxOn) return;
        AudioManager.unlockAudio();
        const ctx = AudioManager._ctx;
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const vol = Math.max(0.05, AudioManager.volume * 0.28);

            const tone = (
                freq0: number,
                freq1: number,
                dur: number,
                type: OscillatorType = 'triangle',
                delay: number = 0,
                gainScale: number = 1
            ) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq0, now + delay);
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), now + delay + dur);
                g.gain.setValueAtTime(vol * gainScale, now + delay);
                g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + dur + 0.01);
            };

            switch (kind) {
                case 'swing':
                    tone(320, 110, 0.11, 'sine', 0, 0.8);
                    break;
                case 'hit':
                    tone(190, 68, 0.09, 'triangle', 0, 1.0);
                    break;
                case 'crit':
                    tone(520, 160, 0.14, 'sawtooth', 0, 0.9);
                    tone(780, 320, 0.12, 'triangle', 0.03, 0.8);
                    break;
                case 'spell':
                    tone(420, 760, 0.18, 'sine', 0, 0.75);
                    break;
                case 'fire':
                    tone(260, 95, 0.22, 'sawtooth', 0, 0.7);
                    break;
                case 'ice':
                    tone(880, 1320, 0.16, 'sine', 0, 0.65);
                    break;
                case 'thunder':
                    tone(160, 48, 0.28, 'sawtooth', 0, 1.0);
                    tone(680, 140, 0.15, 'square', 0.02, 0.55);
                    break;
                case 'pickup':
                    tone(520, 820, 0.11, 'sine', 0, 0.65);
                    break;
                case 'coin':
                    tone(880, 1180, 0.09, 'sine', 0, 0.6);
                    tone(1180, 1560, 0.12, 'sine', 0.07, 0.6);
                    break;
                case 'meditate':
                    tone(330, 495, 0.35, 'sine', 0, 0.55);
                    break;
                case 'breakthrough':
                    tone(261, 523, 0.3, 'triangle', 0, 0.9);
                    tone(392, 784, 0.35, 'triangle', 0.12, 0.9);
                    tone(523, 1046, 0.55, 'sine', 0.25, 1.0);
                    break;
                case 'quest_complete':
                    tone(440, 554, 0.12, 'triangle', 0, 0.75);
                    tone(554, 659, 0.12, 'triangle', 0.1, 0.75);
                    tone(659, 880, 0.26, 'sine', 0.2, 0.85);
                    break;
                case 'portal':
                    tone(280, 620, 0.26, 'sine', 0, 0.7);
                    break;
                case 'hurt':
                    tone(150, 70, 0.14, 'sawtooth', 0, 0.75);
                    break;
                case 'deny':
                    tone(220, 155, 0.14, 'square', 0, 0.45);
                    break;
                case 'ui_click':
                    tone(640, 480, 0.045, 'sine', 0, 0.45);
                    break;
            }
        } catch {
            // Safe ignore
        }
    }
}
