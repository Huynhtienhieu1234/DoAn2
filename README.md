# HỆ THỐNG QUẢN LÝ ĐĂNG KÝ NGÀY LAO ĐỘNG SINH VIÊN (QuanLyDangKyNgayLD)

Hệ thống web hỗ trợ nhà trường và sinh viên trong việc quản lý, tổ chức, đăng ký và theo dõi tiến độ hoàn thành các đợt lao động công ích / hoạt động ngoại khóa dành cho sinh viên.

---

## 📌 MỤC LỤC
1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Cấu trúc thư mục dự án](#3-cấu-trúc-thư-mục-dự-án)
4. [Cấu hình & Chi tiết kết nối Cơ sở dữ liệu](#4-cấu-hình--chi-tiết-kết-nối-cơ-sở-dữ-liệu)
5. [Các chức năng chính](#5-các-chức-năng-chính)
6. [Hướng dẫn cài đặt & Khởi chạy](#6-hướng-dẫn-cài-đặt--khởi-chạy)

---

## 1. GIỚI THIỆU TỔNG QUAN

- **Tên dự án:** Quản Lý Đăng Ký Ngày Lao Động Sinh Viên (`QuanLyDangKyNgayLD`)
- **Đối tượng sử dụng:**
  - **Quản trị viên / Cán bộ quản lý (Admin):** Tạo đợt lao động, quản lý tài khoản, xét duyệt đơn đăng ký, điểm danh, cấp chứng nhận hoàn thành và xuất báo cáo thống kê.
  - **Sinh viên (Student):** Tra cứu đợt lao động đang mở, đăng ký ca làm việc, theo dõi lịch sử tham gia, kiểm tra kết quả điểm danh, số ngày tích lũy và nhận hỗ trợ tự động qua Chatbot.

---

## 2. CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công nghệ / Thư viện | Ghi chú |
| :--- | :--- | :--- |
| **Nền tảng** | ASP.NET MVC 5 (.NET Framework 4.8) | Kiến trúc MVC truyền thống, chuẩn hóa module bằng `Areas` |
| **ORM / Data Access** | Entity Framework 6.5.1 (Database First) | Mô hình `.edmx` kết nối trực tiếp CSDL SQL Server |
| **Cơ sở dữ liệu** | Microsoft SQL Server | Tên CSDL: `QuanLyLaoDongSinhVien` |
| **Mật mã & Bảo mật** | `BCrypt.Net-Next 4.0.3` | Băm mật khẩu một chiều có salt chống tấn công Brute-force |
| **Xử lý Excel** | `EPPlus 6.2.2` | Đọc / Ghi file Excel phục vụ import/export danh sách |
| **Giao diện (Frontend)**| HTML5, CSS3, JavaScript, jQuery, Bootstrap, FontAwesome | Thiết kế Responsive, tích hợp biểu đồ thống kê Chart.js |
| **Tiện ích mở rộng** | `System.Net.Mail` (SMTP) | Tự động gửi email xác nhận và thông báo kết quả |

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
DoAn2/
│
├── packages/                               # Thư mục chứa các NuGet packages cài đặt
├── QuanLyDangKyNgayLD.sln                  # Visual Studio Solution
│
└── QuanLyDangKyNgayLD/                     # Thư mục mã nguồn chính của ứng dụng ASP.NET MVC
    │
    ├── App_Start/                          # Cấu hình khởi tạo toàn cục của ứng dụng
    │   ├── BundleConfig.cs                 # Cấu hình Bundle nén và gom nhóm tài nguyên tĩnh (CSS/JS)
    │   ├── FilterConfig.cs                 # Đăng ký bộ lọc toàn cục (Global Action Filters)
    │   └── RouteConfig.cs                  # Thiết lập quy tắc định tuyến URL (Default Route)
    │
    ├── Areas/                              # Phân chia các phân hệ nghiệp vụ độc lập (Module/Area)
    │   │
    │   ├── Admin/                          # PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN AREA)
    │   │   ├── AdminAreaRegistration.cs    # Đăng ký route riêng cho Area Admin (/Admin/{controller}/{action}/{id})
    │   │   ├── Content/                    # Tài nguyên giao diện riêng cho Admin
    │   │   │   ├── css/                    # Stylesheet tùy chỉnh cho Admin
    │   │   │   │   ├── Adminsuscessword.css    # Style trang xác nhận hoàn thành đợt lao động
    │   │   │   │   └── AdminTK.css             # Style trang thống kê, báo cáo của Admin
    │   │   │   └── js/                     # Scripts tương tác trang Admin
    │   │   │       ├── Adminsuscessword.js     # Xử lý duyệt hoàn thành và cấp xác nhận
    │   │   │       ├── AdminTK.js              # Khởi tạo biểu đồ và xử lý bộ lọc thống kê
    │   │   │       └── duyetHandler.js         # Xử lý nghiệp vụ xét duyệt phiếu đăng ký
    │   │   ├── Controllers/                # Controllers xử lý nghiệp vụ phía Admin
    │   │   │   ├── AccountController.cs          # Quản lý tài khoản (CRUD, phân quyền, import/export, Audit Log)
    │   │   │   ├── AdminAuditLogController.cs    # Quản lý, tra cứu, xem chi tiết JSON nhật ký Audit Log
    │   │   │   ├── AdminController.cs            # Dashboard điều hướng chính của Admin
    │   │   │   ├── AdminStudentController.cs     # Quản lý danh sách, hồ sơ sinh viên, import/export Excel
    │   │   │   ├── AdminSuscesWordController.cs  # Xác nhận hoàn thành nghĩa vụ & xuất báo cáo hoàn thành
    │   │   │   ├── AdminTKController.cs          # Thống kê số liệu, tỷ lệ tham gia và xuất báo cáo
    │   │   │   ├── AdminWordRegisterController.cs# Quản lý đợt lao động, duyệt sinh viên đăng ký
    │   │   │   └── WordCreateRegister.cs         # Xử lý logic tạo mới đợt và phân bổ ngày lao động
    │   │   ├── ViewModel/                  # DTO / ViewModel phục vụ truyền dữ liệu trong Admin
    │   │   │   └── StudentProgressViewModel.cs   # Model thể hiện tiến độ tham gia lao động của sinh viên
    │   │   └── Views/                      # Giao diện Razor Views (.cshtml) của Admin
    │   │       ├── Account/                # Quản lý danh sách tài khoản (Index.cshtml)
    │   │       ├── Admin/                  # Trang chủ / Dashboard quản trị (Index.cshtml)
    │   │       ├── AdminAuditLog/          # Tra cứu lịch sử / nhật ký xóa hệ thống (Index.cshtml)
    │   │       ├── AdminStudent/           # Quản lý danh sách sinh viên (Index.cshtml)
    │   │       ├── AdminSuscesWord/        # Danh sách hoàn thành & cấp chứng nhận (Index.cshtml)
    │   │       ├── AdminTK/                # Báo cáo thống kê & Biểu đồ Chart.js (Index.cshtml)
    │   │       ├── AdminWordRegister/      # Danh sách & tạo đợt lao động, duyệt đăng ký (Index.cshtml)
    │   │       └── Shared/                 # Layouts và Partial Views dùng chung trong Admin
    │   │           └── ViewShare.cshtml        # Layout Master chính của phân hệ Admin
    │   │
    │   ├── Student/                        # PHÂN HỆ SINH VIÊN (STUDENT AREA)
    │   │   ├── StudentAreaRegistration.cs  # Đăng ký route riêng cho Area Student (/Student/{controller}/{action}/{id})
    │   │   ├── Content/                    # Tài nguyên giao diện phía Sinh viên
    │   │   │   ├── Css/                    # Stylesheet cho giao diện sinh viên
    │   │   │   │   ├── Dashboard.css           # Giao diện trang chủ và thống kê sinh viên
    │   │   │   │   ├── Siderbarmain.css        # Giao diện menu sidebar điều hướng
    │   │   │   │   ├── Table.css               # Định dạng bảng biểu hiển thị dữ liệu
    │   │   │   │   └── Toast.css               # Thông báo Toast notification động
    │   │   │   └── Js/                     # Javascript xử lý tương tác giao diện sinh viên
    │   │   │       ├── ChatBot/            # Module Chatbot hỗ trợ tự động (ChatBot.js)
    │   │   │       ├── Register/           # Xử lý hủy đăng ký ca lao động (DeleteRegister.js)
    │   │   │       ├── StudentCheckDay/    # Kiểm tra điểm danh & kết quả theo ca (StudentCheckDay.js)
    │   │   │       ├── StudentListDay/     # Tra cứu lịch sử các ngày đã tham gia (StudentListDay.js)
    │   │   │       ├── StudentMain/        # Xử lý thông tin cá nhân & dashboard (StudentInfo.js, StudentMain.js)
    │   │   │       ├── StudentRegister/    # Đăng ký ngày lao động, hiển thị lớp phó (StudentRegister.js, StudentListClass.js, LopPhoTableOverride.js)
    │   │   │       ├── StudentTK/          # Thống kê số buổi đã đạt của cá nhân (StudentTK.js)
    │   │   │       └── Viewsider/          # Hiệu ứng thu phóng sidebar & responsive (LayoutUser.js, Viewsider.js)
    │   │   ├── Controllers/                # Controllers xử lý nghiệp vụ phía Sinh viên
    │   │   │   ├── ChatBotController.cs          # Chatbot tư vấn, trả lời tự động câu hỏi thường gặp
    │   │   │   ├── MainSinhVienController.cs     # Trang chủ sinh viên, xem và cập nhật hồ sơ cá nhân
    │   │   │   ├── StudentCheckDayController.cs  # Kiểm tra kết quả điểm danh, số ngày hợp lệ
    │   │   │   ├── StudentListDayController.cs   # Danh sách và tiến độ các ngày lao động đã đăng ký
    │   │   │   ├── StudentRegisterWordController.cs # Xem lịch đợt mở và thực hiện đăng ký tham gia
    │   │   │   └── StudentTKController.cs        # Thống kê tổng hợp số ngày tích lũy của sinh viên
    │   │   └── Views/                      # Giao diện Razor Views (.cshtml) của Sinh viên
    │   │       ├── ChatBot/                # Giao diện hộp thoại Chatbot tương tác
    │   │       ├── MainSinhVien/           # Trang cá nhân (Index.cshtml, Detail.cshtml)
    │   │       ├── StudentCheckDay/        # Trang kiểm tra điểm danh (Index.cshtml)
    │   │       ├── StudentListDay/         # Trang lịch sử đăng ký (Index.cshtml)
    │   │       ├── StudentRegisterWord/    # Trang đăng ký đợt lao động (Index.cshtml)
    │   │       ├── StudentTK/              # Trang thống kê cá nhân (Index.cshtml)
    │   │       └── Shared/                 # Layouts và Partial Views dùng chung của Sinh viên
    │   │           ├── Viewsiderbar.cshtml     # Sidebar điều hướng của sinh viên
    │   │           └── ViewSinhvien.cshtml     # Layout Master chính của phân hệ Sinh viên
    │   │
    │   ├── Content/                        # Tài nguyên tĩnh tổng hợp dùng chung giữa các Area
    │   │   ├── admin.css                   # Định kiểu tổng quan trang Admin
    │   │   ├── adminpage.css               # Định kiểu bổ trợ trang quản trị
    │   │   ├── css/                        # Stylesheets module
    │   │   │   ├── AdminCount.css              # Style bộ đếm và chỉ số thống kê
    │   │   │   ├── AdminStudentRegister.css    # Style bảng quản lý sinh viên đăng ký
    │   │   │   └── admonWwordRegister.css      # Style giao diện tạo và quản lý đợt
    │   │   ├── Js/                         # Scripts tiện ích hệ thống
    │   │   │   ├── adminCommon.js              # Tiện ích chung cho Admin (thông báo, định dạng ngày)
    │   │   │   ├── adminWordRegistor.js        # Script quản lý form tạo đợt lao động
    │   │   │   └── CreateCode.js               # Tạo mã định danh tự động
    │   │   ├── AdminStudentRegister/       # Scripts xử lý import/export và tương tác bảng sinh viên
    │   │   │   ├── AdminExportStudent.js       # Xuất danh sách sinh viên ra Excel
    │   │   │   ├── AdminImportStudent.js       # Import danh sách sinh viên từ file Excel
    │   │   │   └── AdminStudentRegister.js     # Thao tác thêm/xóa/sửa sinh viên
    │   │   └── jsAccount/                  # Scripts quản lý tài khoản người dùng
    │   │       ├── Account.js                  # Khởi tạo và xử lý bảng tài khoản
    │   │       ├── AdminPagesize.js            # Phân trang động danh sách
    │   │       ├── DeleteAcount.js             # Xử lý xóa mềm / xóa cứng tài khoản kèm ghi log
    │   │       ├── DetailAcount.js             # Xem modal chi tiết thông tin tài khoản
    │   │       ├── EditAcount.js               # Cập nhật thông tin và quyền tài khoản
    │   │       ├── ExportExcel.js              # Xuất danh sách tài khoản sang Excel
    │   │       ├── FilterSearchAccounts.js     # Tìm kiếm, lọc theo vai trò và trạng thái
    │   │       └── ResetpasswordAcount.js      # Reset mật khẩu tài khoản về mặc định
    │   │
    │   └── Models/                         # ViewModels dùng chung giữa các Areas
    │       └── AdminThongKeViewModel.cs    # Model tổng hợp dữ liệu báo cáo thống kê
    │
    ├── Controllers/                        # Controllers xác thực dùng chung (ngoài Area)
    │   ├── LoginController.cs              # Xử lý Đăng nhập / Đăng xuất, ghi log đăng nhập
    │   ├── ForgotPasswordController.cs     # Xử lý Quên mật khẩu, gửi mã OTP xác nhận qua Email
    │   └── ResetPasswordController.cs      # Xác thực mã OTP và cập nhật mật khẩu mới
    │
    ├── AuditHelper/                        # Xử lý ghi nhận và tra cứu Audit Log (Nhật ký thao tác)
    │   └── AuditLogHelper.cs               # Ghi nhật ký vào DB QuanLyAuditLog (Delete/Update/Restore), phân trang & thống kê
    │
    ├── DbContextFactory/                   # Quản lý tập trung vòng đời kết nối CSDL (Factory Pattern)
    │   └── DbContextFactory.cs             # Khởi tạo và giải phóng DB_QLNLD4ROLEEntities1 an toàn
    │
    ├── EmailHelper/                        # Xử lý gửi thư tự động qua giao thức SMTP (System.Net.Mail)
    │   ├── EmailHelper.cs                  # Gửi email thông báo, OTP xác nhận quên mật khẩu, phản hồi đăng ký
    │   └── EmailHelperCompletion.cs        # Gửi email chứng nhận hoàn thành đợt lao động kèm file/thông tin
    │
    ├── Logs/                               # Module ghi nhật ký vận hành và lưu trữ log file
    │   ├── LoginLogger.cs                  # Service ghi lại lịch sử đăng nhập (IP, thời gian, tài khoản, trạng thái)
    │   ├── LichSuDangNhap.txt              # File lưu vết lịch sử các phiên đăng nhập vào hệ thống
    │   └── ErrorLog.txt                    # File lưu vết các ngoại lệ/lỗi runtime
    │
    ├── PasswordHelper/                     # Xử lý bảo mật mật khẩu
    │   └── PasswordHelper.cs               # Mã hóa Hash (BCrypt.HashPassword) và Kiểm tra Verify (BCrypt.Verify)
    │
    ├── Models/                             # Mô hình dữ liệu Entity Framework 6 (Database First)
    │   ├── QuanLyDangKyLaoDong.edmx        # Sơ đồ quan hệ thực thể ánh xạ CSDL (EDMX Model)
    │   ├── QuanLyDangKyLaoDong.edmx.diagram# Sơ đồ trực quan quan hệ giữa các bảng
    │   ├── QuanLyDangKyLaoDong.Context.cs  # DbContext quản lý kết nối CSDL (DB_QLNLD4ROLEEntities1)
    │   ├── TaiKhoan.cs                     # Thực thể Tài khoản (Tên đăng nhập, Mật khẩu đã hash, Vai trò)
    │   ├── VaiTro.cs                       # Thực thể Vai trò phân quyền (Admin, Quản lý, Sinh viên)
    │   ├── SinhVien.cs                     # Thực thể Sinh viên (MSSV, Họ tên, Lớp, Khoa, Email, SĐT, Ảnh đại diện)
    │   ├── QuanLy.cs                       # Thực thể Cán bộ quản lý / Giảng viên phụ trách
    │   ├── Khoa.cs                         # Thực thể Khoa / Đơn vị đào tạo
    │   ├── Lop.cs                          # Thực thể Lớp học sinh viên
    │   ├── TaoDotNgayLaoDong.cs            # Thực thể Đợt lao động (Tên đợt, Ngày bắt đầu, Ngày kết thúc, Địa điểm, Số lượng tối đa)
    │   ├── PhieuDangKy.cs                  # Thực thể Phiếu đăng ký ngày lao động của sinh viên
    │   ├── PhieuDuyet.cs                   # Thực thể Phiếu duyệt tham gia từ phía Quản lý/Admin
    │   ├── DanhSachDiemDanh.cs             # Thực thể Điểm danh ngày lao động (Trạng thái có mặt, Đánh giá)
    │   ├── SoNgayLaoDong.cs                # Thực thể Tổng kết số ngày lao động tích lũy của sinh viên
    │   ├── PhieuXacNhanHoanThanh.cs        # Thực thể Giấy chứng nhận hoàn thành nghĩa vụ lao động
    │   └── Anh.cs                          # Thực thể Lưu trữ đường dẫn hình ảnh / minh chứng
    │
    ├── Uploads/                            # Thư mục lưu trữ tệp tin upload từ người dùng
    │   └── Avatars/                        # Lưu trữ ảnh đại diện (avatar) của sinh viên và cán bộ
    │
    ├── Views/                              # Giao diện xác thực chung (ngoài Area)
    │   ├── Login/                          # Giao diện trang Đăng nhập hệ thống (Login.cshtml)
    │   ├── ForgotPassword/                 # Giao diện Yêu cầu gửi OTP quên mật khẩu (ForgotPassword.cshtml)
    │   ├── ResetPassword/                  # Giao diện Nhập OTP & Đổi mật khẩu mới (ResetPassword.cshtml)
    │   └── web.config                      # Cấu hình Razor View Engine cho thư mục Views gốc
    │
    ├── Global.asax / Global.asax.cs        # Xử lý vòng đời ứng dụng (Application_Start, Session_Start...)
    ├── packages.config                     # Danh mục các thư viện quản lý qua NuGet Packages
    ├── QuanLyDangKyNgayLD.csproj           # File cấu hình Project C# của Visual Studio
    └── Web.config                          # File cấu hình trung tâm (ConnectionStrings, AppSettings, Auth, System.web)
```

---

## 4. CẤU HÌNH & CHI TIẾT KẾT NỐI CƠ SỞ DỮ LIỆU

Chuỗi kết nối cơ sở dữ liệu được định cấu hình tại thẻ `<connectionStrings>` trong file [Web.config](file:///d:/DoAn2/DoAn2/QuanLyDangKyNgayLD/Web.config).

### 4.1. Chuỗi kết nối mẫu trong `Web.config`

```xml
<connectionStrings>
  <!-- Database chính: Quản lý nghiệp vụ lao động -->
  <add name="DB_QLNLD4ROLEEntities" 
       connectionString="metadata=res://*/Models.QuanLyDangKyLaoDong.csdl|res://*/Models.QuanLyDangKyLaoDong.ssdl|res://*/Models.QuanLyDangKyLaoDong.msl;provider=System.Data.SqlClient;provider connection string=&quot;data source=.\SQLEXPRESS;initial catalog=QuanLyLaoDongSinhVien;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;App=EntityFramework&quot;" 
       providerName="System.Data.EntityClient" />

  <add name="DB_QLNLD4ROLEEntities1" 
       connectionString="metadata=res://*/Models.QuanLyDangKyLaoDong.csdl|res://*/Models.QuanLyDangKyLaoDong.ssdl|res://*/Models.QuanLyDangKyLaoDong.msl;provider=System.Data.SqlClient;provider connection string=&quot;data source=.\SQLEXPRESS;initial catalog=QuanLyLaoDongSinhVien;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;App=EntityFramework&quot;" 
       providerName="System.Data.EntityClient" />

  <!-- Database phụ: Nhật ký Audit Log ghi nhận thao tác xóa dữ liệu -->
  <add name="QuanLyAuditLogConnection" 
       connectionString="data source=.\SQLEXPRESS;initial catalog=QuanLyAuditLog;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;" 
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

### 4.2. Giải thích chi tiết các tham số kết nối

| Tham số | Giá trị mẫu | Giải thích chi tiết |
| :--- | :--- | :--- |
| **`name`** | `DB_QLNLD4ROLEEntities1` | Tên của chuỗi kết nối, tương ứng với lớp kế thừa `DbContext` trong code C#. |
| **`providerName`** | `System.Data.EntityClient` | Provider kết nối cho Entity Framework để ánh xạ CSDL qua Metadata EDMX. |
| **`metadata`** | `res://*/Models/...` | Đường dẫn đến các tài nguyên ánh xạ schema (`.csdl`, `.ssdl`, `.msl`). |
| **`data source` / `Server`** | `.\SQLEXPRESS` | Địa chỉ máy chủ SQL Server. Một số giá trị thường gặp:<br>• `.\SQLEXPRESS` (SQL Server Express)<br>• `localhost` hoặc `.` (SQL Server Default Instance)<br>• `(localdb)\MSSQLLocalDB` (LocalDB)<br>• `IP,PORT` (Máy chủ từ xa, ví dụ `192.168.1.100,1433`) |
| **`initial catalog`** | `QuanLyLaoDongSinhVien` | Tên cơ sở dữ liệu trên SQL Server. |
| **`integrated security`** | `True` | Sử dụng xác thực Windows Authentication của tài khoản máy đang chạy. |
| **`User ID` & `Password`** | *(Nếu dùng SQL Auth)* | Thêm `user id=sa;password=MatKhau123;` nếu không dùng Windows Authentication. |
| **`trustservercertificate`** | `True` | Bỏ qua kiểm tra chứng chỉ SSL/TLS tự ký của SQL Server, tránh lỗi handshake. |
| **`MultipleActiveResultSets`** | `True` (MARS) | Cho phép thực thi đồng thời nhiều truy vấn trên cùng một connection. |
| **`App`** | `EntityFramework` | Tên định danh ứng dụng gửi đến SQL Server Profiler/Activity Monitor. |

---

## 5. CÁC CHỨC NĂNG CHÍNH

### 👑 Phân hệ Admin
1. **Quản lý Đợt lao động:** Tạo đợt, thiết lập thời gian, địa điểm, nội dung công việc và số lượng sinh viên tối đa mỗi ca.
2. **Xét duyệt đăng ký:** Duyệt hoặc từ chối phiếu đăng ký của sinh viên, gửi email phản hồi tự động.
3. **Điểm danh & Giám sát:** Ghi nhận có mặt/vắng mặt, đánh giá mức độ hoàn thành nhiệm vụ theo từng ngày.
4. **Cấp xác nhận hoàn thành:** Tự động tổng hợp số ngày đạt chuẩn để xét cấp giấy xác nhận hoàn thành nghĩa vụ lao động.
5. **Thống kê & Báo cáo:** Biểu đồ tỷ lệ hoàn thành, thống kê theo khoa/lớp/học kỳ, xuất báo cáo ra file Excel (`EPPlus`).

### 🎓 Phân hệ Sinh viên
1. **Tra cứu & Đăng ký:** Xem danh sách các đợt lao động đang mở, đăng ký lịch phù hợp.
2. **Theo dõi tiến độ:** Xem lịch sử tham gia, trạng thái duyệt và số ngày lao động đã tích lũy.
3. **Chatbot hỗ trợ:** Tra cứu nhanh quy định, thời hạn và giải đáp thắc mắc liên quan đến ngày lao động.

### 🔒 Xác thực & Bảo mật
- Mã hóa mật khẩu an toàn chuẩn ngành với thuật toán `BCrypt`.
- Quy trình Quên mật khẩu / Đổi mật khẩu với mã xác thực gửi qua Email.
- Kiểm soát phân quyền truy cập nghiêm ngặt theo vai trò giữa các Area.

---

## 6. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### 6.1. Yêu cầu hệ thống
- **Hệ điều hành:** Windows 10/11 hoặc Windows Server
- **Công cụ phát triển:** Visual Studio 2019 / 2022 (cài gói *ASP.NET and web development*)
- **Framework:** .NET Framework 4.8
- **Hệ quản trị CSDL:** SQL Server 2016 trở lên hoặc SQL Server Express

### 6.2. Các bước cài đặt

1. **Khởi tạo CSDL:**
   - Mở SQL Server Management Studio (SSMS).
   - Tạo CSDL tên: `QuanLyLaoDongSinhVien` và chạy script database đi kèm.

2. **Cập nhật chuỗi kết nối:**
   - Mở file `QuanLyDangKyNgayLD/Web.config`.
   - Điều chỉnh `data source` tại `connectionStrings` cho khớp với tên instance SQL Server trên máy của bạn.

3. **Mở dự án & Khôi phục Packages:**
   - Mở file solution `QuanLyDangKyNgayLD.sln` bằng Visual Studio.
   - Nhấp chuột phải vào Solution $\rightarrow$ chọn **Restore NuGet Packages**.

4. **Biên dịch & Khởi chạy:**
   - Nhấn phím `F5` hoặc `Ctrl + F5` để khởi chạy ứng dụng trên IIS Express.
   - Trình duyệt sẽ tự động mở trang đăng nhập tại địa chỉ: `http://localhost:<port>/Login`.
