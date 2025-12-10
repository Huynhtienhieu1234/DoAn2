using OfficeOpenXml;
using OfficeOpenXml.Style;
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
        private const int ITEMS_PER_PAGE = 5;

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
        // Trong AdminStudentController.cs, sửa action LoadStudents
        [HttpGet]
        public ActionResult LoadStudents(int page = 1, int pageSize = 5, string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens
                              .Include(s => s.Lop)
                              .Include(s => s.Lop.Khoa)
                              .Where(s => s.Deleted_at == null); // ✅ lọc bỏ sinh viên đã xóa mềm

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    query = query.Where(s => (s.HoTen ?? "").Contains(keyword) ||
                                             s.MSSV.ToString().Contains(keyword));
                }

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

                var students = query
                    .OrderBy(s => s.MSSV)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new
                    {
                        s.MSSV,
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
                        Password = PasswordHelper.HashPassword("123456"), // mật khẩu mặc định
                        Email = model.Email,
                        VaiTro_id = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro == "SinhVien")?.VaiTro_id,
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
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
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





        // POST: Xóa mềm sinh viên (đánh dấu Deleted_at trong tài khoản)
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = db.SinhViens
                        .Include(s => s.TaiKhoan1)
                        .FirstOrDefault(s => s.MSSV == id && s.Deleted_at == null);

                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

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
     
        // POST: Khôi phục sinh viên
        [HttpPost]
        public ActionResult RestoreAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
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




        // GET: Xuất danh sách sinh viên ra Excel
        [HttpGet]
        public ActionResult ExportAllStudentsToExcel(string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens
                              .Include(s => s.Lop)
                              .Include(s => s.Lop.Khoa)
                              .Where(s => s.Deleted_at == null); // lọc bỏ sinh viên đã xóa mềm

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    query = query.Where(s => (s.HoTen ?? "").Contains(keyword) ||
                                             s.MSSV.ToString().Contains(keyword));
                }

                var students = query.OrderBy(s => s.MSSV).ToList();

                using (var package = new OfficeOpenXml.ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("DanhSachSinhVien");

                    // ======= Header =======
                    string[] headers = { "STT", "MSSV", "Họ tên", "Email", "Ngày sinh", "Quê quán", "Số điện thoại", "Giới tính", "Lớp", "Khoa" };
                    for (int col = 1; col <= headers.Length; col++)
                    {
                        ws.Cells[1, col].Value = headers[col - 1];
                        ws.Cells[1, col].Style.Font.Bold = true;
                        ws.Cells[1, col].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[1, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        ws.Cells[1, col].Style.Fill.PatternType = ExcelFillStyle.Solid;
                        ws.Cells[1, col].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                        ws.Cells[1, col].Style.Border.BorderAround(ExcelBorderStyle.Thin);
                    }

                    // ======= Dữ liệu =======
                    int row = 2;
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
                            ws.Cells[row, col].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            ws.Cells[row, col].Style.Border.BorderAround(ExcelBorderStyle.Thin);
                        }

                        ws.Cells[row, 1].Style.Font.Bold = true; // STT in đậm
                        ws.Cells[row, 2].Style.Font.Bold = true; // MSSV in đậm

                        row++;
                        stt++;
                    }

                    // Auto-fit cột
                    ws.Cells[ws.Dimension.Address].AutoFitColumns();

                    // Xuất file
                    var fileBytes = package.GetAsByteArray();
                    string fileName = $"DanhSachSinhVien_{DateTime.Now:ddMMyy}.xlsx";


                    return File(fileBytes,
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                fileName);
                }
            }
        }





        // POST: Nhập danh sách sinh viên từ file Excel
        [HttpPost]
        public ActionResult ImportExcel(HttpPostedFileBase excelFile)
        {
            if (excelFile == null || excelFile.ContentLength == 0)
                return Json(new { success = false, message = "Vui lòng chọn file Excel." });

            if (!excelFile.FileName.EndsWith(".xlsx"))
                return Json(new { success = false, message = "Chỉ hỗ trợ file .xlsx." });

            try
            {
                using (var package = new OfficeOpenXml.ExcelPackage(excelFile.InputStream))
                {
                    var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                    if (worksheet == null)
                        return Json(new { success = false, message = "Không tìm thấy sheet nào trong file." });

                    var rowCount = worksheet.Dimension.Rows;
                    var students = new List<SinhVien>();
                    var errorList = new List<string>();

                    using (var db = DbContextFactory.Create())
                    {
                        var allLops = db.Lops.Include("Khoa").ToList();
                        var vaiTroSinhVien = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro == "SinhVien");

                        // ✅ Kiểm tra nếu có cột STT
                        int offset = 0;
                        var firstCell = worksheet.Cells[1, 1].Text?.Trim().ToLower();
                        if (firstCell == "stt")
                        {
                            offset = 1;
                        }

                        for (int row = 2; row <= rowCount; row++) // bỏ dòng tiêu đề
                        {
                            var mssvText = worksheet.Cells[row, 1 + offset].Text?.Trim();
                            var hoTen = worksheet.Cells[row, 2 + offset].Text?.Trim();
                            var tenLop = worksheet.Cells[row, 3 + offset].Text?.Trim();
                            var tenKhoa = worksheet.Cells[row, 4 + offset].Text?.Trim();

                            // ✅ Nếu phát hiện trống bất kỳ cột nào → báo lỗi chi tiết
                            var missingFields = new List<string>();
                            if (string.IsNullOrEmpty(mssvText)) missingFields.Add("MSSV");
                            if (string.IsNullOrEmpty(hoTen)) missingFields.Add("Họ tên");
                            if (string.IsNullOrEmpty(tenLop)) missingFields.Add("Tên lớp");
                            if (string.IsNullOrEmpty(tenKhoa)) missingFields.Add("Tên khoa");

                            if (missingFields.Any())
                            {
                                errorList.Add($"Dòng {row}: Thiếu dữ liệu ở các cột: {string.Join(", ", missingFields)}");
                                continue;
                            }

                            if (!long.TryParse(mssvText, out long mssv))
                            {
                                errorList.Add($"Dòng {row}: MSSV không hợp lệ ({mssvText})");
                                continue;
                            }

                            var lop = allLops.FirstOrDefault(l =>
                                l.TenLop.Equals(tenLop, StringComparison.OrdinalIgnoreCase));

                            if (lop == null)
                            {
                                errorList.Add($"Dòng {row}: Không tìm thấy lớp '{tenLop}'");
                                continue;
                            }

                            if (!lop.Khoa.TenKhoa.Equals(tenKhoa, StringComparison.OrdinalIgnoreCase))
                            {
                                errorList.Add($"Dòng {row}: Tên khoa trong Excel là '{tenKhoa}' nhưng lớp '{tenLop}' thực tế thuộc khoa '{lop.Khoa.TenKhoa}'");
                                // vẫn nhập sinh viên, dùng khoa đúng từ lớp
                            }

                            bool existsMssv = db.SinhViens.Any(s => s.MSSV == mssv);
                            if (existsMssv)
                            {
                                errorList.Add($"Dòng {row}: MSSV {mssv} đã tồn tại");
                                continue;
                            }

                            bool existsName = db.SinhViens.Any(s => s.HoTen.Equals(hoTen, StringComparison.OrdinalIgnoreCase));
                            if (existsName)
                            {
                                errorList.Add($"Dòng {row}: Họ tên '{hoTen}' đã tồn tại trong hệ thống");
                                continue;
                            }

                            // ✅ Tạo tài khoản cho sinh viên
                            var taiKhoan = new TaiKhoan
                            {
                                Username = mssv.ToString(),
                                Password = PasswordHelper.HashPassword("123456"), // mật khẩu mặc định
                                Email = null,
                                VaiTro_id = vaiTroSinhVien?.VaiTro_id,
                                Deleted_at = null
                            };

                            // ✅ Tạo sinh viên và gắn tài khoản
                            var newStudent = new SinhVien
                            {
                                MSSV = mssv,
                                HoTen = hoTen,
                                Lop_id = lop.Lop_id,
                                GioiTinh = "Nam",
                                TaiKhoan1 = taiKhoan
                            };

                            db.SinhViens.Add(newStudent);
                            db.SaveChanges();
                            students.Add(newStudent);
                        }
                    }

                    return Json(new
                    {
                        success = true,
                        successCount = students.Count,
                        errorCount = errorList.Count,
                        errorList = errorList
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi khi xử lý file: " + ex.Message });
            }
        }








        // Xử lý tác vụ 
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
                        .Where(s => s.Deleted_at != null)
                        .ToList() // lấy ra trước
                        .Select(s => new
                        {
                            s.MSSV,
                            s.HoTen,
                            Lop = s.Lop != null ? s.Lop.TenLop : "Chưa có",
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
        //Xóa tất cả sinh viên đã xóa

        [HttpPost]
        public ActionResult DeletePermanentAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = db.SinhViens.Include(s => s.TaiKhoan1)
                                         .FirstOrDefault(s => s.MSSV == id);

                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

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

        // xử lý khoi phục






    }
}
