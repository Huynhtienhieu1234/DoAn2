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
                var taiKhoans = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .ToList();

                ViewBag.VaiTroList = db.VaiTroes.ToList();
                return View(taiKhoans);
            }
        }

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
                    // Kiểm tra username trùng
                    if (db.TaiKhoans.Any(t => t.Username == taiKhoan.Username))
                    {
                        TempData["Message"] = "Tên tài khoản đã tồn tại.";
                        TempData["MessageType"] = "warning";
                        ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.VaiTro_id);
                        return View(taiKhoan);
                    }

                    db.TaiKhoans.Add(taiKhoan);
                    db.SaveChanges();

                    TempData["Message"] = "Tạo tài khoản thành công!";
                    TempData["MessageType"] = "success";
                    return RedirectToAction("Index");
                }

                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.VaiTro_id);
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
                    .FirstOrDefault(t => t.TaiKhoan_id == id);

                if (taiKhoan == null)
                    return HttpNotFound();

                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.VaiTro_id);
                return View(taiKhoan);
            }
        }

        // POST: Admin/Account/Edit - SỬA LẠI ACTION NÀY
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
                    .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id);

                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                // Kiểm tra username trùng (trừ chính nó)
                if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id))
                {
                    TempData["Message"] = "Tên tài khoản đã tồn tại.";
                    TempData["MessageType"] = "warning";
                    ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", model.VaiTro_id);
                    return View(model);
                }

                // Cập nhật thông tin
                taiKhoan.Username = model.Username;
                taiKhoan.Email = model.Email;
                taiKhoan.VaiTro_id = model.VaiTro_id;

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

        // AJAX Edit - Dùng cho form modal
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(model.TaiKhoan_id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Kiểm tra username trùng
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Cập nhật thông tin
                    taiKhoan.Username = model.Username;
                    taiKhoan.Email = model.Email;
                    taiKhoan.VaiTro_id = model.VaiTro_id;

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

        // GET: Admin/Account/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);

            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id);

                if (taiKhoan == null)
                    return HttpNotFound();

                return View(taiKhoan);
            }
        }

        // POST: Admin/Account/Delete
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

                db.TaiKhoans.Remove(taiKhoan);
                db.SaveChanges();

                TempData["Message"] = "Đã xóa tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        // AJAX Delete
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

                    db.TaiKhoans.Remove(taiKhoan);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa tài khoản thành công!" });
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
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // Reset về mật khẩu mặc định (ví dụ: "123456")
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
                    .Where(t => t.TaiKhoan_id == id)
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
                    // Kiểm tra username trùng
                    if (db.TaiKhoans.Any(t => t.Username == model.Username))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

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