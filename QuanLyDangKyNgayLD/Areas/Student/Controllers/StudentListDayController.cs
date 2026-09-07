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
                             d.TaoDotLaoDong_id,
                             d.DotLaoDong,
                             d.Buoi,
                             d.NgayLaoDong,
                             d.LoaiLaoDong,
                             d.KhuVuc,
                             d.TrangThaiDot,
                             d.TrangThaiDuyet,
                             d.SoLuongSinhVien,
                             d.GiaTri,
                             d.MoTa,
                             DaDiemDanh = diemDanh != null
                         }).ToList();

                    var now = DateTime.Now;
                    var todayDate = DateTime.Today;
                    var nowTime = now.TimeOfDay;

                    var dotIds = rawList.Select(x => x.TaoDotLaoDong_id).Distinct().ToList();
                    var dangKyCounts = db.PhieuDangKies
                        .Where(p => dotIds.Contains(p.TaoDotLaoDong_id.Value) && p.TrangThai == "DangKy")
                        .GroupBy(p => p.TaoDotLaoDong_id.Value)
                        .ToDictionary(g => g.Key, g => g.Count());

                    var phieuLopList = db.PhieuDangKies
                        .Where(p => p.TaoDotLaoDong_id.HasValue && dotIds.Contains(p.TaoDotLaoDong_id.Value) && p.LaoDongTheoLop == true)
                        .Select(p => new { TaoDotLaoDong_id = p.TaoDotLaoDong_id.Value, p.MSSV })
                        .ToList();

                    var lopDangKyDict = phieuLopList
                        .Join(db.SinhViens, p => p.MSSV, s => s.MSSV, (p, s) => new { p.TaoDotLaoDong_id, LopId = s.Lop_id })
                        .GroupBy(x => x.TaoDotLaoDong_id)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(x => x.LopId.GetValueOrDefault()).Distinct().Count()
                        );

                    var list = rawList.Select(x =>
                    {
                        bool isPastTime = false;
                        if (x.NgayLaoDong.HasValue)
                        {
                            if (x.NgayLaoDong.Value.Date < todayDate)
                            {
                                isPastTime = true;
                            }
                            else if (x.NgayLaoDong.Value.Date == todayDate)
                            {
                                bool isSang = string.Equals(x.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase) || (x.Buoi != null && x.Buoi.ToLower().Contains("sáng"));
                                bool isChieu = string.Equals(x.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase) || (x.Buoi != null && x.Buoi.ToLower().Contains("chiều"));

                                if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                                {
                                    isPastTime = true;
                                }
                                else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                                {
                                    isPastTime = true;
                                }
                            }
                        }

                        int soLuongDangKy = dangKyCounts.ContainsKey(x.TaoDotLaoDong_id) ? dangKyCounts[x.TaoDotLaoDong_id] : 0;
                        int soLuongCan = x.SoLuongSinhVien ?? 20;
                        bool isLoaiLop = string.Equals(x.LoaiLaoDong?.Trim(), "Lớp", StringComparison.OrdinalIgnoreCase);
                        int soLopDaDangKy = isLoaiLop && lopDangKyDict.ContainsKey(x.TaoDotLaoDong_id) ? lopDangKyDict[x.TaoDotLaoDong_id] : 0;
                        int tongLopCan = x.SoLuongSinhVien.GetValueOrDefault(20);

                        bool khongDuSoLuong = isLoaiLop ? (soLopDaDangKy < tongLopCan) : (soLuongDangKy < soLuongCan);

                        string trangThaiText = "Chưa duyệt";
                        if (x.DaDiemDanh)
                        {
                            trangThaiText = "Đã điểm danh";
                        }
                        else if (x.TrangThaiDot == "Tạm ngưng")
                        {
                            trangThaiText = "Tạm ngưng";
                        }
                        else if (isPastTime && (x.TrangThaiDuyet != true || khongDuSoLuong))
                        {
                            trangThaiText = "Kết thúc";
                        }
                        else if (x.TrangThaiDuyet == true)
                        {
                            trangThaiText = "Đã duyệt";
                        }
                        else
                        {
                            trangThaiText = "Chưa duyệt";
                        }

                        return new
                        {
                            TaoDotLaoDong_id = x.TaoDotLaoDong_id,
                            DotLaoDong = x.DotLaoDong,
                            Buoi = x.Buoi,
                            Ngay = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                            LoaiLaoDong = x.LoaiLaoDong,
                            DiaDiem = x.KhuVuc,
                            GiaTri = x.GiaTri ?? 0,
                            MoTa = x.MoTa ?? "",
                            TrangThaiText = trangThaiText
                        };
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
