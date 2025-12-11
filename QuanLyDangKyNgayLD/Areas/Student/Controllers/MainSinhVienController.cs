using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class MainSinhVienController : Controller
    {
        // Trang thông tin sinh viên (render view)
        public ActionResult Index()
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return RedirectToAction("Login", "Login");

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens
                           .Include("TaiKhoan1.VaiTro")
                           .Include("Anh")
                           .Include("Lop")
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv == null)
                    sv = new SinhVien { TaiKhoan = userId };

                return View("Index", sv);
            }
        }

        // Trang chi tiết để xem và chỉnh sửa
        public ActionResult Detail()
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return RedirectToAction("Login", "Login");

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens
                           .Include("TaiKhoan1.VaiTro")
                           .Include("Anh")
                           .Include("Lop")
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv == null)
                    sv = new SinhVien { TaiKhoan = userId };

                return View("Detail", sv);
            }
        }

        // API lấy thông tin sinh viên (AJAX)
        [HttpGet]
        public JsonResult GetStudentInfo()
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return Json(new { success = false, message = "Bạn chưa đăng nhập!" }, JsonRequestBehavior.AllowGet);

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens
                           .Include("TaiKhoan1.VaiTro")
                           .Include("Anh")
                           .Include("Lop")
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy thông tin sinh viên!" }, JsonRequestBehavior.AllowGet);

                string avatarUrl = sv.Anh != null ? sv.Anh.DuongDan : "/image/Avarta.png";

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        MSSV = sv.MSSV,
                        HoTen = string.IsNullOrEmpty(sv.HoTen) ? "Chưa có dữ liệu" : sv.HoTen,
                        Email = string.IsNullOrEmpty(sv.Email) ? "Chưa có dữ liệu" : sv.Email,
                        GioiTinh = string.IsNullOrEmpty(sv.GioiTinh) ? "Chưa có dữ liệu" : sv.GioiTinh,
                        SoDienThoai = string.IsNullOrEmpty(sv.SoDienThoaiSinhVien) ? "Chưa có dữ liệu" : sv.SoDienThoaiSinhVien,
                        Lop = sv.Lop != null ? sv.Lop.TenLop : "Chưa có dữ liệu",
                        VaiTro = sv.TaiKhoan1?.VaiTro?.TenVaiTro ?? "Chưa có",
                        Avatar = avatarUrl
                    }
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // Chỉnh thông tin sinh viên (form POST)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UpdateInfo(SinhVien model, HttpPostedFileBase AvatarFile)
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return RedirectToAction("Login", "Login");

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == userId);
                if (sv != null)
                {
                    sv.MSSV = model.MSSV;
                    sv.HoTen = model.HoTen;
                    sv.Email = model.Email;
                    sv.NgaySinh = model.NgaySinh;
                    sv.QueQuan = model.QueQuan;
                    sv.GioiTinh = model.GioiTinh;
                    sv.SoDienThoaiSinhVien = model.SoDienThoaiSinhVien;

                    // xử lý upload ảnh
                    if (AvatarFile != null && AvatarFile.ContentLength > 0)
                    {
                        var uploadDir = Server.MapPath("~/Uploads/Avatars");
                        if (!System.IO.Directory.Exists(uploadDir))
                            System.IO.Directory.CreateDirectory(uploadDir);

                        var fileName = System.IO.Path.GetFileName(AvatarFile.FileName);
                        var path = System.IO.Path.Combine(uploadDir, fileName);
                        AvatarFile.SaveAs(path);

                        var anh = new Anh { DuongDan = "/Uploads/Avatars/" + fileName };
                        db.Anhs.Add(anh);
                        db.SaveChanges();

                        sv.Anh_id = anh.Anh_id;
                    }

                    db.SaveChanges();
                }
                else
                {
                    model.TaiKhoan = userId;
                    db.SinhViens.Add(model);
                    db.SaveChanges();
                }
            }

            return RedirectToAction("Detail", "MainSinhVien", new { area = "Student" });
        }
    }
}
