# Wellness Farm — học, thực hành và trải nghiệm miễn phí

Phát triển tiếp từ `wellness_farm_web_app (1).html` theo hướng **học → tạo giá trị → du lịch**, với thông điệp “Đến để học. Ở lại để tạo giá trị.” Trang chủ, lịch workshop, Nghệ nhân bạc và đăng ký trải nghiệm dùng cùng màu xanh, font và ảnh nông trại của dự án. Trang quản trị riêng giữ menu bên trái và quyền quản lý dữ liệu cũ.

## Học – làm – du lịch

- **Đăng ký online** có ba gói: Ngày **450.000đ/1 ngày**, Tuần **2.000.000đ/7 ngày**, Tháng **9.000.000đ/30 ngày**. Cả ba cùng có trải nghiệm, workshop và talkshow. Gói Ngày gồm sàng lọc huyết áp, nhịp tim, đồ ăn và nước uống. Gói Tuần thêm theo dõi hai lần/ngày trong 7 ngày, tư vấn dinh dưỡng và ưu tiên đặt lịch. Gói Tháng thêm chuyên gia khám định kỳ, tư vấn dinh dưỡng mỗi tuần, ưu tiên đặt lịch và xử lý hồ sơ cao nhất. Đội ngũ xác nhận lịch chăm sóc khi tiếp nhận.
- Danh mục cũ được nâng cấp một lần; giữ nguyên mã gói, hồ sơ, giá và quyền lợi đã chốt của đơn lịch sử. Các lần khởi động sau không ghi đè giá admin đã sửa. Máy chủ tính giá và quyền lợi khi tạo đơn; người dùng không tự nâng mức ưu tiên. Admin xem đơn theo ưu tiên gói; ưu tiên hồ sơ dựa trên gói Tháng đã xác nhận và chưa hết hạn, sau mức khẩn cấp của yêu cầu.
- Nút **VI / EN** trên thanh đầu trang lưu lựa chọn ngôn ngữ trong trình duyệt. Trang công khai, đăng ký, tài khoản và luồng người học có bản tiếng Anh; tiền tệ vẫn là VND. Workshop, câu chuyện và sản phẩm có trường tiếng Anh tùy chọn. Nội dung chưa có bản tiếng Anh giữ nguyên bản gốc, không tự dịch thông tin người dùng.
- **SENIOR** là học viên cao tuổi; **FAMILY** hỗ trợ người thân. **EXPERT** tổ chức workshop, theo dõi thực hành và xác nhận kỹ năng cho học viên trong workshop phụ trách, không được xem hồ sơ y tế. Người dùng gửi hồ sơ chuyên gia để admin/manager duyệt; duyệt xong cần đăng nhập lại.
- Workshop có chủ đề, hình thức workshop/talkshow, chuyên gia phụ trách, mức vận động, lịch và số chỗ còn lại. Khi đủ chỗ, người dùng có thể đăng ký danh sách chờ; xác nhận từ danh sách chờ vẫn kiểm tra sức chứa.
- Hành trình từng người gồm vườn riêng, kỹ năng đã học, nhật ký thực hành và sản phẩm. Kỹ năng do học viên ghi nhận cần chuyên gia hoặc quản lý xác nhận.
- Trang **Nghệ nhân bạc** chỉ hiển thị câu chuyện và sản phẩm khi có đồng ý công khai và được duyệt. Thay đổi nội dung cần duyệt lại. Không công khai thông tin liên hệ hoặc sức khỏe. Khách gửi yêu cầu tham quan để admin xác nhận; lượt khách chỉ tính sau khi đã tham quan.
- Bảng tác động dùng số liệu thật: workshop trong tháng, số hồ sơ học viên đã đăng ký/tham gia, bản ghi sản phẩm và lượt khách đã tham quan. Không thêm số liệu minh họa vào dữ liệu vận hành.
- **Sức khỏe cơ bản** là phần tùy chọn thu gọn. Dữ liệu và chức năng chăm sóc cũ vẫn được giữ cho vai trò có quyền.

File phát triển chính là `index.html`. URL `/wellness_farm_web_app.html` được server phục vụ từ cùng file; file HTML cũ chỉ còn là trang chuyển hướng. Backend thay thế cơ chế tài khoản/chuyến trong localStorage. Chỉ cần Python 3.12 trở lên để chạy. CSS, ảnh nông trại, font chữ và icon đều nằm trong `assets/`, không tải tài nguyên bên ngoài khi mở trang.

