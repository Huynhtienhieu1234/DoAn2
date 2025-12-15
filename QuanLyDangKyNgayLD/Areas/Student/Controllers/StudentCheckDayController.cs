using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Linq;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentCheckDayController : Controller
    {
        // GET: Student/StudentCheckDay
        public ActionResult Index()
        {
            // Kiểm tra đăng nhập
            if (Session["User"] == null)
            {
                return RedirectToAction("Login", "Account", new { area = "" });
            }

            return View();
        }

        // Helper: Lấy TaiKhoan từ Session (tái sử dụng logic từ controller khác)
        private TaiKhoan GetCurrentUser()
        {
            return Session["User"] as TaiKhoan;
        }

        // GET: Lấy danh sách đợt đã đăng ký
        [HttpGet]
        public JsonResult GetDotDaDangKy()
        {
            try
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                {
                    return Json(new { success = false, message = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." }, JsonRequestBehavior.AllowGet);
                }

                using (var db = DbContextFactory.Create())
                {
                    // Lấy tài khoản từ Username
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.Username == username);
                    if (taiKhoan == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy tài khoản!" }, JsonRequestBehavior.AllowGet);
                    }

                    // Lấy sinh viên từ TaiKhoan_id
                    var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.TaiKhoan == taiKhoan.TaiKhoan_id);
                    if (sinhVien == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy thông tin sinh viên!" }, JsonRequestBehavior.AllowGet);
                    }

                    long mssv = sinhVien.MSSV;

                    // Lấy dữ liệu thô trước
                    var rawList = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv && d.Ngayxoa == null
                                   select new
                                   {
                                       d.TaoDotLaoDong_id,
                                       d.DotLaoDong,
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.KhuVuc,
                                       DaDuyet = d.TrangThaiDuyet == true,
                                       DaDiemDanh = db.DanhSachDiemDanhs.Any(dd => dd.Dot_id == d.TaoDotLaoDong_id && dd.MSSV == mssv)
                                   }).ToList(); // ✅ ToList để EF thực thi SQL trước

                    // Sau đó xử lý định dạng ngày bằng C#
                    var dotList = rawList.Select(x => new
                    {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        x.KhuVuc,
                        x.DaDuyet,
                        x.DaDiemDanh
                    }).OrderByDescending(x => x.NgayLaoDong).ToList();

                    var choDuyet = dotList.Where(x => !x.DaDuyet).ToList();
                    var daDuyet = dotList.Where(x => x.DaDuyet).ToList();

                    return Json(new
                    {
                        success = true,
                        choDuyet,
                        daDuyet,
                        role = taiKhoan.VaiTro?.TenVaiTro ?? "NULL",
                        debugRole = Session["Role"] ?? "NULL"
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Điểm danh
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult DiemDanhAjax(int dotId, string maDiemDanh)
        {
            try
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                    return Json(new { success = false, message = "Phiên đăng nhập hết hạn!" });

                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.Username == username);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản!" });

                    var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.TaiKhoan == taiKhoan.TaiKhoan_id);
                    if (sinhVien == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên!" });

                    long mssv = sinhVien.MSSV;

                    // ... (phần kiểm tra đăng ký, mã, đã điểm danh, lưu điểm danh, cộng ngày lao động giữ nguyên như cũ)
                    // Chỉ thay mssv lấy từ sinhVien.MSSV thay vì Session["MSSV"]

                    var phieu = db.PhieuDangKies.FirstOrDefault(p => p.TaoDotLaoDong_id == dotId && p.MSSV == mssv);
                    if (phieu == null)
                        return Json(new { success = false, message = "Bạn chưa đăng ký đợt này." });

                    var dot = db.TaoDotNgayLaoDongs.Find(dotId);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Đợt không tồn tại." });

                    if (string.IsNullOrWhiteSpace(dot.MaDiemDanh) ||
                        dot.MaDiemDanh.Trim().ToUpper() != maDiemDanh.Trim().ToUpper())
                        return Json(new { success = false, message = "Mã điểm danh không đúng." });

                    if (db.DanhSachDiemDanhs.Any(d => d.Dot_id == dotId && d.MSSV == mssv))
                        return Json(new { success = false, message = "Bạn đã điểm danh rồi!" });

                    db.DanhSachDiemDanhs.Add(new DanhSachDiemDanh
                    {
                        MSSV = mssv,
                        Dot_id = dotId,
                        MaDiemDanh = maDiemDanh.Trim().ToUpper(),
                        ThoiGian = DateTime.Now
                    });

                    var soNgay = db.SoNgayLaoDongs.FirstOrDefault(s => s.MSSV == mssv);
                    if (soNgay != null)
                    {
                        soNgay.TongSoNgay = (soNgay.TongSoNgay ?? 0) + 1;
                    }
                    else
                    {
                        db.SoNgayLaoDongs.Add(new SoNgayLaoDong { MSSV = mssv, TongSoNgay = 1 });
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = "Điểm danh thành công! Đã cộng +1 ngày lao động." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống." });
            }
        }
    }
}