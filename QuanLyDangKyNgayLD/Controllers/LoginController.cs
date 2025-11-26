using System.Linq;
using System.Web.Mvc;
using System.Web.Security;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;   

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
            if (ModelState.IsValid)
            {
                // Lấy DbContext từ Factory
                using (var db = DbContextFactory.Create())
                {
                    if (string.IsNullOrEmpty(model.Password))
                    {
                        ModelState.AddModelError("", "Mật khẩu không được trống");
                        return View(model);


                    }
                    if (string.IsNullOrEmpty(model.Username))
                    {
                        ModelState.AddModelError("", "Tài khoản không được trống");
                        return View(model);


                    }


                    // Tìm user trong DB
                    TaiKhoan user = db.TaiKhoans
                        .FirstOrDefault(u => u.Username == model.Username && u.Password == model.Password);

                    if (user != null)
                    {
                        // Lưu session
                        Session["UserID"] = user.TaiKhoan_id;
                        Session["Username"] = user.Username;

                        // Lấy vai trò
                        var role = db.VaiTroes.FirstOrDefault(r => r.VaiTro_id == user.TaiKhoan_id);
                        Session["Role"] = role?.TenVaiTro;

                        // Tạo cookie đăng nhập
                        FormsAuthentication.SetAuthCookie(user.Username, false);

                        // Điều hướng theo Role
                        switch (user.TaiKhoan_id)
                        {
                            case 1: return RedirectToAction("Index", "Admin", new { area = "Admin" });
                            case 2: return RedirectToAction("Index", "QuanLy", new { area = "Admin" });
                            case 3:return RedirectToAction("Index", "MainSinhVien", new { area = "SinhVien" });
                            case 4: return RedirectToAction("Index", "LopPhoLaoDong");
                            default:
                                ModelState.AddModelError("", "Vai trò tài khoản không hợp lệ.");
                                break;
                        }
                    }
                    else
                    {
                        ModelState.AddModelError("", "Sai tài khoản hoặc mật khẩu.");
                    }
                }
            }

           
            return View(model);
        }

 
    }
}