ADMIN dùng trang quản trị riêng với menu bên trái và bảng tổng quan. Các vai trò khác dùng menu nhóm trên thanh điều hướng để mở chức năng theo quyền.

Nếu thay đổi CSS hoặc muốn lấy lại nội dung từ bản nguồn, dùng Node.js và các công cụ phát triển:

```powershell
npm ci
python upgrade_original.py 'C:\Users\vu thai an\Downloads\wellnes\wellness_farm_web_app (1).html'
npm run build:styles
```

Script `upgrade_original.py` chỉ trích xuất phần trình bày của nguồn; thay handler inline bằng hành động được kiểm soát, không mang theo tài khoản admin demo hoặc logic xác thực cũ. Không tự chạy script này để cập nhật dữ liệu tài khoản/chăm sóc.

## Chạy

```powershell
python server.py
```

Mở http://127.0.0.1:8000. Không mở `index.html` trực tiếp bằng file://. Server chỉ lắng nghe trên máy này.

Đổi cổng nếu cần: `python server.py --port 8001`.

## Tài khoản

Khách tự đăng ký nhận vai trò FAMILY; nút “Đăng ký học viên cao tuổi” tạo tài khoản SENIOR. Đăng ký công khai không cấp quyền quản trị hoặc chuyên gia. Tạo tài khoản kỹ thuật và quản lý từ terminal:

```powershell
python server.py --create-user
```

Chọn ADMIN để quản lý tài khoản/quyền, tiếp nhận yêu cầu gia đình và quản lý toàn bộ hồ sơ, lưu trú, chăm sóc, tài chính. Chọn MANAGER để quản lý vận hành và chăm sóc. Nhập mật khẩu tối thiểu 12 ký tự tại lời nhắc ẩn.

ADMIN có trang quản trị riêng với menu bên trái và bảng tổng quan người dùng, đơn lưu trú chờ duyệt, yêu cầu gia đình cần xử lý. Trên điện thoại, mở nút menu để chọn chức năng. Nút Làm mới cập nhật thông tin từ người dùng. ADMIN có thể tạo thêm RECEPTION, NURSE, DOCTOR, ACCOUNTANT, MANAGER và FAMILY trong giao diện. ADMIN hoặc MANAGER vào hồ sơ người lưu trú để phân công bác sĩ/điều dưỡng và liên kết gia đình. Nhân viên y tế chỉ thấy hồ sơ được phân công; gia đình chỉ thấy hồ sơ được liên kết.

Đăng ký bằng họ tên, email và mật khẩu (tối thiểu 12 ký tự). Đăng nhập bằng email và mật khẩu, không cần số điện thoại hoặc mã xác thực. Người quản trị máy có thể khôi phục mật khẩu qua lệnh bên dưới, sau khi xác minh người yêu cầu:

```powershell
python server.py --reset-password
```

Lệnh này đặt lại mật khẩu và thu hồi phiên; ghi nhật ký thao tác. Email đặt lại mật khẩu/xác minh email chưa được tích hợp.

## Dữ liệu mẫu

Demo luôn tạo ở `data/demo/wellness.sqlite3`, tách khỏi vận hành (`data/production/wellness.sqlite3`). Trang demo hiển thị nhãn rõ ràng. Seed từ chối `WF_DATA_DIR` để tránh ghi nhầm vào dữ liệu thật. Chạy:

```powershell
python seed_demo.py
$env:WF_DEMO = "1"
python server.py
```

Lệnh tạo dữ liệu hoàn toàn giả và in mật khẩu ngẫu nhiên cho các tài khoản demo. Mật khẩu dùng chung chỉ dành cho trải nghiệm cục bộ này, không dùng làm tài khoản vận hành. Lệnh từ chối chạy nếu database đã có tài khoản. Không lưu mật khẩu demo trong mã nguồn hoặc localStorage.

## Các module đã triển khai

