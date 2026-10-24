import { sys } from 'cc';
import { ResourceManager } from './ResourceManager';

export const SAVE_CHAR_KEY = 'pntt_cocos_char_v2';
export const SAVE_PROG_KEY = 'pntt_cocos_prog_v2';

export type EquipSlot =
    | 'vu_khi'
    | 'ao'
    | 'giap'
    | 'mu'
    | 'giay'
    | 'nhan'
    | 'phap_boi'
    | 'phi_hanh'
    | 'hu_anh';

export interface CharacterConfig {
    name: string;
    gender: 'male' | 'female';
    skin: string;
    hair: string;
    hairColor: string;
    beard: string;
    eyeColor: string;
    outfit: string;
    shoes: string;
    hat: string;
    linhCan: string; // 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho' | 'loi' | 'bang' | 'phong'
}

export interface PlotState {
    seed: string;
    plantedAt: number;
    durMs: number;
    wet: boolean;
}

export interface QuestObjective {
    text: string;
    cur?: number;
    max?: number;
    done?: boolean;
}

export const LINH_CAN_LIST: Array<{ id: string; name: string; color: string; bonusDesc: string }> = [
    { id: 'kim', name: 'Kim Linh Căn', color: '#ffd970', bonusDesc: '+12% Công cơ bản & Xuyên giáp' },
    { id: 'moc', name: 'Mộc Linh Căn', color: '#7ee08f', bonusDesc: '+15% Khí Huyết & Hồi phục' },
    { id: 'thuy', name: 'Thủy Linh Căn', color: '#6ecbff', bonusDesc: '+18% Linh Lực & Hồi Linh Lực' },
    { id: 'hoa', name: 'Hỏa Linh Căn', color: '#ff7a59', bonusDesc: '+15% Uy lực Pháp Quyết' },
    { id: 'tho', name: 'Thổ Linh Căn', color: '#e0ad68', bonusDesc: '+20% Hộ Giáp & Giảm sát thương' },
    { id: 'loi', name: 'Lôi Dị Linh Căn', color: '#c996ff', bonusDesc: '+12% Pháp Quyết & +8% Tốc đánh' },
    { id: 'phong', name: 'Phong Dị Linh Căn', color: '#8ef5d8', bonusDesc: '+10% Tốc chạy & Giảm hồi chiêu' },
    { id: 'bang', name: 'Băng Dị Linh Căn', color: '#a8ecff', bonusDesc: '+10% Khống chế & Kháng hiệu ứng' },
];

export const BREW_RECIPES: Array<{
    id: string;
    name: string;
    resultId: string;
    minRealm?: string;
    note: string;
    ingredients: Array<{ id: string; qty: number }>;
}> = [
    {
        id: 'tay_tuy_thang',
        name: 'Tẩy Tuỷ Thang',
        resultId: 'tay_tuy_thang',
        note: 'Rửa sạch trọc khí phàm nhân, uống trên Đài Đá để khai mở Luyện Khí Tầng 1.',
        ingredients: [{ id: 'tay_ue_thao', qty: 3 }],
    },
    {
        id: 'tu_khi_duoc',
        name: 'Linh Dược Tụ Khí',
        resultId: 'tu_khi_duoc',
        note: 'Uống tại Đài Đá giúp Đạo Hạnh viên mãn lập tức ở Luyện Khí Tầng 1.',
        ingredients: [
            { id: 'linh_diep', qty: 2 },
            { id: 'huyet_thao', qty: 2 },
        ],
    },
    {
        id: 'tu_khi_dan',
        name: 'Tụ Khí Đan',
        resultId: 'tu_khi_dan',
        note: 'Đan dược đột phá Luyện Khí Tầng 2 lên 3 và Tầng 3 lên 4.',
        ingredients: [
            { id: 'linh_diep', qty: 3 },
            { id: 'huyet_thao', qty: 3 },
            { id: 'linh_thuy', qty: 2 },
        ],
    },
    {
        id: 'luyen_khi_dan',
        name: 'Luyện Khí Đan',
        resultId: 'luyen_khi_dan',
        minRealm: 'luyen_khi_4',
        note: 'Đan dược đột phá các cửa Luyện Khí Tầng 4 lên 7.',
        ingredients: [
            { id: 'linh_ngoc_diep', qty: 3 },
            { id: 'xich_duong_thao', qty: 3 },
            { id: 'linh_thuy', qty: 4 },
        ],
    },
    {
        id: 'pha_canh_dan',
        name: 'Phá Cảnh Đan',
        resultId: 'pha_canh_dan',
        minRealm: 'luyen_khi_7',
        note: 'Đan dược đột phá các cửa Luyện Khí Tầng 7 lên 13.',
        ingredients: [
            { id: 'bich_van_diep', qty: 3 },
            { id: 'long_huyet_thao', qty: 3 },
            { id: 'linh_thuy', qty: 5 },
        ],
    },
    {
        id: 'truc_co_dan',
        name: 'Trúc Cơ Đan',
        resultId: 'truc_co_dan',
        minRealm: 'luyen_khi_10',
        note: 'Chí bảo ngưng tụ Đạo Cơ - đột phá Luyện Khí Tầng 13 lên Trúc Cơ Sơ Kỳ!',
        ingredients: [
            { id: 'truc_co_thao', qty: 2 },
            { id: 'dia_linh_qua', qty: 1 },
            { id: 'yeu_dan_cap_3', qty: 1 },
        ],
    },
    {
        id: 'dan_ngu_hanh',
        name: 'Đan Ngũ Hành',
        resultId: 'dan_ngu_hanh',
        minRealm: 'truc_co_1',
        note: 'Linh đan Trúc Cơ hồi phục Khí Huyết, Linh Lực, Thần Thức liên tục.',
        ingredients: [
            { id: 'ngu_hanh_thao', qty: 1 },
            { id: 'yeu_dan_cap_1', qty: 5 },
            { id: 'yeu_dan_cap_2', qty: 2 },
        ],
    },
    {
        id: 'tay_tam_dan',
        name: 'Tẩy Tâm Đan',
        resultId: 'tay_tam_dan',
        note: 'Thanh lọc tâm ma, giảm Sát Nghiệp và nộp nhiệm vụ Tông Môn.',
        ingredients: [
            { id: 'phong_linh_thao', qty: 10 },
            { id: 'nam_linh_chi', qty: 5 },
        ],
    },
];

