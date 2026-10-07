# Kiểm tra giao diện người dùng và bảo mật — 07/10/2026

Đã sửa lỗi tái hiện được trong bản đồng bộ Git `406d992` và áp dụng vào máy chủ cục bộ `http://127.0.0.1:8000/`.

## Giao diện

| Lỗi | Nguyên nhân và cách sửa |
| --- | --- |
| Nhiều trang, thao tác không chạy | `frontend/pages.js` trong commit `406d992` thiếu dấu đóng ngoặc. Đã sửa; kiểm tra cú pháp toàn bộ giao diện đạt. |
| Logo không trở về bảng điều hành của user | Logo đã chuyển thành liên kết neo của trang công khai nhưng giao diện đăng nhập vẫn xử lý thuộc tính cũ. Đã tạo nút điều hướng đúng. |
| Menu tràn ngang trên điện thoại | Thanh điều khiển và logo vượt chiều rộng màn hình. Đã bỏ khoảng đệm nút logo và cho thanh menu xuống dòng. |
| Chân trang giữ tiếng Anh khi chuyển về tiếng Việt | Bản mẫu bị thay đổi trực tiếp khi dịch. Đã dịch bản sao cho mỗi lần dựng giao diện. |
| Hành trình hiển thị đoạn mã `${...}` | Chuỗi thông báo dùng dấu nháy sai. Đã sửa nội suy và dịch thông báo. |
| Hủy đăng ký rồi đăng nhập lại vẫn mở yêu cầu cũ | Đóng hộp thoại chưa xóa thao tác chờ. Đã xóa khi bấm đóng hoặc Escape, vẫn giữ luồng tiếp tục sau đăng nhập thành công. |
| Thông báo trống và thông tin tác giả từ Git chưa xuất hiện đúng | Bản đồng bộ sửa mẫu cũ, trong khi trang công khai dùng bộ dựng mới. Đã đưa nội dung vào trang thực tế, phân biệt chưa có dữ liệu và không có kết quả lọc; ẩn nút tạo kỹ năng trong danh sách theo bản đồng bộ. |

Giữ thiết kế nền vườn, kiểu chữ và hiệu ứng hiện có. Giữ giá Ngày 450.000đ, Tuần 2.000.000đ, Tháng 9.000.000đ.

## Bảo mật

Các thử nghiệm dùng máy chủ và cơ sở dữ liệu tạm, không tạo tài khoản hoặc nội dung thử trong dữ liệu thật.

| Phát hiện tái hiện được trước sửa | Bản sửa |
| --- | --- |
| API công khai trả cả ghi chú nội bộ và trường sở hữu trong danh mục, hoạt động chưa công khai | Chỉ xuất trường cho phép và hoạt động công khai đang mở. |
| Vai trò kế toán đọc được câu chuyện vườn riêng và yêu cầu hỗ trợ ngoài nhiệm vụ | Giới hạn đọc theo loại dữ liệu và vai trò. |
| Đăng nhập thành công bằng tài khoản khác xóa giới hạn thử mật khẩu của tài khoản mục tiêu | Tách giới hạn theo địa chỉ và tài khoản, đồng thời giữ giới hạn tổng theo địa chỉ. |

Đã bổ sung kiểm tra hồi quy: giả mạo phiên đăng nhập, chuỗi SQL trong email, đọc tệp riêng, Host giả, tiêu đề bảo mật, phiên cũ sau đăng xuất, truy cập sức khỏe trái quyền và sửa liên kết hồ sơ. Trường hợp giả mạo liên kết hồ sơ đã bị chặn trước sửa; việc giữ liên kết từ dữ liệu lưu là gia cố thêm, không tính thành lỗ hổng đã khai thác được.

## Kết quả xác minh

- 40/40 ca trình duyệt đạt: desktop 1280×800 và mobile 390×844. Bao gồm đăng ký/đăng nhập/đăng xuất, gói dịch vụ, VI/EN, workshop, hồ sơ, hành trình, menu và trang quản trị.
- 30/30 ca máy chủ đạt, gồm 22 ca có sẵn và 8 ca bảo mật bổ sung.
- Kiểm tra cú pháp giao diện và khoảng trắng bản sửa đạt.
- Kiểm tra chỉ đọc trực tiếp cổng 8000 đạt: trang chủ, ba gói và giá, chuyển VI/EN, không có lỗi JavaScript ở hai kích thước trên.
- Đã xem ảnh giao diện desktop/mobile sau sửa.
- Đã sao lưu SQLite trước khi khởi động lại máy chủ. Đối chiếu sau cập nhật xác nhận tài khoản và các bản ghi lịch sử ngoài danh mục gói không thay đổi; giá gói đúng.

Phạm vi là ứng dụng và cấu hình cục bộ hiện tại. Đây là kiểm tra có mục tiêu và hồi quy, chưa phải kiểm thử đầy đủ môi trường triển khai công khai, TLS, hạ tầng hoặc mọi trình duyệt.

## Bàn giao cho team

Sau khi lấy bản mới từ nhánh `master`, chạy các kiểm tra sau từ thư mục dự án:

```sh
npm ci
npm run check
python -m unittest test_security -q
npx playwright install chromium
npm run test:e2e
```

Chạy `python server.py --port 8000` để mở ứng dụng cục bộ. Nếu máy chủ đã chạy trước khi cập nhật, cần khởi động lại để nạp các sửa đổi phía máy chủ. `npm run build:styles` dùng để dựng lại CSS khi sửa `original-input.css`; CSS đã dựng được lưu cùng bản sửa.

Ảnh giao diện mới ở `screenshots/user-home-*.png` và `screenshots/user-dashboard-*.png`. Dữ liệu thật, bản sao lưu, `.env` và nhật ký cục bộ không nằm trong bản bàn giao Git. Mỗi thành viên dùng dữ liệu và cấu hình cục bộ riêng theo README.
