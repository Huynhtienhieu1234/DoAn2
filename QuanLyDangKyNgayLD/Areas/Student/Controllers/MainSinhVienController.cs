using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System.Linq;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class MainSinhVienController : Controller
    {
        // Trang thông tin sinh viên
        public ActionResult Index()
        {
            // lấy id tài khoản từ session
            var userId = Session["UserID"] as int?;
            if (userId == null)
            {
                return RedirectToAction("Login", "Login");
            }

            using (var db = DbContextFactory.Create())
            {
                // lấy đúng sinh viên theo tài khoản đã đăng nhập
                var sv = db.SinhViens
                           .Include("TaiKhoan1.VaiTro") // lấy thêm thông tin vai trò
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                // nếu chưa có record thì tạo object rỗng để tránh null
                if (sv == null)
                {
                    sv = new SinhVien { TaiKhoan = userId };
                }

                // truyền model sang view Index
                return View("Index", sv);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UpdateInfo(SinhVien model)
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
            {
                return RedirectToAction("Login", "Login");
            }

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == userId);
                if (sv != null)
                {
                    // cập nhật thông tin
                    sv.MSSV = model.MSSV;
                    sv.HoTen = model.HoTen;
                    sv.Email = model.Email;
                    sv.NgaySinh = model.NgaySinh;
                    sv.QueQuan = model.QueQuan;
                    sv.GioiTinh = model.GioiTinh;
                    sv.SoDienThoaiSinhVien = model.SoDienThoaiSinhVien;
                    db.SaveChanges();
                }
                else
                {
                    // thêm mới nếu chưa có record
                    model.TaiKhoan = userId;
                    db.SinhViens.Add(model);
                    db.SaveChanges();
                }
            }

            // quay lại trang Index để hiển thị thông tin mới
            return RedirectToAction("Index", "MainSinhVien", new { area = "Student" });
        }
    }
}