export const FARM_SEEDS: Array<{
    seed: string;
    crop: string;
    growSec: number;
    wetSec: number;
    name: string;
}> = [
    { seed: 'hat_linh_diep', crop: 'linh_diep', growSec: 45, wetSec: 15, name: 'Hạt Linh Diệp' },
    { seed: 'hat_huyet_thao', crop: 'huyet_thao', growSec: 45, wetSec: 15, name: 'Hạt Huyết Thảo' },
    { seed: 'hat_thanh_tam', crop: 'thanh_tam_hoa', growSec: 50, wetSec: 18, name: 'Hạt Thanh Tâm Hoa' },
    { seed: 'hat_linh_ngoc', crop: 'linh_ngoc_diep', growSec: 75, wetSec: 25, name: 'Hạt Linh Ngọc Diệp' },
    { seed: 'hat_xich_duong', crop: 'xich_duong_thao', growSec: 75, wetSec: 25, name: 'Hạt Xích Dương Thảo' },
    { seed: 'hat_bich_van', crop: 'bich_van_diep', growSec: 90, wetSec: 30, name: 'Hạt Bích Vân Diệp' },
    { seed: 'hat_long_huyet', crop: 'long_huyet_thao', growSec: 90, wetSec: 30, name: 'Hạt Long Huyết Thảo' },
    { seed: 'hat_truc_co_thao', crop: 'truc_co_thao', growSec: 120, wetSec: 40, name: 'Hạt Trúc Cơ Thảo' },
    { seed: 'hat_dia_linh_qua', crop: 'dia_linh_qua', growSec: 120, wetSec: 40, name: 'Hạt Địa Linh Quả' },
    { seed: 'hat_ngu_hanh_thao', crop: 'ngu_hanh_thao', growSec: 150, wetSec: 50, name: 'Hạt Ngũ Hành Thảo' },
];

export const QUEST_STAGE_META: Array<{ name: string; hint: string; mapId: string; targetIds?: string[]; turnInNpc?: string }> = [
    { name: 'Nhập Môn - Chưa Có Duyên Pháp', hint: 'Đọc Bia Đá Cổ Tự bên lối mòn phía nam hoặc hỏi Thầy Ông Nội.', mapId: 'tan_vien', targetIds: ['bia_da', 'su_phu'] },
    { name: 'Giai đoạn 1 - Lĩnh Ngộ Cổ Pháp', hint: 'Đọc Bia Đá Cổ Tự hoặc hỏi Thầy Ông Nội về Đạo Dẫn thuật.', mapId: 'tan_vien', targetIds: ['bia_da', 'su_phu'] },
    { name: 'Giai đoạn 2 - Hái Tẩy Uế Thảo', hint: 'Hái 3 ngọn Tẩy Uế Thảo mọc ven suối làng Tản Viên.', mapId: 'tan_vien', targetIds: ['thao_1', 'thao_2', 'thao_3', 'thao_4', 'thao_5'] },
    { name: 'Giai đoạn 3 - Sắc Tẩy Tuỷ Thang', hint: 'Tới Đan Lô Cũ trong sân nhà tranh, chọn sắc Tẩy Tuỷ Thang.', mapId: 'tan_vien', targetIds: ['dan_lo'] },
    { name: 'Giai đoạn 4 - Tẩy Uế Thể Xác', hint: 'Ra Đài Đá bên suối (hoặc bấm Đột Phá) để Tẩy Tuỷ lên Luyện Khí Tầng 1!', mapId: 'tan_vien', targetIds: ['dai_da', 'linh_tuyen'] },
    { name: 'Giai đoạn 5 - Dọn Yêu Thú Rừng Trúc', hint: 'Xuống Rừng Trúc gặp Huấn Sư Huynh nhận Trúc Kiếm, diệt 5 Bọ Ngựa / Sơn Chuột.', mapId: 'thanh_truc_lam', targetIds: ['ly_thanh'] },
    { name: 'Giai đoạn 6 - Tuần Tra Rừng Trúc', hint: 'Diệt thêm 5 yêu thú, nhặt 3 manh mối phát sáng quanh rừng, rồi báo Huấn Sư Huynh.', mapId: 'thanh_truc_lam', targetIds: ['clue_1', 'clue_2', 'clue_3', 'ly_thanh'], turnInNpc: 'ly_thanh' },
    { name: 'Giai đoạn 7 - Bái Kiến Đại Phu', hint: 'Theo lối nam Rừng Trúc xuống Thảo Dược Cốc gặp Đại Phu nhận hạt giống.', mapId: 'duoc_vien', targetIds: ['dai_phu'] },
    { name: 'Giai đoạn 8 - Trồng Linh Thảo', hint: 'Vào Vườn Cá Nhân gieo hạt, tưới nước và thu hái 5 Linh Diệp + 5 Huyết Thảo.', mapId: 'vuon_ca_nhan', targetIds: ['plot_1', 'plot_2', 'plot_3'] },
    { name: 'Giai đoạn 9 - Sắc Linh Dược', hint: 'Tới Đan Lô sắc 1 chén Linh Dược Tụ Khí (2 Linh Diệp + 2 Huyết Thảo).', mapId: 'vuon_ca_nhan', targetIds: ['dan_lo_vuon', 'dan_lo'] },
    { name: 'Giai đoạn 10 - Dùng Dược Phá Quan', hint: 'Uống Linh Dược Tụ Khí và Đột Phá lên Luyện Khí Tầng 2!', mapId: 'vuon_ca_nhan', targetIds: ['dai_da_duoc', 'dai_da'] },
    { name: 'Giai đoạn 11 - Dược Viên Có Khách Lạ', hint: 'Hạ Dược Linh Thú trong Vườn Cá Nhân thu thập 2 giọt Linh Thúy.', mapId: 'vuon_ca_nhan' },
    { name: 'Giai đoạn 12 - Luyện Tụ Khí Đan', hint: 'Luyện 1 viên Tụ Khí Đan tại Đan Lô (3 Linh Diệp, 3 Huyết Thảo, 2 Linh Thúy).', mapId: 'vuon_ca_nhan', targetIds: ['dan_lo_vuon', 'dan_lo'] },
    { name: 'Giai đoạn 13 - Đột Phá Luyện Khí Tầng 3', hint: 'Tích đầy Đạo Hạnh, dùng Tụ Khí Đan đột phá lên Tầng 3 rồi báo Đại Phu.', mapId: 'duoc_vien', targetIds: ['dai_phu'], turnInNpc: 'dai_phu' },
    { name: 'Giai đoạn 14 - Duyên Pháp Bí Tịch', hint: 'Nhận Binh Khí từ Đại Phu, lên Tầng 4, đeo Phi Diệp, tìm 2 mảnh Bí Tịch ở Miếu Hoang về giao Tàng Kinh Lão Nhân.', mapId: 'mieu_hoang', targetIds: ['manh_bi_tich_thuong', 'tang_kinh_lao_nhan'] },
    { name: 'Giai đoạn 15 - Yêu Cốt Miếu Hoang', hint: 'Dùng pháp quyết mới hạ Yêu Quái ở Miếu Hoang gom 10 Yêu Cốt Vụn giao Tàng Kinh Lão Nhân.', mapId: 'mieu_hoang', turnInNpc: 'tang_kinh_lao_nhan' },
    { name: 'Giai đoạn 16 - Độc Đằng & Linh Ngư', hint: 'Hạ Độc Đằng Yêu ở Thảo Dược Cốc gom 10 Độc Dịch và câu 1 Linh Ngư giao Đại Phu.', mapId: 'duoc_vien', targetIds: ['dai_phu'], turnInNpc: 'dai_phu' },
    { name: 'Giai đoạn 17 - Hỏi Đạo và Tàng Kinh Các', hint: 'Hỏi Đạo 5 câu với Thầy Ông Nội (+300 Linh Thạch) rồi rút 1 Bí Tịch ở Tàng Kinh Lão Nhân.', mapId: 'tan_vien', targetIds: ['su_phu', 'tang_kinh_lao_nhan'] },
    { name: 'Giai đoạn 18 - Cửa Quan Tầng 5 & 6', hint: 'Tu luyện và dùng Luyện Khí Đan đột phá lên Luyện Khí Tầng 6.', mapId: 'duoc_vien', targetIds: ['dai_phu'] },
    { name: 'Giai đoạn 19 - Chiến Bảng & Phong Linh Thảo', hint: 'Hái 10 Phong Linh Thảo ở Bãi Đá Hang Gió và 5 Nấm Linh Chi quanh làng.', mapId: 'bai_da_hang_gio' },
    { name: 'Giai đoạn 20 - Hang Động & Rèn Binh Khí', hint: 'Đạt Tầng 7, vào Hang Động Cổ kiếm 2 Huyền Thiết Khoáng rồi về Thợ Rèn rèn vũ khí.', mapId: 'hang_dong_co', targetIds: ['tho_ren'] },
    { name: 'Giai đoạn 21 - Thử Lửa Đạo Tâm', hint: 'Khiêu chiến Boss bí cảnh hoặc dự Đại Hội Tu Tiên ở Chấp Sự Đại Hội.', mapId: 'mieu_hoang', targetIds: ['nu_tu_mieu_hoang', 'chap_su_dai_hoi'] },
    { name: 'Giai đoạn 22 - Tầng 10 & Thỉnh Giáo Đại Phu', hint: 'Đột phá Luyện Khí Tầng 10 và tỷ thí thắng Đại Phu tại Thảo Dược Cốc.', mapId: 'duoc_vien', targetIds: ['dai_phu'] },
    { name: 'Giai đoạn 23 - Hạ Thần Thú Xích Long', hint: 'Tiến vào Long Uyên Cốc hạ Thần Thú Xích Long rồi về báo Thợ Rèn.', mapId: 'long_uyen', turnInNpc: 'tho_ren' },
    { name: 'Giai đoạn 24 - Khai Mở Trúc Cơ!', hint: 'Luyện Trúc Cơ Đan, đột phá lên Trúc Cơ Sơ Kỳ khai mở Linh Căn & Quang Hoàn!', mapId: 'tan_vien', targetIds: ['dan_lo', 'dai_da'] },
];

