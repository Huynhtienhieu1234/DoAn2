using System;
using System.Linq;
using System.Web.Mvc;
using System.Data.Entity;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

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
        [HttpGet]
        public ActionResult LoadStudents(int page = 1, int pageSize = 5, string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens
                              .Include(s => s.Lop)
                              .Include(s => s.Lop.Khoa);

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
                        s.Lop_id,
                        TenLop = s.Lop != null ? s.Lop.TenLop : "Chưa có",
                        TenKhoa = s.Lop != null && s.Lop.Khoa != null ? s.Lop.Khoa.TenKhoa : "Chưa có khoa"
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
                    var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == id);
                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                    var tk = db.TaiKhoans.Find(sv.TaiKhoan);
                    if (tk != null)
                        tk.Deleted_at = DateTime.Now;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa sinh viên thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
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

                    var tk = db.TaiKhoans.Find(sv.TaiKhoan);
                    if (tk != null)
                        tk.Deleted_at = null;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục sinh viên thành công!" });
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
            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens
                    .Include(s => s.Lop)
                    .Where(s => s.MSSV == id)
                    .Select(s => new
                    {
                        s.MSSV,
                        s.HoTen,
                        s.NgaySinh,
                        s.GioiTinh,
                        s.QueQuan,
                        s.Email,
                        s.SoDienThoaiSinhVien,
                        Lop = s.Lop != null ? s.Lop.TenLop : "Chưa có"
                    })
                    .FirstOrDefault();

                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên." }, JsonRequestBehavior.AllowGet);

                return Json(new { success = true, data = sv }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Xuất danh sách sinh viên
        [HttpGet]
        public ActionResult ExportAllStudents(string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.SinhViens.Include(s => s.Lop);

                if (!string.IsNullOrWhiteSpace(keyword))
                    query = query.Where(s => s.HoTen.Contains(keyword) || s.MSSV.ToString().Contains(keyword));

                var students = query.Select(s => new
                {
                    s.MSSV,
                    s.HoTen,
                    s.Email,
                    Lop = s.Lop != null ? s.Lop.TenLop : "Chưa có"
                }).ToList();

                return Json(new { success = true, items = students }, JsonRequestBehavior.AllowGet);
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










    }
}
