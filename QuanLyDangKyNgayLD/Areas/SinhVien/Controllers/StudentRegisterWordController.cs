using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Linq;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.SinhVien.Controllers
{
    public class StudentRegisterWordController : Controller
    {
        private const int ITEMS_PER_PAGE = 5;

        // Trang Index hiển thị View
        public ActionResult Index(int page = 1, string buoi = "", string trangthai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var user = Session["User"] as TaiKhoan;

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                                                        .Where(d => d.Ngayxoa == null);

                // Lọc theo vai trò
                if (user != null)
                {
                    if (user.VaiTro.TenVaiTro == "SinhVien")
                    {
                        query = query.Where(d => d.LoaiLaoDong == "Cá nhân");
                    }
                    else if (user.VaiTro.TenVaiTro == "LopPhoLaoDong")
                    {
                        // lớp phó lao động thấy tất cả
                    }
                }

                // Lọc theo buổi
                if (!string.IsNullOrWhiteSpace(buoi))
                    query = query.Where(x => x.Buoi == buoi);

                // Lọc theo trạng thái duyệt
                if (trangthai == "1")
                    query = query.Where(x => x.TrangThaiDuyet == true);
                else if (trangthai == "0")
                    query = query.Where(x => x.TrangThaiDuyet == false);

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / ITEMS_PER_PAGE);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var items = query.OrderByDescending(x => x.NgayLaoDong)
                                 .Skip((page - 1) * ITEMS_PER_PAGE)
                                 .Take(ITEMS_PER_PAGE)
                                 .ToList();

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.Buoi = buoi;
                ViewBag.TrangThai = trangthai;

                return View(items);
            }
        }

        // AJAX: Lấy danh sách đợt lao động (phân trang + lọc)
        [HttpGet]
        public ActionResult LoadDotLaoDong(
            int page = 1,
            int pageSize = ITEMS_PER_PAGE,
            string buoi = "",
            string trangThai = "",
            int? thang = null
        )
        {
            using (var db = DbContextFactory.Create())
            {
                var user = Session["User"] as TaiKhoan;

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                                                        .Where(d => d.Ngayxoa == null);

                // Lọc theo vai trò
                if (user != null)
                {
                    if (user.VaiTro.TenVaiTro == "SinhVien")
                    {
                        query = query.Where(d => d.LoaiLaoDong == "Cá nhân");
                    }
                }

                // Lọc theo buổi
                if (!string.IsNullOrWhiteSpace(buoi))
                    query = query.Where(x => x.Buoi == buoi);

                // Lọc theo trạng thái duyệt
                if (trangThai == "1")
                    query = query.Where(x => x.TrangThaiDuyet == true);
                else if (trangThai == "0")
                    query = query.Where(x => x.TrangThaiDuyet == false);

                // Lọc theo tháng
                if (thang.HasValue)
                    query = query.Where(x => x.NgayLaoDong.HasValue && x.NgayLaoDong.Value.Month == thang.Value);

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                var rawItems = query.OrderByDescending(x => x.NgayLaoDong)
                                    .Skip((page - 1) * pageSize)
                                    .Take(pageSize)
                                    .ToList();

                var items = rawItems.Select(x => new
                {
                    x.TaoDotLaoDong_id,
                    x.DotLaoDong,
                    x.Buoi,
                    x.LoaiLaoDong,
                    GiaTri = x.GiaTri,
                    NgayLaoDong = x.NgayLaoDong.HasValue
                        ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy")
                        : "",
                    x.KhuVuc,
                    x.SoLuongSinhVien,
                    TrangThaiDuyet = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt"
                }).ToList();

                return Json(new
                {
                    success = true,
                    items,
                    page,
                    totalPages
                }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
