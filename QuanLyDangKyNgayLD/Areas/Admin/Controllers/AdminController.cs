using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminController : Controller
    {
        // GET: Admin/Admin
        public ActionResult Index()
        {
            using (var db = DbContextFactory.Create())
            {
                var model = new AdminThongKeViewModel
                {
                    TongTaiKhoan = db.TaiKhoans.Count(),
                    TongSinhVien = db.SinhViens.Count(),
                    TongDotLaoDong = db.TaoDotNgayLaoDongs.Count(),
                    TongHoanThanh = db.PhieuXacNhanHoanThanhs.Count(x => x.TrangThai == "Hoàn thành")
                };

                return View(model);
            }
        }
        // ViewModel chứa dữ liệu hiển thị ra giao diện
        public class AdminThongKeViewModel
        {
            public int TongTaiKhoan { get; set; }
            public int TongSinhVien { get; set; }
            public int TongDotLaoDong { get; set; }
            public int TongHoanThanh { get; set; }
        }
    }



}
