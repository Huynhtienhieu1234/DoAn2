using OfficeOpenXml;
using OfficeOpenXml.Style;
using QuanLyDangKyNgayLD.AuditHelper;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminWordRegisterController : Controller
    {
        private const int ITEMS_PER_PAGE = 10;

        public ActionResult Index(int page = 1, string keyword = "", string buoi = "", string trangthai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaoDotNgayLaoDongs.Where(x => x.Ngayxoa == null);

                // Lọc theo từ khóa (tên đợt hoặc khu vực)
                if (!string.IsNullOrWhiteSpace(keyword))
                    query = query.Where(x => x.DotLaoDong.Contains(keyword) || x.KhuVuc.Contains(keyword));

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

                var items = query.OrderBy(x => x.TaoDotLaoDong_id)
                                 .Skip((page - 1) * ITEMS_PER_PAGE)
                                 .Take(ITEMS_PER_PAGE)
                                 .ToList();

                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.Keyword = keyword;
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
            string keyword = "",
            string buoi = "",
            string trangThai = "",
            int? thang = null,
            string ngay = null,
            string sortField = "id",
            string sortDir = "asc"
        )
        {
            using (var db = DbContextFactory.Create())
            {
                // Bước 1: Khởi tạo truy vấn ban đầu
                var query = db.TaoDotNgayLaoDongs.Where(x => x.Ngayxoa == null);

                // Bước 2: Lọc theo từ khóa
                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    query = query.Where(x => x.DotLaoDong.Contains(keyword) || x.KhuVuc.Contains(keyword));
                }

                // Bước 3: Lọc theo buổi
                if (!string.IsNullOrWhiteSpace(buoi))
                {
                    query = query.Where(x => x.Buoi == buoi);
                }

                // Bước 4: Lọc theo trạng thái duyệt
                if (trangThai == "1")
                {
                    query = query.Where(x => x.TrangThaiDuyet == true);
                }
                else if (trangThai == "0")
                {
                    query = query.Where(x => x.TrangThaiDuyet == false);
                }

                // Bước 5: Lọc theo tháng
                if (thang.HasValue)
                {
                    query = query.Where(x => x.NgayLaoDong.HasValue && x.NgayLaoDong.Value.Month == thang.Value);
                }

                // Bước 5.5: Lọc theo ngày cụ thể
                if (!string.IsNullOrEmpty(ngay))
                {
                    DateTime d = DateTime.Parse(ngay);
                    query = query.Where(x =>
                        x.NgayLaoDong.HasValue &&
                        x.NgayLaoDong.Value.Year == d.Year &&
                        x.NgayLaoDong.Value.Month == d.Month &&
                        x.NgayLaoDong.Value.Day == d.Day
                    );
                }

                // Bước 6: Sort server-side
                switch (sortField)
                {
                    case "id":
                        query = sortDir == "desc" ? query.OrderByDescending(x => x.TaoDotLaoDong_id) : query.OrderBy(x => x.TaoDotLaoDong_id);
                        break;
                    case "date":
                        query = sortDir == "desc" ? query.OrderByDescending(x => x.NgayLaoDong) : query.OrderBy(x => x.NgayLaoDong);
                        break;
                    case "quantity":
                        query = sortDir == "desc"
                            ? query.OrderByDescending(x => db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id))
                            : query.OrderBy(x => db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id));
                        break;
                    case "status":
                        query = sortDir == "desc" ? query.OrderByDescending(x => x.TrangThaiDuyet) : query.OrderBy(x => x.TrangThaiDuyet);
                        break;
                    default:
                        query = query.OrderBy(x => x.TaoDotLaoDong_id);
                        break;
                }

                // Bước 7: Phân trang
                int totalItems = query.Count();
                if (pageSize <= 0) pageSize = 10;
                int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / pageSize) : 1;
                if (totalPages < 1) totalPages = 1;
                if (page < 1) page = 1;
                if (page > totalPages) page = totalPages;

                var rawItems = query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                // === TÍNH SỐ LỚP ĐÃ ĐĂNG KÝ CHO ĐỢT LOẠI "LỚP" ===
                var dotIds = rawItems.Select(x => x.TaoDotLaoDong_id).ToList();

                var phieuLopList = db.PhieuDangKies
                    .Where(p => p.TaoDotLaoDong_id.HasValue && dotIds.Contains(p.TaoDotLaoDong_id.Value) && p.LaoDongTheoLop == true)
                    .Select(p => new { TaoDotLaoDong_id = p.TaoDotLaoDong_id.Value, p.MSSV })
                    .ToList();

                var lopDaDangKyDict = phieuLopList
                    .Join(db.SinhViens, p => p.MSSV, sv => sv.MSSV, (p, sv) => new { p.TaoDotLaoDong_id, LopId = sv.Lop_id })
                    .GroupBy(x => x.TaoDotLaoDong_id)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(x => x.LopId.GetValueOrDefault()).Distinct().Count()
                    );

                var now = DateTime.Now;
                var today = DateTime.Today;
                var nowTime = now.TimeOfDay;

                // === TẠO DANH SÁCH TRẢ VỀ JSON ===
                var items = rawItems.Select(x =>
                {
                    bool isPastTime = false;
                    if (x.NgayLaoDong.HasValue)
                    {
                        if (x.NgayLaoDong.Value.Date < today)
                        {
                            isPastTime = true;
                        }
                        else if (x.NgayLaoDong.Value.Date == today)
                        {
                            bool isSang = string.Equals(x.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase) || (x.Buoi != null && x.Buoi.ToLower().Contains("sáng"));
                            bool isChieu = string.Equals(x.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase) || (x.Buoi != null && x.Buoi.ToLower().Contains("chiều"));

                            if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                            {
                                isPastTime = true;
                            }
                            else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                            {
                                isPastTime = true;
                            }
                        }
                    }

                    int soLuongDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id && p.TrangThai == "DangKy");
                    int soLuongCan = x.SoLuongSinhVien ?? 20;
                    bool isLoaiLop = string.Equals(x.LoaiLaoDong?.Trim(), "Lớp", StringComparison.OrdinalIgnoreCase);
                    int soLopDaDangKy = isLoaiLop && lopDaDangKyDict.ContainsKey(x.TaoDotLaoDong_id) ? lopDaDangKyDict[x.TaoDotLaoDong_id] : 0;
                    int tongLopCan = x.SoLuongSinhVien.GetValueOrDefault(20);

                    bool khongDuSoLuong = isLoaiLop ? (soLopDaDangKy < tongLopCan) : (soLuongDangKy < soLuongCan);

                    // Tự động chuyển thành 'Kết thúc' nếu đã qua thời gian đăng ký mà chưa được duyệt hoặc không đủ số lượng
                    string trangThaiDuyet = "Chưa duyệt";
                    if (x.TrangThaiDot == "Tạm ngưng")
                    {
                        trangThaiDuyet = "Tạm ngưng";
                    }
                    else if (isPastTime && (x.TrangThaiDuyet != true || khongDuSoLuong))
                    {
                        trangThaiDuyet = "Kết thúc";
                    }
                    else if (x.TrangThaiDuyet == true)
                    {
                        trangThaiDuyet = "Đã duyệt";
                    }

                    return new
                    {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        x.LoaiLaoDong,
                        GiaTri = x.GiaTri,
                        NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        x.KhuVuc,
                        x.SoLuongSinhVien,
                        SoLuongDangKy = soLuongDangKy,
                        TrangThaiDot = x.TrangThaiDot ?? "",
                        TrangThaiDuyet = trangThaiDuyet,
                        x.MoTa,
                        x.NguoiTao,
                        SoLuongLopDaDangKy = soLopDaDangKy,
                        TongSoLopCan = tongLopCan
                    };
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


        // Tạo Đợt Lao động 
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult CreateAjax(TaoDotNgayLaoDong model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                using (var db = DbContextFactory.Create())
                {
                    // Lấy user từ Session
                    var userIdStr = Session["UserId"]?.ToString();
                    if (!int.TryParse(userIdStr, out int userId))
                        return Json(new { success = false, message = "Không xác định được người tạo." });

                    var user = db.TaiKhoans.FirstOrDefault(u => u.TaiKhoan_id == userId);
                    if (user == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    // ✅ Cho phép Admin và Cán bộ quản lý tạo đợt
                    if (user.VaiTro_id != 1 && user.VaiTro_id != 2)
                        return Json(new { success = false, message = "Bạn không có quyền tạo đợt lao động." });

                    // Kiểm tra trùng lặp (ngày + buổi + khu vực + loại lao động)
                    bool isDuplicate = db.TaoDotNgayLaoDongs.Any(x =>
                        x.NgayLaoDong == model.NgayLaoDong &&
                        x.Buoi == model.Buoi &&
                        x.KhuVuc == model.KhuVuc &&
                        x.LoaiLaoDong == model.LoaiLaoDong &&
                        x.Ngayxoa == null);

                    if (isDuplicate)
                        return Json(new { success = false, message = "Khu vực này đã có đợt lao động cùng loại trong ngày và buổi này." });

                    // Kiểm tra dữ liệu đầu vào
                    if (!model.NgayLaoDong.HasValue)
                        return Json(new { success = false, message = "Bạn phải chọn ngày lao động." });

                    var today = DateTime.Today;
                    var nowTime = DateTime.Now.TimeOfDay;
                    var dotDate = model.NgayLaoDong.Value.Date;

                    // 1. Chặn tạo đợt ở ngày trong quá khứ hoặc tháng đã qua
                    if (dotDate < today)
                    {
                        return Json(new { success = false, message = "Không thể tạo đợt lao động vào ngày trong quá khứ hoặc tháng đã qua!" });
                    }

                    // 2. Chặn nếu là ngày hôm nay và đã qua thời gian của ca đó
                    if (dotDate == today)
                    {
                        bool isSang = string.Equals(model.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase) || (model.Buoi != null && model.Buoi.ToLower().Contains("sáng"));
                        bool isChieu = string.Equals(model.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase) || (model.Buoi != null && model.Buoi.ToLower().Contains("chiều"));

                        if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                        {
                            return Json(new { success = false, message = "Ca sáng ngày hôm nay đã bắt đầu (07h00), đã quá thời gian quy định để tạo đợt lao động!" });
                        }
                        else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                        {
                            return Json(new { success = false, message = "Ca chiều ngày hôm nay đã bắt đầu (13h30), đã quá thời gian quy định để tạo đợt lao động!" });
                        }
                    }

                    if (string.IsNullOrWhiteSpace(model.Buoi))
                        return Json(new { success = false, message = "Bạn phải chọn buổi." });

                    if (model.SoLuongSinhVien <= 0)
                        return Json(new { success = false, message = "Số lượng sinh viên phải lớn hơn 0." });

                    // Gán mặc định
                    model.TrangThaiDuyet = false;
                    model.Ngayxoa = null;
                    model.NguoiTao = user.TaiKhoan_id;
                    model.TrangThaiDot = "Chờ diễn ra";
                    if (string.IsNullOrEmpty(model.MaDiemDanh))
                    {
                        model.MaDiemDanh = GenerateRandomCode(6);
                    }

                    // ✅ Lưu đợt lao động
                    db.TaoDotNgayLaoDongs.Add(model);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Tạo đợt lao động thành công!" });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Thêm thất bại: " + inner.Message });
            }
        }



        // AJAX: Chỉnh sửa
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditAjax(TaoDotNgayLaoDong model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(model.TaoDotLaoDong_id);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Không tìm thấy đợt lao động." });

                    if (!model.NgayLaoDong.HasValue)
                        return Json(new { success = false, message = "Bạn phải chọn ngày lao động." });

                    var today = DateTime.Today;
                    var nowTime = DateTime.Now.TimeOfDay;
                    var dotDate = model.NgayLaoDong.Value.Date;

                    if (dotDate < today)
                    {
                        return Json(new { success = false, message = "Không thể chuyển ngày đợt lao động về ngày trong quá khứ hoặc tháng đã qua!" });
                    }

                    if (dotDate == today)
                    {
                        bool isSang = string.Equals(model.Buoi?.Trim(), "Sáng", StringComparison.OrdinalIgnoreCase) || (model.Buoi != null && model.Buoi.ToLower().Contains("sáng"));
                        bool isChieu = string.Equals(model.Buoi?.Trim(), "Chiều", StringComparison.OrdinalIgnoreCase) || (model.Buoi != null && model.Buoi.ToLower().Contains("chiều"));

                        if (isSang && nowTime >= new TimeSpan(7, 0, 0))
                        {
                            return Json(new { success = false, message = "Ca sáng ngày hôm nay đã bắt đầu (07h00), đã quá thời gian quy định để chỉnh sửa đợt!" });
                        }
                        else if (isChieu && nowTime >= new TimeSpan(13, 30, 0))
                        {
                            return Json(new { success = false, message = "Ca chiều ngày hôm nay đã bắt đầu (13h30), đã quá thời gian quy định để chỉnh sửa đợt!" });
                        }
                    }

                    dot.DotLaoDong = model.DotLaoDong;
                    dot.Buoi = model.Buoi;
                    dot.LoaiLaoDong = model.LoaiLaoDong;
                    dot.GiaTri = model.GiaTri;
                    dot.NgayLaoDong = model.NgayLaoDong;
                    dot.KhuVuc = model.KhuVuc;
                    dot.SoLuongSinhVien = model.SoLuongSinhVien;
                    dot.MoTa = model.MoTa;

                    db.SaveChanges();

                    return Json(new { success = true, message = "Cập nhật thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // AJAX: Xóa mềm
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var dot = db.TaoDotNgayLaoDongs.Find(id);
                if (dot == null)
                    return Json(new { success = false, message = "Không tìm thấy đợt lao động." });

                // ✅ Kiểm tra quyền: chỉ Admin mới được xóa
                var userId = Session["UserId"]?.ToString();
                var user = db.TaiKhoans.FirstOrDefault(u => u.TaiKhoan_id.ToString() == userId);
                if (user == null || user.VaiTro_id != 1) // 1 = Admin
                    return Json(new { success = false, message = "Chỉ tài khoản Admin mới được xóa." });

                // 📝 Ghi nhận nhật ký xóa vào QuanLyAuditLog
                var dataOld = new
                {
                    dot.TaoDotLaoDong_id,
                    dot.DotLaoDong,
                    dot.KhuVuc,
                    NgayLaoDong = dot.NgayLaoDong.HasValue ? dot.NgayLaoDong.Value.ToString("yyyy-MM-dd") : null,
                    dot.Buoi,
                    dot.SoLuongSinhVien,
                    dot.LoaiLaoDong,
                    dot.GiaTri,
                    dot.ThoiGian,
                    dot.TrangThaiDuyet,
                    dot.MoTa,
                    dot.MaDiemDanh
                };
                AuditLogHelper.GhiNhatKy("TaoDotNgayLaoDong", dot.TaoDotLaoDong_id.ToString(), dataOld, "DELETE");

                // ✅ Cho phép xóa (Admin được xóa cả khi đã duyệt)
                dot.Ngayxoa = DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa đợt lao động." });
            }
        }

        private bool IsAdminUser(DB_QLNLD4ROLEEntities1 db)
        {
            var vaiTroId = Session["VaiTroId"] as int?;
            if (vaiTroId.HasValue)
            {
                return vaiTroId.Value == 1;
            }

            if (User != null && User.Identity != null && User.Identity.IsAuthenticated && !string.IsNullOrEmpty(User.Identity.Name))
            {
                string username = User.Identity.Name;
                var tk = db.TaiKhoans.FirstOrDefault(t => t.Username == username && t.Deleted_at == null);
                if (tk != null)
                {
                    Session["UserID"] = tk.TaiKhoan_id;
                    Session["UserId"] = tk.TaiKhoan_id;
                    Session["Username"] = tk.Username;
                    Session["VaiTroId"] = tk.VaiTro_id;
                    Session["Role"] = tk.VaiTro != null ? tk.VaiTro.TenVaiTro : "Admin";
                    return tk.VaiTro_id == 1;
                }
            }

            return true;
        }

        // AJAX: Xóa nhiều đợt đã chọn
        [HttpPost]
        public ActionResult DeleteMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một đợt lao động để xóa." });

            using (var db = DbContextFactory.Create())
            {
                if (!IsAdminUser(db))
                    return Json(new { success = false, message = "Chỉ tài khoản Admin mới được xóa." });
                var dots = db.TaoDotNgayLaoDongs.Where(d => ids.Contains(d.TaoDotLaoDong_id) && d.Ngayxoa == null).ToList();
                if (!dots.Any())
                    return Json(new { success = false, message = "Không tìm thấy đợt lao động hợp lệ để xóa." });

                int count = 0;
                foreach (var dot in dots)
                {
                    // 📝 Ghi nhận nhật ký xóa từng đợt
                    var dataOld = new
                    {
                        dot.TaoDotLaoDong_id,
                        dot.DotLaoDong,
                        dot.KhuVuc,
                        NgayLaoDong = dot.NgayLaoDong.HasValue ? dot.NgayLaoDong.Value.ToString("yyyy-MM-dd") : null,
                        dot.Buoi,
                        dot.SoLuongSinhVien,
                        dot.LoaiLaoDong,
                        dot.GiaTri,
                        dot.ThoiGian,
                        dot.TrangThaiDuyet,
                        dot.MoTa,
                        dot.MaDiemDanh
                    };
                    AuditLogHelper.GhiNhatKy("TaoDotNgayLaoDong", dot.TaoDotLaoDong_id.ToString(), dataOld, "DELETE");

                    dot.Ngayxoa = DateTime.Now;
                    count++;
                }
                db.SaveChanges();
                return Json(new { success = true, message = $"Đã xóa thành công {count} đợt lao động đã chọn." });
            }
        }

        // AJAX: Cập nhật trạng thái Tạm ngưng / Mở lại đợt lao động (Dành cho Quản lý và Admin)
        [HttpPost]
        public ActionResult ToggleTamNgung(int id, string lyDo = "")
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(id);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Không tìm thấy đợt lao động." });

                    if (dot.TrangThaiDot == "Tạm ngưng")
                    {
                        dot.TrangThaiDot = "Hoạt động";
                        db.SaveChanges();
                        return Json(new { success = true, message = "Đã mở lại đợt lao động thành công!", status = "Hoạt động" });
                    }
                    else
                    {
                        if (string.IsNullOrWhiteSpace(lyDo))
                            return Json(new { success = false, message = "Vui lòng nhập lý do tạm ngưng đợt lao động." });

                        dot.TrangThaiDot = "Tạm ngưng";
                        dot.MoTa = lyDo.Trim();
                        db.SaveChanges();
                        return Json(new { success = true, message = "Đã chuyển trạng thái đợt sang Tạm ngưng thành công!", status = "Tạm ngưng", lyDo = dot.MoTa });
                    }
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }
        // Duyệt
        [HttpPost]
        public ActionResult ApproveAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(id);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Không tìm thấy đợt." });

                    bool duDieuKien = false;

                    // Nếu là loại "Lớp" → kiểm tra số lớp đăng ký
                    if (dot.LoaiLaoDong == "Lớp")
                    {
                        var soLopDangKy = (from pd in db.PhieuDangKies
                                           join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                           where pd.TaoDotLaoDong_id == id && pd.LaoDongTheoLop == true
                                           select sv.Lop_id).Distinct().Count();

                        if (soLopDangKy >= 2)
                            duDieuKien = true;
                        else
                            return Json(new { success = false, message = $"Chưa đủ số lớp đăng ký (hiện tại: {soLopDangKy}/2)." });
                    }
                    else
                    {
                        // Nếu là loại "Cá Nhân" → kiểm tra số lượng sinh viên
                        int soDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == id);
                        if (soDangKy >= 5)
                            duDieuKien = true;
                        else
                            return Json(new { success = false, message = $"Chưa đủ số lượng sinh viên đăng ký (hiện tại: {soDangKy}/5)." });
                    }

                    if (!duDieuKien)
                        return Json(new { success = false, message = "Không đủ điều kiện duyệt." });

                    // ✅ Cập nhật trạng thái đợt
                    dot.TrangThaiDuyet = true;

                    // ✅ Duyệt từng phiếu đăng ký
                    var phieuList = db.PhieuDangKies.Where(p => p.TaoDotLaoDong_id == id).ToList();
                    foreach (var phieu in phieuList)
                    {
                        phieu.TrangThai = "DaDuyet";
                        phieu.ThoiGian = DateTime.Now;

                        // ✅ Thêm bản ghi PhieuDuyet (KHÔNG gán ID — để trigger tự xử lý)
                        db.PhieuDuyets.Add(new PhieuDuyet
                        {
                            PhieuDangKy = phieu.PhieuDangKy_id,
                            Nguoiduyet = 1, // hoặc lấy từ Session["UserId"]
                            ThoiGian = DateTime.Now,
                            TrangThai = "Đã duyệt"
                        });
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã duyệt đợt thành công!" });
                }
            }
            catch (Exception ex)
            {
                var message = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Json(new { success = false, message = "Lỗi: " + message });
            }
        }







        // AJAX: Lấy danh sách đã xóa
        [HttpGet]
        public ActionResult GetDeletedDotLaoDong()
        {
            using (var db = DbContextFactory.Create())
            {
                var list = db.TaoDotNgayLaoDongs
                    .Where(x => x.Ngayxoa != null)
                    .OrderByDescending(x => x.Ngayxoa)
                    .ToList() // ⬅️ Truy vấn xong rồi mới xử lý
                    .Select(x => new {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        NgayLaoDong = x.NgayLaoDong.HasValue
                            ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy")
                            : "",
                        x.KhuVuc,
                        Ngayxoa = x.Ngayxoa.HasValue
                            ? x.Ngayxoa.Value.ToString("dd/MM/yyyy")
                            : ""
                    })
                    .ToList();



                return Json(new { success = true, items = list }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Khôi phục
        [HttpPost]
        public ActionResult RestoreAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(id);
                    if (dot == null)
                        return Json(new { success = false, message = "Không tìm thấy đợt." });

                    dot.Ngayxoa = null;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }
        // Xuất dữ liệu
        [HttpGet]
        public ActionResult ExportAllDotLaoDong()
        {
            using (var db = DbContextFactory.Create())
            {
                // Lấy danh sách đợt lao động
                var dotListRaw = db.TaoDotNgayLaoDongs
                                   .Where(x => x.Ngayxoa == null)
                                   .OrderByDescending(x => x.NgayLaoDong)
                                   .ToList();

                var dataDot = dotListRaw.Select(x => new {
                    x.TaoDotLaoDong_id,
                    x.DotLaoDong,
                    x.Buoi,
                    x.LoaiLaoDong,
                    GiaTri = x.GiaTri,
                    NgayLaoDong = x.NgayLaoDong.HasValue
                        ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy")
                        : "",
                    x.KhuVuc,
                    SoLuongSinhVien = x.SoLuongSinhVien ?? 0,
                    SoLuongDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id),
                    TrangThaiDuyet = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt"
                }).ToList();

                // Lấy danh sách sinh viên đăng ký
                var dataSinhVienRaw = db.PhieuDangKies
                    .Join(db.SinhViens, p => p.MSSV, sv => sv.MSSV, (p, sv) => new { p, sv })
                    .Join(db.Lops, ps => ps.sv.Lop_id, lop => lop.Lop_id, (ps, lop) => new { ps.p, ps.sv, lop })
                    .Join(db.Khoas, psl => psl.lop.Khoa_id, khoa => khoa.Khoa_id, (psl, khoa) => new {
                        MSSV = psl.sv.MSSV,
                        HoTen = psl.sv.HoTen,
                        Lop = psl.lop.TenLop,
                        Khoa = khoa.TenKhoa,
                        DotLaoDong = psl.p.TaoDotNgayLaoDong.DotLaoDong,
                        Buoi = psl.p.TaoDotNgayLaoDong.Buoi,
                        NgayXacNhan = psl.p.TaoDotNgayLaoDong.NgayLaoDong
                    })
                    .ToList();

                // Format ngày sau khi dữ liệu đã load về
                var dataSinhVien = dataSinhVienRaw.Select(x => new {
                    x.MSSV,
                    x.HoTen,
                    x.Lop,
                    x.Khoa,
                    x.DotLaoDong,
                    x.Buoi,
                    NgayXacNhan = x.NgayXacNhan.HasValue
                        ? x.NgayXacNhan.Value.ToString("dd/MM/yyyy")
                        : ""
                }).ToList();

                return Json(new { success = true, dotList = dataDot, sinhVienList = dataSinhVien }, JsonRequestBehavior.AllowGet);
            }
        }




        //xóa vĩnh viễn 
        [HttpPost]
        public JsonResult DeleteForever(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(id);
                    if (dot == null)
                        return Json(new { success = false, message = "Không tìm thấy đợt." });

                    // ✅ Xóa các phiếu đăng ký liên quan trước
                    var phieuDangKyList = db.PhieuDangKies.Where(p => p.TaoDotLaoDong_id == id).ToList();
                    foreach (var phieu in phieuDangKyList)
                    {
                        // Xóa các phiếu duyệt liên quan
                        var phieuDuyetList = db.PhieuDuyets.Where(pd => pd.PhieuDangKy == phieu.PhieuDangKy_id).ToList();
                        db.PhieuDuyets.RemoveRange(phieuDuyetList);
                    }
                    db.PhieuDangKies.RemoveRange(phieuDangKyList);

                    // ✅ Xóa các bản ghi điểm danh liên quan
                    var diemDanhList = db.DanhSachDiemDanhs.Where(dd => dd.Dot_id == id).ToList();
                    db.DanhSachDiemDanhs.RemoveRange(diemDanhList);

                    // ✅ Cuối cùng xóa đợt lao động
                    db.TaoDotNgayLaoDongs.Remove(dot);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã xóa vĩnh viễn." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }




        // lấy danh sách sinh viên tham gia
        [HttpGet]
        public JsonResult GetSinhVienThamGia(int maDot)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var danhSach = (from pd in db.PhieuDangKies
                                    join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                    join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                                    join khoa in db.Khoas on lop.Khoa_id equals khoa.Khoa_id
                                    where pd.TaoDotLaoDong_id == maDot
                                    select new
                                    {
                                        MSSV = sv.MSSV,                 // ← THÊM DÒNG NÀY
                                        TenSinhVien = sv.HoTen,
                                        TenLop = lop.TenLop,
                                        TenKhoa = khoa.TenKhoa
                                    }).ToList();

                    return Json(new
                    {
                        success = true,
                        data = danhSach
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }


        // Xử lý sinh mã điểm danh

        [HttpPost]
        public JsonResult HienThiMaDiemDanh(int dotId)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var dot = db.TaoDotNgayLaoDongs.Find(dotId);
                    if (dot == null || dot.Ngayxoa != null)
                        return Json(new { success = false, message = "Không tìm thấy đợt lao động." });

                    // Chỉ cho phép tạo mã khi đợt đã được duyệt
                    if (dot.TrangThaiDuyet != true)
                        return Json(new { success = false, message = "Đợt chưa được duyệt, không thể hiển thị mã điểm danh." });

                    // Nếu chưa có mã → tự động tạo mới (6 ký tự chữ hoa + số)
                    if (string.IsNullOrEmpty(dot.MaDiemDanh))
                    {
                        dot.MaDiemDanh = GenerateRandomCode(6);
                        db.SaveChanges();
                    }

                    return Json(new
                    {
                        success = true,
                        maDiemDanh = dot.MaDiemDanh,
                        tenDot = dot.DotLaoDong ?? "Đợt lao động"
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // Lấy danh sách sinh viên đã điểm danh
        [HttpGet]
        public JsonResult GetDanhSachDiemDanh(int dotId)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var danhSach = (from dd in db.DanhSachDiemDanhs
                                    join sv in db.SinhViens on dd.MSSV equals sv.MSSV
                                    join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                                    join khoa in db.Khoas on lop.Khoa_id equals khoa.Khoa_id
                                    where dd.Dot_id == dotId
                                    orderby dd.ThoiGian descending
                                    select new
                                    {
                                        sv.MSSV,
                                        sv.HoTen,
                                        TenLop = lop.TenLop,
                                        TenKhoa = khoa.TenKhoa,
                                        ThoiGian = dd.ThoiGian
                                    }).ToList();

                    var result = danhSach.Select(x => new
                    {
                        x.MSSV,
                        x.HoTen,
                        x.TenLop,
                        x.TenKhoa,
                        ThoiGian = x.ThoiGian.ToString("HH:mm:ss dd/MM/yyyy")
                    }).ToList();

                    return Json(new { success = true, items = result }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // Hỗ trợ tạo mã điểm danh ngẫu nhiên
        private string GenerateRandomCode(int length = 6)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        // Lấy danh sách lớp theo lớp


        [HttpGet]
        public ActionResult GetDanhSachLopThamGia(int dotId)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    // Gom nhóm theo lớp
                    var danhSachLop = (from pd in db.PhieuDangKies
                                       join sv in db.SinhViens on pd.MSSV equals sv.MSSV
                                       join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                                       join khoa in db.Khoas on lop.Khoa_id equals khoa.Khoa_id
                                       where pd.TaoDotLaoDong_id == dotId && pd.LaoDongTheoLop == true
                                       group sv by new { lop.Lop_id, lop.TenLop, khoa.TenKhoa } into g
                                       select new
                                       {
                                           LopId = g.Key.Lop_id,
                                           TenLop = g.Key.TenLop,
                                           TenKhoa = g.Key.TenKhoa,
                                           SoLuongSinhVien = g.Count()
                                       }).ToList();

                    return Json(new
                    {
                        success = true,
                        data = danhSachLop
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Lỗi hệ thống: " + ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // ==============================================================
        // 📥 XUẤT MẪU IMPORT EXCEL (CÓ DÒNG VÍ DỤ VÀ HƯỚNG DẪN)
        // ==============================================================
        [HttpGet]
        public ActionResult DownloadTemplate()
        {
            try
            {
                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("Mau_TaoDotLaoDong");

                    // 1. Tiêu đề
                    ws.Cells["A1:J1"].Merge = true;
                    ws.Cells["A1"].Value = "MẪU NHẬP DANH SÁCH ĐỢT LAO ĐỘNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(13, 110, 253)); // Blue primary
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // 2. Header
                    string[] headers = new string[]
                    {
                        "STT",
                        "Tên Đợt Lao Động (*)",
                        "Buổi (*) (Sáng / Chiều)",
                        "Loại Lao Động (*) (Cá nhân / Lớp)",
                        "Điểm / Giá Trị (*)",
                        "Ngày Lao Động (*) (dd/MM/yyyy)",
                        "Khung Giờ (Ví dụ: 07:00 - 10:30)",
                        "Khu Vực (*)",
                        "Số Lượng SV (*)",
                        "Mô Tả Công Việc"
                    };

                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        cell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    }
                    ws.Row(2).Height = 28;

                    // 3. Dòng ví dụ mẫu (Ví dụ cụ thể, không lấy dữ liệu DB)
                    // Dòng ví dụ 1: Sáng cá nhân
                    ws.Cells[3, 1].Value = 1;
                    ws.Cells[3, 2].Value = "Dọn vệ sinh khuôn viên B1";
                    ws.Cells[3, 3].Value = "Sáng";
                    ws.Cells[3, 4].Value = "Cá nhân";
                    ws.Cells[3, 5].Value = 5;
                    ws.Cells[3, 6].Value = DateTime.Now.AddDays(7).ToString("dd/MM/yyyy");
                    ws.Cells[3, 7].Value = "07:00 - 10:30";
                    ws.Cells[3, 8].Value = "Khu B1 - Sân trước";
                    ws.Cells[3, 9].Value = 40;
                    ws.Cells[3, 10].Value = "Quét dọn lá cây, thu gom rác xung quanh tòa nhà B1";

                    // Dòng ví dụ 2: Chiều theo lớp
                    ws.Cells[4, 1].Value = 2;
                    ws.Cells[4, 2].Value = "Chăm sóc vườn hoa khu Trung tâm";
                    ws.Cells[4, 3].Value = "Chiều";
                    ws.Cells[4, 4].Value = "Lớp";
                    ws.Cells[4, 5].Value = 10;
                    ws.Cells[4, 6].Value = DateTime.Now.AddDays(7).ToString("dd/MM/yyyy");
                    ws.Cells[4, 7].Value = "13:30 - 16:30";
                    ws.Cells[4, 8].Value = "Vườn hoa Trung tâm";
                    ws.Cells[4, 9].Value = 60;
                    ws.Cells[4, 10].Value = "Tưới cây, tỉa cành và nhổ cỏ bồn hoa";

                    // Dòng ví dụ 3: Cùng tên đợt nhưng khác ngày hoặc buổi (hợp lệ)
                    ws.Cells[5, 1].Value = 3;
                    ws.Cells[5, 2].Value = "Dọn vệ sinh khuôn viên B1";
                    ws.Cells[5, 3].Value = "Chiều";
                    ws.Cells[5, 4].Value = "Cá nhân";
                    ws.Cells[5, 5].Value = 5;
                    ws.Cells[5, 6].Value = DateTime.Now.AddDays(8).ToString("dd/MM/yyyy");
                    ws.Cells[5, 7].Value = "13:30 - 16:30";
                    ws.Cells[5, 8].Value = "Khu B1 - Sân sau";
                    ws.Cells[5, 9].Value = 35;
                    ws.Cells[5, 10].Value = "Vệ sinh hành lang và khuôn viên sau";

                    for (int r = 3; r <= 5; r++)
                    {
                        for (int c = 1; c <= headers.Length; c++)
                        {
                            ws.Cells[r, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[r, c].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[r, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 3].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 4].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 5].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 7].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 9].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }

                    // 4. Ghi chú hướng dẫn chi tiết
                    int noteRow = 7;
                    ws.Cells[noteRow, 1].Value = "📌 GHI CHÚ HƯỚNG DẪN QUAN TRỌNG KHI NHẬP EXCEL:";
                    ws.Cells[noteRow, 1].Style.Font.Bold = true;
                    ws.Cells[noteRow, 1].Style.Font.Color.SetColor(Color.FromArgb(220, 53, 69));

                    ws.Cells[noteRow + 1, 1].Value = "1. Các cột có dấu (*) là thông tin bắt buộc.";
                    ws.Cells[noteRow + 2, 1].Value = "2. 'Buổi' chỉ chấp nhận: 'Sáng' hoặc 'Chiều'.";
                    ws.Cells[noteRow + 3, 1].Value = "3. 'Loại Lao Động' chỉ chấp nhận: 'Cá nhân' hoặc 'Lớp'.";
                    ws.Cells[noteRow + 4, 1].Value = "4. 'Ngày Lao Động' nhập đúng định dạng ngày/tháng/năm: dd/MM/yyyy (Ví dụ: 25/10/2026).";
                    ws.Cells[noteRow + 5, 1].Value = "5. 'Điểm / Giá Trị' và 'Số Lượng SV' phải là số nguyên dương (> 0).";
                    ws.Cells[noteRow + 6, 1].Value = "6. QUY TẮC TRÙNG LỊCH: Tên đợt có thể trùng nhau, nhưng nếu trùng cùng (Khu Vực + Ngày Lao Động + Buổi) thì hệ thống sẽ báo lỗi trùng lịch và KHÔNG thực hiện import dòng đó.";

                    for (int nr = noteRow; nr <= noteRow + 6; nr++)
                    {
                        ws.Cells[nr, 1].Style.Font.Size = 10;
                    }

                    // Đặt độ rộng cột cố định chuẩn đẹp
                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 32;
                    ws.Column(3).Width = 14;
                    ws.Column(4).Width = 18;
                    ws.Column(5).Width = 16;
                    ws.Column(6).Width = 18;
                    ws.Column(7).Width = 20;
                    ws.Column(8).Width = 25;
                    ws.Column(9).Width = 16;
                    ws.Column(10).Width = 45;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = "Mau_Import_TaoDotLaoDong.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi khi tải mẫu Excel: " + ex.Message);
            }
        }

        // ==============================================================
        // 📤 NHẬP DỮ LIỆU ĐỢT LAO ĐỘNG TỪ EXCEL (KIỂM TRA TRÙNG LỊCH)
        // ==============================================================
        [HttpPost]
        public ActionResult ImportExcel(HttpPostedFileBase file)
        {
            OfficeOpenXml.ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

            if (file == null || file.ContentLength == 0)
                return Json(new { success = false, message = "Vui lòng chọn file Excel để nhập dữ liệu." });

            string ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls")
                return Json(new { success = false, message = "Định dạng file không hợp lệ! Vui lòng tải lên file Excel (.xlsx)." });

            var errors = new List<string>();
            int successCount = 0;
            int totalRows = 0;

            try
            {
                using (var package = new ExcelPackage(file.InputStream))
                {
                    // LẤY SHEET ĐẦU TIÊN
                    var ws = package.Workbook.Worksheets.FirstOrDefault();
                    if (ws == null)
                        return Json(new { success = false, message = "File Excel không chứa bất kỳ sheet dữ liệu nào." });

                    int rowCount = ws.Dimension?.Rows ?? 0;
                    if (rowCount < 2)
                    {
                        return Json(new { success = false, message = "File Excel không có dữ liệu nhập." });
                    }

                    // Tự động nhận diện dòng bắt đầu dữ liệu
                    int startRow = 3;
                    string cellA1 = ws.Cells[1, 1].Text?.Trim().ToLower() ?? "";
                    string cellB1 = ws.Cells[1, 2].Text?.Trim().ToLower() ?? "";
                    if (cellA1.Contains("stt") || cellB1.Contains("tên") || cellB1.Contains("đợt"))
                    {
                        startRow = 2; // Header ở dòng 1
                    }

                    using (var db = DbContextFactory.Create())
                    {
                        // Lấy các lịch hiện có trong DB (chưa bị xóa) để kiểm tra trùng: KhuVuc + NgayLaoDong + Buoi
                        var existingSchedules = db.TaoDotNgayLaoDongs
                            .Where(x => x.Ngayxoa == null && x.NgayLaoDong.HasValue)
                            .Select(x => new
                            {
                                KhuVuc = (x.KhuVuc ?? "").Trim().ToLower(),
                                Ngay = DbFunctions.TruncateTime(x.NgayLaoDong),
                                Buoi = (x.Buoi ?? "").Trim().ToLower()
                            })
                            .ToList();

                        // Tập hợp key để kiểm tra nhanh: khuVuc|yyyyMMdd|buoi
                        var scheduleKeySet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        foreach (var sc in existingSchedules)
                        {
                            if (sc.Ngay.HasValue)
                            {
                                string key = $"{sc.KhuVuc}|{sc.Ngay.Value:yyyyMMdd}|{sc.Buoi}";
                                scheduleKeySet.Add(key);
                            }
                        }

                        // Tập hợp key trong chính file Excel để tránh trùng lặp nội bộ file
                        var fileScheduleKeySet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        var newBatches = new List<TaoDotNgayLaoDong>();

                        for (int row = startRow; row <= rowCount; row++)
                        {
                            var tenDot = ws.Cells[row, 2].Text?.Trim();
                            var buoi = ws.Cells[row, 3].Text?.Trim();
                            var loaiLD = ws.Cells[row, 4].Text?.Trim();
                            var giaTriStr = ws.Cells[row, 5].Text?.Trim();
                            var ngayStr = ws.Cells[row, 6].Text?.Trim();
                            var thoiGian = ws.Cells[row, 7].Text?.Trim();
                            var khuVuc = ws.Cells[row, 8].Text?.Trim();
                            var soLuongStr = ws.Cells[row, 9].Text?.Trim();
                            var moTa = ws.Cells[row, 10].Text?.Trim();

                            // Bỏ qua dòng hoàn toàn trống
                            if (string.IsNullOrWhiteSpace(tenDot) && string.IsNullOrWhiteSpace(khuVuc) && string.IsNullOrWhiteSpace(ngayStr))
                                continue;

                            totalRows++;

                            // 1. Kiểm tra trường bắt buộc
                            if (string.IsNullOrWhiteSpace(tenDot))
                            {
                                errors.Add($"Dòng {row}: 'Tên đợt lao động' không được để trống.");
                                continue;
                            }
                            if (string.IsNullOrWhiteSpace(buoi))
                            {
                                errors.Add($"Dòng {row}: 'Buổi' không được để trống (phải là 'Sáng' hoặc 'Chiều').");
                                continue;
                            }
                            if (string.IsNullOrWhiteSpace(loaiLD))
                            {
                                errors.Add($"Dòng {row}: 'Loại lao động' không được để trống (phải là 'Cá nhân' hoặc 'Lớp').");
                                continue;
                            }
                            if (string.IsNullOrWhiteSpace(khuVuc))
                            {
                                errors.Add($"Dòng {row}: 'Khu vực' không được để trống.");
                                continue;
                            }
                            if (string.IsNullOrWhiteSpace(ngayStr))
                            {
                                errors.Add($"Dòng {row}: 'Ngày lao động' không được để trống.");
                                continue;
                            }

                            // 2. Chuẩn hóa Buổi
                            string buoiNormalized = "";
                            if (buoi.Equals("Sáng", StringComparison.OrdinalIgnoreCase) || buoi.Equals("Sang", StringComparison.OrdinalIgnoreCase))
                                buoiNormalized = "Sáng";
                            else if (buoi.Equals("Chiều", StringComparison.OrdinalIgnoreCase) || buoi.Equals("Chieu", StringComparison.OrdinalIgnoreCase))
                                buoiNormalized = "Chiều";
                            else
                            {
                                errors.Add($"Dòng {row}: Buổi '{buoi}' không hợp lệ (chỉ nhận 'Sáng' hoặc 'Chiều').");
                                continue;
                            }

                            // 3. Chuẩn hóa Loại lao động
                            string loaiNormalized = "";
                            if (loaiLD.IndexOf("cá nhân", StringComparison.OrdinalIgnoreCase) >= 0 || loaiLD.IndexOf("ca nhan", StringComparison.OrdinalIgnoreCase) >= 0)
                                loaiNormalized = "Cá Nhân";
                            else if (loaiLD.IndexOf("lớp", StringComparison.OrdinalIgnoreCase) >= 0 || loaiLD.IndexOf("lop", StringComparison.OrdinalIgnoreCase) >= 0)
                                loaiNormalized = "Lớp";
                            else
                                loaiNormalized = loaiLD;

                            // 4. Parse Ngày lao động
                            DateTime ngayLaoDong;
                            var dateCell = ws.Cells[row, 6].Value;
                            if (dateCell is DateTime dtVal)
                            {
                                ngayLaoDong = dtVal.Date;
                            }
                            else if (DateTime.TryParseExact(ngayStr, new[] { "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "yyyy-MM-dd" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDt))
                            {
                                ngayLaoDong = parsedDt.Date;
                            }
                            else if (DateTime.TryParse(ngayStr, out var parsedGenDt))
                            {
                                ngayLaoDong = parsedGenDt.Date;
                            }
                            else
                            {
                                errors.Add($"Dòng {row}: Ngày lao động '{ngayStr}' không đúng định dạng (yêu cầu: dd/MM/yyyy).");
                                continue;
                            }

                            // 4.1. Kiểm tra ngày trong quá khứ / tháng đã qua hoặc ca hôm nay đã qua thời gian bắt đầu
                            DateTime today = DateTime.Today;
                            TimeSpan nowTime = DateTime.Now.TimeOfDay;
                            if (ngayLaoDong < today)
                            {
                                errors.Add($"Dòng {row}: Ngày lao động ({ngayLaoDong:dd/MM/yyyy}) là ngày trong quá khứ hoặc tháng đã qua, không thể tạo đợt!");
                                continue;
                            }
                            if (ngayLaoDong == today)
                            {
                                if (buoiNormalized == "Sáng" && nowTime >= new TimeSpan(7, 0, 0))
                                {
                                    errors.Add($"Dòng {row}: Ca Sáng hôm nay ({today:dd/MM/yyyy}) đã bắt đầu (sau 07:00), đã quá thời gian quy định tạo đợt!");
                                    continue;
                                }
                                if (buoiNormalized == "Chiều" && nowTime >= new TimeSpan(13, 30, 0))
                                {
                                    errors.Add($"Dòng {row}: Ca Chiều hôm nay ({today:dd/MM/yyyy}) đã bắt đầu (sau 13:30), đã quá thời gian quy định tạo đợt!");
                                    continue;
                                }
                            }

                            // 5. Parse Giá trị / Điểm
                            int giaTri = 1;
                            if (!string.IsNullOrWhiteSpace(giaTriStr))
                            {
                                if (!int.TryParse(giaTriStr, out giaTri) || giaTri <= 0)
                                {
                                    errors.Add($"Dòng {row}: Điểm/Giá trị '{giaTriStr}' phải là số nguyên dương > 0.");
                                    continue;
                                }
                            }

                            // 6. Parse Số lượng sinh viên
                            int soLuongSV = 30;
                            if (!string.IsNullOrWhiteSpace(soLuongStr))
                            {
                                if (!int.TryParse(soLuongStr, out soLuongSV) || soLuongSV <= 0)
                                {
                                    errors.Add($"Dòng {row}: Số lượng sinh viên '{soLuongStr}' phải là số nguyên dương > 0.");
                                    continue;
                                }
                            }

                            // 7. KIỂM TRA TRÙNG LỊCH: KhuVuc + NgayLaoDong + Buoi
                            string scheduleKey = $"{khuVuc.Trim().ToLower()}|{ngayLaoDong:yyyyMMdd}|{buoiNormalized.ToLower()}";

                            // Trùng trong chính file Excel
                            if (fileScheduleKeySet.Contains(scheduleKey))
                            {
                                errors.Add($"Dòng {row}: Trùng lịch với dòng khác trong file tại khu vực '{khuVuc}' vào ngày {ngayLaoDong:dd/MM/yyyy} ({buoiNormalized}). Không thực hiện import dòng này!");
                                continue;
                            }

                            // Trùng với dữ liệu đã có trong Database
                            if (scheduleKeySet.Contains(scheduleKey))
                            {
                                errors.Add($"Dòng {row}: Trùng lịch lao động đã tồn tại trên hệ thống tại khu vực '{khuVuc}' vào ngày {ngayLaoDong:dd/MM/yyyy} ({buoiNormalized}). Không thực hiện import dòng này!");
                                continue;
                            }

                            // Lấy user từ session nếu có
                            var userIdStr = Session["UserId"]?.ToString();
                            int.TryParse(userIdStr, out int currentUserId);

                            // Tạo đối tượng đợt mới
                            string defaultThoiGian = buoiNormalized == "Sáng" ? "07:00 - 10:30" : "13:30 - 16:30";
                            string cleanTenDot = tenDot.Length > 255 ? tenDot.Substring(0, 255) : tenDot;
                            string cleanKhuVuc = khuVuc.Length > 100 ? khuVuc.Substring(0, 100) : khuVuc;
                            string cleanThoiGian = string.IsNullOrWhiteSpace(thoiGian) ? defaultThoiGian : (thoiGian.Length > 50 ? thoiGian.Substring(0, 50) : thoiGian);
                            string cleanMoTa = moTa != null && moTa.Length > 255 ? moTa.Substring(0, 255) : (moTa ?? "");

                            var newDot = new TaoDotNgayLaoDong
                            {
                                DotLaoDong = cleanTenDot,
                                Buoi = buoiNormalized,
                                LoaiLaoDong = loaiNormalized,
                                GiaTri = giaTri,
                                NgayLaoDong = ngayLaoDong,
                                ThoiGian = cleanThoiGian,
                                KhuVuc = cleanKhuVuc,
                                SoLuongSinhVien = soLuongSV,
                                MoTa = cleanMoTa,
                                TrangThaiDuyet = true,
                                MaDiemDanh = GenerateRandomCode(6),
                                TrangThaiDot = "Chờ diễn ra",
                                NguoiTao = currentUserId > 0 ? currentUserId : (int?)null
                            };

                            newBatches.Add(newDot);
                            fileScheduleKeySet.Add(scheduleKey);
                            scheduleKeySet.Add(scheduleKey);
                        }

                        if (newBatches.Count > 0)
                        {
                            foreach (var b in newBatches)
                            {
                                try
                                {
                                    db.TaoDotNgayLaoDongs.Add(b);
                                    db.SaveChanges();
                                    successCount++;
                                }
                                catch (Exception itemEx)
                                {
                                    var itemInner = itemEx;
                                    while (itemInner.InnerException != null) itemInner = itemInner.InnerException;
                                    errors.Add($"Đợt '{b.DotLaoDong}': Lỗi lưu CSDL ({itemInner.Message})");
                                }
                            }
                        }
                    }
                }

                if (successCount == 0 && errors.Count > 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Không có đợt lao động nào được nhập do bị trùng lịch hoặc dữ liệu không hợp lệ.",
                        errors = errors
                    });
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã nhập thành công {successCount}/{totalRows} đợt lao động." + (errors.Count > 0 ? $" Có {errors.Count} dòng bị trùng lịch hoặc lỗi không được nhập." : ""),
                    successCount = successCount,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null)
                {
                    inner = inner.InnerException;
                }
                return Json(new { success = false, message = "Lỗi khi xử lý file Excel: " + inner.Message });
            }
        }

        // ==============================================================
        // 📊 XUẤT DỮ LIỆU ĐỢT LAO ĐỘNG RA EXCEL
        // ==============================================================
        [HttpGet]
        public ActionResult ExportExcel(string keyword = "", string buoi = "", string trangthai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaoDotNgayLaoDongs.Where(x => x.Ngayxoa == null);

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    keyword = keyword.Trim();
                    query = query.Where(x => x.DotLaoDong.Contains(keyword) || x.KhuVuc.Contains(keyword));
                }

                if (!string.IsNullOrWhiteSpace(buoi))
                {
                    query = query.Where(x => x.Buoi == buoi);
                }

                if (trangthai == "1")
                    query = query.Where(x => x.TrangThaiDuyet == true);
                else if (trangthai == "0")
                    query = query.Where(x => x.TrangThaiDuyet == false);

                var list = query.OrderBy(x => x.TaoDotLaoDong_id).ToList();

                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("DanhSachDotLaoDong");

                    // Header Title
                    ws.Cells["A1:I1"].Merge = true;
                    ws.Cells["A1"].Value = "DANH SÁCH ĐỢT LAO ĐỘNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 15;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(13, 110, 253));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    string[] headers = new string[]
                    {
                        "STT", "Tên Đợt Lao Động", "Buổi", "Loại LĐ", "Giá Trị",
                        "Ngày Lao Động", "Khu Vực", "Số Lượng SV", "Trạng Thái"
                    };

                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        cell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    }
                    ws.Row(2).Height = 25;

                    int row = 3;
                    int stt = 1;
                    foreach (var item in list)
                    {
                        ws.Cells[row, 1].Value = stt;
                        ws.Cells[row, 2].Value = item.DotLaoDong;
                        ws.Cells[row, 3].Value = item.Buoi;
                        ws.Cells[row, 4].Value = item.LoaiLaoDong;
                        ws.Cells[row, 5].Value = item.GiaTri ?? 0;
                        ws.Cells[row, 6].Value = item.NgayLaoDong.HasValue ? item.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "";
                        ws.Cells[row, 7].Value = item.KhuVuc;
                        ws.Cells[row, 8].Value = item.SoLuongSinhVien ?? 0;
                        ws.Cells[row, 9].Value = item.TrangThaiDuyet == true ? "Đã duyệt" : "Chờ duyệt";

                        for (int c = 1; c <= headers.Length; c++)
                        {
                            ws.Cells[row, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[row, c].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[row, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 3].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 4].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 5].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 8].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 9].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                        row++;
                        stt++;
                    }

                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 32;
                    ws.Column(3).Width = 14;
                    ws.Column(4).Width = 18;
                    ws.Column(5).Width = 14;
                    ws.Column(6).Width = 18;
                    ws.Column(7).Width = 25;
                    ws.Column(8).Width = 16;
                    ws.Column(9).Width = 18;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = $"DanhSachDotLaoDong_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
        }
    }
}
