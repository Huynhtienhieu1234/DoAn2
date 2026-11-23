using System;
using System.Text;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Controllers
{
    public class SwaggerController : Controller
    {
        [HttpGet]
        public ActionResult Index()
        {
            string html = @"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <title>Swagger UI - Quản Lý Lao Động Sinh Viên DThU</title>
    <link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css"" />
    <link rel=""icon"" type=""image/png"" href=""/favicon.png"" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .topbar { background-color: #1e3a8a !important; padding: 10px 0; }
        .topbar-wrapper .link { display: flex; align-items: center; color: white !important; font-weight: bold; font-size: 1.15rem; text-decoration: none; }
        .topbar-wrapper .link span { margin-left: 10px; }
        .swagger-ui .info { margin: 25px 0; }
        .swagger-ui .info .title { color: #1e3a8a; }
        .swagger-ui .btn.authorize { background-color: #0284c7; color: white; border-color: #0284c7; }
        .swagger-ui .btn.authorize svg { fill: white; }
    </style>
</head>
<body>
    <div id=""swagger-ui""></div>
    <script src=""https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js""></script>
    <script src=""https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js""></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: '/swagger/json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout'
            });
        };
    </script>
</body>
</html>";
            return Content(html, "text/html", Encoding.UTF8);
        }

        [HttpGet]
        public ActionResult Spec()
        {
            string json = @"{
  ""openapi"": ""3.0.1"",
  ""info"": {
    ""title"": ""Hệ Thống Quản Lý Lao Động Sinh Viên - DThU API"",
    ""description"": ""Tài liệu đặc tả toàn bộ các Endpoints và AJAX APIs của hệ thống Quản Lý Đăng Ký Ngày Lao Động Sinh Viên (Đại học Đồng Tháp)."",
    ""version"": ""2.0.0"",
    ""contact"": {
      ""name"": ""Ban Quản Trị Hệ Thống DThU"",
      ""url"": ""http://localhost:52154""
    }
  },
  ""servers"": [
    {
      ""url"": ""http://localhost:52154"",
      ""description"": ""Local IIS Express Server""
    }
  ],
  ""tags"": [
    { ""name"": ""Authentication"", ""description"": ""Đăng nhập, Quên mật khẩu & Phân quyền RBAC"" },
    { ""name"": ""Admin - Đợt Lao Động"", ""description"": ""Quản lý đợt lao động, sĩ số, xét duyệt ca & mã điểm danh"" },
    { ""name"": ""Admin - Xác Nhận Hoàn Thành"", ""description"": ""Xét duyệt tích lũy 18 ngày công & Nhập Excel"" },
    { ""name"": ""Admin - Sinh Viên & Tài Khoản"", ""description"": ""Quản lý danh sách sinh viên & Khóa/Mở tài khoản"" },
    { ""name"": ""Admin - Thống Kê"", ""description"": ""Thống kê tỷ lệ hoàn thành & Biểu đồ Chart.js"" },
    { ""name"": ""Student - Đăng Ký Lao Động"", ""description"": ""Tra cứu đợt, Đăng ký ca cá nhân & Đăng ký theo lớp"" },
    { ""name"": ""Student - Điểm Danh"", ""description"": ""Điểm danh trực tuyến bằng mã đối soát bảo mật 6 ký tự"" },
    { ""name"": ""Student - Tiến Độ"", ""description"": ""Xem lịch sử ca lao động & Tiến độ tích lũy ngày công"" },
    { ""name"": ""ChatBot"", ""description"": ""Chatbot AI tư vấn và giải đáp quy định lao động"" }
  ],
  ""paths"": {
    ""/Login/Login"": {
      ""post"": {
        ""tags"": [""Authentication""],
        ""summary"": ""Đăng nhập hệ thống"",
        ""description"": ""Xác thực tài khoản bằng Username và Password với mã hóa BCrypt."",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/x-www-form-urlencoded"": {
              ""schema"": {
                ""type"": ""object"",
                ""properties"": {
                  ""Username"": { ""type"": ""string"", ""example"": ""admin"" },
                  ""Password"": { ""type"": ""string"", ""example"": ""123456"" }
                },
                ""required"": [""Username"", ""Password""]
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""Đăng nhập thành công, chuyển hướng theo vai trò (Role)."" },
          ""400"": { ""description"": ""Sai tài khoản hoặc mật khẩu."" }
        }
      }
    },
    ""/Login/Logout"": {
      ""get"": {
        ""tags"": [""Authentication""],
        ""summary"": ""Đăng xuất khỏi hệ thống"",
        ""responses"": {
          ""302"": { ""description"": ""Hủy Session và chuyển hướng về trang Login."" }
        }
      }
    },
    ""/Admin/AdminWordRegister/LoadDotLaoDong"": {
      ""get"": {
        ""tags"": [""Admin - Đợt Lao Động""],
        ""summary"": ""Tải danh sách đợt lao động"",
        ""description"": ""Lấy danh sách các đợt lao động kèm số lượng đăng ký thực tế, số lượng lớp tiếp nhận và giới hạn SV mỗi lớp."",
        ""parameters"": [
          { ""name"": ""page"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 1 } },
          { ""name"": ""pageSize"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 10 } },
          { ""name"": ""search"", ""in"": ""query"", ""schema"": { ""type"": ""string"" } },
          { ""name"": ""sortField"", ""in"": ""query"", ""schema"": { ""type"": ""string"", ""default"": ""date"" } },
          { ""name"": ""sortDir"", ""in"": ""query"", ""schema"": { ""type"": ""string"", ""default"": ""desc"" } }
        ],
        ""responses"": {
          ""200"": {
            ""description"": ""Trả về danh sách đợt lao động và thông tin phân trang.""
          }
        }
      }
    },
    ""/Admin/AdminWordRegister/CreateAjax"": {
      ""post"": {
        ""tags"": [""Admin - Đợt Lao Động""],
        ""summary"": ""Tạo mới đợt lao động"",
        ""description"": ""Thêm mới một ca lao động (hỗ trợ cả loại Cá Nhân và loại Lớp với SoLuongLop và SoLuongSinhVien)."",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/x-www-form-urlencoded"": {
              ""schema"": {
                ""type"": ""object"",
                ""properties"": {
                  ""DotLaoDong"": { ""type"": ""string"", ""example"": ""Vệ sinh khu nhà B"" },
                  ""NgayLaoDong"": { ""type"": ""string"", ""format"": ""date"", ""example"": ""2026-11-25"" },
                  ""Buoi"": { ""type"": ""string"", ""enum"": [""Sáng"", ""Chiều""], ""example"": ""Sáng"" },
                  ""LoaiLaoDong"": { ""type"": ""string"", ""enum"": [""Cá Nhân"", ""Lớp""], ""example"": ""Lớp"" },
                  ""SoLuongLop"": { ""type"": ""integer"", ""example"": 1 },
                  ""SoLuongSinhVien"": { ""type"": ""integer"", ""example"": 20 },
                  ""GiaTri"": { ""type"": ""integer"", ""example"": 1 },
                  ""KhuVuc"": { ""type"": ""string"", ""example"": ""Khu B - Sảnh chính"" },
                  ""MoTa"": { ""type"": ""string"", ""example"": ""Quét dọn và lau chùi bàn ghế"" }
                },
                ""required"": [""DotLaoDong"", ""NgayLaoDong"", ""Buoi"", ""LoaiLaoDong""]
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Thêm đợt lao động thành công!' }"" }
        }
      }
    },
    ""/Admin/AdminWordRegister/DuyetAjax"": {
      ""post"": {
        ""tags"": [""Admin - Đợt Lao Động""],
        ""summary"": ""Phê duyệt đợt lao động"",
        ""description"": ""Chốt danh sách và mở cổng đợt lao động khi đã đủ điều kiện số lượng đăng ký."",
        ""parameters"": [
          { ""name"": ""id"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Duyệt đợt lao động thành công!' }"" }
        }
      }
    },
    ""/Admin/AdminWordRegister/HienThiMaDiemDanh"": {
      ""get"": {
        ""tags"": [""Admin - Đợt Lao Động""],
        ""summary"": ""Lấy mã điểm danh bí mật"",
        ""description"": ""Cung cấp mã điểm danh 6 ký tự để cán bộ công bố tại hiện trường."",
        ""parameters"": [
          { ""name"": ""id"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, maDiemDanh: 'ABC123' }"" }
        }
      }
    },
    ""/Student/StudentRegisterWord/LoadDotLaoDong"": {
      ""get"": {
        ""tags"": [""Student - Đăng Ký Lao Động""],
        ""summary"": ""Sinh viên xem danh sách đợt đang mở"",
        ""parameters"": [
          { ""name"": ""page"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 1 } },
          { ""name"": ""pageSize"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 10 } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""Danh sách đợt lao động hợp lệ dành cho sinh viên/lớp phó."" }
        }
      }
    },
    ""/Student/StudentRegisterWord/DangKyCaNhan"": {
      ""post"": {
        ""tags"": [""Student - Đăng Ký Lao Động""],
        ""summary"": ""Sinh viên đăng ký ca cá nhân"",
        ""parameters"": [
          { ""name"": ""dotId"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Đăng ký thành công!' }"" }
        }
      }
    },
    ""/Student/StudentRegisterWord/DangKyTheoLop"": {
      ""post"": {
        ""tags"": [""Student - Đăng Ký Lao Động""],
        ""summary"": ""Cán sự lớp đăng ký theo danh sách lớp"",
        ""description"": ""Kiểm tra số lớp tiếp nhận và số lượng sinh viên không vượt quá giới hạn SoLuongSinhVien của đợt."",
        ""parameters"": [
          { ""name"": ""dotId"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } },
          { ""name"": ""mssvList"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""array"", ""items"": { ""type"": ""integer"" } } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Đăng ký theo lớp thành công!' }"" }
        }
      }
    },
    ""/Student/StudentCheckDay/DiemDanhAjax"": {
      ""post"": {
        ""tags"": [""Student - Điểm Danh""],
        ""summary"": ""Sinh viên nhập mã điểm danh"",
        ""description"": ""Kiểm tra mã điểm danh bảo mật với cơ sở dữ liệu và ghi nhận ngày công nếu chính xác."",
        ""parameters"": [
          { ""name"": ""dotId"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } },
          { ""name"": ""maDiemDanh"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""string"" } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Điểm danh thành công!' }"" }
        }
      }
    },
    ""/Admin/AdminSuscesWord/LoadData"": {
      ""get"": {
        ""tags"": [""Admin - Xác Nhận Hoàn Thành""],
        ""summary"": ""Tải danh sách sinh viên đủ 18 ngày công"",
        ""parameters"": [
          { ""name"": ""page"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 1 } },
          { ""name"": ""pageSize"", ""in"": ""query"", ""schema"": { ""type"": ""integer"", ""default"": 10 } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""Danh sách phiếu hoàn thành nghĩa vụ lao động."" }
        }
      }
    },
    ""/Admin/AdminSuscesWord/DuyetAjax"": {
      ""post"": {
        ""tags"": [""Admin - Xác Nhận Hoàn Thành""],
        ""summary"": ""Phê duyệt hoàn thành nghĩa vụ lao động"",
        ""parameters"": [
          { ""name"": ""id"", ""in"": ""query"", ""required"": true, ""schema"": { ""type"": ""integer"" } }
        ],
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, message: 'Duyệt hoàn thành thành công!' }"" }
        }
      }
    },
    ""/Student/ChatBot/SendMessage"": {
      ""post"": {
        ""tags"": [""ChatBot""],
        ""summary"": ""Gửi câu hỏi tới ChatBot tư vấn"",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""type"": ""object"",
                ""properties"": {
                  ""message"": { ""type"": ""string"", ""example"": ""Làm thế nào để đủ điều kiện hoàn thành lao động?"" }
                }
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""{ success: true, reply: 'Bạn cần tích lũy đủ 18 ngày lao động...' }"" }
        }
      }
    }
  }
}";
            return Content(json, "application/json", Encoding.UTF8);
        }
    }
}