export class GameState {
    public static hasCharacter: boolean = false;
    public static char: CharacterConfig = {
        name: 'tieututien',
        gender: 'male',
        skin: 'light',
        hair: 'dao_ke',
        hairColor: 'hac',
        beard: 'none',
        eyeColor: 'brown',
        outfit: 'bach_y',
        shoes: 'cloth',
        hat: 'straw',
        linhCan: 'kim',
    };

    public static currentMapId: string = 'tan_vien';
    public static savedPos: { x: number; y: number } | null = null;

    public static realmId: string = 'pham_nhan';
    public static exp: number = 0;
    public static hp: number = 100;
    public static mp: number = 0;
    public static sp: number = 20;
    public static bp: number = 40;

    public static stones: number = 200; // Linh Thạch khởi đầu thuận tiện trải nghiệm
    public static duocCong: number = 0;
    public static sectName: string = '';

    public static bag: Record<string, number> = {};
    public static equipment: Partial<Record<EquipSlot, string>> = {};
    public static learnedActives: string[] = [];
    public static learnedPassives: string[] = [];
    public static equippedPassives: string[] = [];
    public static hotbar: Array<string | null> = [null, null, null, null, null, null, null, null];
    public static quickslots: Array<string | null> = [null, null, null, null];

    public static questStage: number = 0;
    public static questFlags: Record<string, any> = {};
    public static questKills: number = 0;
    public static patrolKills: number = 0;
    public static harvested: Record<string, number> = {}; // propId -> regrowAt timestamp ms
    public static plots: Record<string, PlotState> = {};
    public static activeFood: { id: string; until: number } | null = null;

    // Computed combat stats
    public static hpMax: number = 100;
    public static mpMax: number = 0;
    public static spMax: number = 20;
    public static bpMax: number = 40;
    public static expMax: number = 0;
    public static atk: number = 1;
    public static skillPower: number = 2;
    public static moveSpeedBonus: number = 0;

    public static load(): boolean {
        try {
            const rawChar = sys.localStorage.getItem(SAVE_CHAR_KEY);
            const rawProg = sys.localStorage.getItem(SAVE_PROG_KEY);
            if (!rawChar) {
                GameState.hasCharacter = false;
                return false;
            }
            const parsedChar = JSON.parse(rawChar);
            GameState.char = { ...GameState.char, ...parsedChar };
            GameState.hasCharacter = true;

            if (rawProg) {
                const p = JSON.parse(rawProg);
                GameState.currentMapId = p.currentMapId || 'tan_vien';
                GameState.savedPos = p.savedPos || null;
                GameState.realmId = p.realmId || 'pham_nhan';
                GameState.exp = Number(p.exp) || 0;
                GameState.stones = Number(p.stones ?? 200);
                GameState.duocCong = Number(p.duocCong) || 0;
                GameState.sectName = p.sectName || '';
                GameState.bag = p.bag || {};
                GameState.equipment = p.equipment || {};
                GameState.learnedActives = Array.isArray(p.learnedActives) ? p.learnedActives : [];
                GameState.learnedPassives = Array.isArray(p.learnedPassives) ? p.learnedPassives : [];
                GameState.equippedPassives = Array.isArray(p.equippedPassives) ? p.equippedPassives : [];
                if (Array.isArray(p.hotbar) && p.hotbar.length === 8) GameState.hotbar = p.hotbar;
                if (Array.isArray(p.quickslots) && p.quickslots.length === 4) GameState.quickslots = p.quickslots;
                GameState.questStage = Number(p.questStage) || 0;
                GameState.questFlags = p.questFlags || {};
                GameState.questKills = Number(p.questKills) || 0;
                GameState.patrolKills = Number(p.patrolKills) || 0;
                GameState.harvested = p.harvested || {};
                GameState.plots = p.plots || {};
                GameState.activeFood = p.activeFood || null;
                GameState.recalcStats(false);
                GameState.hp = Math.min(GameState.hpMax, Math.max(1, Number(p.hp ?? GameState.hpMax)));
                GameState.mp = Math.min(GameState.mpMax, Math.max(0, Number(p.mp ?? GameState.mpMax)));
                GameState.sp = Math.min(GameState.spMax, Math.max(0, Number(p.sp ?? GameState.spMax)));
                GameState.bp = Math.min(GameState.bpMax, Math.max(0, Number(p.bp ?? GameState.bpMax)));
            } else {
                GameState.recalcStats(true);
            }
            return true;
        } catch {
            GameState.hasCharacter = false;
            return false;
        }
    }

