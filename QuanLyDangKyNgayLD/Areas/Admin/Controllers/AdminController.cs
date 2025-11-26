using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Areas.Admin.Models; // dùng ViewModel riêng

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
    }
}
