# REQUIREMENTS.md — UIGen

## 1. Đối tượng sử dụng

- **Developer / Frontend engineer**: Muốn prototype nhanh React component mà không cần setup môi trường
- **Người dùng ẩn danh (Anonymous)**: Dùng thử không cần đăng ký; work được migrate tự động sang tài khoản khi đăng nhập, không mất dữ liệu
- **Người dùng đã đăng ký (Authenticated)**: Muốn lưu lại project, quay lại chỉnh sửa sau

---

## 2. Danh sách màn hình

| Màn hình | Mô tả |
|---|---|
| **Home (`/`)** | Landing page; đã đăng nhập + có project → redirect sang project gần nhất; đã đăng nhập + chưa có project → hiển thị màn hình tạo project mới |
| **Project (`/[projectId]`)** | Giao diện chính làm việc với một project cụ thể |
| **Main Layout (3 panel)** | Shell chứa Chat, Preview, Code Editor trong cùng một view |
| **Chat Panel** | Giao diện chat để mô tả component cần tạo |
| **Preview Panel** | Iframe sandbox hiển thị component đã render |
| **Code Panel** | File tree + code editor để xem/sửa code được sinh ra; preview KHÔNG live update khi sửa tay — cần bấm nút Run/Apply để re-render |
| **Auth Dialog** | Popup đăng ký / đăng nhập bằng username + password; login thất bại hiển thị toast notification; có giới hạn số lần thử, vượt giới hạn thì thông báo cho user |

---

## 3. Luồng chính

1. User truy cập app tại `/`
2. Nếu chưa đăng nhập → thấy giao diện 3 panel với project trống
3. Nếu đã đăng nhập → tự động redirect sang project gần nhất (hoặc tạo project mới)
4. User gõ mô tả component vào ô chat (ví dụ: "tạo một button màu xanh với hiệu ứng hover")
5. App gửi request `POST /api/chat` kèm lịch sử chat + trạng thái virtual filesystem
6. Claude xử lý và trả về tool calls để tạo/sửa file trong virtual filesystem
7. Virtual filesystem cập nhật in-memory, Preview Panel tự động re-render
8. User thấy component live trong iframe ngay lập tức
9. User có thể:
   - Tiếp tục chat để chỉnh sửa component
   - Chuyển sang tab **Code** để xem/sửa code thủ công
   - Đăng nhập để lưu project lại
10. (Nếu đã đăng nhập) Project tự động được lưu vào SQLite sau mỗi lần chat; thay đổi code thủ công trong Code Editor KHÔNG được persist — chỉ thay đổi qua AI chat mới được lưu

---

## 4. Feature List

### Must Have (đang có, core functionality)

- Chat với AI để sinh React component
- Live preview component trong sandboxed iframe
- Virtual filesystem in-memory (tạo, sửa, xóa file)
- Babel transpile JSX tại runtime, import map trỏ về esm.sh
- AI dùng tools `str_replace_editor` và `file_manager` để thao tác file
- Giao diện 3 panel có thể collapse chat panel
- Chuyển đổi giữa tab Preview và Code
- Code editor với syntax highlighting + file tree
- Đăng ký / đăng nhập bằng username + password (JWT cookie)
- Lưu project vào SQLite (messages + filesystem snapshot)
- Hỗ trợ anonymous user (không cần đăng nhập)
- Fallback MockLanguageModel khi không có API key

### Nice To Have (đang có nhưng không phải core)

- Resizable panels (kéo thay đổi kích thước các panel)
- Theo dõi anonymous work qua localStorage (`anon-work-tracker`)
- Nhiều file trong một project (multi-file support với `@/` import)
- Đặt tên project

### Không làm (explicitly out of scope)

- Disk I/O thực sự — filesystem hoàn toàn in-memory
- Export file ra máy tính người dùng (không có feature này trong code)
- Collaboration nhiều người dùng cùng lúc
- Deploy component lên hosting
- Hỗ trợ framework khác ngoài React (Vue, Svelte, v.v.)
- Version history / rollback
