using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Areas.Admin.ViewModel;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminTKController : Controller
    {
        // GET: Admin/AdminTK
        public ActionResult Index(string khoa = "", int page = 1)
        {
            const int PAGE_SIZE = 5;

            using (var db = DbContextFactory.Create())
            {
                // ===== QUERY GỐC =====
                var query = from sv in db.SinhViens
                            where sv.Deleted_at == null
                            join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                            join k in db.Khoas on lop.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            select new StudentProgressViewModel
                            {
                                MSSV = sv.MSSV,
                                HoTen = sv.HoTen,
                                Lop = lop.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                            };

                // ===== LỌC THEO KHOA =====
                if (!string.IsNullOrEmpty(khoa))
                {
                    query = query.Where(x => x.Khoa == khoa);
                }

                // ===== THỐNG KÊ =====
                int tongSV = query.Count();
                int daHoanThanh = query.Count(x => x.SoNgay >= 18);
                int chuaHoanThanh = tongSV - daHoanThanh;
                double tienDo = tongSV > 0
                    ? Math.Round((double)daHoanThanh / tongSV * 100, 2)
                    : 0;

                // ===== VIEWBAG =====
                ViewBag.Khoa = khoa;
                ViewBag.TongSinhVien = tongSV;
                ViewBag.DaHoanThanh = daHoanThanh;
                ViewBag.ChuaHoanThanh = chuaHoanThanh;
                ViewBag.TienDoHoanThanh = tienDo;

                // ===== PHÂN TRANG =====
                int totalPages = (int)Math.Ceiling((double)tongSV / PAGE_SIZE);
                page = page < 1 ? 1 : page;

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;

                var listSV = query
                    .OrderBy(x => x.MSSV)
                    .Skip((page - 1) * PAGE_SIZE)
                    .Take(PAGE_SIZE)
                    .ToList();

                // ===== TRẢ VIEW =====
                return View(listSV);
            }
        }

        public PartialViewResult LoadData(string khoa = "", int page = 1)
        {
            const int PAGE_SIZE = 5;

            using (var db = DbContextFactory.Create())
            {
                var query = from sv in db.SinhViens
                            where sv.Deleted_at == null
                            join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                            join k in db.Khoas on lop.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            select new StudentProgressViewModel
                            {
                                MSSV = sv.MSSV,
                                HoTen = sv.HoTen,
                                Lop = lop.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                            };

                if (!string.IsNullOrEmpty(khoa))
                    query = query.Where(x => x.Khoa == khoa);

                int tongSV = query.Count();
                int daHoanThanh = query.Count(x => x.SoNgay >= 18);
                int chuaHoanThanh = tongSV - daHoanThanh;
                double tienDo = tongSV > 0
                    ? Math.Round((double)daHoanThanh / tongSV * 100, 2)
                    : 0;

                ViewBag.TongSinhVien = tongSV;
                ViewBag.DaHoanThanh = daHoanThanh;
                ViewBag.ChuaHoanThanh = chuaHoanThanh;
                ViewBag.TienDoHoanThanh = tienDo;

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = (int)Math.Ceiling((double)tongSV / PAGE_SIZE);

                var listSV = query
                    .OrderBy(x => x.MSSV)
                    .Skip((page - 1) * PAGE_SIZE)
                    .Take(PAGE_SIZE)
                    .ToList();

                return PartialView("_StudentTable", listSV);
            }
        }



    }
}