| Module | Nghiệp vụ |
| --- | --- |
| Tổng quan | Dashboard theo vai trò, lịch tháng, thông báo và nhắc việc trong ứng dụng |
| Hồ sơ | Nhiều người thân, ngày sinh, sức khỏe, dị ứng, dinh dưỡng, hỗ trợ di chuyển, liên hệ khẩn cấp, đồng ý chia sẻ, phân công nhân viên và liên kết gia đình |
| Lưu trú | Chọn gói/ngày đến/thời lượng, giá ở máy chủ, ngày về, danh sách chờ, phân phòng, đánh giá tiếp nhận, mã hợp đồng, xác nhận, check-in, check-out, hủy |
| Phòng | Cơ sở, sức chứa, khả năng tiếp cận, số chỗ đang lưu trú; kiểm tra chỗ trong toàn bộ lịch trước xác nhận |
| Chăm sóc | Mục tiêu, công việc, hạn, người phụ trách, trạng thái và lịch sử theo người |
| Chỉ số | Huyết áp, mạch, SpO₂; ngưỡng cảnh báo tham khảo hiển thị rõ |
| Thuốc | Chỉ định do bác sĩ/quản lý nhập, liều, lịch, nguồn chỉ định, nhật ký dùng/bỏ lỡ/từ chối |
| Dinh dưỡng | Dị ứng từ hồ sơ, chế độ ăn, thực đơn, bữa ăn và lượng ăn |
| Gia đình | Lịch thăm, yêu cầu ưu tiên, phản hồi, báo cáo được chia sẻ |
| Sự cố | Ưu tiên, phụ trách, xử lý và trạng thái |
| Nhân sự | Phân ca theo ngày/cơ sở, bàn giao theo người lưu trú |
| Hoạt động | Lịch, địa điểm, sức chứa, đăng ký, hủy và ghi nhận tham gia/vắng mặt |
| Tài chính | Thu sau đối soát, mã giao dịch duy nhất, hoàn tiền không vượt số đã thu, công nợ, biên nhận nội bộ và CSV |
| Báo cáo | Báo cáo chăm sóc có tùy chọn chia sẻ, bản in/lưu PDF qua trình duyệt, doanh thu thực thu và công suất |
| Tệp riêng tư | PDF/PNG/JPEG tối đa 5 MB, kiểm tra chữ ký tệp, tải qua API kiểm tra quyền, không phục vụ từ thư mục công khai |
| Bảo mật | Mật khẩu scrypt, phiên 8 giờ, cookie HttpOnly/SameSite, CSRF/Origin/Host, giới hạn thử đăng nhập, nhật ký đọc/sửa, khóa tài khoản thu hồi phiên |
| Giao diện | Desktop/mobile, menu thu gọn, tăng cỡ chữ, bàn phím, trường có nhãn, thông báo và trạng thái trống |

## Quy trình sử dụng

1. Gia đình đăng ký tài khoản và tạo hồ sơ người thân.
2. Chọn workshop hoặc hành trình miễn phí; nếu cần lưu trú, chọn ngày đến và thời lượng để quản lý xác nhận.
3. Lễ tân/quản lý xem hồ sơ, đánh giá tiếp nhận, chọn phòng và xác nhận; có thể chuyển vào danh sách chờ.
4. Người dùng không phải thanh toán cho các trải nghiệm mới. Kế toán chỉ dùng phần tài chính để đối soát giao dịch lịch sử khi cần.
5. Quản lý phân công nhân viên chăm sóc vào hồ sơ.
6. Nhân viên ghi công việc, chỉ số, bữa ăn, bàn giao và báo cáo. Chỉ định thuốc do bác sĩ hoặc quản lý được cấp quyền nhập.
7. Báo cáo chia sẻ chỉ xuất hiện cho gia đình khi báo cáo được chọn chia sẻ và hồ sơ có sự đồng ý. Gia đình có thể thu hồi sự đồng ý.
8. Chuyển đơn sang Đang lưu trú rồi Hoàn tất. Hủy đơn trước check-in; hoàn tiền được ghi nhận riêng sau đối soát.

Đơn giá và thời gian của đơn đã tạo được giữ nguyên khi sửa trạng thái. Gói tháng được cấu hình 30 ngày/đơn vị, hiển thị rõ ở danh mục. Không tự tính tháng lịch.

## Sao lưu và khôi phục

Dữ liệu vận hành ở `data/production/wellness.sqlite3`, được bỏ qua bởi Git. Database cũ `data/wellness.sqlite3` được giữ nguyên và không tự nhập vào vận hành. Nếu đây là dữ liệu thật, hãy sao lưu và xác minh trước khi trỏ `WF_DATA_DIR` về thư mục cũ. Không tự phân loại hoặc xóa dữ liệu cũ. Có thể đổi thư mục bằng biến môi trường `WF_DATA_DIR`.

