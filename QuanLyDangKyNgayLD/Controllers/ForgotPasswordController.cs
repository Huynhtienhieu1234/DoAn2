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
            string search = email?.Trim();
            if (string.IsNullOrEmpty(search))
            {
                ViewBag.Message = "Vui lòng nhập địa chỉ email hoặc mã số sinh viên.";
                ViewBag.IsError = true;
                return View();
            }

            using (var db = DbContextFactory.Create())
            {
                QuanLyDangKyNgayLD.Models.TaiKhoan user = null;
                string targetEmail = null;
                string searchLower = search.ToLower();

                // 1. Tìm trong bảng TaiKhoan theo Email (không phân biệt hoa thường)
                user = db.TaiKhoans.FirstOrDefault(u => u.Email != null && u.Email.Trim().ToLower() == searchLower && u.Deleted_at == null);
                if (user != null)
                {
                    targetEmail = user.Email.Trim();
                }

                // 2. Nếu không tìm thấy, tìm trong bảng SinhVien theo Email
                if (user == null)
                {
                    var sv = db.SinhViens.FirstOrDefault(s => s.Email != null && s.Email.Trim().ToLower() == searchLower);
                    if (sv != null)
                    {
                        targetEmail = sv.Email.Trim();
                        if (sv.TaiKhoan.HasValue)
                        {
                            user = db.TaiKhoans.FirstOrDefault(u => u.TaiKhoan_id == sv.TaiKhoan.Value && u.Deleted_at == null);
                        }
                        if (user == null)
                        {
                            string mssvStr = sv.MSSV.ToString();
                            string mssvPadded = mssvStr.PadLeft(10, '0');
                            user = db.TaiKhoans.FirstOrDefault(u => (u.Username == mssvStr || u.Username == mssvPadded) && u.Deleted_at == null);
                        }
                    }
                }

                // 3. Nếu người dùng nhập MSSV hoặc Username thay vì email
                if (user == null)
                {
                    string padded = search.PadLeft(10, '0');
                    user = db.TaiKhoans.FirstOrDefault(u => (u.Username == search || u.Username == padded) && u.Deleted_at == null);
                    if (user != null)
                    {
                        if (long.TryParse(search, out long mssvVal))
                        {
                            var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == mssvVal);
                            if (sv != null && !string.IsNullOrWhiteSpace(sv.Email))
                            {
                                targetEmail = sv.Email.Trim();
                            }
                        }
                        if (string.IsNullOrWhiteSpace(targetEmail) && !string.IsNullOrWhiteSpace(user.Email))
                        {
                            targetEmail = user.Email.Trim();
                        }
                    }
                }

                if (user == null || string.IsNullOrWhiteSpace(targetEmail))
                {
                    ViewBag.Message = "Không tìm thấy tài khoản hoặc địa chỉ email này trong hệ thống.";
                    ViewBag.IsError = true;
                    return View();
                }

                try
                {
                    // Tạo token ngẫu nhiên
                    string token = Guid.NewGuid().ToString();
                    DateTime expiry = DateTime.Now.AddHours(1);

                    // Lưu token vào DB và đồng bộ Email
                    user.Reset_token = token;
                    user.Reset_token_expiry = expiry;
                    if (string.IsNullOrWhiteSpace(user.Email) || user.Email != targetEmail)
                    {
                        user.Email = targetEmail;
                    }
                    db.SaveChanges();

                    // Tạo link đặt lại mật khẩu
                    string resetLink = Url.Action(
                        "ResetPassword",
                        "ResetPassword",
                        new { token = token },
                        Request.Url.Scheme
                    );

                    // Gửi email
                    string mailError;
                    bool sent = EmailHelper.SendPasswordResetEmail(targetEmail, resetLink, out mailError);
                    if (sent)
                    {
                        ViewBag.Message = $"Email hướng dẫn đặt lại mật khẩu đã được gửi đến: {targetEmail}. Vui lòng kiểm tra hộp thư (kể cả mục Thư rác/Spam).";
                        ViewBag.IsError = false;
                    }
                    else
                    {
                        ViewBag.Message = "Không gửi được email: " + mailError;
                        ViewBag.IsError = true;
                    }
                }
                catch (Exception ex)
                {
                    ViewBag.Message = "Có lỗi xảy ra: " + ex.Message;
                    ViewBag.IsError = true;
                }
            }

            return View();
        }
    }
}