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
        [HttpGet]
        public ActionResult ResetPassword(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                TempData["ErrorMessage"] = "Token không hợp lệ.";
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Reset_token == token && u.Deleted_at == null);
                if (user == null)
                {
                    TempData["ErrorMessage"] = "Token không hợp lệ hoặc tài khoản đã bị xóa.";
                    return View();
                }
                if (user.Reset_token_expiry == null || user.Reset_token_expiry < DateTime.Now)
                {
                    TempData["ErrorMessage"] = "Token đã hết hạn.";
                    return View();
                }

                ViewBag.Token = token;
                return View();
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ResetPassword(string token, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrEmpty(token))
            {
                TempData["ErrorMessage"] = "Token không hợp lệ.";
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Reset_token == token && u.Deleted_at == null);
                if (user == null)
                {
                    TempData["ErrorMessage"] = "Token không hợp lệ hoặc tài khoản đã bị xóa.";
                    return View();
                }
                if (user.Reset_token_expiry == null || user.Reset_token_expiry < DateTime.Now)
                {
                    TempData["ErrorMessage"] = "Token đã hết hạn.";
                    return View();
                }
                if (string.IsNullOrEmpty(newPassword) || string.IsNullOrEmpty(confirmPassword))
                {
                    TempData["ErrorMessage"] = "Vui lòng nhập đầy đủ mật khẩu.";
                    ViewBag.Token = token;
                    return View();
                }
                if (newPassword != confirmPassword)
                {
                    TempData["ErrorMessage"] = "Mật khẩu xác nhận không khớp!";
                    ViewBag.Token = token;
                    return View();
                }

                // Regex: >=7 ký tự, có ít nhất 1 số và 1 ký tự đặc biệt
                var passwordPattern = @"^(?=.*\d)(?=.*[!@#$%^&*()_+\-\[\]{};':""\\|,.<>\/?]).{7,}$";
                if (!Regex.IsMatch(newPassword, passwordPattern))
                {
                    TempData["ErrorMessage"] = "Mật khẩu phải ≥7 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt!";
                    ViewBag.Token = token;
                    return View();
                }

                try
                {
                    // Mã hóa mật khẩu
                    user.Password = PasswordHelper.HashPassword(newPassword);
                    user.Reset_token = null;
                    user.Reset_token_expiry = null;
                    db.SaveChanges();

                    // THÀNH CÔNG → DÙNG TempData ĐỂ JS HIỆN BONG BÓNG + TỰ CHUYỂN HƯỚNG
                    TempData["SuccessMessage"] = "Đặt lại mật khẩu thành công! Đang chuyển về trang đăng nhập...";
                    return View(); // Quan trọng: vẫn return View để JS hiện thông báo + redirect
                }
                catch (Exception ex)
                {
                    TempData["ErrorMessage"] = "Có lỗi xảy ra khi lưu mật khẩu. Vui lòng thử lại!";
                    ViewBag.Token = token;
                    return View();
                }
            }
        }
    }
}