# Cập nhật dữ liệu giữa các trình duyệt — 07/10/2026

Người dùng xác nhận Edge và Chrome mở cùng địa chỉ, đăng nhập cùng tài khoản nhưng hiển thị dữ liệu khác nhau.

## Kết quả kiểm tra

- Dữ liệu tài khoản, hồ sơ và đăng ký được lưu ở SQLite phía máy chủ. Trình duyệt chỉ lưu ngôn ngữ, cỡ chữ và cookie phiên riêng; không giữ database nghiệp vụ riêng.
- Phát hiện ba tiến trình máy chủ cùng lắng nghe cổng 8000 trên Windows. Đã đọc thư mục và cấu hình của từng tiến trình, xác nhận cả ba thuộc cùng dự án và dùng cùng database vận hành. Không cần gộp database.
- Trước sửa, giao diện tải dữ liệu khi đăng nhập, tải lại trang hoặc thao tác cập nhật; chuyển trình duyệt không tự lấy dữ liệu mới. Chưa quan sát trực tiếp hai cửa sổ Edge/Chrome của người dùng để khẳng định đây là nguyên nhân duy nhất của dữ liệu bị thiếu.

## Thay đổi

- Kiểm tra phiên và tải dữ liệu mới khi cửa sổ lấy lại focus hoặc tab trở lại hiển thị. Hai sự kiện được gộp để tránh gửi yêu cầu lặp.
- Chỉ dựng lại giao diện khi dữ liệu thay đổi. Giữ trang đang xem, bộ lọc và tìm kiếm; không thay thế biểu mẫu đang mở hoặc ô đang nhập. Đóng hộp thoại sẽ kiểm tra cập nhật.
- Kết quả tải dữ liệu từ tài khoản cũ bị loại bỏ sau khi đăng xuất hoặc đổi tài khoản. Phiên hết hạn trả về trang công khai; bản nháp trong hộp thoại được giữ nguyên nhưng gửi dữ liệu vẫn cần phiên hợp lệ.
- Windows dùng cổng độc quyền để từ chối máy chủ thứ hai trên cùng cổng.
- Sau sao lưu, đã dừng đúng ba tiến trình thuộc dự án và chạy một máy chủ duy nhất. Dữ liệu vận hành giữ nguyên.

## Xác minh

- 44/44 ca E2E đạt trên desktop/mobile, gồm hai trường hợp mới trên mỗi kích thước: hai phiên đăng nhập độc lập cùng tài khoản, và phản hồi đồng bộ bị chậm sau khi đổi tài khoản.
- 31/31 ca máy chủ/bảo mật đạt, gồm kiểm tra không thể chạy hai máy chủ trên cùng cổng.
- Kiểm tra cú pháp JavaScript và khoảng trắng bản sửa đạt.
- Đối chiếu database sau cập nhật xác nhận tài khoản và bản ghi lịch sử không thay đổi; giá gói vẫn đúng. Cổng 8000 chỉ còn một máy chủ.

Các thử nghiệm tạo dữ liệu trong database tạm, không tạo tài khoản thử trong dữ liệu thật. Cập nhật dựa trên việc quay lại cửa sổ/tab, chưa phải đồng bộ tức thời qua thông báo đẩy. Lần đầu cần tải lại trang ở cả hai trình duyệt để nạp mã mới; mỗi trình duyệt đăng nhập riêng vào cùng tài khoản và cùng địa chỉ máy chủ.
