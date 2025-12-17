using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentListDayController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public JsonResult GetLichDaDangKy(int weekOffset = 0)
        {
            try
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                    return Json(new { success = false, message = "Phiên đăng nhập hết hạn." }, JsonRequestBehavior.AllowGet);

                using (var db = DbContextFactory.Create())
                {
                    var user = db.TaiKhoans.FirstOrDefault(t => t.Username == username);
                    if (user == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản!" }, JsonRequestBehavior.AllowGet);

                    var sv = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == user.TaiKhoan_id);
                    if (sv == null)
                        return Json(new { success = false, message = "Không tìm thấy sinh viên!" }, JsonRequestBehavior.AllowGet);

                    long mssv = sv.MSSV;

                    DateTime today = DateTime.Today;
                    int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
                    DateTime monday = today.AddDays(-diff).AddDays(weekOffset * 7);
                    DateTime sunday = monday.AddDays(6);

                    var rawList =
                        (from p in db.PhieuDangKies
                         join d in db.TaoDotNgayLaoDongs
                            on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id

                         // LEFT JOIN điểm danh
                         join dd in db.DanhSachDiemDanhs
                            on new { MSSV = p.MSSV, Dot_id = p.TaoDotLaoDong_id ?? 0 }
                            equals new { dd.MSSV, dd.Dot_id }
                            into diemDanhGroup
                         from diemDanh in diemDanhGroup.DefaultIfEmpty()

                         where p.MSSV == mssv
                               && p.TrangThai == "DangKy"
                               && d.Ngayxoa == null
                               && d.NgayLaoDong >= monday
                               && d.NgayLaoDong <= sunday

                         orderby d.NgayLaoDong
                         select new
                         {
                             d.Buoi,
                             d.NgayLaoDong,
                             d.LoaiLaoDong,
                             d.KhuVuc,
                             d.TrangThaiDot,

                             DaDiemDanh = diemDanh != null
                         }).ToList();

                    var list = rawList.Select(x => new
                    {
                        Buoi = x.Buoi,
                        Ngay = x.NgayLaoDong.HasValue
                            ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy")
                            : "",
                        LoaiLaoDong = x.LoaiLaoDong,
                        DiaDiem = x.KhuVuc,

                        TrangThaiText =
                            x.DaDiemDanh
                                ? "Đã điểm danh"
                                : string.IsNullOrEmpty(x.TrangThaiDot)
                                    ? "Chưa duyệt"
                                    : (x.TrangThaiDot == "Đã duyệt"
                                       && x.NgayLaoDong.HasValue
                                       && x.NgayLaoDong.Value.Date < DateTime.Today
                                        ? "Hoàn thành"
                                        : x.TrangThaiDot)
                    }).ToList();

                    return Json(new { success = true, list }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
