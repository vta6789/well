"use strict";
let language = "vi";
try { language = localStorage.getItem("wf_language") === "en" ? "en" : "vi"; } catch {}
const english = {
  "Trang chủ": "Home", "Workshop": "Workshops", "Nghệ nhân bạc": "Silver Artisans", "Đăng ký online": "Online registration", "Về dự án": "About us",
  "Đăng nhập": "Sign in", "Tạo tài khoản": "Create account", "Trang quản trị": "Admin workspace", "Trang của tôi": "My dashboard", "Đăng xuất": "Sign out",
  "LÀNG SỨC KHỎE BÌNH MỸ": "BINH MY WELLNESS VILLAGE", "Đến để học.": "Come to learn.", "Ở lại để": "Stay to", "tạo giá trị.": "create value.",
  "Chuyên gia chia sẻ kinh nghiệm. Người cao tuổi học, thực hành và tạo sản phẩm của riêng mình. Du khách đến để học hỏi và kết nối.": "Experts share their knowledge. Older learners practise and create their own products. Visitors come to learn and connect.",
  "Xem lịch workshop": "Explore workshops", "Chọn gói & đăng ký": "Choose a package", "Hoạt động, workshop và talkshow có trong cả ba gói.": "Activities, workshops and talkshows are included in every package.",
  "Khám phá hành trình": "Discover the journey", "Bình Mỹ · Một miền xanh": "Binh My · A green retreat", "Gieo một kỹ năng.": "Plant a skill.", "Gặt một hành trình.": "Grow a journey.", "Cho những khởi đầu mới": "For new beginnings",
  "Chuyên gia chia sẻ": "Experts share", "Người cao tuổi học": "Older adults learn", "Thực hành tại vườn": "Practise in the garden", "Tạo sản phẩm": "Create products", "Du khách kết nối": "Visitors connect",
  "HỌC CÙNG NHAU": "LEARN TOGETHER", "Workshop & Talkshow sắp tới": "Upcoming workshops & talkshows", "Xem lịch đầy đủ": "View the full schedule",
  "Lịch workshop đang được cập nhật": "New workshops are on the way", "Bạn có chuyên môn muốn chia sẻ? Gửi hồ sơ để cùng xây dựng cộng đồng học tập.": "Have expertise to share? Apply and help us build a learning community.",
  "Kinh nghiệm của bạn có thể mở ra một hành trình mới.": "Your experience can open up a new journey.", "Đồng hành cùng người cao tuổi trong nông nghiệp, sức khỏe, số hóa và thủ công.": "Support older learners in agriculture, wellbeing, digital skills and crafts.", "Đăng ký làm chuyên gia": "Apply as an expert",
  "MỘT HÀNH TRÌNH ĐANG NẢY MẦM": "A NEW JOURNEY IS TAKING ROOT", "Nông nghiệp": "Agriculture", "Sức khỏe": "Wellbeing", "Số hóa": "Digital skills", "Thủ công": "Crafts", "Tất cả": "All topics",
  "HỌC – THỰC HÀNH – KẾT NỐI": "LEARN – PRACTISE – CONNECT", "Lịch workshop và talkshow": "Workshop and talkshow schedule", "Chọn chủ đề và mức vận động phù hợp. Các hoạt động có trong tất cả gói đăng ký.": "Choose a topic and activity level that suits you. Activities are included in every registration package.",
  "Chưa có lịch cho chủ đề này": "No sessions for this topic yet", "Quay lại để xem các buổi học mới được chuyên gia và quản trị viên cập nhật.": "Check back for new sessions added by our experts and team.",
  "MỖI NGƯỜI MỘT HÀNH TRÌNH": "EVERY PERSON HAS A JOURNEY", "Nghệ nhân bạc và sản phẩm của họ": "Silver Artisans and their creations", "Những khu vườn, kỹ năng và câu chuyện được học viên đồng ý chia sẻ.": "Gardens, skills and stories shared with the learners’ permission.",
  "Sản phẩm từ hành trình học": "Creations from the learning journey", "Đặt tham quan vườn": "Request a garden visit", "Các câu chuyện đang được vun đắp": "Stories are growing", "Hồ sơ và sản phẩm chỉ xuất hiện khi học viên đồng ý công khai và quản trị viên đã duyệt.": "Profiles and products appear after the learner gives permission and our team approves them.",
  "Nền tảng học – làm – du lịch": "A place to learn, create and explore", "Chúng tôi kết nối kinh nghiệm của chuyên gia với khả năng sáng tạo của người cao tuổi. Mỗi buổi học dẫn đến thực hành, mỗi sản phẩm kể một câu chuyện, mỗi chuyến tham quan tạo thêm kết nối.": "We bring expert knowledge together with the creativity of older adults. Every session leads to practice, every product tells a story and every visit builds connections.",
  "SDG 4 · Học tập suốt đời": "SDG 4 · Lifelong learning", "Workshop và hoạt động thực hành phù hợp nhiều mức thể trạng, có trong cả ba gói.": "Workshops and practical activities for different activity levels, included in all three packages.", "SDG 8 · Tạo giá trị": "SDG 8 · Creating value", "Ghi nhận kỹ năng, giới thiệu sản phẩm và kết nối du khách với người tạo ra chúng.": "Recognise skills, showcase creations and connect visitors with their makers.",
  "Học cùng nhau. Tạo giá trị cùng nhau. Khám phá Wellness Farm.": "Learn together. Create together. Discover Wellness Farm.", "Đăng ký học viên cao tuổi": "Register as an older learner",
  "Bảng tác động": "Community impact", "Workshop tháng này": "Workshops this month", "Lịch trong tháng": "Sessions scheduled this month", "Người học": "Learners", "Hồ sơ tham gia không trùng lặp": "Unique participating learner profiles", "Sản phẩm tạo ra": "Products created", "Bản ghi sản phẩm được ghi nhận": "Recorded creations", "Lượt khách": "Visitors", "Số người đã tham quan": "Completed visitor attendance",
  "Số liệu từ hệ thống; học viên tính theo hồ sơ đã đăng ký hoặc tham gia workshop, lượt khách chỉ tính chuyến đã tham quan.": "Figures from our records: learners are registered or attending profiles; visitors are counted after completed visits.",
  "Hoạt động giống nhau · Chăm sóc khác nhau theo gói.": "The same activities · Different care benefits by package.",
  "CHUẨN BỊ CHO CHUYẾN ĐI": "PLAN YOUR VISIT", "Đăng ký online tại Wellness Farm": "Register your Wellness Farm visit", "Chọn gói Ngày, Tuần hoặc Tháng. Cả ba cùng có quyền tham gia trải nghiệm, workshop và talkshow; khác nhau về chăm sóc sức khỏe và mức ưu tiên.": "Choose a Day, Week or Month package. Every package includes experiences, workshops and talkshows, with different wellbeing support and priority levels.",
  "Gói Ngày": "Day Package", "Gói Tuần": "Week Package", "Gói Tháng": "Month Package", "1 ngày": "1 day", "7 ngày": "7 days", "30 ngày": "30 days", "Đăng ký gói này": "Register for this package",
  "Quyền lợi chung": "Included in every package", "Trải nghiệm tại nông trại": "Farm experiences", "Tham gia workshop": "Workshop participation", "Tham gia talkshow": "Talkshow participation", "Đồ ăn & nước uống": "Food & drinks",
  "So sánh chăm sóc sức khỏe": "Compare wellbeing support", "Quyền lợi": "Benefits", "Sàng lọc huyết áp & nhịp tim": "Blood pressure & heart rate screening", "Theo dõi chỉ số": "Health monitoring", "Tư vấn dinh dưỡng": "Nutrition advice", "Chuyên gia khám định kỳ": "Regular expert check-ups", "Ưu tiên đặt lịch": "Booking priority", "Ưu tiên xử lý hồ sơ": "Case processing priority",
  "Sàng lọc cơ bản": "Basic screening", "2 lần/ngày trong 7 ngày": "Twice a day for 7 days", "Có tư vấn": "Consultation included", "Mỗi tuần": "Every week", "Theo lịch chuyên gia": "Scheduled by the expert", "Tiêu chuẩn": "Standard", "Ưu tiên": "Priority", "Cao nhất": "Highest", "Bao gồm": "Included", "Chưa bao gồm": "Not included",
  "Lịch chăm sóc và chuyên gia được đội ngũ xác nhận khi tiếp nhận đăng ký.": "Our team confirms your care schedule and expert appointments when reviewing your registration.",
  "Đặt lịch trước chuyến đi": "Plan ahead", "Gửi đăng ký online. Đội ngũ sẽ xác nhận lịch và sức chứa trước chuyến đi của bạn.": "Register online. Our team will confirm dates and availability before your visit.",
  "Đăng ký tham gia": "Register to attend", "Vào danh sách chờ": "Join the waiting list", "Đã gồm trong gói": "Included in your package", "Chưa phân công": "To be assigned", "Nhẹ nhàng": "Gentle", "Vừa sức": "Moderate", "Cần hỗ trợ": "Support needed", "Đang cập nhật": "To be confirmed", "Đủ chỗ · nhận danh sách chờ": "Full · waiting list available", "Còn {count} chỗ": "{count} places available", "{count} kỹ năng đã học": "{count} skills learned",
  "Chào mừng trở lại": "Welcome back", "Tạo tài khoản gia đình": "Create a family account", "Tạo tài khoản học viên cao tuổi": "Create an older learner account", "Tạo tài khoản để quản lý hồ sơ và đặt lịch cho người thân.": "Create an account to manage profiles and registrations for your family.", "Đăng ký để học, thực hành và ghi lại hành trình của bạn.": "Register to learn, practise and record your journey.", "Đăng nhập để tiếp tục hành trình cùng Wellness Farm.": "Sign in to continue your Wellness Farm journey.",
  "Họ tên": "Full name", "Email": "Email", "Mật khẩu": "Password", "Tối thiểu 12 ký tự.": "At least 12 characters.", "Nếu quên mật khẩu, liên hệ quản trị viên; email khôi phục chưa kết nối.": "If you forgot your password, contact our team. Email recovery is not connected yet.", "Đã có tài khoản": "Already have an account", "Đăng ký": "Register", "Đóng": "Close", "Ngày sinh": "Date of birth", "Số điện thoại liên hệ": "Contact phone (optional)",
  "Tình trạng sức khỏe": "Health information", "Dị ứng / Thực phẩm cần tránh": "Allergies / foods to avoid", "Nhu cầu dinh dưỡng": "Dietary needs", "Khả năng di chuyển": "Mobility", "Tự đi lại": "Independent", "Xe lăn": "Wheelchair", "Liên hệ khẩn cấp": "Emergency contact", "Thói quen và nhu cầu đặc biệt": "Habits and special requirements",
  "Tôi đồng ý chia sẻ thông tin chăm sóc với các thành viên gia đình được cấp quyền.": "I agree to share care information with authorised family members.", "Sức khỏe cơ bản · tùy chọn": "Basic health · optional", "Chỉ ghi thông tin cần thiết để hỗ trợ thể trạng. Nội dung này không được công khai trên trang Nghệ nhân bạc.": "Only provide information needed to support your wellbeing. It is not published on the Silver Artisans page.",
  "Người học": "Learner", "Người lưu trú": "Visitor profile", "Gói dịch vụ": "Service package", "Ngày đến": "Arrival date", "Số đơn vị thời lượng": "Number of package periods", "Ghi chú": "Notes", "Xác nhận tạo": "Submit registration", "Lưu thay đổi": "Save changes", "Tạo mới · ": "New · ", "Cập nhật · ": "Edit · ",
  "Cần tạo hồ sơ người lưu trú trước.": "Create a visitor profile first.", "Tạo hồ sơ": "Create profile", "Hồ sơ người lưu trú": "Visitor profiles", "Hồ sơ người học": "Learner profiles", "Đặt lịch & lưu trú": "Registrations & stays", "Lưu trú của tôi": "My registrations", "Nhận đăng ký": "Open for registration", "Tạm ngừng": "Unavailable",
  "Chờ duyệt": "Pending review", "Chờ xử lý": "Pending", "Danh sách chờ": "Waiting list", "Đã đăng ký": "Registered", "Đã tham gia": "Attended", "Đã xác nhận": "Confirmed", "Đang lưu trú": "Checked in", "Hoàn tất": "Completed", "Đã hủy": "Cancelled", "Vắng mặt": "Absent", "Đã duyệt": "Approved", "Từ chối": "Declined", "Đã tham quan": "Visited", "Chờ xác nhận": "Awaiting verification", "Đã học": "Verified", "Ẩn": "Hidden",
  "Học mỗi ngày. Tạo giá trị mỗi ngày.": "Learn every day. Create value every day.", "Xin chào {name}. Chọn hoạt động yêu thích và theo dõi hành trình của bạn.": "Hello {name}. Explore your favourite activities and follow your journey.", "Xem workshop": "View workshops", "Workshop đã đăng ký": "Registered workshops", "Bao gồm danh sách chờ": "Including waiting list registrations", "Kỹ năng đã học": "Skills learned", "Được chuyên gia xác nhận": "Verified by an expert", "Nhật ký thực hành": "Practice journal", "Việc đã làm và bài học": "Activities and lessons", "Sản phẩm của tôi": "My creations", "Thành quả từ hành trình học": "Results of your learning journey",
  "Hành trình giá trị của bạn": "Your learning journey", "Ghi lại vườn riêng, kỹ năng, những lần thực hành và sản phẩm được tạo ra.": "Record your garden, skills, practice and creations.", "Mở hành trình": "Open my journey", "Tạo hồ sơ người học": "Create a learner profile", "Tham quan vườn": "Garden visits", "Hành trình giá trị": "Learning journey", "Vườn riêng & câu chuyện": "My garden & story", "Sản phẩm học viên": "Learner creations", "Đăng ký workshop": "Workshop registrations", "Workshop & Talkshow": "Workshops & Talkshows",
  "Tổng quan": "Overview", "Bảng điều hành": "Dashboard", "Thông báo & nhắc việc": "Notifications & reminders", "Học & thực hành": "Learning & practice", "Lưu trú": "Stays", "Trải nghiệm": "Experiences", "Yêu cầu hỗ trợ": "Support requests", "Tùy chọn": "Optional", "Sức khỏe cơ bản": "Basic health", "Chức năng": "Menu", "Tài khoản": "Account", "Cài đặt & bảo mật": "Settings & security", "Cỡ chữ Aᴀ": "Text size Aᴀ", "Gia đình": "Family", "Học viên cao tuổi": "Older learner", "Chuyên gia": "Expert", "Quản trị viên": "Administrator", "Quản lý": "Manager", "Lễ tân": "Reception", "Điều dưỡng": "Nurse", "Bác sĩ": "Doctor", "Kế toán": "Accountant",
  "Chi tiết": "Details", "Sửa": "Edit", "Xử lý": "Review", "Hủy": "Cancel", "Tên gói": "Package name", "Loại gói": "Package tier", "Giá gói (VNĐ)": "Package price (VND)", "Tên tiếng Anh": "English name", "Mô tả tiếng Anh": "English description", "Quyền lợi và mô tả": "Benefits and description", "Đang nhận đăng ký": "Open for registration",
  "Dự kiến {days} ngày · Ngày về {end} · Tổng phí {price}. Lịch cần được đội ngũ xác nhận theo sức chứa.": "Estimated {days} days · Departure {end} · Total {price}. Our team confirms dates based on availability.", "Đã lưu thành công.": "Saved successfully.", "Xin chào {name}.": "Welcome, {name}.",
  "Thông tin đăng nhập không đúng.": "Incorrect email or password.", "Email hoặc điện thoại đã được sử dụng.": "This email or phone number is already registered.", "Email hoặc điện thoại không hợp lệ.": "Invalid email or phone number.", "Mật khẩu cần 12–128 ký tự; vai trò phải hợp lệ.": "Use a password with 12–128 characters and a valid account type.", "Không thể kết nối máy chủ.": "Unable to connect to the server.", "Không thể xử lý yêu cầu. Vui lòng thử lại.": "Unable to process your request. Please try again.", "Cần chọn người lưu trú.": "Please choose a visitor profile.", "Ngày đến không được ở quá khứ.": "Arrival cannot be in the past.", "Workshop đã đủ chỗ. Bạn có thể đăng ký danh sách chờ.": "This workshop is full. You can join the waiting list.", "Không có quyền thực hiện.": "You do not have permission for this action.",
};
Object.assign(english, {
  "Tư vấn dinh dưỡng mỗi tuần": "Weekly nutrition advice",
  "Ưu tiên đặt lịch cao nhất": "Highest booking priority",
  "Quyền lợi chăm sóc đã đăng ký": "Your registered care benefits",
  "Điều hướng chính": "Main navigation",
  "Không gian xanh để học tập và thực hành tại nông trại": "A green space to learn and practise at the farm",
  "Có": "Yes",
  "Không": "No",
  "Gói": "Package",
  "Tổng phí": "Total fee",
  "Thao tác": "Actions",
  "Chi tiết": "Details",
  "Nội dung": "Details",
  "Gói & lịch": "Package & dates",
  "Mã / Người lưu trú": "Reference / visitor",
  "Mã đơn": "Registration reference",
  "Ngày về": "Departure date",
  "Thời lượng": "Package periods",
  "Trạng thái": "Status",
  "Ngày tạo": "Created",
  "Ngày cập nhật": "Updated",
  "Phòng": "Room",
  "Chưa phân phòng": "Room not assigned yet",
  "Tạo mới · ": "New · ",
  "Cập nhật · ": "Edit · ",
  "Tên tiếng Anh (tùy chọn)": "English name (optional)",
  "Mô tả tiếng Anh (tùy chọn)": "English description (optional)",
  "Vườn / sản phẩm chủ đạo tiếng Anh (tùy chọn)": "Garden / speciality in English (optional)",
  "Câu chuyện tiếng Anh (tùy chọn)": "Story in English (optional)",
  "Tên nghệ nhân / tên hiển thị": "Artisan / display name",
  "Vườn / sản phẩm chủ đạo": "Garden / speciality",
  "Khu vườn / vị trí": "Garden / location",
  "Câu chuyện của tôi": "My story",
  "Tôi đồng ý công khai nội dung này trên trang Nghệ nhân bạc.": "I agree to publish this content on the Silver Artisans page.",
  "Tên sản phẩm": "Product name",
  "Sản phẩm được tạo ra như thế nào?": "How was this product created?",
  "Số lượng": "Quantity",
  "Đơn vị": "Unit",
  "Chậu, bó, sản phẩm…": "Pots, bunches, items…",
  "Nghệ nhân / vườn tham quan": "Artisan / garden to visit",
  "Ngày mong muốn": "Preferred date",
  "Số khách": "Number of visitors",
  "Thông tin liên hệ": "Contact details",
  "Chuyên môn muốn chia sẻ": "Expertise you would like to share",
  "Kinh nghiệm và đề xuất workshop": "Your experience and workshop proposal",
  "Hồ sơ chuyên gia": "Expert applications",
  "Ngày thực hành": "Practice date",
  "Tôi đã thực hành gì?": "What did I practise?",
  "Kết quả / bài học": "Results / lessons",
  "Tiêu đề": "Title",
  "Workshop đã đăng ký": "Registered workshop",
  "Xác nhận kỹ năng": "Skill verification",
  "Họ tên / tên": "Full name / name",
  "Tên người lưu trú": "Visitor name",
  "Yêu cầu gia đình": "Support requests",
  "Tên gói": "Package name",
  "Tìm kiếm": "Search",
  "Lọc trạng thái": "Filter by status",
  "Tất cả trạng thái": "All statuses",
  "Làm mới": "Refresh",
  "Tìm kiếm trong {name}…": "Search {name}…",
  "Đã lưu thành công.": "Saved successfully.",
  "Không có quyền thực hiện.": "You do not have permission for this action.",
  "DỮ LIỆU DEMO · Số liệu và câu chuyện minh họa.": "DEMO DATA · Sample figures and stories.",
  "Khẩn cấp": "Urgent",
  "Cao": "High",
  "Bình thường": "Normal"
});
Object.assign(english, {
  "Đến nội dung chính": "Skip to main content",
  "Đang mở Wellness Farm…": "Opening Wellness Farm…",
  "Chưa có dữ liệu": "No records yet",
  "Tạo bản ghi đầu tiên để bắt đầu theo dõi.": "Create your first record to get started.",
  "Bắt đầu bằng bản ghi đầu tiên của bạn.": "Start with your first record.",
  "+ Tạo mới": "+ New record",
  "+ Ghi nhận": "+ Add record",
  "+ Đăng ký lưu trú": "+ Register a stay",
  "Vườn riêng, câu chuyện và lựa chọn công khai của từng học viên.": "Each learner’s garden, story and sharing preferences.",
  "Ghi nhận kỹ năng từ workshop; chuyên gia xác nhận kết quả học tập.": "Record workshop skills; experts verify learning outcomes.",
  "Nhật ký quá trình làm, kết quả và bài học của mỗi người.": "Record your practice, results and lessons.",
  "Thư viện sản phẩm từ hành trình học; công khai khi có đồng ý và được duyệt.": "Creations from learning, published with consent and approval.",
  "Yêu cầu tham quan; chỉ tính lượt khách sau khi hoàn tất chuyến tham quan.": "Visit requests; visitor numbers are recorded after completed visits.",
  "Chuyên môn, đề xuất buổi học và quy trình duyệt của quản trị viên.": "Expertise, session proposals and team review.",
  "Từ điều đã học đến việc đã làm và sản phẩm của riêng mỗi người.": "From learning to practice and your own creations.",
  "Đăng ký và danh sách chờ": "Registrations and waiting list",
  "Đã được chuyên gia xác nhận": "Verified by an expert",
  "Lần thực hành": "Practice sessions",
  "Nhật ký đã ghi nhận": "Recorded practice",
  "Sản phẩm": "Products",
  "Thành quả được tạo ra": "Recorded creations",
  "Chưa có nội dung được ghi nhận.": "No entries recorded yet.",
  "Tạo hồ sơ người học để bắt đầu hành trình.": "Create a learner profile to begin your journey.",
  "Đã đồng ý công khai": "Approved for public sharing",
  "Nội dung riêng tư": "Private content",
  "Người gửi": "Submitted by",
  "Yêu cầu tham quan": "Visit request",
  "{count} khách": "{count} visitors",
  "Thông tin hỗ trợ tùy chọn; không phải điều kiện để tham gia học tập.": "Optional support information; you can participate without providing it.",
  "Hỗ trợ phù hợp thể trạng": "Support for your activity level",
  "Bạn có thể ghi nhu cầu hỗ trợ trong hồ sơ người học. Dữ liệu chăm sóc đã có vẫn được lưu theo quyền truy cập.": "Add support needs to your profile. Existing care records remain protected by access permissions.",
  "Chỉ số sức khỏe": "Health readings",
  "Thuốc & chỉ định": "Medicines & prescriptions",
  "Thông tin tài khoản và trạng thái dịch vụ.": "Your account information and service status.",
  "Tài khoản của bạn": "Your account",
  "Vai trò": "Role",
  "Điện thoại": "Phone",
  "Đổi mật khẩu": "Change password",
  "Đổi mật khẩu sẽ đăng xuất tất cả phiên của tài khoản.": "Changing your password signs out all sessions for this account.",
  "Tích hợp dịch vụ": "Connected services",
  "Dịch vụ": "Service",
  "Thanh toán tự động": "Automatic payments",
  "Thiết bị y tế": "Health devices",
  "Chưa kết nối": "Not connected",
  "Email và mật khẩu": "Email and password",
  "Cơ sở dữ liệu": "Database",
  "SQLite cục bộ": "Local SQLite",
  "Xem README để cấu hình sao lưu và các yêu cầu trước khi vận hành công khai.": "See the README for backups and requirements before making the site public.",
  "Chia sẻ dữ liệu": "Data sharing",
  "Báo cáo chỉ hiện cho gia đình khi nhân viên chọn chia sẻ và hồ sơ cho phép.": "Reports are visible to authorised family members when staff share them and the profile permits access.",
  "Xem hồ sơ": "View profiles",
  "Trải nghiệm đọc": "Reading preferences",
  "Thay đổi cỡ chữ để dễ theo dõi. Giao diện hỗ trợ màn hình nhỏ và điều hướng bằng bàn phím.": "Adjust text size for easier reading. Small screens and keyboard navigation are supported.",
  "Đổi cỡ chữ Aᴀ": "Change text size Aᴀ",
  "Mật khẩu hiện tại": "Current password",
  "Mật khẩu mới": "New password",
  "Đổi mật khẩu & đăng xuất": "Change password & sign out",
  "Nền tảng học, thực hành và du lịch cộng đồng. Đăng ký online với gói Ngày, Tuần hoặc Tháng.": "A community for learning, practice and tourism. Register online for a Day, Week or Month package.",
  "Tác giả": "Author",
  "Liên Hệ Ban Quản Lý": "Contact our team",
  "Địa chỉ: Xã Bình Mỹ, TP. Hồ Chí Minh": "Address: Binh My, Ho Chi Minh City",
  "© 2026 Wellness Farm. Tất cả quyền được bảo lưu.": "© 2026 Wellness Farm. All rights reserved.",
  "Sinh ngày {date}": "Born {date}",
  "Chưa nhập": "Not provided",
  "Hồ sơ sức khỏe được bảo vệ theo quyền truy cập.": "Health information is protected by access permissions.",
  "Đồng ý chia sẻ": "Sharing permitted",
  "Chưa chia sẻ": "Private",
  "Hành trình chăm sóc": "Care history",
  "Họ tên và thông tin hỗ trợ, dị ứng, chế độ ăn, nhu cầu di chuyển.": "Names, support information, allergies, dietary needs and mobility.",
  "Tất cả": "All",
  "Nội dung / Phản hồi": "Details / response",
  "Chưa phản hồi": "No response yet",
  "Yêu cầu có trạng thái, ưu tiên và phản hồi.": "Requests with status, priority and responses.",
  "Đăng ký trải nghiệm, theo dõi lịch và trạng thái xác nhận.": "Register a visit and follow dates and confirmation status.",
  "Xác nhận hủy": "Confirm cancellation",
  "Giữ đơn": "Keep registration",
  "Hủy đăng ký lưu trú": "Cancel registration",
  "Đã hủy đăng ký.": "Registration cancelled.",
  "Nếu đã thanh toán, nhân viên cần đối soát và xử lý hoàn tiền riêng.": "If you have paid, our team needs to reconcile the payment and arrange a refund.",
  "Đã thu ròng: {paid} · Còn nợ: {due}. Nếu cần hủy sau thanh toán, nhân viên xử lý hoàn tiền riêng.": "Net paid: {paid} · Outstanding: {due}. Our team handles refunds separately for paid registrations."
});
function t(source, values = {}) {
  let result = language === "en" ? english[source] || source : source;
  if (language === "en" && !english[source] && typeof source === "string" && source.startsWith("+ ")) result = "+ " + (english[source.slice(2)] || source.slice(2));
  for (const [key, value] of Object.entries(values)) result = result.replaceAll(`{${key}}`, String(value));
  return result;
}
const uiLocale = () => language === "en" ? "en-GB" : "vi-VN";
function localized(record, key = "name") {
  return language === "en" ? record?.[key + "_en"] || t(record?.[key] || "") : record?.[key] || "";
}
function languageSwitch() {
  return `<div class="language-switch" role="group" aria-label="${language === "en" ? "Language" : "Ngôn ngữ"}"><button type="button" data-action="language" data-id="vi" lang="vi" aria-label="Tiếng Việt" aria-pressed="${language === "vi"}">VI</button><button type="button" data-action="language" data-id="en" lang="en" aria-label="English" aria-pressed="${language === "en"}">EN</button></div>`;
}
function updateLanguageDocument() {
  document.documentElement.lang = language;
  document.title = language === "en" ? "Wellness Farm — Learn, create and explore" : "Wellness Farm — Học, thực hành và du lịch";
  const skip = document.querySelector("a.skip");
  if (skip) skip.textContent = t("Đến nội dung chính");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = language === "en" ? "Learn, create and explore at Wellness Farm. Register online for Day, Week and Month packages with shared activities and different wellbeing support." : "Học, thực hành và du lịch tại Wellness Farm. Đăng ký online với gói Ngày, Tuần, Tháng: cùng hoạt động, khác quyền lợi chăm sóc sức khỏe.";
}
function translateStatic(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (english[text]) node.textContent = node.textContent.replace(text, t(text));
  }
  return element;
}
async function setLanguage(next) {
  if (!["vi", "en"].includes(next) || next === language) return;
  language = next;
  try { localStorage.setItem("wf_language", language); } catch {}
  updateLanguageDocument();
  const position = scrollY;
  if (document.querySelector(".learning-public") || !state.user) await learningLanding(state.publicView || "home");
  else shell();
  window.scrollTo({ top: position, behavior: "instant" });
}
updateLanguageDocument();
