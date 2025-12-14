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
                            where (phieu.TrangThai == "Chờ Xác Nhận" || phieu.TrangThai == null)
                                  && (snld != null && snld.TongSoNgay == 18)   // ✅ chỉ lấy sinh viên đủ 18 ngày
                            orderby sv.HoTen
                            select new
                            {
                                id = phieu.id,
                                MSSV = sv.MSSV,
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




        // Xác nhận Duyệt
        [HttpPost]
        public ActionResult DuyetAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var phieu = db.PhieuXacNhanHoanThanhs.FirstOrDefault(p => p.id == id);
                if (phieu == null)
                    return Json(new { success = false, message = "Không tìm thấy phiếu xác nhận." });

                phieu.TrangThai = "Hoàn Thành";
                phieu.NgayXacNhan = DateTime.Now;
                phieu.NguoiXacNhan = 1;

                var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == phieu.MSSV);
                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                // ✅ Ép MSSV (long) sang string để so sánh với Username (string)
                var tk = db.TaiKhoans.FirstOrDefault(t => t.Username == sv.MSSV.ToString());
                if (tk != null)
                {
                    tk.IsLocked = true;
                }

                db.SaveChanges();

                if (!string.IsNullOrEmpty(sv.Email))
                {
                    try
                    {
                        EmailHelperCompletion.SendCompletionEmail(sv.Email, sv.HoTen);
                    }
                    catch (Exception ex)
                    {
                        return Json(new
                        {
                            success = true,
                            message = $"Đã duyệt và khóa tài khoản MSSV {sv.MSSV}, nhưng gửi email thất bại: {ex.Message}"
                        });
                    }
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã duyệt, khóa tài khoản MSSV {sv.MSSV} và gửi email thành công!"
                });
            }
        }




    }
}
