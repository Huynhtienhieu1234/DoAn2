using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminSuscesWordController : Controller
    {
        // GET: Admin/AdminSuscesWord
        public ActionResult Index()
        {
            return View();
        }

        // Lấy danh sách phiếu xác nhận hoàn thành (liên kết MSSV với SinhVien)
        [HttpGet]
        public ActionResult GetList(int page = 1, int pageSize = 5)
        {
            using (var db = DbContextFactory.Create())
            {
                var query = from phieu in db.PhieuXacNhanHoanThanhs
                            join sv in db.SinhViens on phieu.MSSV equals sv.MSSV
                            join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                            join khoa in db.Khoas on lop.Khoa_id equals khoa.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            from snld in snldGroup.DefaultIfEmpty()
                            where phieu.TrangThai == "Chờ Duyệt" || phieu.TrangThai == null
                            orderby sv.HoTen
                            select new
                            {
                                id = phieu.id,
                                HoTen = sv.HoTen,
                                Lop = lop.TenLop,
                                Khoa = khoa.TenKhoa,
                                SoNgay = snld != null ? snld.TongSoNgay : 0
                            };

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                var data = query.Skip((page - 1) * pageSize)
                                .Take(pageSize)
                                .ToList();

                return Json(new
                {
                    data,
                    currentPage = page,
                    totalPages,
                    totalItems
                }, JsonRequestBehavior.AllowGet);
            }
        }




    }
}
