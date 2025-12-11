using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web.Mvc;


namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AccountController : Controller
    {
        private const int ITEMS_PER_PAGE = 100;

        // GET: Admin/Account
        public ActionResult Index(int page = 1, string search = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                // Lấy danh sách tài khoản chưa bị xóa + Include VaiTro
                var query = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null);

                // Lọc theo vai trò
                if (!string.IsNullOrWhiteSpace(role) && role != "Tất Cả")
                {
                    query = query.Where(t => t.VaiTro != null && t.VaiTro.TenVaiTro == role);
                }

                // Lọc theo từ khóa tìm kiếm
                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(t => t.Username.Contains(search) || t.Email.Contains(search));
                }

                // Tính toán phân trang
                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / ITEMS_PER_PAGE);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var accounts = query
                    .OrderBy(t => t.TaiKhoan_id)
                    .Skip((page - 1) * ITEMS_PER_PAGE)
                    .Take(ITEMS_PER_PAGE)
                    .ToList();

                // Truyền dữ liệu sang view
                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.SearchKeyword = search;
                ViewBag.SelectedRole = role;
                ViewBag.ItemsPerPage = ITEMS_PER_PAGE;
                ViewBag.VaiTroList = db.VaiTroes.ToList();
                ViewBag.Roles = db.VaiTroes
                    .Select(v => new { ID = v.VaiTro_id, Name = v.TenVaiTro })
                    .ToList();

                return View(accounts);
            }
        }





        // lấy dữ liêu
        [HttpGet]
        public ActionResult GetAccounts(int page = 1, int pageSize = 100)
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null)
                    .OrderByDescending(t => t.TaiKhoan_id);

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var accounts = query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        RoleName = t.VaiTro.TenVaiTro
                    })
                    .ToList();

                return Json(new
                {
                    data = accounts,
                    currentPage = page,
                    totalPages = totalPages,
                    totalItems = totalItems
                }, JsonRequestBehavior.AllowGet);
            }
        }






        [HttpPost]
        public ActionResult CreateAccountAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    if (!ModelState.IsValid)
                        return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                    // Kiểm tra trùng Username
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Kiểm tra trùng Email
                    if (!string.IsNullOrWhiteSpace(model.Email) &&
                        db.TaiKhoans.Any(t => t.Email == model.Email && t.Deleted_at == null))
                        return Json(new { success = false, message = "Email đã tồn tại." });

                    bool isStudentRole = model.VaiTro_id == 3 || model.VaiTro_id == 4;
                    string rawPassword;

                    if (isStudentRole)
                    {
                        // MSSV bắt buộc là số
                        if (string.IsNullOrWhiteSpace(model.Username) || !model.Username.All(char.IsDigit))
                            return Json(new { success = false, message = "MSSV chỉ được phép nhập số, không chứa chữ cái!" });

                        rawPassword = model.Username.Trim();

                        if (rawPassword.Length < 6 || rawPassword.Length > 20)
                            return Json(new { success = false, message = "MSSV phải có từ 6 đến 20 chữ số!" });
                    }
                    else
                    {
                        // Admin / Quản lý phải nhập mật khẩu
                        if (string.IsNullOrWhiteSpace(model.Password))
                            return Json(new { success = false, message = "Mật khẩu không được để trống!" });

                        rawPassword = model.Password.Trim();
                        if (rawPassword.Length < 6)
                            return Json(new { success = false, message = "Mật khẩu phải ít nhất 6 ký tự!" });
                    }

                    // Hash mật khẩu
                    string hashedPassword = PasswordHelper.HashPassword(rawPassword);

                    // Tạo tài khoản
                    var taiKhoan = new TaiKhoan
                    {
                        Username = model.Username.Trim(),
                        Email = model.Email?.Trim(),
                        Password = hashedPassword,
                        VaiTro_id = model.VaiTro_id,
                        Deleted_at = null
                    };

                    db.TaiKhoans.Add(taiKhoan);
                    db.SaveChanges();

                    // Nếu là Sinh viên hoặc Lớp phó lao động thì thêm vào bảng SinhVien
                    if (isStudentRole)
                    {
                        if (db.SinhViens.Any(s => s.MSSV.ToString() == taiKhoan.Username && s.Deleted_at == null))
                        {
                            transaction.Rollback();
                            return Json(new { success = false, message = "Sinh viên với MSSV này đã tồn tại trong hệ thống!" });
                        }

                        var sinhVien = new SinhVien
                        {
                            MSSV = Convert.ToInt64(taiKhoan.Username),
                            Email = taiKhoan.Email,
                            TaiKhoan = taiKhoan.TaiKhoan_id,
                            Deleted_at = null
                        };

                        db.SinhViens.Add(sinhVien);
                        db.SaveChanges();
                    }

                    transaction.Commit();

                    string successMessage = isStudentRole
                        ? $"Thêm sinh viên thành công! Mật khẩu mặc định = MSSV: <strong>{rawPassword}</strong>"
                        : "Thêm tài khoản thành công!";

                    return Json(new { success = true, message = successMessage });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Chỉnh sửa
        [HttpPost]
        public ActionResult EditAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    if (!ModelState.IsValid)
                        return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                    var taiKhoan = db.TaiKhoans
                        .Include(t => t.VaiTro)
                        .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);

                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản cần chỉnh sửa." });

                    // Kiểm tra trùng Username (ngoại trừ chính nó)
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Kiểm tra trùng Email (ngoại trừ chính nó)
                    if (!string.IsNullOrWhiteSpace(model.Email) &&
                        db.TaiKhoans.Any(t => t.Email == model.Email && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Email đã tồn tại." });

                    bool isStudentRole = model.VaiTro_id == 3 || model.VaiTro_id == 4;

                    // Cập nhật thông tin cơ bản
                    taiKhoan.Username = model.Username.Trim();
                    taiKhoan.Email = model.Email?.Trim();
                    taiKhoan.VaiTro_id = model.VaiTro_id;

                    // Nếu không phải sinh viên thì cho phép đổi mật khẩu
                    if (!isStudentRole && !string.IsNullOrWhiteSpace(model.Password))
                    {
                        if (model.Password.Trim().Length < 6)
                            return Json(new { success = false, message = "Mật khẩu phải ít nhất 6 ký tự!" });

                        taiKhoan.Password = PasswordHelper.HashPassword(model.Password.Trim());
                    }

                    db.SaveChanges();

                    // Nếu là sinh viên thì cập nhật bảng SinhVien
                    if (isStudentRole)
                    {
                        var sinhVien = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == taiKhoan.TaiKhoan_id && s.Deleted_at == null);
                        if (sinhVien != null)
                        {
                            sinhVien.MSSV = Convert.ToInt64(taiKhoan.Username);
                            sinhVien.Email = taiKhoan.Email;
                            db.SaveChanges();
                        }
                    }

                    transaction.Commit();

                    return Json(new { success = true, message = "Cập nhật tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        [HttpGet]
        public ActionResult GetAccountById(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var acc = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null && t.TaiKhoan_id == id)
                    .Select(t => new {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        t.VaiTro_id
                    })
                    .FirstOrDefault();

                return Json(acc, JsonRequestBehavior.AllowGet);
            }
        }

        // Xóa tài khoản
        // Xóa mềm
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản hoặc đã bị xóa." });

                    taiKhoan.Deleted_at = DateTime.Now;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa tài khoản thành công (xóa mềm)." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Lấy danh sách tài khoản đã xóa
        [HttpGet]
        public ActionResult GetDeletedAccounts()
        {
            using (var db = DbContextFactory.Create())
            {
                var accounts = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at != null)
                    .OrderByDescending(t => t.Deleted_at)
                    .Select(t => new {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        RoleName = t.VaiTro.TenVaiTro,
                        DeletedAt = t.Deleted_at
                    })
                    .ToList();

                return Json(accounts, JsonRequestBehavior.AllowGet);
            }
        }

        // Khôi phục
        [HttpPost]
        public ActionResult RestoreAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at != null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản đã xóa." });

                    taiKhoan.Deleted_at = null;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục tài khoản thành công." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Xóa hẳn
        [HttpPost]
        public ActionResult DeletePermanentAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at != null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản đã xóa." });

                    db.TaiKhoans.Remove(taiKhoan);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã xóa hẳn tài khoản khỏi hệ thống." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }
        // xem chi tiết
        [HttpGet]
        public ActionResult GetDetail(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var acc = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);

                if (acc == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." }, JsonRequestBehavior.AllowGet);
                }

                return Json(new
                {
                    success = true,
                    TaiKhoan_id = acc.TaiKhoan_id,
                    Username = acc.Username,
                    Email = acc.Email,
                    RoleName = acc.VaiTro != null ? acc.VaiTro.TenVaiTro : "Chưa có vai trò",

                }, JsonRequestBehavior.AllowGet);
            }
        }
        // Đặt lại mật khẩu mặc định
        [HttpPost]
        public ActionResult ResetPasswordAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản hoặc đã bị xóa." });

                    // Mật khẩu cố định
                    string rawPassword = "123456";
                    string hashedPassword = PasswordHelper.HashPassword(rawPassword);

                    taiKhoan.Password = hashedPassword;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đặt lại mật khẩu thành công! Mật khẩu mới = 123456" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }








    }
}