    public static createNewCharacter(cfg: CharacterConfig): void {
        GameState.char = { ...cfg };
        GameState.hasCharacter = true;
        GameState.currentMapId = 'tan_vien';
        GameState.savedPos = null;
        GameState.realmId = 'pham_nhan';
        GameState.exp = 0;
        GameState.stones = 250;
        GameState.duocCong = 0;
        GameState.sectName = '';
        GameState.bag = {};
        GameState.equipment = {};
        GameState.learnedActives = [];
        GameState.learnedPassives = [];
        GameState.equippedPassives = [];
        GameState.hotbar = [null, null, null, null, null, null, null, null];
        GameState.quickslots = ['bat_com_linh_me', 'phu_thanh_tam', 'phu_toc_hanh', null];
        GameState.questStage = 1;
        GameState.questFlags = {};
        GameState.questKills = 0;
        GameState.patrolKills = 0;
        GameState.harvested = {};
        GameState.plots = {};
        GameState.activeFood = null;

        // Starter outfit + straw hat + starter supplies
        const startOutfit = cfg.outfit || 'bach_y';
        if (ResourceManager.items[startOutfit]) {
            GameState.bag[startOutfit] = 1;
            GameState.equipment.ao = startOutfit;
        }
        if (cfg.hat === 'straw' && ResourceManager.items['non_la']) {
            GameState.bag['non_la'] = 1;
            GameState.equipment.mu = 'non_la';
        }
        GameState.addItem('bat_com_linh_me', 2);
        GameState.addItem('phu_thanh_tam', 2);
        GameState.addItem('phu_toc_hanh', 1);

        GameState.recalcStats(true);
        GameState.save();
    }

    public static save(): void {
        if (!GameState.hasCharacter) return;
        try {
            sys.localStorage.setItem(SAVE_CHAR_KEY, JSON.stringify(GameState.char));
            sys.localStorage.setItem(
                SAVE_PROG_KEY,
                JSON.stringify({
                    currentMapId: GameState.currentMapId,
                    savedPos: GameState.savedPos,
                    realmId: GameState.realmId,
                    exp: GameState.exp,
                    hp: Math.round(GameState.hp),
                    mp: Math.round(GameState.mp),
                    sp: Math.round(GameState.sp),
                    bp: Math.round(GameState.bp),
                    stones: GameState.stones,
                    duocCong: GameState.duocCong,
                    sectName: GameState.sectName,
                    bag: GameState.bag,
                    equipment: GameState.equipment,
                    learnedActives: GameState.learnedActives,
                    learnedPassives: GameState.learnedPassives,
                    equippedPassives: GameState.equippedPassives,
                    hotbar: GameState.hotbar,
                    quickslots: GameState.quickslots,
                    questStage: GameState.questStage,
                    questFlags: GameState.questFlags,
                    questKills: GameState.questKills,
                    patrolKills: GameState.patrolKills,
                    harvested: GameState.harvested,
                    plots: GameState.plots,
                    activeFood: GameState.activeFood,
                })
            );
        } catch {
            // Safe ignore quota error
        }
    }

    public static realmIndex(id: string = GameState.realmId): number {
        const idx = ResourceManager.realms.findIndex((r) => r.id === id);
        return idx >= 0 ? idx : 0;
    }

    public static realmDef(id: string = GameState.realmId): any {
        return ResourceManager.realms.find((r) => r.id === id) || ResourceManager.realms[0] || {
            id: 'pham_nhan',
            name: 'Phàm Nhân',
            sub: 'Thân thể trọc khí',
            hpMax: 100,
            mpMax: 0,
            spMax: 20,
            bpMax: 40,
            expMax: 0,
            canMeditate: false,
        };
    }

    public static nextRealmDef(): any | null {
        const idx = GameState.realmIndex();
        return ResourceManager.realms[idx + 1] || null;
    }

    public static baseAttackForRealm(realmId: string = GameState.realmId): number {
        const idx = GameState.realmIndex(realmId);
        if (idx <= 3) return 1;
        if (idx <= 6) return 2;
        if (idx <= 9) return 3;
        if (idx <= 13) return 4;
        return 5 + (idx - 14);
    }

    public static skillPowerForRealm(realmId: string = GameState.realmId): number {
        const idx = GameState.realmIndex(realmId);
        if (idx === 0) return 2;
        if (idx <= 13) return 2 + idx;
        return 18 + (idx - 14) * 3;
    }

    public static meditateMult(realmId: string = GameState.realmId): number {
        const idx = GameState.realmIndex(realmId);
        if (idx >= 15) return 3;
        if (idx >= 14) return 2;
        return 1;
    }

    public static recalcStats(refillVitals: boolean = false): void {
        const r = GameState.realmDef();
        let hpB = 0;
        let mpB = 0;
        let spB = 0;
        let bpB = 0;
        let atkB = 0;
        let spdB = 0;

        for (const slotKey of Object.keys(GameState.equipment) as EquipSlot[]) {
            const itemId = GameState.equipment[slotKey];
            if (!itemId) continue;
            const it = ResourceManager.items[itemId];
            if (!it) continue;
            hpB += Number(it.hpBonus || 0);
            mpB += Number(it.mpBonus || 0);
            spB += Number(it.spBonus || 0);
            bpB += Number(it.bpBonus || 0);
            atkB += Number(it.damage ?? it.atkBonus ?? 0);
            spdB += Number(it.moveSpeedBonus || 0);
        }

        // Passive skills bonuses
        for (const pid of GameState.equippedPassives) {
            const pd = ResourceManager.passiveSkills[pid];
            if (!pd) continue;
            hpB += Number(pd.hpBonus || 0);
            mpB += Number(pd.mpBonus || 0);
            spB += Number(pd.spBonus || 0);
            bpB += Number(pd.bpBonus || 0);
            atkB += Number(pd.atkBonus || 0);
            spdB += Number(pd.moveBonus || 0);
        }

        const lc = GameState.char.linhCan;
        const hasLc = GameState.realmIndex() >= GameState.realmIndex('luyen_khi_1');
        const hpMult = hasLc && lc === 'moc' ? 1.15 : 1.0;
        const mpMult = hasLc && lc === 'thuy' ? 1.18 : 1.0;
        const bpMult = hasLc && lc === 'tho' ? 1.2 : 1.0;
        const atkMult = hasLc && lc === 'kim' ? 1.12 : 1.0;
        const spwrMult = hasLc && (lc === 'hoa' ? 1.15 : lc === 'loi' ? 1.12 : 1.0);
        if (hasLc && lc === 'phong') spdB += 0.1;

        GameState.hpMax = Math.max(10, Math.round(((r.hpMax || 100) + hpB) * hpMult));
        GameState.mpMax = Math.max(0, Math.round(((r.mpMax || 0) + mpB) * mpMult));
        GameState.spMax = Math.max(10, Math.round((r.spMax || 20) + spB));
        GameState.bpMax = Math.max(0, Math.round(((r.bpMax || 40) + bpB) * bpMult));
        GameState.expMax = Number(r.expMax || 0);
        GameState.atk = Math.max(1, Math.round((GameState.baseAttackForRealm() + atkB) * atkMult));
        GameState.skillPower = Math.max(2, Math.round(GameState.skillPowerForRealm() * spwrMult));
        GameState.moveSpeedBonus = spdB;

        if (refillVitals) {
            GameState.hp = GameState.hpMax;
            GameState.mp = GameState.mpMax;
            GameState.sp = GameState.spMax;
            GameState.bp = GameState.bpMax;
        } else {
            GameState.hp = Math.min(GameState.hpMax, GameState.hp);
            GameState.mp = Math.min(GameState.mpMax, GameState.mp);
            GameState.sp = Math.min(GameState.spMax, GameState.sp);
            GameState.bp = Math.min(GameState.bpMax, GameState.bp);
        }
    }

