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

                ViewBag.MaVaiTro = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.VaiTro?.VaiTro_id);
                return View(taiKhoan);
            }
        }

        // POST: Admin/Account/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(int TaiKhoan_id, string Username, string Email, string Password, int? VaiTro_id)
        {
            using (var db = DbContextFactory.Create())
            {
                if (TaiKhoan_id <= 0)
                {
                    TempData["Message"] = "ID tài khoản không hợp lệ.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == TaiKhoan_id);

                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                if (string.IsNullOrWhiteSpace(Username))
                {
                    TempData["Message"] = "Tên tài khoản không được để trống.";
                    TempData["MessageType"] = "warning";
                    return RedirectToAction("Index");
                }

                if (db.TaiKhoans.Any(t => t.Username == Username && t.TaiKhoan_id != TaiKhoan_id))
                {
                    TempData["Message"] = "Tên tài khoản đã tồn tại.";
                    TempData["MessageType"] = "warning";
                    return RedirectToAction("Index");
                }

                // Update account info
                taiKhoan.Username = Username;
                taiKhoan.Email = Email;

                if (!string.IsNullOrWhiteSpace(Password))
                    taiKhoan.Password = Password;

                if (VaiTro_id.HasValue)
                {
                    var role = db.VaiTroes.Find(VaiTro_id.Value);
                    if (role != null)
                        taiKhoan.VaiTro = role;
                }

                db.SaveChanges();

                // Nếu AJAX thì trả JSON
                if (Request.IsAjaxRequest())
                    return Json(new { success = true, message = "Cập nhật thành công!" });

                // Nếu request bình thường → show toast
                TempData["Message"] = "Cập nhật tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        [HttpPost]
        public ActionResult EditAjax(int TaiKhoan_id, string Username, string Email, string Password, string VaiTro)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == TaiKhoan_id);
                if (taiKhoan == null)
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                taiKhoan.Username = Username;
                taiKhoan.Email = Email;

                if (!string.IsNullOrEmpty(Password))
                    taiKhoan.Password = Password;

                var roleObj = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro == VaiTro);
                if (roleObj != null)
                    taiKhoan.VaiTro = roleObj;

                db.SaveChanges();

                TempData["Message"] = "Cập nhật tài khoản thành công!";
                TempData["MessageType"] = "success";

                return Json(new { success = true });
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

        // POST: Admin/Account/DeleteConfirmed
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
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

        // AJAX: Xem chi tiết tài khoản
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
                        Role = t.VaiTro != null ? t.VaiTro.TenVaiTro : null
                    })
                    .FirstOrDefault();

                if (taiKhoan == null)
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." }, JsonRequestBehavior.AllowGet);

                return Json(new { success = true, data = taiKhoan }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
