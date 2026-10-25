# tutien2d-for-cocos

**Tu Tiên 2D - Tam Giới Tiên Đồ** — Game nhập vai Tu Tiên 2.5D xây dựng trên **Cocos Creator 3.8.8** (TypeScript, Pure Sprite & 32-Bit Pixel Art).

## Tính năng nổi bật
- **Đồ họa Pure 32-Bit Pixel Art (`nearest` filter)**:
  - **64 bộ nhân vật Nam/Nữ Tu Sĩ** (32 y phục tiên hiệp × 2 giới tính, đầy đủ hoạt ảnh 4 hướng, vung Linh Kiếm, Đả Tọa tụ khí, Kết Ấn, Chưởng Pháp, Hái Dược).
  - **28 NPC Tam Giới** và hệ thống Quái / Thủ Lĩnh / Linh Thú / Pháp Bảo Phi Hành.
  - **34 bản đồ thế giới mở** kết nối cổng truyền tống, Làng Tản Viên, Hắc Thị, Động Mạch Ngầm, Hư Thiên Điện...
  - **Giao diện Cổ Phong Mộc Kim 9-slice** & màn hình Loading **Tiên Sơn Vân Hải** toàn khung hình (`1280x720`).
- **Hệ thống gameplay đầy đủ**: Khởi tạo nhân vật & Thiên Phú Linh Căn, Tu Luyện Đột Phá Cảnh Giới, Túi Càn Khôn, Luyện Đan, Rèn Pháp Bảo, Trồng Linh Dược, Thỉnh Bí Tịch, Tự Động Chiến Đấu & Ngự Kiếm Phi Hành.

## Cấu trúc thư mục
- `assets/scenes/TuTienMain.scene` — Scene chính của game (`1280x720`).
- `assets/scripts/` — Toàn bộ mã nguồn TypeScript (`TuTienGameMain`, `WorldController`, `PlayerActor`, `WorldEntities`, `HudController`, `ModalPanels`, `ResourceManager`, `GameState`...).
- `assets/prefabs/` — Các Prefab thực thể & ô giao diện.
- `assets/resources/` — Dữ liệu JSON, âm thanh BGM/SFX, phông chữ Pixel Việt hóa (`Galmuri11-vi.ttf`) và toàn bộ Texture / SpriteAtlas.
- `settings/` — Cấu hình dự án Cocos Creator 3.8.8.

## Hướng dẫn mở & chạy dự án
1. Cài đặt **Cocos Dashboard** và trình biên tập **Cocos Creator 3.8.8**.
2. Clone kho mã nguồn:
   ```bash
   git clone https://github.com/dichvuright/tutien2d-for-cocos.git
   ```
3. Trong Cocos Dashboard, chọn **Add** -> trỏ tới thư mục dự án vừa clone -> mở dự án.
4. Mở scene `assets/scenes/TuTienMain.scene` và nhấn **Play (Preview)** trên trình duyệt (`http://localhost:7456`).