```powershell
python server.py --backup
```

Lệnh dùng SQLite backup API để tạo bản sao nhất quán trong thư mục dữ liệu đang chọn, tên `backup-YYYYMMDD-HHMMSS.sqlite3`. Sao lưu chứa dữ liệu nhạy cảm; cần bảo vệ và lưu ngoài máy theo chính sách của tổ chức.

Khôi phục: dừng server; sao lưu database hiện tại; chép bản backup đã kiểm tra thành `wellness.sqlite3` trong thư mục dữ liệu đang chọn; chạy lại server. Không ghi đè database khi server còn chạy. Backup hiện được chạy theo lệnh, chưa lập lịch tự động.

## Kiểm tra

```powershell
python -m unittest discover -v
npm run check
npm ci
npx playwright install chromium
npm run test:e2e
```

Test dùng database tạm riêng: giá/trạng thái ở server, giả mạo vai trò, truy cập gia đình khác, phân công nhân viên, CSRF/Origin, xác nhận phòng đồng thời, giao dịch trùng/hoàn tiền, sự đồng ý chia sẻ, tệp riêng tư, khóa phiên, mật khẩu, sức chứa hoạt động và đăng ký không cần số điện thoại.

## Giới hạn cần xử lý trước triển khai công khai

Đây là ứng dụng cục bộ đầy đủ các module nêu trên, chưa phải hệ thống y tế được chứng nhận hoặc một bản triển khai production đã thẩm định.

- Thanh toán ngân hàng tự động, VietQR, email/Zalo/SMS, xác minh liên hệ và thiết bị y tế chưa kết nối; màn hình thể hiện trạng thái này. Không tạo giao dịch tiền thật. Thông báo hiện được tổng hợp khi tải/làm mới, chưa có push thời gian thực.
- Server HTTP chuẩn của Python được giới hạn loopback. Khi triển khai cần application server phù hợp, HTTPS, bật `WF_COOKIE_SECURE=1`, cấu hình Host/Origin tin cậy, rate limit dùng chung và quản lý session phù hợp. Không mở trực tiếp server này ra Internet.
- Database và tệp chưa mã hóa riêng ở lớp ứng dụng. Cần mã hóa ổ đĩa/backup, quản lý khóa và quyền filesystem; tệp chỉ kiểm tra định dạng, chưa quét malware.
- Tài khoản có quyền truy cập máy/database có thể khôi phục mật khẩu; cần quy trình xác minh và bảo vệ truy cập máy.
- Nhật ký nằm trong cùng database, không chống chỉnh sửa bởi người quản trị máy. Cần kho nhật ký riêng, giám sát, thời hạn lưu trữ và diễn tập khôi phục.
- Chưa có tự động xóa/ẩn danh theo thời hạn, xuất toàn bộ hồ sơ theo yêu cầu quyền riêng tư hoặc quản lý đồng ý pháp lý theo từng mục đích.
- Cơ sở hiện là trường thông tin trên phòng/ca; chưa có phân quyền tách dữ liệu theo cơ sở. Chưa có giữ chỗ tự hết hạn, dịch vụ cộng thêm/khuyến mãi hoặc bộ tối ưu tự động phân ca.
- Hợp đồng hiện lưu mã và ghi chú; chưa có chữ ký điện tử. Biên nhận không phải hóa đơn thuế.
- Cảnh báo chỉ số là ngưỡng tham khảo cố định. Không tự chẩn đoán, kê đơn, quyết định tiếp nhận hay gửi cảnh báo cấp cứu bên ngoài. Cần chuyên môn duyệt quy trình, ngưỡng và SLA trước sử dụng thật.
- Không tự nhập dữ liệu/mật khẩu localStorage từ bản HTML cũ; cần quy trình chuyển đổi được kiểm tra nếu có dữ liệu thật.

Các tích hợp cần thông tin nhà cung cấp, tài khoản và yêu cầu triển khai để cấu hình và kiểm thử tiếp.

## Cấu trúc và kiểm thử giao diện

