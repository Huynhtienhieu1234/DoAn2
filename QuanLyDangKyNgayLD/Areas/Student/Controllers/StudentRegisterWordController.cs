using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentRegisterWordController : Controller
    {
        // GET: Student/StudentRegisterWord
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



        [HttpGet]
        public ActionResult LoadDotLaoDong(
            int page = 1,
            int pageSize = 5,
            string buoi = "",
            string trangThai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var user = Session["User"] as TaiKhoan;

                var today = DateTime.Today;
                var currentMonth = today.Month;
                var currentYear = today.Year;

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                    .Where(d => d.Ngayxoa == null);

                // CHỈ LẤY ĐỢT TRONG THÁNG HIỆN TẠI
                query = query.Where(x => x.NgayLaoDong.HasValue &&
                                        x.NgayLaoDong.Value.Month == currentMonth &&
                                        x.NgayLaoDong.Value.Year == currentYear);

                // Lọc theo vai trò: sinh viên chỉ thấy cá nhân
                if (user != null && user.VaiTro.TenVaiTro == "SinhVien")
                {
                    query = query.Where(d => d.LoaiLaoDong == "Cá nhân");
                }

                if (!string.IsNullOrWhiteSpace(buoi))
                    query = query.Where(x => x.Buoi == buoi);

                if (trangThai == "1")
                    query = query.Where(x => x.TrangThaiDuyet == true);
                else if (trangThai == "0")
                    query = query.Where(x => x.TrangThaiDuyet == false);

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                var rawItems = query.OrderBy(x => x.NgayLaoDong)
                                    .Skip((page - 1) * pageSize)
                                    .Take(pageSize)
                                    .ToList();

                // ĐẾM SỐ LƯỢNG SINH VIÊN ĐÃ ĐĂNG KÝ (theo PhieuDangKy)
                var dotIds = rawItems.Select(x => x.TaoDotLaoDong_id).ToList();

                var dangKyCount = db.PhieuDangKies
                    .Where(p => dotIds.Contains(p.TaoDotLaoDong_id ?? 0))
                    .GroupBy(p => p.TaoDotLaoDong_id)
                    .ToDictionary(g => g.Key ?? 0, g => g.Count());

                // Đảm bảo mọi đợt đều có số lượng (nếu chưa ai đăng ký → 0)
                foreach (var id in dotIds)
                    if (!dangKyCount.ContainsKey(id))
                        dangKyCount[id] = 0;

                var items = rawItems.Select(x => new
                {
                    x.TaoDotLaoDong_id,
                    x.DotLaoDong,
                    x.Buoi,
                    x.LoaiLaoDong,
                    GiaTri = x.GiaTri ?? 0,
                    NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                    x.KhuVuc,
                    x.SoLuongSinhVien,
                    TrangThaiDuyet = x.TrangThaiDuyet == true,
                    TrangThaiText = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt",
                    SoLuongDaDangKy = dangKyCount.ContainsKey(x.TaoDotLaoDong_id) ? dangKyCount[x.TaoDotLaoDong_id] : 0
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
        //// Đăng ký ngày lao động
        [HttpPost]
        public ActionResult DangKy(int id)
        {

            using (var db = DbContextFactory.Create())
            {
                string username = Session["Username"]?.ToString();

                if (string.IsNullOrEmpty(username))
                {
                    throw new Exception("Lỗi không lưu sesion");
                }

                var user = db.TaiKhoans.FirstOrDefault(tk => tk.Username == username);

                if (username == null)
                    return Json(new { success = false, message = "Vui lòng đăng nhập lại!" });

                if (user == null)
                    return Json(new { success = false, message = "Tài khoản không tồn tại!" });


                // Lấy MSSV từ bảng SinhVien
                var sv = db.SinhViens
                      .Include("TaiKhoan1")
                      .FirstOrDefault(tk => tk.TaiKhoan == user.TaiKhoan_id);

                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên tương ứng!" + username });


                // Kiểm tra đợt lao động tồn tại
                var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == id && x.Ngayxoa == null);
                if (dot == null)
                    return Json(new { success = false, message = "Đợt lao động không tồn tại!" });

                // Kiểm tra đã đăng ký chưa
                var phieu = db.PhieuDangKies.FirstOrDefault(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV);
                if (phieu != null && phieu.TrangThai == "DangKy")
                    return Json(new { success = false, message = "Bạn đã đăng ký đợt này rồi!" });

                if (phieu == null)
                {
                    // Tạo phiếu mới
                    var phieuMoi = new PhieuDangKy
                    {
                        PhieuDangKy_id = (db.PhieuDangKies.Max(p => (int?)p.PhieuDangKy_id) ?? 0) + 1,
                        MSSV = sv.MSSV,
                        TaoDotLaoDong_id = id,
                        ThoiGian = DateTime.Now,
                        LaoDongCaNhan = dot.LoaiLaoDong == "Cá nhân",
                        LaoDongTheoLop = dot.LoaiLaoDong == "Theo lớp",
                        TrangThai = "DangKy"
                    };
                    db.PhieuDangKies.Add(phieuMoi);
                }
                else
                {
                    // Nếu trước đó đã hủy thì cho đăng ký lại
                    phieu.TrangThai = "DangKy";
                    phieu.ThoiGian = DateTime.Now;
                }

                db.SaveChanges();

                return Json(new { success = true, message = "Đăng ký thành công!" });
            }
        }

    }
}