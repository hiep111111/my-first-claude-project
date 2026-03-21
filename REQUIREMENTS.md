# REQUIREMENTS.md — UIGen

> Tài liệu yêu cầu sản phẩm, dựa trên codebase hiện tại (2026-03-21)

---

## 1. Đối tượng sử dụng

| Nhóm | Mô tả | Mục đích sử dụng |
|---|---|---|
| **Anonymous user** | Bất kỳ ai truy cập, không cần tài khoản | Thử tạo UI component nhanh, không lưu lại |
| **Authenticated user** | Người đã đăng ký tài khoản | Tạo và lưu nhiều project, quay lại làm tiếp |

---

## 2. Danh sách màn hình

| Màn hình | Đường dẫn | Mô tả |
|---|---|---|
| **Trang chủ** | `/` | Entry point — ẩn danh thấy app ngay; đã login thì redirect tới project gần nhất hoặc tạo project mới |
| **Project workspace** | `/[projectId]` | Giao diện làm việc chính với 3 panel: Chat, Preview, Code editor |
| **Auth dialog** | (popup) | Form đăng nhập / đăng ký hiển thị dạng dialog, không phải trang riêng |

---

## 3. Luồng chính

### Luồng ẩn danh (không đăng nhập)

1. User truy cập `/`
2. Thấy giao diện 3 panel ngay lập tức (không cần login)
3. Nhập mô tả UI vào ô chat (panel trái)
4. Gửi message → `POST /api/chat` gọi Claude AI
5. Claude trả về tool calls → tạo/sửa file trong Virtual Filesystem
6. Panel phải tự refresh: Babel transpile JSX → render vào iframe sandbox
7. User xem preview trực tiếp, tiếp tục chat để chỉnh sửa
8. (Tuỳ chọn) Toggle sang tab Code để xem/đọc file được tạo

### Luồng đã đăng nhập

1. User truy cập `/` → tự động redirect tới project gần nhất (hoặc tạo project mới)
2. Tiếp tục luồng như trên (bước 3–8)
3. Mỗi thay đổi được lưu vào SQLite (messages + virtual FS snapshot)
4. User có thể quay lại project cũ bất kỳ lúc nào

---

## 4. Feature List

### Must Have (đã có trong code)

- **Chat interface** — Gửi/nhận message với AI, hiển thị markdown
- **AI code generation** — Claude tạo React component từ mô tả tự nhiên
- **Virtual filesystem** — Quản lý file in-memory, không cần disk
- **Live preview** — Babel transpile JSX + render trong iframe sandbox
- **Code editor + file tree** — Xem và duyệt code được tạo
- **Resizable panels** — Kéo thả chia tỉ lệ giữa chat và preview
- **Toggle chat panel** — Ẩn/hiện panel chat để có thêm không gian xem
- **Toggle Preview/Code** — Chuyển đổi giữa xem preview và đọc code
- **Anonymous usage** — Dùng ngay không cần đăng ký
- **Authentication** — Đăng ký / đăng nhập bằng email + password (JWT cookie)
- **Project persistence** — Lưu project vào SQLite cho user đã login
- **Mock AI fallback** — Chạy được khi không có API key (MockLanguageModel)
- **File operations** — AI có thể tạo, sửa, đổi tên, xoá file trong virtual FS

### Nice to Have (chưa có, nhưng phù hợp với sản phẩm)

- Danh sách tất cả project của user (project list page)
- Đặt tên / đổi tên project
- Export code ra file zip để tải về
- Share project qua link public

### Không làm (ngoài scope hiện tại)

- Chạy/build project thật trên server
- Hỗ trợ framework khác ngoài React + Tailwind
- Collaboration nhiều người cùng lúc
- Version history / undo theo commit
- Tích hợp với GitHub / external git
