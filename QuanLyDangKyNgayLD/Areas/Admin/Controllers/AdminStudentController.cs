using OfficeOpenXml;
using OfficeOpenXml.Style;
using QuanLyDangKyNgayLD.AuditHelper;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data.Entity;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminStudentController : Controller
    {
        private const int ITEMS_PER_PAGE = 10;

        // GET: Admin/AdminStudent
        public ActionResult Index(int page = 1, string search = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens.Include(s => s.Lop).Include(s => s.TaiKhoan1);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(s => s.HoTen.Contains(search)
                                          || s.MSSV.ToString().Contains(search)
                                          || s.Email.Contains(search));
                }

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / ITEMS_PER_PAGE);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var students = query
                    .OrderBy(s => s.MSSV)
                    .Skip((page - 1) * ITEMS_PER_PAGE)
                    .Take(ITEMS_PER_PAGE)
                    .ToList();

                // ✅ Truyền danh sách lớp để tránh null
                ViewBag.LopList = db.Lops.ToList();

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.SearchKeyword = search;
                ViewBag.ItemsPerPage = ITEMS_PER_PAGE;

                return View(students);
            }
        }


        // AJAX: Load danh sách sinh viên (phục vụ fetch)
        [HttpGet]
        public ActionResult LoadStudents(int page = 1, int pageSize = 10, string keyword = "", string khoa = "")
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var query = db.SinhViens
                                  .Include(s => s.Lop)
                                  .Include(s => s.Lop.Khoa)
                                  .Include(s => s.TaiKhoan1)
                                  .Where(s => s.Deleted_at == null); // ✅ lọc bỏ sinh viên đã xóa mềm

                    // Lọc theo Khoa
                    if (!string.IsNullOrWhiteSpace(khoa) && khoa != "0")
                    {
                        if (int.TryParse(khoa, out int khoaId) && khoaId > 0)
                        {
                            query = query.Where(s => (s.Lop != null && s.Lop.Khoa_id == khoaId) || (s.Lop != null && s.Lop.Khoa != null && s.Lop.Khoa.Khoa_id == khoaId));
                        }
                        else
                        {
                            query = query.Where(s => s.Lop != null && s.Lop.Khoa != null && s.Lop.Khoa.TenKhoa.Contains(khoa));
                        }
                    }

                    // Lọc theo từ khóa tìm kiếm
                    if (!string.IsNullOrWhiteSpace(keyword))
                    {
                        keyword = keyword.Trim();
                        string trimmedZero = keyword.TrimStart('0');

                        query = query.Where(s =>
                            (s.HoTen != null && s.HoTen.Contains(keyword)) ||
                            s.MSSV.ToString().Contains(keyword) ||
                            (!string.IsNullOrEmpty(trimmedZero) && s.MSSV.ToString().Contains(trimmedZero)) ||
                            (s.TaiKhoan1 != null && s.TaiKhoan1.Username != null && s.TaiKhoan1.Username.Contains(keyword)) ||
                            (s.Email != null && s.Email.Contains(keyword)) ||
                            (s.SoDienThoaiSinhVien != null && s.SoDienThoaiSinhVien.Contains(keyword)) ||
                            (s.QueQuan != null && s.QueQuan.Contains(keyword)) ||
                            (s.Lop != null && s.Lop.TenLop != null && s.Lop.TenLop.Contains(keyword))
                        );
                    }

                    if (pageSize <= 0) pageSize = 10;
                    int totalItems = query.Count();
                    int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
                    if (totalPages < 1) totalPages = 1;
                    if (page < 1) page = 1;
                    if (page > totalPages) page = totalPages;

                    var students = query
                        .OrderBy(s => s.MSSV)
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(s => new
                        {
                            s.MSSV,
                            MSSVDisplay = (s.TaiKhoan1 != null && s.TaiKhoan1.Username != null) ? s.TaiKhoan1.Username : s.MSSV.ToString(),
                            s.HoTen,
                            s.GioiTinh,
                            s.NgaySinh,
                            s.QueQuan,
                            s.Email,
                            s.SoDienThoaiSinhVien,
                            s.Lop_id,
                            TenLop = s.Lop != null ? s.Lop.TenLop : "Chưa có",
                            TenKhoa = s.Lop != null && s.Lop.Khoa != null ? s.Lop.Khoa.TenKhoa : "Chưa có khoa",
                            Khoa_id = s.Lop != null && s.Lop.Khoa != null ? s.Lop.Khoa.Khoa_id : (int?)null
                        })
                        .ToList();

                    return Json(new { success = true, items = students, page, totalPages, totalItems }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message, items = new List<object>(), page = 1, totalPages = 1, totalItems = 0 }, JsonRequestBehavior.AllowGet);
            }
        }
        // POST: Thêm sinh viên (tạo luôn tài khoản)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CreateAjax(QuanLyDangKyNgayLD.Models.SinhVien model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!ModelState.IsValid)
                        return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                    // ✅ Kiểm tra MSSV trùng trong bảng SinhVien
                    if (db.SinhViens.Any(s => s.MSSV == model.MSSV && s.Deleted_at == null))
                        return Json(new { success = false, message = "MSSV đã tồn tại trong hệ thống!" });

                    // ✅ Kiểm tra Username trùng trong bảng TaiKhoan
                    string username = model.MSSV.ToString();
                    if (db.TaiKhoans.Any(t => t.Username == username && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tài khoản với MSSV này đã tồn tại!" });

                    // ✅ Kiểm tra Email trùng trong bảng TaiKhoan
                    if (!string.IsNullOrWhiteSpace(model.Email) &&
                        db.TaiKhoans.Any(t => t.Email == model.Email && t.Deleted_at == null))
                        return Json(new { success = false, message = "Email này đã được sử dụng!" });

                    // ✅ Kiểm tra số điện thoại
                    if (string.IsNullOrWhiteSpace(model.SoDienThoaiSinhVien))
                        return Json(new { success = false, message = "Số điện thoại không được để trống!" });

                    if (!System.Text.RegularExpressions.Regex.IsMatch(model.SoDienThoaiSinhVien, @"^\d{10}$"))
                        return Json(new { success = false, message = "Số điện thoại phải đủ 10 chữ số!" });

                    // ✅ Tạo tài khoản cho sinh viên
                    var taiKhoan = new TaiKhoan
                    {
                        Username = username,
                        Password = PasswordHelper.HashPassword(username), // mật khẩu = MSSV
                        Email = model.Email,
                        VaiTro_id = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro.Contains("Sinh") || v.TenVaiTro == "SinhVien")?.VaiTro_id ?? 3,
                        Deleted_at = null
                    };
                    db.TaiKhoans.Add(taiKhoan);
                    db.SaveChanges();

                    // ✅ Gán TaiKhoan_id cho sinh viên
                    model.TaiKhoan = taiKhoan.TaiKhoan_id;
                    db.SinhViens.Add(model);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Thêm sinh viên và tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Thêm thất bại: " + inner.Message });
            }
        }



        // POST: Chỉnh sửa sinh viên
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditAjax(QuanLyDangKyNgayLD.Models.SinhVien model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == model.MSSV);
                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                    // Kiểm tra số điện thoại
                    if (!string.IsNullOrEmpty(model.SoDienThoaiSinhVien))
                    {
                        var phoneRegex = new System.Text.RegularExpressions.Regex(@"^\d{10}$");
                        if (!phoneRegex.IsMatch(model.SoDienThoaiSinhVien))
                        {
                            return Json(new { success = false, message = "Số điện thoại phải có đúng 10 chữ số!" });
                        }
                    }

                    // Cập nhật dữ liệu
                    sv.HoTen = model.HoTen;
                    sv.NgaySinh = model.NgaySinh;
                    sv.GioiTinh = model.GioiTinh;
                    sv.QueQuan = model.QueQuan;
                    sv.Email = model.Email;
                    sv.SoDienThoaiSinhVien = model.SoDienThoaiSinhVien;
                    sv.Lop_id = model.Lop_id;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Cập nhật sinh viên thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }





        private bool IsAdminUser(DB_QLNLD4ROLEEntities1 db)
        {
            var vaiTroId = Session["VaiTroId"] as int?;
            if (vaiTroId.HasValue)
            {
                return vaiTroId.Value == 1;
            }

            if (User != null && User.Identity != null && User.Identity.IsAuthenticated && !string.IsNullOrEmpty(User.Identity.Name))
            {
                string username = User.Identity.Name;
                var tk = db.TaiKhoans.FirstOrDefault(t => t.Username == username && t.Deleted_at == null);
                if (tk != null)
                {
                    Session["UserID"] = tk.TaiKhoan_id;
                    Session["UserId"] = tk.TaiKhoan_id;
                    Session["Username"] = tk.Username;
                    Session["VaiTroId"] = tk.VaiTro_id;
                    Session["Role"] = tk.VaiTro != null ? tk.VaiTro.TenVaiTro : "Admin";
                    return tk.VaiTro_id == 1;
                }
            }

            return true;
        }

        // POST: Xóa mềm sinh viên (đánh dấu Deleted_at trong tài khoản)
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền xóa dữ liệu." });

                    var sv = db.SinhViens
                        .Include(s => s.TaiKhoan1)
                        .FirstOrDefault(s => s.MSSV == id && s.Deleted_at == null);

                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                    // 📝 Ghi nhận nhật ký xóa sinh viên vào QuanLyAuditLog
                    var dataOld = new
                    {
                        sv.MSSV,
                        sv.HoTen,
                        sv.Email,
                        sv.Lop_id,
                        sv.TaiKhoan,
                        TaiKhoanInfo = sv.TaiKhoan1 != null ? new { sv.TaiKhoan1.TaiKhoan_id, sv.TaiKhoan1.Username, sv.TaiKhoan1.Email } : null
                    };
                    AuditLogHelper.GhiNhatKy("SinhVien", sv.MSSV.ToString(), dataOld, "DELETE");

                    // Đánh dấu xóa cho SinhVien
                    sv.Deleted_at = DateTime.Now;

                    // Nếu có tài khoản liên kết thì cũng đánh dấu xóa
                    if (sv.TaiKhoan1 != null)
                    {
                        sv.TaiKhoan1.Deleted_at = DateTime.Now;
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa sinh viên và tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }

        // POST: Xóa nhiều sinh viên đã chọn
        [HttpPost]
        public ActionResult DeleteMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một sinh viên để xóa." });

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền xóa dữ liệu." });

                    var svList = db.SinhViens
                        .Include(s => s.TaiKhoan1)
                        .Where(s => ids.Contains((int)s.MSSV) && s.Deleted_at == null)
                        .ToList();

                    if (!svList.Any())
                        return Json(new { success = false, message = "Không tìm thấy sinh viên hợp lệ để xóa." });

                    int count = 0;
                    foreach (var sv in svList)
                    {
                        // 📝 Ghi nhận nhật ký xóa sinh viên
                        var dataOld = new
                        {
                            sv.MSSV,
                            sv.HoTen,
                            sv.Email,
                            sv.Lop_id,
                            sv.TaiKhoan,
                            TaiKhoanInfo = sv.TaiKhoan1 != null ? new { sv.TaiKhoan1.TaiKhoan_id, sv.TaiKhoan1.Username, sv.TaiKhoan1.Email } : null
                        };
                        AuditLogHelper.GhiNhatKy("SinhVien", sv.MSSV.ToString(), dataOld, "DELETE");

                        sv.Deleted_at = DateTime.Now;
                        if (sv.TaiKhoan1 != null)
                        {
                            sv.TaiKhoan1.Deleted_at = DateTime.Now;
                        }
                        count++;
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = $"Đã xóa thành công {count} sinh viên đã chọn." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }
     
        // POST: Khôi phục sinh viên
        [HttpPost]
        public ActionResult RestoreAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền khôi phục dữ liệu." });

                    var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == id);
                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                    // Gỡ xóa mềm cho SinhVien
                    sv.Deleted_at = null;

                    // Gỡ xóa mềm cho TàiKhoan nếu có
                    var tk = db.TaiKhoans.Find(sv.TaiKhoan);
                    if (tk != null)
                        tk.Deleted_at = null;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục sinh viên và tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }







        // AJAX: Chi tiết sinh viên
        [HttpGet]
        public ActionResult DetailsAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var svRaw = db.SinhViens
                        .Include(s => s.Lop)
                        .FirstOrDefault(s => s.MSSV == id);

                    if (svRaw == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." }, JsonRequestBehavior.AllowGet);

                    var sv = new
                    {
                        svRaw.MSSV,
                        svRaw.HoTen,
                        NgaySinh = svRaw.NgaySinh?.ToString("dd/MM/yyyy") ?? "",
                        svRaw.GioiTinh,
                        svRaw.QueQuan,
                        svRaw.Email,
                        svRaw.SoDienThoaiSinhVien,
                        Lop = svRaw.Lop != null ? svRaw.Lop.TenLop : "Chưa có"
                    };

                    return Json(new { success = true, data = sv }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }




        // ==============================================================
        // 📥 XUẤT MẪU IMPORT EXCEL SINH VIÊN (CÓ VÍ DỤ VÀ HƯỚNG DẪN)
        // ==============================================================
        [HttpGet]
        public ActionResult DownloadTemplate()
        {
            try
            {
                using (var package = new OfficeOpenXml.ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("Mau_Import_SinhVien");

                    // 1. Tiêu đề
                    ws.Cells["A1:J1"].Merge = true;
                    ws.Cells["A1"].Value = "MẪU NHẬP DANH SÁCH SINH VIÊN";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(System.Drawing.Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(13, 110, 253));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // 2. Header
                    string[] headers = new string[]
                    {
                        "STT",
                        "MSSV (*)",
                        "Họ và Tên (*)",
                        "Tên Lớp (*)",
                        "Tên Khoa (*)",
                        "Email (*)",
                        "Số Điện Thoại",
                        "Giới Tính (Nam/Nữ)",
                        "Ngày Sinh (dd/MM/yyyy)",
                        "Quê Quán"
                    };

                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, System.Drawing.Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        cell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    }
                    ws.Row(2).Height = 28;

                    // 3. Dòng ví dụ mẫu (không lấy DB, minh họa chuẩn xác)
                    ws.Cells[3, 1].Value = 1;
                    ws.Cells[3, 2].Value = 2115141001;
                    ws.Cells[3, 3].Value = "Nguyễn Văn An";
                    ws.Cells[3, 4].Value = "DHCNTT21A";
                    ws.Cells[3, 5].Value = "Công nghệ và kỹ thuật";
                    ws.Cells[3, 6].Value = "an2115141001@gmail.com";
                    ws.Cells[3, 7].Value = "0912345678";
                    ws.Cells[3, 8].Value = "Nam";
                    ws.Cells[3, 9].Value = "15/05/2003";
                    ws.Cells[3, 10].Value = "Đồng Tháp";

                    ws.Cells[4, 1].Value = 2;
                    ws.Cells[4, 2].Value = 2115141002;
                    ws.Cells[4, 3].Value = "Trần Thị Bình";
                    ws.Cells[4, 4].Value = "DHNN21B";
                    ws.Cells[4, 5].Value = "Khoa Ngoại ngữ";
                    ws.Cells[4, 6].Value = "binh2115141002@gmail.com";
                    ws.Cells[4, 7].Value = "0987654321";
                    ws.Cells[4, 8].Value = "Nữ";
                    ws.Cells[4, 9].Value = "20/08/2003";
                    ws.Cells[4, 10].Value = "An Giang";

                    ws.Cells[5, 1].Value = 3;
                    ws.Cells[5, 2].Value = 2115141003;
                    ws.Cells[5, 3].Value = "Lê Hoàng Cường";
                    ws.Cells[5, 4].Value = "DHKT21A";
                    ws.Cells[5, 5].Value = "Khoa Kinh tế - Luật";
                    ws.Cells[5, 6].Value = "cuong2115141003@gmail.com";
                    ws.Cells[5, 7].Value = "0901234567";
                    ws.Cells[5, 8].Value = "Nam";
                    ws.Cells[5, 9].Value = "10/11/2003";
                    ws.Cells[5, 10].Value = "Cần Thơ";

                    for (int r = 3; r <= 5; r++)
                    {
                        for (int c = 1; c <= headers.Length; c++)
                        {
                            ws.Cells[r, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, System.Drawing.Color.FromArgb(220, 220, 220));
                            ws.Cells[r, c].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[r, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 7].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 8].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 9].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }

                    // 4. Ghi chú hướng dẫn
                    int noteRow = 7;
                    ws.Cells[noteRow, 1].Value = "📌 GHI CHÚ HƯỚNG DẪN QUAN TRỌNG:";
                    ws.Cells[noteRow, 1].Style.Font.Bold = true;
                    ws.Cells[noteRow, 1].Style.Font.Color.SetColor(System.Drawing.Color.FromArgb(220, 53, 69));

                    ws.Cells[noteRow + 1, 1].Value = "1. Các cột có dấu (*) là bắt buộc phải nhập dữ liệu.";
                    ws.Cells[noteRow + 2, 1].Value = "2. 'MSSV' và 'Email' không được trùng lặp với sinh viên đã tồn tại trên hệ thống.";
                    ws.Cells[noteRow + 3, 1].Value = "3. 'Tên Lớp' và 'Tên Khoa' phải khớp với danh mục lớp khoa trên hệ thống.";
                    ws.Cells[noteRow + 4, 1].Value = "4. Hệ thống sẽ tự động tạo tài khoản đăng nhập với Tên tài khoản = MSSV và Mật khẩu mặc định = MSSV.";
                    ws.Cells[noteRow + 5, 1].Value = "5. 'Ngày Sinh' định dạng dd/MM/yyyy (Ví dụ: 15/05/2003).";

                    for (int nr = noteRow; nr <= noteRow + 5; nr++)
                    {
                        ws.Cells[nr, 1].Style.Font.Size = 10;
                    }

                    // Đặt độ rộng cột cố định chuẩn đẹp
                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 16;
                    ws.Column(3).Width = 26;
                    ws.Column(4).Width = 16;
                    ws.Column(5).Width = 30;
                    ws.Column(6).Width = 30;
                    ws.Column(7).Width = 16;
                    ws.Column(8).Width = 14;
                    ws.Column(9).Width = 16;
                    ws.Column(10).Width = 20;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = "Mau_Import_SinhVien.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi khi tải mẫu Excel: " + ex.Message);
            }
        }

        // ==============================================================
        // 📊 XUẤT DỮ LIỆU SINH VIÊN RA EXCEL
        // ==============================================================
        [HttpGet]
        public ActionResult exportAllAccountstudent(string search = "", string khoa = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens
                              .Include(s => s.Lop)
                              .Include(s => s.Lop.Khoa)
                              .Where(s => s.Deleted_at == null);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.Trim();
                    query = query.Where(s => (s.HoTen ?? "").Contains(search) ||
                                             s.MSSV.ToString().Contains(search) ||
                                             (s.Email ?? "").Contains(search));
                }

                if (!string.IsNullOrWhiteSpace(khoa) && int.TryParse(khoa, out int khoaId) && khoaId > 0)
                {
                    query = query.Where(s => s.Lop != null && s.Lop.Khoa_id == khoaId);
                }

                var students = query.OrderBy(s => s.MSSV).ToList();

                using (var package = new OfficeOpenXml.ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("DanhSachSinhVien");

                    // Title
                    ws.Cells["A1:J1"].Merge = true;
                    ws.Cells["A1"].Value = "DANH SÁCH SINH VIÊN HỆ THỐNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(System.Drawing.Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(13, 110, 253));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // ======= Header =======
                    string[] headers = { "STT", "MSSV", "Họ tên", "Email", "Ngày sinh", "Quê quán", "Số điện thoại", "Giới tính", "Lớp", "Khoa" };
                    for (int col = 1; col <= headers.Length; col++)
                    {
                        ws.Cells[2, col].Value = headers[col - 1];
                        ws.Cells[2, col].Style.Font.Bold = true;
                        ws.Cells[2, col].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[2, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        ws.Cells[2, col].Style.Fill.PatternType = ExcelFillStyle.Solid;
                        ws.Cells[2, col].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(235, 243, 253));
                        ws.Cells[2, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, System.Drawing.Color.FromArgb(200, 200, 200));
                    }
                    ws.Row(2).Height = 25;

                    // ======= Dữ liệu =======
                    int row = 3;
                    int stt = 1;
                    foreach (var s in students)
                    {
                        ws.Cells[row, 1].Value = stt;
                        ws.Cells[row, 2].Value = s.MSSV;
                        ws.Cells[row, 3].Value = s.HoTen;
                        ws.Cells[row, 4].Value = s.Email ?? "";
                        ws.Cells[row, 5].Value = s.NgaySinh?.ToString("dd/MM/yyyy") ?? "";
                        ws.Cells[row, 6].Value = s.QueQuan ?? "";
                        ws.Cells[row, 7].Value = s.SoDienThoaiSinhVien ?? "";
                        ws.Cells[row, 8].Value = s.GioiTinh ?? "";
                        ws.Cells[row, 9].Value = s.Lop?.TenLop ?? "Chưa có";
                        ws.Cells[row, 10].Value = s.Lop?.Khoa?.TenKhoa ?? "Chưa có khoa";

                        for (int col = 1; col <= headers.Length; col++)
                        {
                            ws.Cells[row, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            ws.Cells[row, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, System.Drawing.Color.FromArgb(220, 220, 220));
                        }
                        ws.Cells[row, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 5].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 7].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 8].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                        ws.Cells[row, 1].Style.Font.Bold = true;
                        ws.Cells[row, 2].Style.Font.Bold = true;

                        row++;
                        stt++;
                    }

                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 16;
                    ws.Column(3).Width = 26;
                    ws.Column(4).Width = 30;
                    ws.Column(5).Width = 16;
                    ws.Column(6).Width = 20;
                    ws.Column(7).Width = 16;
                    ws.Column(8).Width = 14;
                    ws.Column(9).Width = 16;
                    ws.Column(10).Width = 30;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = $"DanhSachSinhVien_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

                    return File(fileBytes,
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                fileName);
                }
            }
        }

        // ==============================================================
        // 📤 NHẬP DANH SÁCH SINH VIÊN TỪ FILE EXCEL
        // ==============================================================
        [HttpPost]
        public ActionResult ImportExcel(HttpPostedFileBase file, HttpPostedFileBase excelFile)
        {
            OfficeOpenXml.ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

            var uploadedFile = file ?? excelFile;
            if (uploadedFile == null || uploadedFile.ContentLength == 0)
                return Json(new { success = false, message = "Vui lòng chọn file Excel để nhập dữ liệu." });

            string ext = System.IO.Path.GetExtension(uploadedFile.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls")
                return Json(new { success = false, message = "Chỉ hỗ trợ file Excel (.xlsx)." });

            try
            {
                using (var package = new OfficeOpenXml.ExcelPackage(uploadedFile.InputStream))
                {
                    // LẤY SHEET ĐẦU TIÊN
                    var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                    if (worksheet == null)
                        return Json(new { success = false, message = "Không tìm thấy sheet nào trong file Excel." });

                    var rowCount = worksheet.Dimension?.Rows ?? 0;
                    if (rowCount < 2)
                    {
                        return Json(new { success = false, message = "File Excel không có dữ liệu nhập." });
                    }

                    // Tự động nhận diện dòng tiêu đề (header)
                    int headerRow = 2;
                    string cellA1 = worksheet.Cells[1, 1].Text?.Trim().ToLower() ?? "";
                    string cellB1 = worksheet.Cells[1, 2].Text?.Trim().ToLower() ?? "";
                    if (cellA1.Contains("stt") || cellB1.Contains("mssv") || cellB1.Contains("mã") || cellA1.Contains("danh sách"))
                    {
                        if (cellA1.Contains("stt") || cellB1.Contains("mssv"))
                            headerRow = 1;
                        else
                            headerRow = 2;
                    }

                    int startRow = headerRow + 1;

                    // Ánh xạ vị trí cột mặc định
                    int colMssv = 2, colHoTen = 3, colLop = 4, colKhoa = 5, colSdt = 6, colEmail = 7, colGioiTinh = 8, colNgaySinh = 9, colQueQuan = 10;

                    // Tự động quét dòng header để khớp đúng vị trí các cột
                    int totalCols = worksheet.Dimension?.Columns ?? 10;
                    for (int c = 1; c <= totalCols; c++)
                    {
                        string h = (worksheet.Cells[headerRow, c].Text ?? "").Trim().ToLower();
                        if (string.IsNullOrEmpty(h)) continue;

                        if (h.Contains("mssv") || h.Contains("mã sinh viên") || h.Contains("ma sinh vien")) colMssv = c;
                        else if (h.Contains("họ tên") || h.Contains("ho ten") || h.Contains("tên sinh viên") || h.Contains("họ và tên")) colHoTen = c;
                        else if (h.Contains("lớp") || h.Contains("ten lop") || h.Contains("mã lớp")) colLop = c;
                        else if (h.Contains("khoa") || h.Contains("viện")) colKhoa = c;
                        else if (h.Contains("thoại") || h.Contains("sđt") || h.Contains("sdt") || h.Contains("phone")) colSdt = c;
                        else if (h.Contains("email") || h.Contains("thư điện tử")) colEmail = c;
                        else if (h.Contains("giới tính") || h.Contains("gioi tinh") || h.Contains("phái")) colGioiTinh = c;
                        else if (h.Contains("sinh") || h.Contains("ngaysinh") || h.Contains("dob")) colNgaySinh = c;
                        else if (h.Contains("quán") || h.Contains("quê") || h.Contains("địa chỉ") || h.Contains("dia chi") || h.Contains("nơi sinh")) colQueQuan = c;
                    }

                    var students = new List<SinhVien>();
                    var errorList = new List<string>();
                    int totalRows = 0;
                    using (var db = DbContextFactory.Create())
                    {
                        var allLops = db.Lops.Include("Khoa").ToList();
                        var allKhoas = db.Khoas.ToList();
                        var vaiTroSinhVien = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro.Contains("Sinh") || v.TenVaiTro == "SinhVien");

                        var existingMssvSet = new HashSet<long>(db.SinhViens.Select(s => s.MSSV));
                        var existingEmailSet = new HashSet<string>(
                            db.TaiKhoans.Where(t => t.Deleted_at == null && t.Email != null).Select(t => t.Email.ToLower()),
                            StringComparer.OrdinalIgnoreCase
                        );
                        var allUsernames = new HashSet<string>(
                            db.TaiKhoans.Select(t => t.Username.ToLower()),
                            StringComparer.OrdinalIgnoreCase
                        );

                        var fileMssvSet = new HashSet<long>();
                        var fileEmailSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                        for (int row = startRow; row <= rowCount; row++)
                        {
                            try
                            {
                                var mssvRaw = (worksheet.Cells[row, colMssv].Value?.ToString() ?? worksheet.Cells[row, colMssv].Text)?.Trim();
                                var hoTen = worksheet.Cells[row, colHoTen].Text?.Trim();
                                var tenLop = worksheet.Cells[row, colLop].Text?.Trim();
                                var tenKhoa = worksheet.Cells[row, colKhoa].Text?.Trim();
                                var sdt = (worksheet.Cells[row, colSdt].Value?.ToString() ?? worksheet.Cells[row, colSdt].Text)?.Trim();
                                var email = worksheet.Cells[row, colEmail].Text?.Trim();
                                var gioiTinh = worksheet.Cells[row, colGioiTinh].Text?.Trim();
                                var ngaySinhText = worksheet.Cells[row, colNgaySinh].Text?.Trim();
                                var queQuan = worksheet.Cells[row, colQueQuan].Text?.Trim();

                                // Bỏ qua dòng trống hoàn toàn
                                if (string.IsNullOrWhiteSpace(mssvRaw) && string.IsNullOrWhiteSpace(hoTen) && string.IsNullOrWhiteSpace(email))
                                    continue;

                                totalRows++;

                                string mssvText = System.Text.RegularExpressions.Regex.Replace(mssvRaw ?? "", @"[^\d]", "");

                                // Kiểm tra các trường bắt buộc
                                if (string.IsNullOrWhiteSpace(mssvText) || !long.TryParse(mssvText, out long mssv))
                                {
                                    errorList.Add($"Dòng {row}: MSSV '{mssvRaw}' không hợp lệ (phải là số nguyên).");
                                    continue;
                                }

                                if (string.IsNullOrWhiteSpace(hoTen))
                                {
                                    errorList.Add($"Dòng {row}: Họ tên sinh viên không được để trống.");
                                    continue;
                                }

                                if (string.IsNullOrWhiteSpace(tenLop))
                                {
                                    errorList.Add($"Dòng {row}: Lớp không được để trống.");
                                    continue;
                                }

                                if (string.IsNullOrWhiteSpace(email))
                                {
                                    errorList.Add($"Dòng {row}: Email không được để trống.");
                                    continue;
                                }

                                // Kiểm tra trùng MSSV
                                if (fileMssvSet.Contains(mssv))
                                {
                                    errorList.Add($"Dòng {row}: MSSV {mssv} bị trùng với dòng khác trong file Excel.");
                                    continue;
                                }

                                // Kiểm tra trùng Email
                                if (fileEmailSet.Contains(email))
                                {
                                    errorList.Add($"Dòng {row}: Email '{email}' bị trùng với dòng khác trong file Excel.");
                                    continue;
                                }

                                // Trùng trong DB
                                if (existingMssvSet.Contains(mssv))
                                {
                                    errorList.Add($"Dòng {row}: Sinh viên có MSSV {mssv} đã tồn tại trong danh sách sinh viên.");
                                    continue;
                                }
                                if (existingEmailSet.Contains(email))
                                {
                                    errorList.Add($"Dòng {row}: Email '{email}' đã được sử dụng bởi tài khoản khác.");
                                    continue;
                                }

                                // Kiểm tra lớp (nếu chưa có lớp nhưng có Khoa hợp lệ -> tự động tạo lớp mới thuộc Khoa đó)
                                var lop = allLops.FirstOrDefault(l => (l.TenLop ?? "").Equals(tenLop, StringComparison.OrdinalIgnoreCase) ||
                                                                      (l.MaLop ?? "").Equals(tenLop, StringComparison.OrdinalIgnoreCase));
                                if (lop == null)
                                {
                                    Khoa khoa = null;
                                    if (!string.IsNullOrWhiteSpace(tenKhoa))
                                    {
                                        khoa = allKhoas.FirstOrDefault(k =>
                                            (k.TenKhoa ?? "").Equals(tenKhoa, StringComparison.OrdinalIgnoreCase) ||
                                            (k.TenKhoa ?? "").IndexOf(tenKhoa, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                            tenKhoa.IndexOf((k.TenKhoa ?? ""), StringComparison.OrdinalIgnoreCase) >= 0 ||
                                            (!string.IsNullOrWhiteSpace(k.MaKhoa) && k.MaKhoa.Equals(tenKhoa, StringComparison.OrdinalIgnoreCase))
                                        );
                                    }

                                    if (khoa != null)
                                    {
                                        // Tự động tạo mới Lớp và gán vào Khoa
                                        string cleanMaLop = tenLop.Trim();
                                        if (cleanMaLop.Length > 20)
                                        {
                                            cleanMaLop = cleanMaLop.Substring(0, 20).Trim();
                                        }

                                        string cleanTenLop = tenLop.Trim();
                                        if (cleanTenLop.Length > 100)
                                        {
                                            cleanTenLop = cleanTenLop.Substring(0, 100).Trim();
                                        }

                                        lop = new Lop
                                        {
                                            TenLop = cleanTenLop,
                                            MaLop = cleanMaLop,
                                            Khoa_id = khoa.Khoa_id
                                        };
                                        db.Lops.Add(lop);
                                        db.SaveChanges(); // Lưu để lấy Lop_id ngay
                                        allLops.Add(lop);  // Cập nhật bộ nhớ đệm
                                    }
                                    else
                                    {
                                        if (string.IsNullOrWhiteSpace(tenKhoa))
                                        {
                                            errorList.Add($"Dòng {row}: Không tìm thấy lớp '{tenLop}' trong hệ thống (vui lòng điền tên Khoa để tự động thêm lớp).");
                                        }
                                        else
                                        {
                                            errorList.Add($"Dòng {row}: Không tìm thấy lớp '{tenLop}' và khoa '{tenKhoa}' trong cơ sở dữ liệu.");
                                        }
                                        continue;
                                    }
                                }

                                // Parse Ngày sinh
                                DateTime? ngaySinh = null;
                                if (!string.IsNullOrWhiteSpace(ngaySinhText))
                                {
                                    var dateVal = worksheet.Cells[row, colNgaySinh].Value;
                                    if (dateVal is DateTime dtVal)
                                    {
                                        ngaySinh = dtVal;
                                    }
                                    else if (DateTime.TryParseExact(ngaySinhText, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "MM/dd/yyyy" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDob))
                                    {
                                        ngaySinh = parsedDob;
                                    }
                                }

                                // Chuẩn hóa Số điện thoại - TỰ ĐỘNG THÊM SỐ 0 NẾU EXCEL LÀM MẤT SỐ 0 Ở ĐẦU
                                string cleanSdt = "";
                                if (!string.IsNullOrWhiteSpace(sdt))
                                {
                                    cleanSdt = System.Text.RegularExpressions.Regex.Replace(sdt, @"[^\d]", "");
                                    if (cleanSdt.Length == 9)
                                    {
                                        cleanSdt = "0" + cleanSdt;
                                    }
                                    else if (cleanSdt.StartsWith("84") && cleanSdt.Length == 11)
                                    {
                                        cleanSdt = "0" + cleanSdt.Substring(2);
                                    }
                                    else if (!cleanSdt.StartsWith("0") && cleanSdt.Length > 0 && cleanSdt.Length <= 10)
                                    {
                                        cleanSdt = "0" + cleanSdt;
                                    }

                                    if (cleanSdt.Length > 15)
                                        cleanSdt = cleanSdt.Substring(0, 15);
                                }

                                string cleanGioiTinh = gioiTinh;
                                if (!string.IsNullOrWhiteSpace(cleanGioiTinh) && cleanGioiTinh.Length > 10)
                                    cleanGioiTinh = cleanGioiTinh.Substring(0, 10);

                                string cleanEmail = email;
                                if (!string.IsNullOrWhiteSpace(cleanEmail) && cleanEmail.Length > 100)
                                    cleanEmail = cleanEmail.Substring(0, 100);

                                string cleanHoTen = hoTen;
                                if (!string.IsNullOrWhiteSpace(cleanHoTen) && cleanHoTen.Length > 100)
                                    cleanHoTen = cleanHoTen.Substring(0, 100);

                                string cleanQueQuan = queQuan;
                                if (!string.IsNullOrWhiteSpace(cleanQueQuan) && cleanQueQuan.Length > 200)
                                    cleanQueQuan = cleanQueQuan.Substring(0, 200);

                                // Xử lý Tài Khoản: kiểm tra xem tài khoản với Username=MSSV đã có chưa
                                string usernameStr = mssvText;
                                int taiKhoanId;

                                var existingTk = db.TaiKhoans.FirstOrDefault(t => t.Username == usernameStr || t.Username == mssv.ToString());
                                if (existingTk != null)
                                {
                                    // Nếu tài khoản này đã gắn với sinh viên khác
                                    bool isLinked = db.SinhViens.Any(s => s.TaiKhoan == existingTk.TaiKhoan_id && s.MSSV != mssv);
                                    if (isLinked)
                                    {
                                        errorList.Add($"Dòng {row}: Tài khoản MSSV '{mssv}' đã được liên kết với một sinh viên khác.");
                                        continue;
                                    }
                                    existingTk.Email = cleanEmail;
                                    existingTk.Deleted_at = null;
                                    db.SaveChanges();
                                    taiKhoanId = existingTk.TaiKhoan_id;
                                }
                                else
                                {
                                    var newTk = new TaiKhoan
                                    {
                                        Username = usernameStr,
                                        Password = PasswordHelper.HashPassword(usernameStr),
                                        Email = cleanEmail,
                                        VaiTro_id = vaiTroSinhVien != null ? vaiTroSinhVien.VaiTro_id : 3,
                                        IsLocked = false,
                                        Deleted_at = null
                                    };
                                    db.TaiKhoans.Add(newTk);
                                    db.SaveChanges();
                                    taiKhoanId = newTk.TaiKhoan_id;
                                    allUsernames.Add(usernameStr);
                                }

                                // Tạo sinh viên
                                var newStudent = new SinhVien
                                {
                                    MSSV = mssv,
                                    HoTen = cleanHoTen,
                                    Lop_id = lop.Lop_id,
                                    Email = cleanEmail,
                                    SoDienThoaiSinhVien = cleanSdt,
                                    GioiTinh = cleanGioiTinh,
                                    NgaySinh = ngaySinh,
                                    QueQuan = cleanQueQuan,
                                    TaiKhoan = taiKhoanId
                                };

                                db.SinhViens.Add(newStudent);
                                db.SaveChanges(); // Lưu từng sinh viên an toàn
                                students.Add(newStudent);

                                fileMssvSet.Add(mssv);
                                fileEmailSet.Add(email);
                                existingMssvSet.Add(mssv);
                                existingEmailSet.Add(cleanEmail);
                            }
                            catch (Exception rowEx)
                            {
                                var rowInner = rowEx;
                                while (rowInner.InnerException != null)
                                {
                                    rowInner = rowInner.InnerException;
                                }
                                errorList.Add($"Dòng {row}: Lỗi khi lưu dữ liệu ({rowInner.Message})");
                            }
                        }
                    }

                    if (students.Count == 0 && errorList.Count > 0)
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Không có sinh viên nào được nhập do dữ liệu bị trùng lặp hoặc không hợp lệ.",
                            errors = errorList,
                            errorList = errorList
                        });
                    }

                    return Json(new
                    {
                        success = true,
                        message = $"Đã nhập thành công {students.Count}/{totalRows} sinh viên vào hệ thống." + (errorList.Count > 0 ? $" Có {errorList.Count} dòng bị trùng hoặc lỗi không được nhập." : ""),
                        successCount = students.Count,
                        errors = errorList,
                        errorList = errorList
                    });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null)
                {
                    inner = inner.InnerException;
                }
                return Json(new { success = false, message = "Lỗi khi xử lý file: " + inner.Message });
            }
        } 
        [HttpGet]
        public JsonResult GetLopByKhoa(int khoaId)
        {
            using (var db = DbContextFactory.Create())
            {
                var dsLop = db.Lops
                              .Where(l => l.Khoa_id == khoaId)
                              .Select(l => new { l.Lop_id, l.TenLop })
                              .ToList();

                return Json(dsLop, JsonRequestBehavior.AllowGet);
            }
        }


        // AJAX: Lấy danh sách sinh viên đã xóa
        [HttpGet]
        public ActionResult GetDeletedList()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var list = db.SinhViens
                        .Include(s => s.Lop)
                        .Include(s => s.Lop.Khoa)
                        .Include(s => s.TaiKhoan1)
                        .Where(s => s.Deleted_at != null)
                        .OrderByDescending(s => s.Deleted_at)
                        .ToList()
                        .Select(s => new
                        {
                            s.MSSV,
                            MSSVDisplay = (s.TaiKhoan1 != null && s.TaiKhoan1.Username != null) ? s.TaiKhoan1.Username : s.MSSV.ToString(),
                            s.HoTen,
                            s.Email,
                            Lop = s.Lop != null ? s.Lop.TenLop : "Chưa có",
                            Khoa = (s.Lop != null && s.Lop.Khoa != null) ? s.Lop.Khoa.TenKhoa : "Chưa có khoa",
                            Deleted_at = s.Deleted_at.HasValue
                                ? s.Deleted_at.Value.ToString("dd/MM/yyyy HH:mm")
                                : ""
                        })
                        .ToList();

                    return Json(list, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // Xóa vĩnh viễn 1 sinh viên
        [HttpPost]
        public ActionResult DeletePermanentAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền xóa vĩnh viễn dữ liệu." });

                    var sv = db.SinhViens.Include(s => s.TaiKhoan1)
                                         .FirstOrDefault(s => s.MSSV == id);

                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                    // 📝 Ghi nhận nhật ký xóa vĩnh viễn sinh viên vào QuanLyAuditLog
                    var dataOld = new
                    {
                        sv.MSSV,
                        sv.HoTen,
                        sv.Email,
                        sv.Lop_id,
                        sv.TaiKhoan,
                        sv.Deleted_at,
                        TaiKhoanInfo = sv.TaiKhoan1 != null ? new { sv.TaiKhoan1.TaiKhoan_id, sv.TaiKhoan1.Username, sv.TaiKhoan1.Email } : null
                    };
                    AuditLogHelper.GhiNhatKy("SinhVien", sv.MSSV.ToString(), dataOld, "DELETE_PERMANENT");

                    // Xóa hẳn sinh viên
                    db.SinhViens.Remove(sv);

                    // Nếu có tài khoản thì cũng xóa hẳn
                    if (sv.TaiKhoan1 != null)
                    {
                        db.TaiKhoans.Remove(sv.TaiKhoan1);
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = "Đã xóa hẳn sinh viên và tài khoản." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }

        // POST: Khôi phục nhiều sinh viên đã chọn
        [HttpPost]
        public ActionResult RestoreMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một sinh viên để khôi phục." });

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền khôi phục dữ liệu." });

                    var svList = db.SinhViens.Include(s => s.TaiKhoan1).Where(s => ids.Contains((int)s.MSSV)).ToList();
                    if (!svList.Any())
                        return Json(new { success = false, message = "Không tìm thấy sinh viên hợp lệ để khôi phục." });

                    int count = 0;
                    foreach (var sv in svList)
                    {
                        sv.Deleted_at = null;
                        if (sv.TaiKhoan1 != null)
                        {
                            sv.TaiKhoan1.Deleted_at = null;
                        }
                        count++;
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = $"Đã khôi phục thành công {count} sinh viên." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }

        // POST: Xóa vĩnh viễn nhiều sinh viên đã chọn
        [HttpPost]
        public ActionResult DeletePermanentMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một sinh viên để xóa vĩnh viễn." });

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!IsAdminUser(db))
                        return Json(new { success = false, message = "Chỉ tài khoản Admin mới có quyền xóa vĩnh viễn dữ liệu." });

                    var svList = db.SinhViens.Include(s => s.TaiKhoan1).Where(s => ids.Contains((int)s.MSSV)).ToList();
                    if (!svList.Any())
                        return Json(new { success = false, message = "Không tìm thấy sinh viên hợp lệ để xóa vĩnh viễn." });

                    int count = 0;
                    foreach (var sv in svList)
                    {
                        var dataOld = new
                        {
                            sv.MSSV,
                            sv.HoTen,
                            sv.Email,
                            sv.Lop_id,
                            sv.TaiKhoan,
                            sv.Deleted_at,
                            TaiKhoanInfo = sv.TaiKhoan1 != null ? new { sv.TaiKhoan1.TaiKhoan_id, sv.TaiKhoan1.Username, sv.TaiKhoan1.Email } : null
                        };
                        AuditLogHelper.GhiNhatKy("SinhVien", sv.MSSV.ToString(), dataOld, "DELETE_PERMANENT");

                        if (sv.TaiKhoan1 != null)
                        {
                            db.TaiKhoans.Remove(sv.TaiKhoan1);
                        }
                        db.SinhViens.Remove(sv);
                        count++;
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = $"Đã xóa vĩnh viễn {count} sinh viên khỏi hệ thống." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }

        // xử lý khoi phục






    }
}
