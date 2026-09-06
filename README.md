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
└── QuanLyDangKyNgayLD/                     # Thư mục mã nguồn chính của ứng dụng
    │
    ├── App_Start/                          # Cấu hình khởi tạo ứng dụng
    │   ├── BundleConfig.cs                 # Cấu hình nén, gom nhóm file CSS/JS
    │   ├── FilterConfig.cs                 # Cấu hình bộ lọc toàn cục (Global Filters)
    │   └── RouteConfig.cs                  # Định tuyến URL cho các Controller mặc định
    │
    ├── Areas/                              # Phân chia phân hệ ứng dụng (Module)
    │   ├── Admin/                          # Phân hệ Quản trị viên
    │   │   ├── AdminAreaRegistration.cs    # Cấu hình Route riêng cho Area Admin
    │   │   ├── Controllers/                # Controllers xử lý nghiệp vụ Admin:
    │   │   │   ├── AccountController.cs          # Quản lý tài khoản, phân quyền (tích hợp Audit Log)
    │   │   │   ├── AdminController.cs            # Dashboard điều hướng chính
    │   │   │   ├── AdminStudentController.cs     # Quản lý hồ sơ sinh viên (tích hợp Audit Log)
    │   │   │   ├── AdminWordRegisterController.cs# Tạo đợt, duyệt phiếu đăng ký (tích hợp Audit Log)
    │   │   │   ├── AdminSuscesWordController.cs  # Xác nhận hoàn thành nghĩa vụ (tích hợp Audit Log)
    │   │   │   ├── AdminAuditLogController.cs    # Tra cứu, lọc, xem chi tiết JSON nhật ký xóa
    │   │   │   └── AdminTKController.cs          # Thống kê, báo cáo số liệu
    │   │   ├── ViewModel/                  # DTO/ViewModel truyền dữ liệu riêng cho Admin
    │   │   └── Views/                      # Giao diện quản trị Razor Views (.cshtml)
    │   │       └── AdminAuditLog/Index.cshtml    # Trang giao diện Lịch Sử / Nhật Ký Xóa
    │   │
    │   ├── Student/                        # Phân hệ Sinh viên
    │   │   ├── StudentAreaRegistration.cs  # Cấu hình Route riêng cho Area Student
    │   │   ├── Controllers/                # Controllers xử lý nghiệp vụ Sinh viên:
    │   │   │   ├── MainSinhVienController.cs     # Trang chủ sinh viên, thông tin cá nhân
    │   │   │   ├── StudentRegisterWordController.cs # Đăng ký đợt/ngày lao động
    │   │   │   ├── StudentCheckDayController.cs  # Kiểm tra điểm danh & lịch sử
    │   │   │   ├── StudentListDayController.cs   # Danh sách ngày đã đăng ký
    │   │   │   ├── StudentTKController.cs        # Thống kê số buổi đã đạt
    │   │   │   └── ChatBotController.cs          # Tích hợp bot giải đáp thắc mắc
    │   │   └── Views/                      # Giao diện sinh viên (.cshtml)
    │   │
    │   └── Content/                        # Tài nguyên tĩnh CSS, JS, Images dùng chung
    │
    ├── Controllers/                        # Controller dùng chung ngoài Area
    │   ├── LoginController.cs              # Xử lý Đăng nhập / Đăng xuất hệ thống
    │   ├── ForgotPasswordController.cs     # Quên mật khẩu, gửi mã OTP/link qua email
    │   └── ResetPasswordController.cs      # Xác thực đặt lại mật khẩu mới
    │
    ├── AuditHelper/                        # Xử lý ghi nhận và tra cứu Audit Log
    │   └── AuditLogHelper.cs               # Ghi nhật ký vào DB QuanLyAuditLog, phân trang & thống kê
    │
    ├── DbContextFactory/                   # Pattern quản lý vòng đời kết nối CSDL
    │   └── DbContextFactory.cs             # Khởi tạo đối tượng DBContext tập trung
    │
    ├── EmailHelper/                        # Xử lý gửi thư tự động
    │   ├── EmailHelper.cs                  # Gửi email thông báo, OTP xác nhận
    │   └── EmailHelperCompletion.cs        # Gửi email chứng nhận hoàn thành
    │
    ├── PasswordHelper/                     # Xử lý mật khẩu
    │   └── PasswordHelper.cs               # Mã hóa Hash và Kiểm tra Verify bằng BCrypt
    │
    ├── Models/                             # Mô hình dữ liệu Entity Framework (.edmx)
    │   ├── QuanLyDangKyLaoDong.edmx        # Sơ đồ quan hệ thực thể (ERD)
    │   ├── QuanLyDangKyLaoDong.Context.cs  # DBContext (DB_QLNLD4ROLEEntities1)
    │   ├── TaiKhoan.cs                     # Thực thể Tài khoản
    │   ├── VaiTro.cs                       # Thực thể Vai trò (Admin, Quản lý, Sinh viên)
    │   ├── SinhVien.cs                     # Thực thể Sinh viên
    │   ├── QuanLy.cs                       # Thực thể Cán bộ quản lý
    │   ├── Khoa.cs                         # Thực thể Khoa / Ngành
    │   ├── Lop.cs                          # Thực thể Lớp học
    │   ├── TaoDotNgayLaoDong.cs            # Thực thể Đợt lao động
    │   ├── PhieuDangKy.cs                  # Thực thể Phiếu đăng ký của sinh viên
    │   ├── PhieuDuyet.cs                   # Thực thể Phiếu duyệt tham gia
    │   ├── DanhSachDiemDanh.cs             # Thực thể Điểm danh ngày lao động
    │   ├── SoNgayLaoDong.cs                # Thực thể Tổng kết số ngày tích lũy
    │   ├── PhieuXacNhanHoanThanh.cs        # Thực thể Chứng nhận hoàn thành
    │   └── Anh.cs                          # Thực thể Lưu trữ hình ảnh/minh chứng
    │
    ├── Uploads/                            # Thư mục lưu trữ tệp tin upload (ảnh thẻ, tài liệu)
    ├── Views/                              # Giao diện chung (Shared Layout, Login...)
    ├── Global.asax / Global.asax.cs        # Vòng đời ứng dụng (Application Lifecycle)
    ├── packages.config                     # Danh mục thư viện quản lý qua NuGet
    └── Web.config                          # File cấu hình trung tâm của toàn bộ Web App
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
