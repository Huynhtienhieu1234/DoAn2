using System;
using System.Linq;
using System.Web.Mvc;

using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Controllers
{
    public class ForgotPasswordController : Controller
    {
        [HttpGet]
        public ActionResult ForgotPassword()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ForgotPassword(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                ViewBag.Message = "Vui lòng nhập địa chỉ email.";
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Email == email);
                if (user == null)
                {
                    ViewBag.Message = "Email này không tồn tại trong hệ thống.";
                    return View();
                }

                try
                {
                    // Tạo token ngẫu nhiên
                    string token = Guid.NewGuid().ToString();
                    DateTime expiry = DateTime.Now.AddHours(1);

                    // Lưu token vào DB
                    user.Reset_token = token;
                    user.Reset_token_expiry = expiry;
                    db.SaveChanges();

                    // Tạo link đặt lại mật khẩu
                    string resetLink = Url.Action(
                           "ResetPassword",
                           "ResetPassword",
                        new { token = token },
                        Request.Url.Scheme
                    );

                    // Gửi email
                    bool sent = EmailHelper.SendPasswordResetEmail(email, resetLink);
                    if (sent)
                    {
                        ViewBag.Message = "Email đặt lại mật khẩu đã được gửi đến địa chỉ của bạn.";
                    }
                    else
                    {
                        ViewBag.Message = "Không gửi được email. Vui lòng thử lại sau.";
                    }
                }
                catch (Exception ex)
                {
                    ViewBag.Message = "Có lỗi xảy ra: " + ex.Message;
                }
            }

            return View();
        }
    }
}