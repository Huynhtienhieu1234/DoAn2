using System;
using System.Linq;
using System.Web.Mvc;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminWordRegisterController : Controller
    {
        private const int ITEMS_PER_PAGE = 5;

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
               string trangThai = "")
        {
            using (var db = DbContextFactory.Create())
            {
                // Bước 1: Khởi tạo truy vấn ban đầu (chỉ lấy đợt chưa bị xóa)
                var query = db.TaoDotNgayLaoDongs.Where(x => x.Ngayxoa == null);

                // Bước 2: Lọc theo từ khóa (tên đợt hoặc khu vực)
                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    query = query.Where(x =>
                        x.DotLaoDong.Contains(keyword) ||
                        x.KhuVuc.Contains(keyword));
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

                // Bước 5: Tính tổng số dòng và số trang
                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                // Bước 6: Lấy dữ liệu theo trang
                var rawItems = query
                    .OrderByDescending(x => x.NgayLaoDong)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList(); // Truy vấn xong rồi mới xử lý

                // Bước 7: Xử lý dữ liệu để trả về JSON
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
                    SoLuongDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == x.TaoDotLaoDong_id),
                    TrangThaiDuyet = x.TrangThaiDuyet == true ? "Đã duyệt" : "Chưa duyệt",
                    x.MoTa,
                    x.NguoiTao
                }).ToList();



                // Bước 8: Trả về JSON
                return Json(new
                {
                    success = true,
                    items,
                    page,
                    totalPages
                }, JsonRequestBehavior.AllowGet);
            }
        }
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
                    // Kiểm tra trùng đợt lao động cùng ngày, buổi, khu vực
                    bool isDuplicate = db.TaoDotNgayLaoDongs.Any(x =>
                        x.DotLaoDong == model.DotLaoDong &&
                        x.NgayLaoDong == model.NgayLaoDong &&
                        x.Buoi == model.Buoi &&
                        x.KhuVuc == model.KhuVuc &&
                        x.Ngayxoa == null);

                    if (isDuplicate)
                        return Json(new { success = false, message = "Đợt lao động này đã tồn tại." });

                    // Kiểm tra ngày lao động
                    if (!model.NgayLaoDong.HasValue)
                        return Json(new { success = false, message = "Bạn phải chọn ngày lao động." });

                    // Kiểm tra buổi
                    if (string.IsNullOrWhiteSpace(model.Buoi))
                        return Json(new { success = false, message = "Bạn phải chọn buổi." });

                    // Kiểm tra số lượng sinh viên
                    if (model.SoLuongSinhVien <= 0)
                        return Json(new { success = false, message = "Số lượng sinh viên phải lớn hơn 0." });

                    // Gán mặc định
                    model.TrangThaiDuyet = false;
                    model.Ngayxoa = null;

                    db.TaoDotNgayLaoDongs.Add(model);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Tạo đợt lao động thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message });
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

                // ❌ Không cho xóa nếu đã duyệt
                if (dot.TrangThaiDuyet == true)
                    return Json(new { success = false, message = "Đợt đã duyệt không thể xóa." });

                // ✅ Kiểm tra quyền: chỉ Admin mới được xóa
                var userId = Session["UserId"]?.ToString();
                var user = db.TaiKhoans.FirstOrDefault(u => u.TaiKhoan_id.ToString() == userId);
                if (user == null || user.VaiTro_id != 1) // 1 = Admin
                    return Json(new { success = false, message = "Chỉ tài khoản Admin mới được xóa." });

                // ✅ Cho phép xóa
                dot.Ngayxoa = DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa đợt lao động." });
            }
        }


        // AJAX: Duyệt đợt

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

                    // Kiểm tra số lượng sinh viên đã đăng ký
                    int soDangKy = db.PhieuDangKies.Count(p => p.TaoDotLaoDong_id == id);
                    if (soDangKy < 5)
                    {
                        return Json(new
                        {
                            success = false,
                            message = $"Chưa đủ số lượng sinh viên đăng ký (hiện tại: {soDangKy}/5)."
                        });
                    }

                    // Nếu đủ thì duyệt
                    dot.TrangThaiDuyet = true;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã duyệt đợt lao động." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
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




    }
}
