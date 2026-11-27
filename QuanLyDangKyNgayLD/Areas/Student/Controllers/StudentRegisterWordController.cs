using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentRegisterWordController : Controller
    {
        private const int ITEMS_PER_PAGE = 5;

        /// <summary>
        /// Truy vấn các phiếu đăng ký đang hiệu lực (chờ duyệt "DangKy", đã duyệt "DaDuyet" và dữ liệu cũ null).
        /// </summary>
        private static IQueryable<PhieuDangKy> ActiveRegistrations(DB_QLNLD4ROLEEntities1 db)
        {
            return db.PhieuDangKies.Where(p => p.TrangThai == "DangKy" || p.TrangThai == "DaDuyet" || p.TrangThai == null);
        }

        private const string ROLE_SINH_VIEN = "SinhVien";
        private const string ROLE_LOP_TRUONG = "LopTruong";

        // Bỏ dấu tiếng Việt để so sánh tên vai trò được linh hoạt
        private static string NormalizeRoleName(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return string.Empty;

            string lower = roleName.Trim().ToLowerInvariant().Replace('đ', 'd');
            string normalized = lower.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();

            foreach (char c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            return sb.ToString().Replace("đ", "d").Replace("  ", " ").Trim();
        }

        // Lớp trưởng / Lớp phó lao động đều có quyền đăng ký theo lớp
        private bool IsClassLeader()
        {
            var vaiTroId = Session["VaiTroId"] as int?;
            if (vaiTroId == 4) return true;

            var user = Session["User"] as TaiKhoan;
            if (user != null)
            {
                if (user.VaiTro_id == 4) return true;

                string normalized = NormalizeRoleName(user.VaiTro?.TenVaiTro);
                if (normalized.Contains("lop truong") ||
                    normalized.Contains("lop pho") ||
                    normalized == "loppholaodong" ||
                    normalized == "lopphilaodong")
                {
                    return true;
                }
            }

            string sessionRole = NormalizeRoleName(Session["Role"]?.ToString());
            return sessionRole.Contains("lop truong") || sessionRole.Contains("lop pho");
        }

        // Hàm helper lấy vai trò thực tế từ Session (đã chuẩn hóa)
        private string GetUserRoleFromSession()
        {
            if (IsClassLeader()) return ROLE_LOP_TRUONG;

            var vaiTroId = Session["VaiTroId"] as int?;
            if (vaiTroId == 3) return ROLE_SINH_VIEN;

            var user = Session["User"] as TaiKhoan;
            if (user != null && user.VaiTro_id == 3) return ROLE_SINH_VIEN;

            string normalized = NormalizeRoleName(Session["Role"]?.ToString());
            if (normalized.Contains("sinh vien")) return ROLE_SINH_VIEN;

            return null;
        }

        // Trang Index hiển thị View
        public ActionResult Index(int page = 1, string buoi = "", string trangthai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var user = SessionAuthHelper.ResolveAuthenticatedAccount(HttpContext, db);
                var userRole = GetUserRoleFromSession();
                bool isClassLeader = IsClassLeader();

                IQueryable<TaoDotNgayLaoDong> query = db.TaoDotNgayLaoDongs
                                                        .Where(d => d.Ngayxoa == null);

                // Lọc theo vai trò
                if (!string.IsNullOrEmpty(userRole))
                {
                    if (userRole == ROLE_SINH_VIEN) // Sinh viên: chỉ lấy Cá Nhân
                    {
                        query = query.Where(d => d.LoaiLaoDong.Trim().Length != 3);
                    }
                    else if (userRole == ROLE_LOP_TRUONG) // Lớp trưởng: lấy cả Lớp và Cá Nhân
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
                ViewBag.IsClassLeader = isClassLeader;

                return View(items);
            }
        }

        // Helper lấy sinh viên hiện tại một cách an toàn và chính xác
        private SinhVien GetCurrentSinhVien(DB_QLNLD4ROLEEntities1 db)
        {
            SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sv, out _);
            return sv;
        }

        [HttpGet]
        public ActionResult LoadDotLaoDong(int page = 1, int pageSize = 5, string buoi = "", string trangThai = "")
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    SessionAuthHelper.ResolveAuthenticatedAccount(HttpContext, db);
                    var userRole = GetUserRoleFromSession();
                    bool isClassLeader = IsClassLeader();
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
                        if (userRole == ROLE_SINH_VIEN)
                        {
                            query = query.Where(d => d.LoaiLaoDong.Trim().Length != 3);
                        }
                        else if (userRole == ROLE_LOP_TRUONG)
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

                    // Sắp xếp: chưa kết thúc lên trước, đã kết thúc xuống sau; thời gian từ mới nhất tới cũ
                    var orderedQuery = query.OrderBy(x => x.NgayLaoDong.Value < today ? 1 : 0)
                                            .ThenByDescending(x => x.NgayLaoDong.Value)
                                            .ThenByDescending(x => x.TaoDotLaoDong_id);

                    int totalItems = orderedQuery.Count();
                    int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);
                    if (page < 1) page = 1;
                    if (page > totalPages && totalPages > 0) page = totalPages;

                    var rawItems = orderedQuery.Skip((page - 1) * pageSize).Take(pageSize).ToList();

                    // Đếm số lượng đã đăng ký toàn bộ
                    var dotIds = rawItems.Select(x => x.TaoDotLaoDong_id).ToList();
                    var dangKyCount = ActiveRegistrations(db)
                        .Where(p => dotIds.Contains(p.TaoDotLaoDong_id ?? 0))
                        .GroupBy(p => p.TaoDotLaoDong_id)
                        .ToDictionary(g => g.Key ?? 0, g => g.Count());

                    var lopDangKyCount = (from pd in ActiveRegistrations(db)
                                          join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                          where dotIds.Contains(pd.TaoDotLaoDong_id ?? 0) && pd.LaoDongTheoLop == true
                                          group sv.Lop_id by pd.TaoDotLaoDong_id.Value into g
                                          select new { DotId = g.Key, Count = g.Distinct().Count() })
                                         .ToDictionary(x => x.DotId, x => x.Count);

                    // LẤY MSSV SINH VIÊN HIỆN TẠI ĐỂ KIỂM TRA ĐÃ ĐĂNG KÝ CHƯA
                    var currentSv = GetCurrentSinhVien(db);
                    long? currentMSSV = currentSv?.MSSV;

                    // Danh sách đợt sinh viên đã đăng ký (bao gồm chờ duyệt "DangKy" và đã duyệt "DaDuyet")
                    var registeredDotIds = currentMSSV.HasValue
                        ? ActiveRegistrations(db)
                            .Where(p => p.MSSV == currentMSSV.Value)
                            .Select(p => p.TaoDotLaoDong_id ?? 0)
                            .ToList()
                        : new List<int>();

                    var now = DateTime.Now;
                    var nowTime = now.TimeOfDay;

                    var items = rawItems.Select(x =>
                    {
                        bool isPast = false;
                        if (x.NgayLaoDong.HasValue)
                        {
                            if (x.NgayLaoDong.Value.Date < today)
                            {
                                isPast = true;
                            }
                            else if (x.NgayLaoDong.Value.Date == today)
                            {
                                bool isSang = string.Equals(x.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase);
                                bool isChieu = string.Equals(x.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase);
                                if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                                    isPast = true;
                                else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                                    isPast = true;
                            }
                        }

                        bool isLoaiLop = x.LoaiLaoDong.Trim().Length == 3;
                        int soLopDaDangKy = lopDangKyCount.ContainsKey(x.TaoDotLaoDong_id) ? lopDangKyCount[x.TaoDotLaoDong_id] : 0;
                        int soLuongLop = x.SoLuongLop.GetValueOrDefault(1);

                        return new
                        {
                            x.TaoDotLaoDong_id,
                            x.DotLaoDong,
                            x.Buoi,
                            LoaiLaoDong = isLoaiLop ? "Lớp" : "Cá Nhân",
                            GiaTri = x.GiaTri ?? 0,
                            NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                            x.KhuVuc,
                            x.SoLuongSinhVien,
                            SoLuongLop = soLuongLop,
                            SoLopDaDangKy = soLopDaDangKy,
                            TrangThaiDuyet = x.TrangThaiDuyet == true,
                            TrangThaiText = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt",
                            SoLuongDaDangKy = isLoaiLop ? soLopDaDangKy : (dangKyCount.ContainsKey(x.TaoDotLaoDong_id) ? dangKyCount[x.TaoDotLaoDong_id] : 0),
                            DaDangKy = registeredDotIds.Contains(x.TaoDotLaoDong_id),
                            DaDuyet = x.TrangThaiDuyet == true,
                            IsPast = isPast
                        };
                    }).ToList();

                    return Json(new
                    {
                        success = true,
                        items,
                        page,
                        totalPages,
                        role = userRole,
                        isClassLeader,
                        debugRole = userRole ?? "NULL"
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi tải đợt lao động: " + inner.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult DangKy(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = GetCurrentSinhVien(db);
                    if (sv == null)
                        return Json(new { success = false, message = "Vui lòng đăng nhập lại!", type = "error" });

                    var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == id && x.Ngayxoa == null);
                    if (dot == null)
                        return Json(new { success = false, message = "Đợt lao động không tồn tại hoặc đã bị xóa!", type = "error" });

                    // Kiểm tra thời gian đợt lao động đã qua ngày hoặc quá giờ quy định trong ngày
                    if (dot.NgayLaoDong.HasValue)
                    {
                        var dotDate = dot.NgayLaoDong.Value.Date;
                        var today = DateTime.Today;
                        var nowTime = DateTime.Now.TimeOfDay;

                        if (dotDate < today)
                        {
                            return Json(new { success = false, message = "Đợt lao động này đã kết thúc, không thể đăng ký!", type = "error" });
                        }

                        if (dotDate == today)
                        {
                            bool isSang = string.Equals(dot.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase);
                            bool isChieu = string.Equals(dot.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase);

                            // Ca Sáng: Bắt đầu lúc 07:00 (nếu đã từ 07:00 trở đi trong ngày thì không được đăng ký)
                            if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                            {
                                return Json(new { success = false, message = "Ca sáng hôm nay đã bắt đầu (07h00 - 10h30), đã quá giờ quy định đăng ký!", type = "error" });
                            }
                            // Ca Chiều: Bắt đầu lúc 13:30 (nếu đã từ 13:30 trở đi trong ngày thì không được đăng ký)
                            else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                            {
                                return Json(new { success = false, message = "Ca chiều hôm nay đã bắt đầu (13h30 - 17h00), đã quá giờ quy định đăng ký!", type = "error" });
                            }
                        }
                    }

                    var alreadyRegistered = ActiveRegistrations(db).Any(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV);
                    if (alreadyRegistered)
                    {
                        return Json(new { success = false, message = "Bạn đã đăng ký đợt lao động này rồi!", type = "warning" });
                    }

                    // Kiểm tra số lượng tối đa nếu có
                    if (dot.SoLuongSinhVien.HasValue && dot.SoLuongSinhVien.Value > 0)
                    {
                        int currentCount = ActiveRegistrations(db).Count(p => p.TaoDotLaoDong_id == id);
                        if (currentCount >= dot.SoLuongSinhVien.Value)
                        {
                            return Json(new { success = false, message = "Đợt lao động này đã đủ số lượng sinh viên đăng ký!", type = "error" });
                        }
                    }

                    // ✅ Lấy tất cả phiếu đăng ký đang hoạt động của sinh viên trong cùng ngày
                    DateTime? dotDateVal = dot.NgayLaoDong.HasValue ? dot.NgayLaoDong.Value.Date : (DateTime?)null;
                    var phieuTrongNgay = ActiveRegistrations(db)
                        .Where(p => p.MSSV == sv.MSSV && p.TaoDotLaoDong_id != id)
                        .ToList();

                    if (dotDateVal.HasValue)
                    {
                        phieuTrongNgay = phieuTrongNgay
                            .Where(p => p.TaoDotNgayLaoDong != null && p.TaoDotNgayLaoDong.NgayLaoDong.HasValue && p.TaoDotNgayLaoDong.NgayLaoDong.Value.Date == dotDateVal.Value)
                            .ToList();

                        // Nếu đã đăng ký cùng buổi → từ chối
                        if (phieuTrongNgay.Any(p => p.TaoDotNgayLaoDong != null && string.Equals(p.TaoDotNgayLaoDong.Buoi, dot.Buoi, StringComparison.OrdinalIgnoreCase)))
                        {
                            return Json(new { success = false, message = $"Bạn đã đăng ký buổi {dot.Buoi} trong ngày này rồi!", type = "error" });
                        }

                        // Nếu đã đăng ký 2 buổi trong ngày → từ chối
                        if (phieuTrongNgay.Count >= 2)
                        {
                            return Json(new { success = false, message = "Bạn chỉ được đăng ký tối đa 2 buổi trong ngày!", type = "error" });
                        }
                    }

                    // ✅ Nếu qua kiểm tra thì thêm phiếu
                    var phieu = db.PhieuDangKies.FirstOrDefault(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV);
                    if (phieu == null)
                    {
                        var phieuMoi = new PhieuDangKy
                        {
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
                        phieu.LaoDongCaNhan = true;
                        phieu.LaoDongTheoLop = false;
                    }

                    db.SaveChanges();
                    var soDangKyMoi = ActiveRegistrations(db).Count(p => p.TaoDotLaoDong_id == id);
                    return Json(new { 
                        success = true, 
                        message = "Đăng ký thành công!", 
                        type = "success",
                        soLuongDaDangKy = soDangKyMoi,
                        soLuongSinhVien = dot.SoLuongSinhVien ?? 0
                    });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi khi đăng ký: " + inner.Message, type = "error" });
            }
        }


        [HttpPost]
        public ActionResult HuyDangKy(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = GetCurrentSinhVien(db);
                    if (sv == null)
                        return Json(new { success = false, message = "Vui lòng đăng nhập lại!", type = "error" });

                    var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == id && x.Ngayxoa == null);
                    if (dot == null)
                        return Json(new { success = false, message = "Đợt lao động không tồn tại hoặc đã bị xóa!", type = "error" });

                    // 1. Kiểm tra nếu đợt lao động đã được duyệt bởi quản trị viên
                    if (dot.TrangThaiDuyet == true)
                    {
                        return Json(new { success = false, message = "Đợt lao động này đã được duyệt, không thể hủy đăng ký!", type = "error" });
                    }

                    // 2. Kiểm tra nếu đợt lao động đã qua ngày hoặc quá giờ quy định trong ngày
                    if (dot.NgayLaoDong.HasValue)
                    {
                        var dotDate = dot.NgayLaoDong.Value.Date;
                        var today = DateTime.Today;
                        var nowTime = DateTime.Now.TimeOfDay;

                        if (dotDate < today)
                        {
                            return Json(new { success = false, message = "Đợt lao động này đã kết thúc, không thể hủy đăng ký!", type = "error" });
                        }

                        if (dotDate == today)
                        {
                            bool isSang = string.Equals(dot.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase);
                            bool isChieu = string.Equals(dot.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase);

                            if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                            {
                                return Json(new { success = false, message = "Ca sáng hôm nay đã bắt đầu (07h00 - 10h30), đã quá giờ quy định để hủy!", type = "error" });
                            }
                            else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                            {
                                return Json(new { success = false, message = "Ca chiều hôm nay đã bắt đầu (13h30 - 17h00), đã quá giờ quy định để hủy!", type = "error" });
                            }
                        }
                    }

                    // 3. Lấy tất cả phiếu đăng ký tương ứng của sinh viên
                    var phieuList = db.PhieuDangKies
                        .Where(p => p.TaoDotLaoDong_id == id && p.MSSV == sv.MSSV)
                        .ToList();

                    if (!phieuList.Any(p => p.TrangThai == "DangKy" || p.TrangThai == "DaDuyet" || p.TrangThai == null))
                    {
                        return Json(new { success = false, message = "Bạn chưa đăng ký đợt này hoặc đã hủy trước đó!", type = "error" });
                    }

                    // 4. Xóa phiếu duyệt liên quan nếu có để tránh lỗi khóa ngoại
                    var phieuIds = phieuList.Select(p => p.PhieuDangKy_id).ToList();
                    var lienQuanPhieuDuyet = db.PhieuDuyets.Where(pd => pd.PhieuDangKy.HasValue && phieuIds.Contains(pd.PhieuDangKy.Value)).ToList();
                    if (lienQuanPhieuDuyet.Any())
                    {
                        db.PhieuDuyets.RemoveRange(lienQuanPhieuDuyet);
                    }

                    // 5. Xóa các phiếu đăng ký
                    db.PhieuDangKies.RemoveRange(phieuList);
                    db.SaveChanges();
                    var soDangKyMoi = ActiveRegistrations(db).Count(p => p.TaoDotLaoDong_id == id);
                    return Json(new { 
                        success = true, 
                        message = "Hủy đăng ký thành công!", 
                        type = "success",
                        soLuongDaDangKy = soDangKyMoi,
                        soLuongSinhVien = dot.SoLuongSinhVien ?? 0
                    });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi khi hủy đăng ký: " + inner.Message, type = "error" });
            }
        }

        // Đăng ký theo lớp
        [HttpGet]
        public ActionResult GetDanhSachLop(int dotId)
        {
            using (var db = DbContextFactory.Create())
            {
                if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var svHienTai, out var authError))
                    return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                if (!svHienTai.Lop_id.HasValue)
                    return Json(new { success = false, message = "Sinh viên chưa được gán lớp" }, JsonRequestBehavior.AllowGet);

                int lopId = svHienTai.Lop_id.Value;

                var danhSach = db.SinhViens
                    .Where(s => s.Lop_id == lopId)
                    .Select(s => new
                    {
                        s.MSSV,
                        s.HoTen,
                        DaDangKy = db.PhieuDangKies.Any(p => p.TaoDotLaoDong_id == dotId && p.MSSV == s.MSSV && p.LaoDongTheoLop == true)
                    })
                    .ToList();

                var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == dotId && x.Ngayxoa == null);
                int gioiHanSV = dot?.SoLuongSinhVien ?? 20;
                int soLuongLop = dot?.SoLuongLop ?? 1;

                return Json(new { 
                    success = true, 
                    sinhViens = danhSach,
                    gioiHanSV = gioiHanSV,
                    soLuongLop = soLuongLop
                }, JsonRequestBehavior.AllowGet);
            }
        }




        // Đăng Ký theo lớp 
        [HttpPost]
        public ActionResult DangKyTheoLop(int dotId, List<long> mssvList)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (mssvList == null)
                        return Json(new { success = false, message = "mssvList = NULL" });

                    if (!mssvList.Any())
                        return Json(new { success = false, message = "Danh sách rỗng" });

                    var now = DateTime.Now;

                    // Lấy thông tin đợt lao động
                    var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == dotId && x.Ngayxoa == null);
                    if (dot == null)
                        return Json(new { success = false, message = "Đợt lao động không tồn tại!" });

                    int soLuongLopToiDa = dot.SoLuongLop.GetValueOrDefault(1);
                    int gioiHanSVMoiLop = dot.SoLuongSinhVien.GetValueOrDefault(20);

                    // Lấy thông tin lớp của sinh viên đang thao tác
                    var currentSv = GetCurrentSinhVien(db);
                    if (currentSv == null || !currentSv.Lop_id.HasValue)
                    {
                        return Json(new { success = false, message = "Không xác định được lớp của bạn!" });
                    }
                    int myLopId = currentSv.Lop_id.Value;

                    // Kiểm tra lớp đã từng đăng ký đợt này chưa
                    bool lopDaDangKy = (from pd in ActiveRegistrations(db)
                                        join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                        where pd.TaoDotLaoDong_id == dotId && pd.LaoDongTheoLop == true && sv.Lop_id == myLopId
                                        select pd).Any();

                    if (!lopDaDangKy)
                    {
                        // Kiểm tra tổng số lớp đã đăng ký
                        int soLopDaDangKy = (from pd in ActiveRegistrations(db)
                                             join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                             where pd.TaoDotLaoDong_id == dotId && pd.LaoDongTheoLop == true
                                             select sv.Lop_id).Distinct().Count();

                        if (soLopDaDangKy >= soLuongLopToiDa)
                        {
                            return Json(new { success = false, message = $"Đợt lao động này đã đủ số lượng lớp đăng ký (tối đa {soLuongLopToiDa} lớp)!" });
                        }
                    }

                    // Kiểm tra giới hạn số sinh viên tham gia của mỗi lớp
                    if (mssvList.Count > gioiHanSVMoiLop)
                    {
                        return Json(new { success = false, message = $"Số lượng sinh viên đăng ký ({mssvList.Count}) vượt quá giới hạn quy định của đợt này (tối đa {gioiHanSVMoiLop} sinh viên/lớp)!" });
                    }

                    // Kiểm tra thời gian đợt lao động cho lớp
                    if (dot.NgayLaoDong.HasValue)
                    {
                        var dotDate = dot.NgayLaoDong.Value.Date;
                        var today = DateTime.Today;
                        var nowTime = DateTime.Now.TimeOfDay;

                        if (dotDate < today)
                        {
                            return Json(new { success = false, message = "Đợt lao động này đã kết thúc, không thể đăng ký!", type = "error" });
                        }

                        if (dotDate == today)
                        {
                            bool isSang = string.Equals(dot.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase);
                            bool isChieu = string.Equals(dot.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase);

                            if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                            {
                                return Json(new { success = false, message = "Ca sáng hôm nay đã bắt đầu (07h00 - 10h30), đã quá giờ quy định đăng ký cho lớp!", type = "error" });
                            }
                            else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                            {
                                return Json(new { success = false, message = "Ca chiều hôm nay đã bắt đầu (13h30 - 17h00), đã quá giờ quy định đăng ký cho lớp!", type = "error" });
                            }
                        }
                    }

                    foreach (var mssv in mssvList)
                    {
                        // ✅ Kiểm tra trùng lịch
                        var phieuTrongNgay = db.PhieuDangKies
                            .Where(p => p.MSSV == mssv && p.TaoDotNgayLaoDong.NgayLaoDong == dot.NgayLaoDong)
                            .ToList();

                        // Nếu đã đăng ký cùng buổi → từ chối
                        if (phieuTrongNgay.Any(p => p.TaoDotNgayLaoDong.Buoi == dot.Buoi))
                        {
                            return Json(new { success = false, message = $"Sinh viên {mssv} đã đăng ký buổi {dot.Buoi} trong ngày này rồi!", type = "error" });
                        }

                        // Nếu đã đăng ký 2 buổi trong ngày → từ chối
                        if (phieuTrongNgay.Count >= 2)
                        {
                            return Json(new { success = false, message = $"Sinh viên {mssv} đã đăng ký đủ 2 buổi trong ngày!", type = "error" });
                        }

                        // ✅ Nếu qua kiểm tra thì thêm phiếu
                        db.PhieuDangKies.Add(new PhieuDangKy
                        {
                            MSSV = mssv,
                            TaoDotLaoDong_id = dotId,
                            ThoiGian = now,
                            LaoDongCaNhan = false,
                            LaoDongTheoLop = true,
                            TrangThai = "DangKy"
                        });
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = "Đăng ký theo lớp thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.InnerException?.Message ?? ex.Message
                });
            }
        }



        // cập nhật đăng ký lớp 
        [HttpPost]
        public ActionResult CapNhatDangKyTheoLop(int dotId, List<long> mssvList)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    // Đảm bảo danh sách không bị null
                    if (mssvList == null)
                        mssvList = new List<long>();

                    var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == dotId && x.Ngayxoa == null);
                    if (dot == null)
                        return Json(new { success = false, message = "Đợt lao động không tồn tại!" });

                    int gioiHanSVMoiLop = dot.SoLuongSinhVien.GetValueOrDefault(20);
                    if (mssvList.Count > gioiHanSVMoiLop)
                    {
                        return Json(new { success = false, message = $"Số lượng sinh viên đăng ký ({mssvList.Count}) vượt quá giới hạn quy định của đợt này (tối đa {gioiHanSVMoiLop} sinh viên/lớp)!" });
                    }

                    // Lấy toàn bộ phiếu đăng ký hiện tại của lớp trong đợt này
                    var danhSachCu = db.PhieuDangKies
                                       .Where(p => p.TaoDotLaoDong_id == dotId && p.LaoDongTheoLop == true)
                                       .Select(p => p.MSSV)
                                       .ToList();

                    var now = DateTime.Now;

                    // 1. Thêm sinh viên mới (có trong mssvList nhưng chưa có trong DB)
                    var canThem = mssvList.Except(danhSachCu).ToList();
                    foreach (var mssv in canThem)
                    {
                        db.PhieuDangKies.Add(new PhieuDangKy
                        {
                            MSSV = mssv,
                            TaoDotLaoDong_id = dotId,
                            ThoiGian = now,
                            LaoDongCaNhan = false,
                            LaoDongTheoLop = true,
                            TrangThai = "DangKy"
                        });
                    }

                    // 2. Xóa sinh viên (có trong DB nhưng không còn trong mssvList)
                    var canXoa = danhSachCu.Except(mssvList).ToList();
                    foreach (var mssv in canXoa)
                    {
                        var phieu = db.PhieuDangKies
                                      .FirstOrDefault(p => p.TaoDotLaoDong_id == dotId && p.MSSV == mssv && p.LaoDongTheoLop == true);
                        if (phieu != null)
                        {
                            db.PhieuDangKies.Remove(phieu);
                        }
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = "Cập nhật danh sách đăng ký thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Lỗi hệ thống: " + (ex.InnerException?.Message ?? ex.Message)
                });
            }
        }



        // thống kê
        [HttpGet]
        public ActionResult GetThongKeDangKyLop(int dotId)
        {
            using (var db = DbContextFactory.Create())
            {
                var dot = db.TaoDotNgayLaoDongs.FirstOrDefault(x => x.TaoDotLaoDong_id == dotId);
                if (dot == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đợt!" }, JsonRequestBehavior.AllowGet);
                }

                // Tổng số sinh viên dự kiến (nullable int nên dùng ?? 0)
                int tongSo = dot.SoLuongSinhVien ?? 0;

                // Chỉ xử lý nếu loại lao động là "Lớp"
                if (dot.LoaiLaoDong == "Lớp")
                {
                    int soLuongLopToiDa = dot.SoLuongLop.GetValueOrDefault(1);
                    int soLopDaDangKy = (from pd in ActiveRegistrations(db)
                                         join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                         where pd.TaoDotLaoDong_id == dotId && pd.LaoDongTheoLop == true
                                         select sv.Lop_id).Distinct().Count();

                    return Json(new
                    {
                        success = true,
                        hienThi = $"{soLopDaDangKy}/{soLuongLopToiDa} lớp"
                    }, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    // Nếu không phải loại lao động là lớp thì bỏ trống hoặc hiển thị khác
                    return Json(new
                    {
                        success = true,
                        hienThi = "-"
                    }, JsonRequestBehavior.AllowGet);
                }
            }
        }

        // kiểm tra đăng ký lớp 
        [HttpGet]
        public ActionResult KiemTraDangKyLop(int dotId)
        {
            using (var db = DbContextFactory.Create())
            {
                bool daDangKy = db.PhieuDangKies.Any(p => p.TaoDotLaoDong_id == dotId && p.LaoDongTheoLop == true);
                return Json(new { success = true, daDangKy = daDangKy }, JsonRequestBehavior.AllowGet);
            }
        }











    }
}