- `frontend/core.js`: trạng thái, dữ liệu, API client.
- `frontend/components.js`: modal, focus, thông báo và component dùng lại.
- `frontend/navigation.js`, `pages.js`: điều hướng và các trang nghiệp vụ.
- `frontend/forms.js`, `account.js`: biểu mẫu và tài khoản; `events.js`, `bootstrap.js`: sự kiện và khởi động.
- `frontend/learning.js`, `backend/learning.py`: workshop, hành trình học, công khai nghệ nhân, tham quan và bảng tác động.
- `backend/security.py`, `policy.py`, `records.py`, `domain.py`: xác thực, vai trò, truy vấn và quy tắc nghiệp vụ. `server.py` giữ HTTP và CLI.
- `design-tokens.css`: màu, font và bán kính chung; `style.css` là CSS component dễ đọc, `original-input.css` là nguồn Tailwind. Không sửa trực tiếp `original-theme.css` được sinh bởi build.
- `tests/e2e/mock-api.js`: fixture mô phỏng lỗi mạng; các luồng đăng ký/đăng xuất dùng API thật và database tạm.

Thanh điều hướng ứng dụng có tối đa bốn nhóm: **Tổng quan**, **Lưu trú**, **Chăm sóc** và **Vận hành** (gia đình thấy **Tiện ích**). Mỗi nhóm mở danh sách chức năng theo vai trò và đánh dấu trang đang xem. Trên màn hình hẹp, một nút **Chức năng** mở danh sách có tiêu đề nhóm, không cần kéo thanh điều hướng ngang. Menu đóng khi chọn mục, bấm ngoài hoặc nhấn Esc.

Nút **Cỡ chữ Aᴀ** nằm trong menu tài khoản ở góc phải. Trạng thái được lưu sau khi tải lại. Modal có nhãn, focus ban đầu, vòng Tab/Shift+Tab, đóng bằng Esc và trả focus về nút mở.

CI ở `.github/workflows/ci.yml` chạy unittest, kiểm tra cú pháp JavaScript, tái tạo CSS và E2E Chromium trên hai kích thước desktop/mobile. CI sẽ chạy khi repository được đẩy lên GitHub; kiểm thử cục bộ dùng cùng lệnh.

## Cookie khi chạy HTTPS

HTTP localhost mặc định không bật Secure. Khi đặt sau HTTPS proxy:

```powershell
$env:WF_COOKIE_SECURE = "1"
python server.py
```

Cookie đăng nhập và xóa phiên đều có `Secure` khi bật chế độ này. Origin yêu cầu HTTPS; proxy phải giữ Host localhost đúng cổng backend. Không tin `X-Forwarded-Proto` do client tự gửi. Đây là cấu hình hỗ trợ HTTPS, không phải cài đặt HTTPS proxy tự động.

Font Plus Jakarta Sans được phân phối cùng giấy phép trong `assets/fonts/LICENSE.txt`; dùng `npm run vendor:fonts` nếu cần lấy lại font từ package Fontsource. Ảnh nông trại được lưu từ URL Unsplash đã có trong dự án.

Giao diện dùng **Lora** cho tiêu đề và **Nunito Sans** cho nội dung, có bộ ký tự tiếng Việt và được lưu trong `assets/fonts/` cùng giấy phép. `npm run vendor:fonts` tái tạo cả ba bộ font từ các package Fontsource. Nền kem/xanh lá, khung ảnh vòm, thẻ nổi và các họa tiết cây lá được khai báo trong `original-input.css`. Hiệu ứng chuyển trang, xuất hiện khi cuộn và số liệu tổng quan nằm trong `frontend/bootstrap.js`; tự tắt khi thiết bị bật giảm chuyển động. Điều hướng bằng bàn phím và bản in luôn hiển thị nội dung ngay.

### Cảnh báo dependency của công cụ build

`npm audit` hiện báo 5 cảnh báo high trong chuỗi dependency của Tailwind 3 (braces, chokidar, micromatch, fast-glob và Tailwind). Đây là các package phát triển, không được HTTP server phục vụ. `npm audit fix` không có bản vá tương thích; npm đề xuất chuyển sang Tailwind 4. Chưa áp dụng nâng cấp major vì thay đổi CSS và yêu cầu trình duyệt cần kiểm thử riêng; xem [hướng dẫn nâng cấp chính thức](https://tailwindcss.com/docs/upgrade-guide). Các sửa lỗi trong ảnh không đồng nghĩa đã hoàn tất kiểm định bảo mật production.
