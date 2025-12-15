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
        private const int ITEMS_PER_PAGE = 5;

        // Hàm helper lấy vai trò thực tế từ Session
        private string GetUserRoleFromSession()
        {
            var user = Session["User"] as TaiKhoan;
            if (user == null) return null;

            // Ưu tiên lấy từ VaiTro.TenVaiTro
            if (user.VaiTro != null && !string.IsNullOrEmpty(user.VaiTro.TenVaiTro))
            {
                return user.VaiTro.TenVaiTro.Trim();
            }

            // Nếu không có thì try lấy từ VaiTro_id
            if (user.VaiTro_id == 3)
            {
                return "SinhVien";
            }

            return null;
        }

        // Trang Index hiển thị View
        public ActionResult Index(int page = 1, string buoi = "", string trangthai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var user = Session["User"] as TaiKhoan;
                var userRole = GetUserRoleFromSession();

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                                                        .Where(d => d.Ngayxoa == null);

                // Lọc theo vai trò
                if (!string.IsNullOrEmpty(userRole))
                {
                    if (userRole == "SinhVien") // Sinh viên: chỉ lấy Cá Nhân
                    {
                        query = query.Where(d => d.LoaiLaoDong.Trim().Length != 3);
                    }
                    else if (userRole == "LopPhoLaoDong") // Lớp phó: lấy cả Lớp và Cá Nhân
                    {
                        query = query.Where(d => d.LoaiLaoDong.Trim().Length == 3 || d.LoaiLaoDong.Trim().Length != 3);
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

                // Phân trang
                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / ITEMS_PER_PAGE);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var items = query.OrderByDescending(x => x.NgayLaoDong)
                                 .Skip((page - 1) * ITEMS_PER_PAGE)
                                 .Take(ITEMS_PER_PAGE)
                                 .ToList();

                // Chuẩn hóa loại lao động
                items.ForEach(x => x.LoaiLaoDong = x.LoaiLaoDong.Trim().Length == 3 ? "Lớp" : "Cá Nhân");

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.Buoi = buoi;
                ViewBag.TrangThai = trangthai;
                ViewBag.Role = userRole;

                return View(items);
            }
        }

        [HttpGet]
        public ActionResult LoadDotLaoDong(int page = 1, int pageSize = 5, string buoi = "", string trangThai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var userRole = GetUserRoleFromSession();
                var today = DateTime.Today;
                var currentMonth = today.Month;
                var currentYear = today.Year;

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                                                        .Where(d => d.Ngayxoa == null);

                // Chỉ lấy trong tháng hiện tại
                query = query.Where(x => x.NgayLaoDong.HasValue &&
                                         x.NgayLaoDong.Value.Month == currentMonth &&
                                         x.NgayLaoDong.Value.Year == currentYear);

                // Lọc theo vai trò
                if (!string.IsNullOrEmpty(userRole))
                {
                    if (userRole == "SinhVien")
                    {
                        query = query.Where(d => d.LoaiLaoDong.Trim().Length != 3);
                    }
                    else if (userRole == "LopPhoLaoDong")
                    {
                        query = query.Where(d => d.LoaiLaoDong.Trim().Length == 3 || d.LoaiLaoDong.Trim().Length != 3);
                    }
                }

                // Lọc theo buổi và trạng thái duyệt
                if (!string.IsNullOrWhiteSpace(buoi))
                    query = query.Where(x => x.Buoi == buoi);
                if (trangThai == "1")
                    query = query.Where(x => x.TrangThaiDuyet == true);
                else if (trangThai == "0")
                    query = query.Where(x => x.TrangThaiDuyet == false);

                // Sắp xếp: chưa kết thúc lên trước, đã kết thúc xuống sau
                var orderedQuery = query.OrderBy(x => x.NgayLaoDong.Value < today ? 1 : 0)
                                        .ThenBy(x => x.NgayLaoDong.Value);

                int totalItems = orderedQuery.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);
                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var rawItems = orderedQuery.Skip((page - 1) * pageSize).Take(pageSize).ToList();

                // Đếm số lượng đã đăng ký toàn bộ
                var dotIds = rawItems.Select(x => x.TaoDotLaoDong_id).ToList();
                var dangKyCount = db.PhieuDangKies
                    .Where(p => dotIds.Contains(p.TaoDotLaoDong_id ?? 0))
                    .GroupBy(p => p.TaoDotLaoDong_id)
                    .ToDictionary(g => g.Key ?? 0, g => g.Count());

                // LẤY MSSV SINH VIÊN HIỆN TẠI ĐỂ KIỂM TRA ĐÃ ĐĂNG KÝ CHƯA
                string username = Session["Username"]?.ToString();
                long? currentMSSV = null;
                if (!string.IsNullOrEmpty(username))
                {
                    var user = db.TaiKhoans.FirstOrDefault(t => t.Username == username);
                    if (user != null)
                    {
                        var sv = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == user.TaiKhoan_id);
                        if (sv != null) currentMSSV = sv.MSSV;
                    }
                }

                // Danh sách đợt sinh viên đã đăng ký (trạng thái DangKy)
                var registeredDotIds = currentMSSV.HasValue
                    ? db.PhieuDangKies
                        .Where(p => p.MSSV == currentMSSV.Value && p.TrangThai == "DangKy")
                        .Select(p => p.TaoDotLaoDong_id ?? 0)
                        .ToList()
                    : new List<int>();

                var items = rawItems.Select(x => new
                {
                    x.TaoDotLaoDong_id,
                    x.DotLaoDong,
                    x.Buoi,
                    LoaiLaoDong = x.LoaiLaoDong.Trim().Length == 3 ? "Lớp" : "Cá Nhân",
                    GiaTri = x.GiaTri ?? 0,
                    NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                    x.KhuVuc,
                    x.SoLuongSinhVien,
                    TrangThaiDuyet = x.TrangThaiDuyet == true,
                    TrangThaiText = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt",
                    SoLuongDaDangKy = dangKyCount.ContainsKey(x.TaoDotLaoDong_id) ? dangKyCount[x.TaoDotLaoDong_id] : 0,
                    // THÊM 2 FIELD QUAN TRỌNG
                    DaDangKy = registeredDotIds.Contains(x.TaoDotLaoDong_id), // Sinh viên đã đăng ký chưa
                    DaDuyet = x.TrangThaiDuyet == true // Đợt đã duyệt chưa
                }).ToList();

                return Json(new
                {
                    success = true,
                    items,
                    page,
                    totalPages,
                    role = userRole,
                    debugRole = userRole ?? "NULL"
                }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpPost]
        public ActionResult DangKy(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                    return Json(new { success = false, message = "Vui lòng đăng nhập lại!", type = "error" });

                var user = db.TaiKhoans.FirstOrDefault(tk => tk.Username == username);
                if (user == null)
                    return Json(new { success = false, message = "Tài khoản không tồn tại!", type = "error" });

                var sv = db.SinhViens.FirstOrDefault(tk => tk.TaiKhoan == user.TaiKhoan_id);
                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên tương ứng!", type = "error" });

                var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == id && x.Ngayxoa == null);
                if (dot == null)
                    return Json(new { success = false, message = "Đợt lao động không tồn tại!", type = "error" });

                var phieu = db.PhieuDangKies.FirstOrDefault(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV);

                if (phieu != null && phieu.TrangThai == "DangKy")
                    return Json(new { success = false, message = "Bạn đã đăng ký đợt này rồi!", type = "error" });

                if (phieu == null)
                {
                    var phieuMoi = new PhieuDangKy
                    {
                        PhieuDangKy_id = (db.PhieuDangKies.Max(p => (int?)p.PhieuDangKy_id) ?? 0) + 1,
                        MSSV = sv.MSSV,
                        TaoDotLaoDong_id = id,
                        ThoiGian = DateTime.Now,
                        LaoDongCaNhan = true,
                        LaoDongTheoLop = false,
                        TrangThai = "DangKy"
                    };
                    db.PhieuDangKies.Add(phieuMoi);
                }
                else
                {
                    phieu.TrangThai = "DangKy";
                    phieu.ThoiGian = DateTime.Now;
                }

                db.SaveChanges();

                return Json(new { success = true, message = "Đăng ký thành công!", type = "success" });
            }
        }

        [HttpPost]
        public ActionResult HuyDangKy(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                string username = Session["Username"]?.ToString();
                if (string.IsNullOrEmpty(username))
                    return Json(new { success = false, message = "Vui lòng đăng nhập lại!", type = "error" });

                var user = db.TaiKhoans.FirstOrDefault(tk => tk.Username == username);
                if (user == null)
                    return Json(new { success = false, message = "Tài khoản không tồn tại!", type = "error" });

                var sv = db.SinhViens.FirstOrDefault(tk => tk.TaiKhoan == user.TaiKhoan_id);
                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên!", type = "error" });

                var phieu = db.PhieuDangKies.FirstOrDefault(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV);

                if (phieu == null || phieu.TrangThai != "DangKy")
                    return Json(new { success = false, message = "Bạn chưa đăng ký hoặc đã hủy trước đó!", type = "error" });

                db.PhieuDangKies.Remove(phieu);
                db.SaveChanges();

                return Json(new { success = true, message = "Đã hủy và xóa phiếu đăng ký thành công!", type = "success" });
            }
        }
    }
}