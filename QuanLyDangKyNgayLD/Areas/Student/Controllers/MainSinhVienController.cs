using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Data.Entity;
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
                           .Include("Anh")
                           .Include("Lop.Khoa")
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv == null)
                    return RedirectToAction("Login", "Login");

                // ✅ Truyền avatar và tên lên ViewBag
                ViewBag.AvatarUrl = sv.Anh != null ? sv.Anh.DuongDan : "/image/Avarta.png";
                ViewBag.HoTen = sv.HoTen ?? "Sinh viên";

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
                           .Include(s => s.TaiKhoan1.VaiTro)
                           .Include(s => s.Anh)
                           .Include(s => s.Lop.Khoa)   // ✅ load luôn Khoa qua Lop
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
                           .Include("Lop.Khoa")   // ✅ Include thêm Khoa qua Lop
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
                        Khoa = sv.Lop?.Khoa != null ? sv.Lop.Khoa.TenKhoa : "Chưa có dữ liệu",  // ✅ thêm tên khoa
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

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = db.SinhViens.Include("TaiKhoan1")
                                         .FirstOrDefault(s => s.TaiKhoan == userId);
                    if (sv != null)
                    {
                        // cập nhật thông tin cá nhân
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

                            var fileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(AvatarFile.FileName);
                            var path = System.IO.Path.Combine(uploadDir, fileName);
                            AvatarFile.SaveAs(path);

                            var anh = new Anh { DuongDan = "/Uploads/Avatars/" + fileName };
                            db.Anhs.Add(anh);
                            db.SaveChanges();

                            sv.Anh_id = anh.Anh_id;
                        }

                        // ✅ xử lý đổi mật khẩu nếu có nhập
                        string matKhauMoi = Request.Form["MatKhauMoi"];
                        if (!string.IsNullOrEmpty(matKhauMoi) && sv.TaiKhoan1 != null)
                        {
                            // ⚠️ Nên hash mật khẩu trước khi lưu
                            sv.TaiKhoan1.Password = matKhauMoi;
                        }

                        db.SaveChanges();
                        TempData["Message"] = "Cập nhật thông tin thành công!";
                        TempData["MessageType"] = "success";
                    }
                    else
                    {
                        model.TaiKhoan = userId;
                        db.SinhViens.Add(model);
                        db.SaveChanges();

                        TempData["Message"] = "Đã thêm mới thông tin sinh viên!";
                        TempData["MessageType"] = "success";
                    }
                }
            }
            catch (Exception ex)
            {
                TempData["Message"] = "Có lỗi xảy ra khi cập nhật: " + ex.Message;
                TempData["MessageType"] = "error";
            }

            return RedirectToAction("Detail", "MainSinhVien", new { area = "Student" });
        }

        // Tài khoản
        public ActionResult TaiKhoanInfo()
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return Json(new { success = false, message = "Bạn chưa đăng nhập!" }, JsonRequestBehavior.AllowGet);

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens
                           .Include("TaiKhoan1.VaiTro")
                           .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv == null || sv.TaiKhoan1 == null)
                    return Json(new { success = false, message = "Không tìm thấy thông tin tài khoản!" }, JsonRequestBehavior.AllowGet);

                var taiKhoanModel = new
                {
                    TenTaiKhoan = sv.TaiKhoan1.Username,
                    MatKhau = sv.TaiKhoan1.Password, 
                    VaiTro = sv.TaiKhoan1.VaiTro?.TenVaiTro ?? "Chưa có"
                };

                return Json(new { success = true, data = taiKhoanModel }, JsonRequestBehavior.AllowGet);
            }
        }

        // Đổi mật khẩu
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult DoiMatKhau(string MatKhauMoi)
        {
            var userId = Session["UserID"] as int?;
            if (userId == null)
                return Json(new { success = false, message = "Bạn chưa đăng nhập!" });

            if (string.IsNullOrEmpty(MatKhauMoi))
                return Json(new { success = false, message = "Vui lòng nhập mật khẩu mới!" });

            using (var db = DbContextFactory.Create())
            {
                var sv = db.SinhViens.Include("TaiKhoan1")
                                     .FirstOrDefault(s => s.TaiKhoan == userId);

                if (sv != null && sv.TaiKhoan1 != null)
                {
                    // ⚠️ Nên hash mật khẩu trước khi lưu
                    sv.TaiKhoan1.Password = MatKhauMoi;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đổi mật khẩu thành công!" });
                }
                else
                {
                    return Json(new { success = false, message = "Không tìm thấy tài khoản!" });
                }
            }
        }







    }
}
