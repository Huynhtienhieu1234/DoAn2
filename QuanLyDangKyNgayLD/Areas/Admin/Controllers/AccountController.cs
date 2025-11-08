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

        // GET: Admin/Account/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id);

                if (taiKhoan == null)
                {
                    return HttpNotFound();
                }

                // Load danh sách vai trò để hiển thị trong dropdown
                ViewBag.MaVaiTro = new SelectList(db.VaiTroes, "MaVaiTro", "TenVaiTro", taiKhoan.TaiKhoan_id);
                return View(taiKhoan);
            }
        }

        [HttpPost]

        public ActionResult EditAjax(int TaiKhoan_id, string Username, string Email, string Password, string VaiTro)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == TaiKhoan_id);
                if (taiKhoan == null)
                    return Json(new { success = false });

                taiKhoan.Username = Username;
                taiKhoan.Email = Email;

                if (!string.IsNullOrEmpty(Password))
                    taiKhoan.Password = Password;

                // 🔧 Tìm vai trò theo tên (nếu bạn gửi từ client là tên)
                var role = db.VaiTroes.FirstOrDefault(v => v.TenVaiTro == VaiTro);
                if (role != null)
                    taiKhoan.VaiTro = role.VaiTro_id;

                db.SaveChanges();
                return Json(new { success = true });
            }
        }


        // GET: Admin/Account/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id);

                if (taiKhoan == null)
                {
                    return HttpNotFound();
                }

                return View(taiKhoan);
            }
        }
    }
}