    public static countItem(itemId: string): number {
        return Math.max(0, Math.floor(GameState.bag[itemId] || 0));
    }

    public static hasItem(itemId: string, qty: number = 1): boolean {
        return GameState.countItem(itemId) >= qty;
    }

    public static addItem(itemId: string, qty: number = 1): void {
        if (!itemId || qty <= 0) return;
        GameState.bag[itemId] = GameState.countItem(itemId) + Math.floor(qty);
        GameState.checkQuestAutoAdvance();
        GameState.save();
    }

    public static removeItem(itemId: string, qty: number = 1): boolean {
        const cur = GameState.countItem(itemId);
        if (cur < qty) return false;
        const left = cur - Math.floor(qty);
        if (left <= 0) delete GameState.bag[itemId];
        else GameState.bag[itemId] = left;
        GameState.save();
        return true;
    }

    public static addStones(amount: number): void {
        GameState.stones = Math.max(0, GameState.stones + Math.round(amount));
        GameState.save();
    }

    public static spendStones(amount: number): boolean {
        const cost = Math.round(amount);
        if (GameState.stones < cost) return false;
        GameState.stones -= cost;
        GameState.save();
        return true;
    }

    public static addExp(amount: number): { gained: number; fullNow: boolean } {
        if (GameState.expMax <= 0 || amount <= 0) return { gained: 0, fullNow: false };
        const before = GameState.exp;
        GameState.exp = Math.min(GameState.expMax, GameState.exp + amount);
        const gained = GameState.exp - before;
        const fullNow = before < GameState.expMax && GameState.exp >= GameState.expMax;
        GameState.save();
        return { gained, fullNow };
    }

    public static getVisualOutfit(): string {
        const eqAo = GameState.equipment.ao;
        if (eqAo && ResourceManager.items[eqAo]?.outfitArt) {
            return ResourceManager.items[eqAo].outfitArt;
        }
        if (eqAo) return eqAo;
        return GameState.char.outfit || 'bach_y';
    }

    public static detectEquipSlot(itemId: string): EquipSlot | null {
        const it = ResourceManager.items[itemId];
        if (!it) return null;
        if (it.slot) return it.slot as EquipSlot;
        if (it.type === 'vu_khi') return 'vu_khi';
        if (it.type === 'trang_phuc' || it.outfitArt) return 'ao';
        if (it.fly) return 'phi_hanh';
        if (it.hatArt) return 'mu';
        return null;
    }

    public static equipItem(itemId: string): { ok: boolean; msg: string } {
        const it = ResourceManager.items[itemId];
        if (!it) return { ok: false, msg: 'Vật phẩm không tồn tại.' };
        const slot = GameState.detectEquipSlot(itemId);
        if (!slot) return { ok: false, msg: 'Vật phẩm này không phải trang bị.' };
        if (it.requireRealm && GameState.realmIndex() < GameState.realmIndex(it.requireRealm)) {
            const reqR = GameState.realmDef(it.requireRealm);
            return { ok: false, msg: `Cần đạt cảnh giới ${reqR.name} mới trang bị được.` };
        }
        if (!GameState.hasItem(itemId, 1)) {
            return { ok: false, msg: 'Không có trong túi đồ.' };
        }

        const prev = GameState.equipment[slot];
        GameState.removeItem(itemId, 1);
        if (prev) {
            GameState.bag[prev] = GameState.countItem(prev) + 1;
        }
        GameState.equipment[slot] = itemId;

        if (slot === 'phi_hanh' && itemId === 'phi_diep') {
            GameState.questFlags.da_trang_bi_phi_diep = true;
        }
        if (slot === 'vu_khi' && itemId === 'truc_kiem') {
            GameState.questFlags.da_trang_bi_truc_kiem = true;
        }
        GameState.recalcStats(false);
        GameState.checkQuestAutoAdvance();
        GameState.save();
        return { ok: true, msg: `Đã trang bị ${it.name}!` };
    }

    public static unequipSlot(slot: EquipSlot): boolean {
        const cur = GameState.equipment[slot];
        if (!cur) return false;
        delete GameState.equipment[slot];
        GameState.bag[cur] = GameState.countItem(cur) + 1;
        GameState.recalcStats(false);
        GameState.save();
        return true;
    }

    public static findSkillByBook(bookItemId: string): { kind: 'active' | 'passive'; def: any } | null {
        for (const k of Object.keys(ResourceManager.activeSkills)) {
            const s = ResourceManager.activeSkills[k];
            if (s.book === bookItemId) return { kind: 'active', def: s };
        }
        for (const k of Object.keys(ResourceManager.passiveSkills)) {
            const s = ResourceManager.passiveSkills[k];
            if (s.book === bookItemId) return { kind: 'passive', def: s };
        }
        return null;
    }

