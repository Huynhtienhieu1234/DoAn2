using System.Linq;
using System.Web.Mvc;
using System.Data.Entity; 
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;
using System.Net;
namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AccountController : Controller
    {
        // GET: Admin/Account
        public ActionResult Index()
        {
            using (var db = DbContextFactory.Create())
            {
                // Include để load cả bảng VaiTro (Role)
                var taiKhoans = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .ToList();

                return View(taiKhoans);
            }
        }

        // Get : Admin: Edit
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans.Find(id);
                if (taiKhoan == null)
                {
                    return HttpNotFound();
                }
                ViewBag.Role_id = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.Role_id);
                return View(taiKhoan);
            }
        }





    }
}
