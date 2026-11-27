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
            using (var db = DbContextFactory.Create())
            {
                if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out _, out _))
                {
                    return RedirectToAction("Login", "Login", new { area = "" });
                }
            }

            return View();
        }

        // GET: Lấy danh sách đợt đã đăng ký
        [HttpGet]
        public JsonResult GetDotDaDangKy()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sv, out var authError))
                    {
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);
                    }

                    long mssv = sv.MSSV;

                    var rawList = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv
                                         && d.Ngayxoa == null
                                         && (p.TrangThai == "DangKy" || p.TrangThai == "DaDuyet" || p.TrangThai == null)
                                   select new
                                   {
                                       d.TaoDotLaoDong_id,
                                       d.DotLaoDong,
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.KhuVuc,
                                       d.LoaiLaoDong,
                                       DaDuyet = d.TrangThaiDuyet == true,
                                       DaDiemDanh = db.DanhSachDiemDanhs.Any(dd => dd.Dot_id == d.TaoDotLaoDong_id && dd.MSSV == mssv)
                                   })
                                   .OrderByDescending(x => x.NgayLaoDong)
                                   .ThenByDescending(x => x.TaoDotLaoDong_id)
                                   .ToList();

                    var dotList = rawList.Select(x => new
                    {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        x.KhuVuc,
                        x.LoaiLaoDong,
                        x.DaDuyet,
                        x.DaDiemDanh
                    }).ToList();

                    var choDuyet = dotList.Where(x => !x.DaDuyet).ToList();
                    var daDuyet = dotList.Where(x => x.DaDuyet && !x.DaDiemDanh).ToList();
                    var hoanThanh = dotList.Where(x => x.DaDuyet && x.DaDiemDanh).ToList();

                    return Json(new
                    {
                        success = true,
                        choDuyet,
                        daDuyet,
                        hoanThanh
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
        public JsonResult DiemDanhAjax(int dotId, string maDiemDanh)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(maDiemDanh))
                    return Json(new { success = false, message = "Vui lòng nhập mã điểm danh." });

                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sinhVien, out var authError))
                    {
                        return Json(new { success = false, message = authError });
                    }

                    long mssv = sinhVien.MSSV;

                    var phieu = db.PhieuDangKies.FirstOrDefault(p =>
                        p.TaoDotLaoDong_id == dotId
                        && p.MSSV == mssv
                        && (p.TrangThai == "DangKy" || p.TrangThai == "DaDuyet" || p.TrangThai == null));
                    if (phieu == null)
                        return Json(new { success = false, message = "Bạn chưa đăng ký đợt này." });

                    var dot = db.TaoDotNgayLaoDongs.Find(dotId);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Đợt không tồn tại." });

                    if (dot.TrangThaiDuyet != true)
                        return Json(new { success = false, message = "Đợt lao động này chưa được duyệt, chưa thể điểm danh." });

                    if (dot.TrangThaiDot == "Tạm ngưng")
                        return Json(new { success = false, message = "Đợt lao động này đang tạm ngưng." });

                    string cleanCode = maDiemDanh.Trim().ToUpperInvariant();
                    if (string.IsNullOrWhiteSpace(dot.MaDiemDanh) ||
                        dot.MaDiemDanh.Trim().ToUpperInvariant() != cleanCode)
                        return Json(new { success = false, message = "Mã điểm danh không đúng." });

                    if (db.DanhSachDiemDanhs.Any(d => d.Dot_id == dotId && d.MSSV == mssv))
                        return Json(new { success = false, message = "Bạn đã điểm danh rồi!" });

                    // Lưu bản ghi điểm danh
                    db.DanhSachDiemDanhs.Add(new DanhSachDiemDanh
                    {
                        MSSV = mssv,
                        Dot_id = dotId,
                        MaDiemDanh = cleanCode,
                        ThoiGian = DateTime.Now
                    });

                    // Cộng trực tiếp vào bảng SoNgayLaoDong (do DB không có trigger tự cộng)
                    int diemCong = (dot.GiaTri.HasValue && dot.GiaTri.Value > 0) ? dot.GiaTri.Value : 1;
                    var soNgayRow = db.SoNgayLaoDongs.FirstOrDefault(s => s.MSSV == mssv);
                    if (soNgayRow != null)
                    {
                        soNgayRow.TongSoNgay = (soNgayRow.TongSoNgay ?? 0) + diemCong;
                    }
                    else
                    {
                        db.SoNgayLaoDongs.Add(new SoNgayLaoDong
                        {
                            MSSV = mssv,
                            TongSoNgay = diemCong
                        });
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = $"Điểm danh thành công! (+{diemCong} ngày lao động)" });
                }
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Json(new { success = false, message = "Lỗi hệ thống: " + detail });
            }
        }
    }
}