    public static useBagItem(itemId: string): { ok: boolean; msg: string; triggerAction?: string } {
        const it = ResourceManager.items[itemId];
        if (!it || !GameState.hasItem(itemId, 1)) {
            return { ok: false, msg: 'Không còn vật phẩm này.' };
        }

        // 1. Check if equipment
        if (GameState.detectEquipSlot(itemId)) {
            return GameState.equipItem(itemId);
        }

        // 2. Check if Skill Manual (Bí Tịch)
        const sk = GameState.findSkillByBook(itemId);
        if (sk) {
            if (sk.kind === 'active') {
                if (GameState.learnedActives.includes(sk.def.id)) {
                    return { ok: false, msg: `Đã lĩnh ngộ ${sk.def.name} rồi.` };
                }
                GameState.removeItem(itemId, 1);
                GameState.learnedActives.push(sk.def.id);
                const emptyIdx = GameState.hotbar.findIndex((s) => !s);
                if (emptyIdx >= 0) GameState.hotbar[emptyIdx] = sk.def.id;
                GameState.save();
                return { ok: true, msg: `Lĩnh ngộ pháp quyết: ${sk.def.name}!` };
            } else {
                if (GameState.learnedPassives.includes(sk.def.id)) {
                    return { ok: false, msg: `Đã lĩnh ngộ tâm pháp ${sk.def.name} rồi.` };
                }
                GameState.removeItem(itemId, 1);
                GameState.learnedPassives.push(sk.def.id);
                if (GameState.equippedPassives.length < 5) {
                    GameState.equippedPassives.push(sk.def.id);
                }
                GameState.recalcStats(false);
                GameState.save();
                return { ok: true, msg: `Lĩnh ngộ tâm pháp bị động: ${sk.def.name}!` };
            }
        }

        if (itemId === 'bi_tich_dan_linh') {
            if (GameState.questFlags.learned_dan_linh) {
                return { ok: false, msg: 'Đã lĩnh ngộ Dẫn Linh Quyết rồi.' };
            }
            GameState.removeItem(itemId, 1);
            GameState.questFlags.learned_dan_linh = true;
            GameState.save();
            return { ok: true, msg: 'Đã lĩnh ngộ Dẫn Linh Quyết - tự động hồi Linh Lực mỗi giây!' };
        }

        // 3. Special quest consumables
        if (itemId === 'tay_tuy_thang') {
            if (GameState.realmId === 'pham_nhan') {
                return { ok: true, msg: 'Bắt đầu Tẩy Tuỷ Phạt Mao!', triggerAction: 'ritual_tay_tuy' };
            }
            GameState.removeItem(itemId, 1);
            GameState.hp = GameState.hpMax;
            return { ok: true, msg: 'Đã uống Tẩy Tuỷ Thang, hồi đầy Khí Huyết.' };
        }

        if (itemId === 'tu_khi_duoc') {
            GameState.removeItem(itemId, 1);
            GameState.exp = Math.max(GameState.exp, GameState.expMax || 150);
            GameState.questFlags.dung_tu_khi_duoc = true;
            GameState.checkQuestAutoAdvance();
            GameState.save();
            return { ok: true, msg: 'Dược lực dâng trào - Đạo Hạnh đã VIÊN MÃN! Hãy bấm Đột Phá!' };
        }

        // 4. Food items
        if (it.food) {
            if (it.food.minRealm && GameState.realmIndex() < GameState.realmIndex(it.food.minRealm)) {
                return { ok: false, msg: `Cần đạt ${GameState.realmDef(it.food.minRealm).name} mới dùng được.` };
            }
            GameState.removeItem(itemId, 1);
            const durMs = (it.food.hours || 2) * 3600 * 1000;
            GameState.activeFood = { id: itemId, until: Date.now() + durMs };
            if (itemId === 'dan_ngu_hanh') GameState.questFlags.dung_dan_ngu_hanh = true;
            GameState.hp = Math.min(GameState.hpMax, GameState.hp + Math.round(GameState.hpMax * 0.25));
            GameState.mp = Math.min(GameState.mpMax, GameState.mp + Math.round(GameState.mpMax * 0.25));
            GameState.checkQuestAutoAdvance();
            GameState.save();
            return { ok: true, msg: `Đã dùng ${it.name} - hồi phục liên tục trong ${it.food.hours || 2} giờ!` };
        }

        // 5. Talismans / Recovery pills
        if (itemId === 'phu_thanh_tam') {
            GameState.removeItem(itemId, 1);
            GameState.mp = Math.min(GameState.mpMax, GameState.mp + 60);
            GameState.sp = Math.min(GameState.spMax, GameState.sp + 15);
            GameState.save();
            return { ok: true, msg: 'Thanh Tâm Phù: +60 Linh Lực, +15 Thần Thức!' };
        }
        if (itemId === 'phu_toc_hanh') {
            GameState.removeItem(itemId, 1);
            GameState.save();
            return { ok: true, msg: 'Tốc Hành Phù: Thân nhẹ như gió (+35% tốc chạy 10s)!', triggerAction: 'buff_haste' };
        }
        if (itemId === 'phu_kim_giap') {
            GameState.removeItem(itemId, 1);
            GameState.bp = GameState.bpMax;
            GameState.save();
            return { ok: true, msg: 'Kim Giáp Phù: Hồi đầy Hộ Giáp + Hộ Thuẫn Kim Quang!', triggerAction: 'buff_shield' };
        }
        if (itemId === 'phu_hoa' || itemId === 'hoa_phu') {
            GameState.removeItem(itemId, 1);
            GameState.save();
            return { ok: true, msg: 'Khai triển Hỏa Phù!', triggerAction: 'cast_talisman_fire' };
        }

        // Breakthrough pills clicked directly -> guide to breakthrough
        if (['tu_khi_dan', 'luyen_khi_dan', 'pha_canh_dan', 'truc_co_dan', 'ngung_nguyen_dan', 'dinh_co_dan'].includes(itemId)) {
            return { ok: true, msg: 'Mở kiểm tra Phá Quan Đột Phá!', triggerAction: 'try_breakthrough' };
        }

        // Generic herb / consumable small heal
        if (it.type === 'dan_duoc' || it.type === 'duoc_lieu') {
            GameState.removeItem(itemId, 1);
            const heal = Math.max(15, Math.round(GameState.hpMax * 0.18));
            GameState.hp = Math.min(GameState.hpMax, GameState.hp + heal);
            GameState.mp = Math.min(GameState.mpMax, GameState.mp + 20);
            GameState.save();
            return { ok: true, msg: `Đã dùng ${it.name}: hồi +${heal} Khí Huyết!` };
        }

        return { ok: false, msg: `${it.name} là nguyên liệu chế tạo / nhiệm vụ.` };
    }

    public static checkBreakthrough(): {
        canBreak: boolean;
        isRitual: boolean;
        nextRealm: any | null;
        reqItem: string | null;
        reqQty: number;
        reason: string;
    } {
        const next = GameState.nextRealmDef();
        if (!next) {
            return { canBreak: false, isRitual: false, nextRealm: null, reqItem: null, reqQty: 0, reason: 'Đã đạt đỉnh phong cảnh giới hiện tại!' };
        }
        if (GameState.realmId === 'pham_nhan') {
            const hasSoup = GameState.hasItem('tay_tuy_thang', 1);
            return {
                canBreak: hasSoup,
                isRitual: true,
                nextRealm: next,
                reqItem: 'tay_tuy_thang',
                reqQty: 1,
                reason: hasSoup
                    ? 'Đã có Tẩy Tuỷ Thang - sẵn sàng Tẩy Tuỷ Phạt Mao lên Luyện Khí Tầng 1!'
                    : 'Cần 1 bát Tẩy Tuỷ Thang (hái 3 Tẩy Uế Thảo ven suối rồi sắc ở Đan Lô).',
            };
        }

        if (GameState.exp < GameState.expMax) {
            return {
                canBreak: false,
                isRitual: false,
                nextRealm: next,
                reqItem: null,
                reqQty: 0,
                reason: `Đạo Hạnh chưa viên mãn (${Math.floor(GameState.exp)}/${GameState.expMax}). Hãy Đả Tọa [Q] hoặc săn yêu thú!`,
            };
        }

        const rules = ResourceManager.gameplaySystems?.breakthroughRules || {};
        const rule = rules[GameState.realmId];
        if (rule?.item) {
            const qty = rule.qty || 1;
            const have = GameState.countItem(rule.item);
            const itemName = ResourceManager.items[rule.item]?.name || rule.item;
            if (have < qty) {
                return {
                    canBreak: false,
                    isRitual: false,
                    nextRealm: next,
                    reqItem: rule.item,
                    reqQty: qty,
                    reason: `Cần ${qty} ${itemName} (hiện có ${have}/${qty}) để phá quan lên ${next.name}.`,
                };
            }
            return {
                canBreak: true,
                isRitual: false,
                nextRealm: next,
                reqItem: rule.item,
                reqQty: qty,
                reason: `Đủ Đạo Hạnh & ${itemName} - sẵn sàng đột phá ${next.name}!`,
            };
        }

        return {
            canBreak: true,
            isRitual: false,
            nextRealm: next,
            reqItem: null,
            reqQty: 0,
            reason: `Đạo Hạnh đã viên mãn - sẵn sàng phá quan lên ${next.name}!`,
        };
    }

