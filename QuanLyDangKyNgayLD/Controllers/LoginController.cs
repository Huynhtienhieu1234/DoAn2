using System.Linq;
using System.Web.Mvc;
using System.Web.Security;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Logs;

namespace QuanLyDangKyNgayLD.Controllers
{
    public class LoginController : Controller
    {
        [HttpGet]
        public ActionResult Login()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(TaiKhoan model)
        {
            if (!ModelState.IsValid)
                return View(model);

            if (string.IsNullOrEmpty(model.Username))
            {
                ModelState.AddModelError("", "Tài khoản không được trống");
                return View(model);
            }

            if (string.IsNullOrEmpty(model.Password))
            {
                ModelState.AddModelError("", "Mật khẩu không được trống");
                return View(model);
            }

            using (var db = DbContextFactory.Create())
            {
                var user = db.TaiKhoans.FirstOrDefault(u => u.Username == model.Username);

                if (user == null)
                {
                    ModelState.AddModelError("", "Tài khoản không tồn tại.");
                    return View(model);
                }

                // ✅ Kiểm tra trạng thái khóa
                if (user.IsLocked)
                {
                    ModelState.AddModelError("", "Bạn đã hoàn thành ngày lao động rồi.");
                    return View(model);
                }

                bool isValid = false;

                // Kiểm tra nếu mật khẩu đã mã hóa
                if (PasswordHelper.IsHashed(user.Password))
                {
                    isValid = PasswordHelper.VerifyPassword(model.Password, user.Password);
                }
                else
                {
                    // Mật khẩu chưa mã hóa → kiểm tra trực tiếp
                    if (user.Password == model.Password)
                    {
                        isValid = true;

                        // ✅ Mã hóa lại và cập nhật
                        user.Password = PasswordHelper.HashPassword(model.Password);
                        db.SaveChanges();
                    }
                }

                if (!isValid)
                {
                    ModelState.AddModelError("", "Sai tài khoản hoặc mật khẩu.");
                    return View(model);
                }

                // ✅ Đăng nhập thành công - SET SESSION
                Session["UserID"] = user.TaiKhoan_id;
                Session["Username"] = user.Username;

                var userWithRole = db.TaiKhoans
                    .Include("VaiTro")
                    .FirstOrDefault(u => u.TaiKhoan_id == user.TaiKhoan_id);

                Session["User"] = userWithRole;
                Session["Role"] = userWithRole?.VaiTro?.TenVaiTro;

                FormsAuthentication.SetAuthCookie(user.Username, false);

                // 🔥 Ghi log đăng nhập ra file txt
                LoginLogger.WriteLog(user.Username);

                switch (user.VaiTro_id)
                {
                    case 1: return RedirectToAction("Index", "Admin", new { area = "Admin" });
                    case 2: return RedirectToAction("Index", "QuanLy", new { area = "QuanLy" });
                    case 3: return RedirectToAction("Index", "MainSinhVien", new { area = "Student" });
                    case 4: return RedirectToAction("Index", "MainSinhVien", new { area = "Student" });
                    default:
                        ModelState.AddModelError("", "Vai trò tài khoản không hợp lệ.");
                        return View(model);
                }
            }
        }

        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("Login", "Login");
        }
    }
}
