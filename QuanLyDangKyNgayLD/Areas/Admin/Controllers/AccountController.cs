using System.Linq;
using System.Web.Mvc;
using System.Data.Entity;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;
using System.Net;
using System;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AccountController : Controller
    {
        // GET: Admin/Account
        public ActionResult Index()
        {
            using (var db = DbContextFactory.Create())
            {
                // Chỉ lấy tài khoản chưa bị xóa (Deleted_at == null)
                var taiKhoans = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null) // Thêm điều kiện này
                    .ToList();

                ViewBag.VaiTroList = db.VaiTroes.ToList();
                return View(taiKhoans);
            }
        }

        // GET: Danh sách tài khoản đã xóa
        public ActionResult GetDeletedAccounts()
        {
            using (var db = DbContextFactory.Create())
            {
                // Lấy danh sách tài khoản đã bị xóa mềm (Deleted_at != null)
                var deletedAccounts = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at != null) // Chỉ lấy những tài khoản đã bị xóa
                    .Select(t => new
                    {
                        id = t.TaiKhoan_id,
                        username = t.Username,
                        email = t.Email,
                        roleName = t.VaiTro.TenVaiTro,
                        deletedAt = t.Deleted_at,
                        deletedBy = "Hệ thống" // Có thể lấy từ field khác nếu có
                    })
                    .ToList();

                return Json(new { success = true, accounts = deletedAccounts }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Admin/Account/Delete - XÓA MỀM
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Delete(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans.Find(id);
                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản cần xóa.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                // Thực hiện xóa mềm - chỉ cập nhật Deleted_at
                taiKhoan.Deleted_at = DateTime.Now;

                db.SaveChanges();

                TempData["Message"] = "Đã xóa tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        // AJAX Delete - XÓA MỀM
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Thực hiện xóa mềm
                    taiKhoan.Deleted_at = DateTime.Now;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Khôi phục tài khoản đã xóa
        [HttpPost]
        public ActionResult RestoreAccount(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Khôi phục tài khoản - đặt Deleted_at về null
                    taiKhoan.Deleted_at = null;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Xóa vĩnh viễn tài khoản (chỉ dùng khi cần)
        [HttpPost]
        public ActionResult PermanentDelete(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Xóa vĩnh viễn
                    db.TaiKhoans.Remove(taiKhoan);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã xóa vĩnh viễn tài khoản!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Các action khác giữ nguyên với điều chỉnh điều kiện Deleted_at...

        // GET: Admin/Account/Create
        public ActionResult Create()
        {
            using (var db = DbContextFactory.Create())
            {
                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro");
                return View();
            }
        }

        // POST: Admin/Account/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(TaiKhoan taiKhoan)
        {
            using (var db = DbContextFactory.Create())
            {
                if (ModelState.IsValid)
                {
                    // Kiểm tra username trùng (chỉ kiểm tra tài khoản chưa xóa)
                    if (db.TaiKhoans.Any(t => t.Username == taiKhoan.Username && t.Deleted_at == null))
                    {
                        TempData["Message"] = "Tên tài khoản đã tồn tại.";
                        TempData["MessageType"] = "warning";
                        ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.Role_id);
                        return View(taiKhoan);
                    }

                    // Đảm bảo tài khoản mới không bị đánh dấu là đã xóa
                    taiKhoan.Deleted_at = null;

                    db.TaiKhoans.Add(taiKhoan);
                    db.SaveChanges();

                    TempData["Message"] = "Tạo tài khoản thành công!";
                    TempData["MessageType"] = "success";
                    return RedirectToAction("Index");
                }

                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.Role_id);
                return View(taiKhoan);
            }
        }

        // GET: Admin/Account/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);

            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null); // Chỉ cho phép sửa tài khoản chưa bị xóa

                if (taiKhoan == null)
                    return HttpNotFound();

                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.Role_id);
                return View(taiKhoan);
            }
        }

        // POST: Admin/Account/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(TaiKhoan model)
        {
            using (var db = DbContextFactory.Create())
            {
                if (model.TaiKhoan_id <= 0)
                {
                    TempData["Message"] = "ID tài khoản không hợp lệ.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);

                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                // Kiểm tra username trùng (trừ chính nó và tài khoản đã xóa)
                if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                {
                    TempData["Message"] = "Tên tài khoản đã tồn tại.";
                    TempData["MessageType"] = "warning";
                    ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", model.Role_id);
                    return View(model);
                }

                // Cập nhật thông tin
                taiKhoan.Username = model.Username;
                taiKhoan.Email = model.Email;
                taiKhoan.Role_id = model.Role_id;

                // Chỉ cập nhật mật khẩu nếu có nhập mới
                if (!string.IsNullOrWhiteSpace(model.Password))
                {
                    taiKhoan.Password = model.Password;
                }

                db.SaveChanges();

                TempData["Message"] = "Cập nhật tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        // AJAX Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Kiểm tra username trùng
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Cập nhật thông tin
                    taiKhoan.Username = model.Username;
                    taiKhoan.Email = model.Email;
                    taiKhoan.Role_id = model.Role_id;

                    if (!string.IsNullOrWhiteSpace(model.Password))
                        taiKhoan.Password = model.Password;

                    db.SaveChanges();

                    return Json(new
                    {
                        success = true,
                        message = "Cập nhật tài khoản thành công!",
                        data = new
                        {
                            taiKhoan.TaiKhoan_id,
                            taiKhoan.Username,
                            taiKhoan.Email,
                            Role = taiKhoan.VaiTro?.TenVaiTro
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // AJAX: Reset mật khẩu
        [HttpPost]
        public ActionResult ResetPasswordAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Reset về mật khẩu mặc định
                    taiKhoan.Password = "123456";
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đặt lại mật khẩu thành công! Mật khẩu mới: 123456" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // AJAX: Chi tiết tài khoản
        [HttpGet]
        public ActionResult DetailsAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.TaiKhoan_id == id && t.Deleted_at == null)
                    .Select(t => new
                    {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        Role = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Không có"
                    })
                    .FirstOrDefault();

                if (taiKhoan == null)
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." }, JsonRequestBehavior.AllowGet);

                return Json(new { success = true, data = taiKhoan }, JsonRequestBehavior.AllowGet);
            }
        }

        // Tạo tài khoản qua AJAX
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CreateAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    // Kiểm tra username trùng (chỉ kiểm tra tài khoản chưa xóa)
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Đảm bảo tài khoản mới không bị đánh dấu là đã xóa
                    model.Deleted_at = null;

                    db.TaiKhoans.Add(model);
                    db.SaveChanges();

                    return Json(new
                    {
                        success = true,
                        message = "Tạo tài khoản thành công!",
                        data = new
                        {
                            model.TaiKhoan_id,
                            model.Username,
                            model.Email,
                            Role = model.VaiTro?.TenVaiTro
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }
    }
}