    public static performBreakthrough(): { ok: boolean; newRealm: any | null; msg: string } {
        const chk = GameState.checkBreakthrough();
        if (!chk.canBreak || !chk.nextRealm) {
            return { ok: false, newRealm: null, msg: chk.reason };
        }
        if (chk.reqItem && chk.reqQty > 0) {
            GameState.removeItem(chk.reqItem, chk.reqQty);
        }
        GameState.realmId = chk.nextRealm.id;
        GameState.exp = 0;
        if (GameState.realmId === 'luyen_khi_1') {
            GameState.questFlags.tay_tuy_xong = true;
        }
        GameState.recalcStats(true);
        GameState.checkQuestAutoAdvance();
        GameState.save();
        return {
            ok: true,
            newRealm: chk.nextRealm,
            msg: `Đột phá thành công lên ${chk.nextRealm.name}! Toàn bộ Khí Huyết & Linh Lực đã đại tăng!`,
        };
    }

    // ================= QUEST SYSTEM =================
    public static getQuestMeta(): { stage: number; name: string; hint: string; objectives: QuestObjective[]; mapId: string; targetIds?: string[] } {
        const st = Math.max(0, Math.min(QUEST_STAGE_META.length - 1, GameState.questStage));
        const meta = QUEST_STAGE_META[st] || QUEST_STAGE_META[0];
        const objs = GameState.getQuestObjectives(GameState.questStage);
        return {
            stage: GameState.questStage,
            name: meta.name,
            hint: meta.hint,
            objectives: objs,
            mapId: meta.mapId,
            targetIds: meta.targetIds,
        };
    }

    public static getQuestObjectives(stage: number): QuestObjective[] {
        const rIdx = GameState.realmIndex();
        switch (stage) {
            case 0:
            case 1:
                return [{ text: 'Đọc Bia Đá Cổ Tự hoặc hỏi Thầy Ông Nội', done: !!(GameState.questFlags.doc_bia_da || GameState.questFlags.hoi_su_phu) }];
            case 2:
                return [{ text: 'Hái Tẩy Uế Thảo ven suối', cur: Math.min(3, GameState.countItem('tay_ue_thao')), max: 3 }];
            case 3:
                return [{ text: 'Sắc Tẩy Tuỷ Thang tại Đan Lô', done: GameState.hasItem('tay_tuy_thang', 1) }];
            case 4:
                return [{ text: 'Tẩy Tuỷ Phạt Mao lên Luyện Khí Tầng 1', done: rIdx >= 1 }];
            case 5:
                if (!GameState.questFlags.nhan_viec_ly_thanh) {
                    return [{ text: 'Gặp Huấn Sư Huynh ở Rừng Trúc', done: false }];
                }
                return [
                    { text: 'Trang bị Trúc Kiếm', done: GameState.equipment.vu_khi === 'truc_kiem' || !!GameState.equipment.vu_khi },
                    { text: 'Diệt Bọ Ngựa / Sơn Chuột', cur: Math.min(5, GameState.questKills), max: 5 },
                ];
            case 6: {
                const clues = ['clue_1', 'clue_2', 'clue_3', 'clue_4', 'clue_5', 'clue_6', 'clue_7'].filter((c) => !!GameState.questFlags[c]).length;
                const list: QuestObjective[] = [
                    { text: 'Diệt thêm yêu thú Rừng Trúc', cur: Math.min(5, GameState.patrolKills), max: 5 },
                    { text: 'Tìm manh mối phát sáng', cur: Math.min(3, clues), max: 3 },
                ];
                if (GameState.patrolKills >= 5 && clues >= 3) {
                    list.push({ text: 'Báo công cho Huấn Sư Huynh', done: !!GameState.questFlags.turnin_6 });
                }
                return list;
            }
            case 7:
                return [{ text: 'Gặp Đại Phu ở Thảo Dược Cốc', done: !!GameState.questFlags.bai_kien_dai_phu }];
            case 8:
                return [
                    { text: 'Thu hái Linh Diệp', cur: Math.min(5, GameState.countItem('linh_diep')), max: 5 },
                    { text: 'Thu hái Huyết Thảo', cur: Math.min(5, GameState.countItem('huyet_thao')), max: 5 },
                ];
            case 9:
                return [{ text: 'Sắc Linh Dược Tụ Khí ở Đan Lô', done: GameState.hasItem('tu_khi_duoc', 1) || !!GameState.questFlags.dung_tu_khi_duoc }];
            case 10:
                return [{ text: 'Đột phá lên Luyện Khí Tầng 2', done: rIdx >= 2 }];
            case 11:
                return [{ text: 'Hạ Dược Linh Thú lấy Linh Thúy', cur: Math.min(2, GameState.countItem('linh_thuy')), max: 2 }];
            case 12:
                return [{ text: 'Luyện Tụ Khí Đan tại Đan Lô', done: GameState.hasItem('tu_khi_dan', 1) || rIdx >= 3 }];
            case 13:
                return [
                    { text: 'Đột phá Luyện Khí Tầng 3', done: rIdx >= 3 },
                    { text: 'Về Thảo Dược Cốc báo Đại Phu', done: !!GameState.questFlags.turnin_13 },
                ];
            case 14:
                return [
                    { text: 'Nhận Binh Khí ở Đại Phu', done: !!GameState.questFlags.nhan_binh_khi },
                    { text: 'Đạt Luyện Khí Tầng 4', done: rIdx >= 4 },
                    { text: 'Gặp Tàng Kinh Lão Nhân nhận Phi Diệp', done: !!GameState.questFlags.bi_tich_nhan_viec },
                    { text: 'Thu Mảnh Bí Tịch Thượng & Hạ (Miếu Hoang)', cur: (GameState.hasItem('manh_bi_tich_thuong') ? 1 : 0) + (GameState.hasItem('manh_bi_tich_ha') ? 1 : 0), max: 2 },
                    { text: 'Về Tàng Kinh Lão Nhân chọn Pháp Quyết', done: !!GameState.questFlags.bi_tich_hoan_thanh },
                ];
            case 15:
                return [
                    { text: 'Hạ Yêu Quái gom Yêu Cốt Vụn', cur: Math.min(10, GameState.countItem('yeu_cot')), max: 10 },
                    { text: 'Báo công Tàng Kinh Lão Nhân', done: !!GameState.questFlags.turnin_15 },
                ];
            case 16:
                return [
                    { text: 'Gom Độc Đằng Độc Dịch', cur: Math.min(10, GameState.countItem('doc_dang_doc_dich')), max: 10 },
                    { text: 'Câu 1 Linh Ngư ở bờ hồ/suối', done: GameState.hasItem('linh_ngu', 1) || !!GameState.questFlags.caught_linh_ngu },
                    { text: 'Giao cho Đại Phu', done: !!GameState.questFlags.turnin_16 },
                ];
            case 17:
                return [
                    { text: 'Hỏi Đạo Thầy Ông Nội (5 câu)', cur: Math.min(5, Number(GameState.questFlags.quiz_count || 0)), max: 5 },
                    { text: 'Rút 1 Bí Tịch tại Tàng Kinh Các', done: !!GameState.questFlags.pulled_gacha },
                ];
            case 18:
                return [{ text: 'Đột phá lên Luyện Khí Tầng 6', done: rIdx >= 6 }];
            case 19:
                return [
                    { text: 'Hái Phong Linh Thảo (Bãi Đá)', cur: Math.min(10, GameState.countItem('phong_linh_thao')), max: 10 },
                    { text: 'Hái Nấm Linh Chi (Tản Viên)', cur: Math.min(5, GameState.countItem('nam_linh_chi')), max: 5 },
                ];
            case 20:
                return [
                    { text: 'Đạt Luyện Khí Tầng 7', done: rIdx >= 7 },
                    { text: 'Rèn 1 vũ khí tại Thợ Rèn', done: !!GameState.questFlags.forged_weapon },
                ];
            default:
                return [{ text: 'Tự do tu luyện, săn Boss Tam Giới & đột phá Trúc Cơ!', done: rIdx >= 14 }];
        }
    }

