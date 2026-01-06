using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Linq;
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

                var items = query.OrderByDescending(x => x.NgayLaoDong)
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
            string sortField = "date",
            string sortDir = "desc"
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
                    case "date":
                        query = sortDir == "asc" ? query.OrderBy(x => x.NgayLaoDong) : query.OrderByDescending(x => x.NgayLaoDong);
                        break;
                    case "quantity":
                        query = sortDir == "asc"
                            ? query.OrderBy(x => db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id))
                            : query.OrderByDescending(x => db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id));
                        break;
                    case "status":
                        query = sortDir == "asc" ? query.OrderBy(x => x.TrangThaiDuyet) : query.OrderByDescending(x => x.TrangThaiDuyet);
                        break;
                    default:
                        query = query.OrderByDescending(x => x.NgayLaoDong);
                        break;
                }

                // Bước 7: Phân trang
                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

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

                // === TẠO DANH SÁCH TRẢ VỀ JSON ===
                var items = rawItems.Select(x => new
                {
                    x.TaoDotLaoDong_id,
                    x.DotLaoDong,
                    x.Buoi,
                    x.LoaiLaoDong,
                    GiaTri = x.GiaTri,
                    NgayLaoDong = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                    x.KhuVuc,
                    x.SoLuongSinhVien,
                    SoLuongDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id),
                    TrangThaiDuyet = x.TrangThaiDuyet == true
                        ? "Đã duyệt"
                        : (x.NgayLaoDong.HasValue && x.NgayLaoDong.Value.Date < DateTime.Today ? "Kết thúc" : "Chưa duyệt"),

                    x.MoTa,
                    x.NguoiTao,
                    // Số lớp đã đăng ký (chỉ cho loại "Lớp")
                    SoLuongLopDaDangKy = (x.LoaiLaoDong == "Lớp")
                        ? (lopDaDangKyDict.ContainsKey(x.TaoDotLaoDong_id) ? lopDaDangKyDict[x.TaoDotLaoDong_id] : 0)
                        : 0,
                    // Tổng số lớp cần (dùng SoLuongSinhVien làm chỉ tiêu lớp, nếu null → mặc định 20)
                    TongSoLopCan = (x.LoaiLaoDong == "Lớp")
                        ? x.SoLuongSinhVien.GetValueOrDefault(20)
                        : 0
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

                    // ✅ Chỉ cho phép Admin tạo đợt
                    if (user.VaiTro_id != 1)
                        return Json(new { success = false, message = "Chỉ Admin mới có quyền tạo đợt lao động." });

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

                    if (string.IsNullOrWhiteSpace(model.Buoi))
                        return Json(new { success = false, message = "Bạn phải chọn buổi." });

                    if (model.SoLuongSinhVien <= 0)
                        return Json(new { success = false, message = "Số lượng sinh viên phải lớn hơn 0." });

                    // Gán mặc định
                    model.TrangThaiDuyet = false;
                    model.Ngayxoa = null;
                    model.NguoiTao = user.TaiKhoan_id;

                    // ✅ Lưu đợt lao động
                    db.TaoDotNgayLaoDongs.Add(model);
                    db.SaveChanges();

                    // ❌ Không tạo phiếu đăng ký ở đây
                    // Phiếu sẽ được sinh viên tạo khi họ đăng ký vào đợt này

                    return Json(new { success = true, message = "Tạo đợt lao động thành công!" });
                }
            }
            catch (Exception)
            {
                return Json(new { success = false, message = "Thêm thành công " });
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

                // ✅ Cho phép xóa (Admin được xóa cả khi đã duyệt)
                dot.Ngayxoa = DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa đợt lao động." });
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
                                    where pd.TaoDotLaoDong_id == maDot && pd.MSSV != null
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









    }
}
