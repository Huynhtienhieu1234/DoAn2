using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Controllers
{
    public class ResetPasswordController : Controller
    {
        // GET: ResetPassword/Index?token=xxxx
        [HttpGet]
        public ActionResult ResetPassword(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                ViewBag.Message = "Token không hợp lệ.";
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Reset_token == token);

                if (user == null)
                {
                    ViewBag.Message = "Token không hợp lệ.";
                    return View();
                }

                if (user.Reset_token_expiry == null || user.Reset_token_expiry < DateTime.Now)
                {
                    ViewBag.Message = "Token đã hết hạn.";
                    return View();
                }

                // Token hợp lệ -> truyền xuống view để form submit lại
                ViewBag.Token = token;
                return View();
            }
        }

        // POST: ResetPassword/Index
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ResetPassword(string token, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrEmpty(token))
            {
                ViewBag.Message = "Token không hợp lệ.";
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Reset_token == token);

                if (user == null)
                {
                    ViewBag.Message = "Token không hợp lệ.";
                    return View();
                }

                if (user.Reset_token_expiry == null || user.Reset_token_expiry < DateTime.Now)
                {
                    ViewBag.Message = "Token đã hết hạn.";
                    return View();
                }

                if (newPassword != confirmPassword)
                {
                    ViewBag.Message = "Mật khẩu và xác nhận không khớp.";
                    ViewBag.Token = token;
                    return View();
                }

                // Regex: >=7 ký tự, ít nhất 1 số, 1 ký tự đặc biệt
                var passwordPattern = @"^(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]).{7,}$";
                if (!Regex.IsMatch(newPassword, passwordPattern))
                {
                    ViewBag.Message = "Mật khẩu phải >=7 ký tự, có số và ký tự đặc biệt.";
                    ViewBag.Token = token;
                    return View();
                }

                // TODO: Hash mật khẩu trước khi lưu (khuyến nghị BCrypt hoặc SHA256)
                user.Password = newPassword;

                // Xóa token sau khi dùng
                user.Reset_token = null;
                user.Reset_token_expiry = null;

                db.SaveChanges();

                TempData["Message"] = "Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.";
                return RedirectToAction("Login", "Login");
            }
        }
    }
}