    public static isStageReadyToAdvance(stage: number = GameState.questStage): boolean {
        const objs = GameState.getQuestObjectives(stage);
        if (!objs.length) return false;
        return objs.every((o) => (o.max !== undefined ? (o.cur || 0) >= o.max : !!o.done));
    }

    public static checkQuestAutoAdvance(): boolean {
        let advanced = false;
        if (GameState.questStage === 0) GameState.questStage = 1;
        for (let guard = 0; guard < 10; guard++) {
            const meta = QUEST_STAGE_META[GameState.questStage];
            if (!meta) break;
            if (meta.turnInNpc && !GameState.questFlags[`turnin_${GameState.questStage}`]) {
                break;
            }
            if (GameState.isStageReadyToAdvance(GameState.questStage) && GameState.questStage < QUEST_STAGE_META.length - 1) {
                const rewardStones = Math.min(60, 12 + GameState.questStage * 3);
                GameState.stones += rewardStones;
                GameState.questStage++;
                advanced = true;
            } else {
                break;
            }
        }
        return advanced;
    }

    public static recordMobKill(mobType: string): void {
        if (GameState.questStage === 5 && GameState.questFlags.nhan_viec_ly_thanh) {
            if (mobType === 'sau_truc' || mobType === 'son_chuot') {
                GameState.questKills++;
            }
        } else if (GameState.questStage === 6) {
            if (mobType === 'sau_truc' || mobType === 'son_chuot') {
                GameState.patrolKills++;
            }
        }
        if (mobType === 'than_thu_xich_long') {
            GameState.questFlags.ha_xich_long = true;
        }
        GameState.checkQuestAutoAdvance();
        GameState.save();
    }

    public static getNpcMarker(propId: string): '!' | '?' | null {
        const st = GameState.questStage;
        if (propId === 'bia_da' && (st === 0 || st === 1) && !GameState.questFlags.doc_bia_da) return '!';
        if (propId === 'su_phu') {
            if ((st === 0 || st === 1) && !GameState.questFlags.hoi_su_phu) return '!';
            if (st === 17 && (GameState.questFlags.quiz_count || 0) < 5) return '!';
        }
        if (propId === 'dan_lo' || propId === 'dan_lo_vuon') {
            if (st === 3 && !GameState.hasItem('tay_tuy_thang')) return '?';
            if (st === 9 && !GameState.hasItem('tu_khi_duoc')) return '?';
            if (st === 12 && !GameState.hasItem('tu_khi_dan')) return '?';
        }
        if (propId === 'dai_da' || propId === 'dai_da_duoc') {
            if (GameState.checkBreakthrough().canBreak) return '?';
        }
        if (propId === 'ly_thanh') {
            if (st === 5 && !GameState.questFlags.nhan_viec_ly_thanh) return '!';
            if (st === 6 && GameState.patrolKills >= 5) return '?';
        }
        if (propId === 'dai_phu') {
            if (st === 7 && !GameState.questFlags.bai_kien_dai_phu) return '!';
            if (st === 13 && GameState.realmIndex() >= 3) return '?';
            if (st === 14 && !GameState.questFlags.nhan_binh_khi) return '!';
            if (st === 16 && GameState.hasItem('doc_dang_doc_dich', 10)) return '?';
        }
        if (propId === 'tang_kinh_lao_nhan') {
            if (st === 14 && GameState.realmIndex() >= 4 && !GameState.questFlags.bi_tich_nhan_viec) return '!';
            if (st === 14 && GameState.hasItem('manh_bi_tich_thuong') && GameState.hasItem('manh_bi_tich_ha')) return '?';
            if (st === 15 && GameState.hasItem('yeu_cot', 10)) return '?';
            if (st === 17 && !GameState.questFlags.pulled_gacha) return '!';
        }
        if (propId === 'tho_ren') {
            if (st === 20 && !GameState.questFlags.forged_weapon) return '!';
            if (st === 23 && GameState.questFlags.ha_xich_long) return '?';
        }
        return null;
    }

    /**
     * Gói Quà Trải Nghiệm Nhanh (dành cho người chơi muốn test ngay Ngự Kiếm, Pháp Quyết Thượng Phẩm, Cảnh Giới cao)
     */
    public static grantExperienceBoostPack(): string {
        GameState.stones += 25000;
        GameState.duocCong += 50;
        const giftItems: Array<[string, number]> = [
            ['phi_diep', 1],
            ['kim_phi_kiem', 1],
            ['thanh_huyen_kiem', 1],
            ['hoang_lan_giap', 1],
            ['tu_khi_dan', 3],
            ['luyen_khi_dan', 5],
            ['pha_canh_dan', 8],
            ['truc_co_dan', 2],
            ['bat_com_linh_me', 5],
            ['phu_thanh_tam', 5],
            ['phu_toc_hanh', 5],
            ['phu_kim_giap', 5],
            ['huyen_thiet_khoang', 20],
        ];
        for (const [id, qty] of giftItems) {
            if (ResourceManager.items[id]) {
                GameState.bag[id] = GameState.countItem(id) + qty;
            }
        }
        const starterSkills = ['hoa_cau', 'phong_nhan', 'bang_thau', 'loi_chuong', 'kim_quang_cu_kiem', 'van_kiem_quy_tong'];
        for (const sid of starterSkills) {
            if (ResourceManager.activeSkills[sid] && !GameState.learnedActives.includes(sid)) {
                GameState.learnedActives.push(sid);
                const empty = GameState.hotbar.findIndex((x) => !x);
                if (empty >= 0) GameState.hotbar[empty] = sid;
            }
        }
        if (GameState.realmIndex() < GameState.realmIndex('luyen_khi_4')) {
            GameState.realmId = 'luyen_khi_4';
            GameState.exp = 0;
        }
        if (!GameState.equipment.phi_hanh && GameState.hasItem('phi_diep')) {
            GameState.equipItem('phi_diep');
        }
        GameState.recalcStats(true);
        GameState.save();
        return 'Đã nhận Gói Trải Nghiệm Tiên Đồ: Luyện Khí Tầng 4, +25.000 Linh Thạch, Phi Diệp, Kim Phi Kiếm & 6 Tuyệt Kỹ Pháp Quyết!';
    }
}
