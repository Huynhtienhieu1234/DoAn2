using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentListDayController : Controller
    {
        // GET: Student/StudentListDay
        public ActionResult Index()
        {
            return View();
        }

        // AJAX: Lấy lịch lao động từ các đợt đã đăng ký và đã duyệt
        [HttpGet]
        public JsonResult GetLichDaDuyet()
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

                    // Lấy danh sách đợt đã đăng ký và đã duyệt
                    var rawList = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv && d.TrangThaiDuyet == true && d.Ngayxoa == null
                                   orderby d.NgayLaoDong
                                   select new
                                   {
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.LoaiLaoDong,
                                       d.KhuVuc
                                   }).ToList();

                    // Định dạng ngày dd/MM/yyyy
                    var list = rawList.Select(x => new
                    {
                        Buoi = x.Buoi,
                        Ngay = x.NgayLaoDong != null ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        LoaiLaoDong = x.LoaiLaoDong,
                        DiaDiem = x.KhuVuc
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
