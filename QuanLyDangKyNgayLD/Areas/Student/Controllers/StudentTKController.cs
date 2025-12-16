using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentTKController : Controller
    {
        // GET: Student/StudentTK
        public ActionResult Index()
        {
            return View();
        }

        // AJAX: Thống kê lao động cho sinh viên
        [HttpGet]
        public JsonResult GetThongKe()
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

                    var tongDot = db.PhieuDangKies.Count(p => p.MSSV == mssv);

                    var daDuyet = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv && d.TrangThaiDuyet == true
                                   select d).Count();

                    var daDiemDanh = db.DanhSachDiemDanhs.Count(dd => dd.MSSV == mssv);

                    var hoanThanh = (from dd in db.DanhSachDiemDanhs
                                     join d in db.TaoDotNgayLaoDongs on dd.Dot_id equals d.TaoDotLaoDong_id
                                     where dd.MSSV == mssv && d.TrangThaiDuyet == true
                                     select d).Count();

                    return Json(new
                    {
                        success = true,
                        tongDot,
                        daDuyet,
                        daDiemDanh,
                        hoanThanh
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy chi tiết ngày lao động sinh viên đã tham gia
        [HttpGet]
        public JsonResult GetChiTietNgay()
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

                    // Lấy dữ liệu thô trước
                    var rawList = (from dd in db.DanhSachDiemDanhs
                                   join d in db.TaoDotNgayLaoDongs on dd.Dot_id equals d.TaoDotLaoDong_id
                                   where dd.MSSV == mssv
                                   orderby dd.ThoiGian descending
                                   select new
                                   {
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.LoaiLaoDong,
                                       d.KhuVuc,
                                       dd.ThoiGian
                                   }).ToList();

                    // Định dạng ngày sau khi đã đưa về bộ nhớ
                    var list = rawList.Select(x => new
                    {
                        Buoi = x.Buoi,
                        Ngay = x.NgayLaoDong != null ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        LoaiLaoDong = x.LoaiLaoDong,
                        DiaDiem = x.KhuVuc,
                        ThoiGianDiemDanh = x.ThoiGian.ToString("dd/MM/yyyy")
                    }).ToList();

                    return Json(new { success = true, list }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy danh sách đợt đã đăng ký (chia nhóm)
        [HttpGet]
        public JsonResult GetDotDaDangKy()
        {
            try
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                    return Json(new { success = false, message = "Phiên đăng nhập hết hạn." }, JsonRequestBehavior.AllowGet);

                using (var db = DbContextFactory.Create())
                {
                    var user = db.TaiKhoans.FirstOrDefault(t => t.Username == username);
                    var sv = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == user.TaiKhoan_id);
                    long mssv = sv.MSSV;

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
                                       d.LoaiLaoDong,
                                       DaDuyet = d.TrangThaiDuyet == true,
                                       DaDiemDanh = db.DanhSachDiemDanhs.Any(dd => dd.Dot_id == d.TaoDotLaoDong_id && dd.MSSV == mssv)
                                   }).ToList();

                    var dotList = rawList.Select(x => new
                    {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        NgayLaoDong = x.NgayLaoDong != null ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        x.KhuVuc,
                        x.LoaiLaoDong,
                        x.DaDuyet,
                        x.DaDiemDanh
                    }).OrderByDescending(x => x.NgayLaoDong).ToList();

                    var choDuyet = dotList.Where(x => !x.DaDuyet).ToList();
                    var daDuyet = dotList.Where(x => x.DaDuyet && !x.DaDiemDanh).ToList();
                    var hoanThanh = dotList.Where(x => x.DaDuyet && x.DaDiemDanh).ToList();

                    return Json(new { success = true, choDuyet, daDuyet, hoanThanh }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
