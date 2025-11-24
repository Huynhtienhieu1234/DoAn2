using System.Linq;
using System.Web.Mvc;
using System.Data.Entity;
using QuanLyDangKyNgayLD.Models;
using QuanLyDangKyNgayLD.Factories;
using System.Net;
using System;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AccountController : Controller
    {
        private const int ITEMS_PER_PAGE = 100;

        // GET: Admin/Account - Phân trang server-side
        public ActionResult Index(int page = 1, string search = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                // Lấy danh sách tài khoản chưa bị xóa + Include VaiTro
                var query = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null);

                // Lọc theo vai trò
                if (!string.IsNullOrWhiteSpace(role) && role != "Tất Cả")
                {
                    query = query.Where(t => t.VaiTro != null && t.VaiTro.TenVaiTro == role);
                }

                // Lọc theo từ khóa tìm kiếm
                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(t => t.Username.Contains(search) || t.Email.Contains(search));
                }

                // Tính toán phân trang
                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / ITEMS_PER_PAGE);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var accounts = query
                    .OrderBy(t => t.TaiKhoan_id)
                    .Skip((page - 1) * ITEMS_PER_PAGE)
                    .Take(ITEMS_PER_PAGE)
                    .ToList();

                // Truyền dữ liệu sang view
                ViewBag.CurrentPage = page;
                ViewBag.TotalPages = totalPages;
                ViewBag.TotalItems = totalItems;
                ViewBag.SearchKeyword = search;
                ViewBag.SelectedRole = role;
                ViewBag.ItemsPerPage = ITEMS_PER_PAGE;
                ViewBag.VaiTroList = db.VaiTroes.ToList();
                ViewBag.Roles = db.VaiTroes
                    .Select(v => new { ID = v.VaiTro_id, Name = v.TenVaiTro })
                    .ToList();





                return View(accounts);
            }
        }

        // AJAX: Lấy danh sách tài khoản đã xóa
        public ActionResult GetDeletedAccounts()
        {
            using (var db = DbContextFactory.Create())
            {
                var deletedAccounts = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at != null)
                    .OrderByDescending(t => t.Deleted_at)
                    .Select(t => new
                    {
                        id = t.TaiKhoan_id,
                        username = t.Username,
                        email = t.Email,
                        roleName = t.VaiTro.TenVaiTro,
                        deletedAt = t.Deleted_at
                    })
                    .ToList();

                return Json(new { success = true, accounts = deletedAccounts }, JsonRequestBehavior.AllowGet);
            }
        }
        // POST: Xóa mềm tài khoản
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Delete(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans.Find(id);
                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản cần xóa.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                taiKhoan.Deleted_at = DateTime.Now;
                db.SaveChanges();

                TempData["Message"] = "Đã xóa tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        // AJAX: Xóa mềm
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    taiKhoan.Deleted_at = DateTime.Now;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Xóa tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }


        // Khôi phục tài khoản
        [HttpPost]
        public ActionResult RestoreAccount(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.Find(id);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    taiKhoan.Deleted_at = null;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Khôi phục tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult Create(TaiKhoan taiKhoan)
        {
            using (var db = DbContextFactory.Create())
            {
                if (!ModelState.IsValid)
                    return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                if (db.TaiKhoans.Any(t => t.Username == taiKhoan.Username && t.Deleted_at == null))
                    return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });


                int roleId;
                try
                {
                    roleId = Convert.ToInt32(taiKhoan.VaiTro_id);
                    taiKhoan.VaiTro_id = roleId;
                }
                catch
                {
                    return Json(new { success = false, message = "Vai trò không hợp lệ!" });
                }

                if (roleId <= 0)
                {
                    return Json(new { success = false, message = "Bạn phải chọn vai trò." });
                }



                taiKhoan.Deleted_at = null;
                db.TaiKhoans.Add(taiKhoan);
                db.SaveChanges();

                return Json(new { success = true, message = "Tạo tài khoản thành công!" });
            }
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CreateAjax(TaiKhoan model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    // xử lý lỗi
                }

                using (var db = DbContextFactory.Create())
                {
                    // kiểm tra trùng username
                    // kiểm tra mật khẩu

                    // ✅ CHÍNH LÀ ĐÂY: xử lý VaiTro_id
                    int roleId;
                    try
                    {
                        roleId = Convert.ToInt32(model.VaiTro_id);
                    }
                    catch
                    {
                        return Json(new { success = false, message = "Vai trò không hợp lệ!" });
                    }

                    if (roleId <= 0)
                    {
                        return Json(new { success = false, message = "Vui lòng chọn vai trò!" });
                    }

                    model.VaiTro_id = roleId;

                    // gán các thông tin còn lại
                    model.Deleted_at = null;
                    db.TaiKhoans.Add(model);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Thêm tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }






























        // GET: Chỉnh sửa
        public ActionResult Edit(int? id)
        {
            if (id == null)
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);

            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);

                if (taiKhoan == null)
                    return HttpNotFound();

                ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", taiKhoan.VaiTro_id);
                return View(taiKhoan);
            }
        }

        // POST: Chỉnh sửa
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(TaiKhoan model)
        {
            using (var db = DbContextFactory.Create())
            {
                if (model.TaiKhoan_id <= 0)
                {
                    TempData["Message"] = "ID tài khoản không hợp lệ.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                var taiKhoan = db.TaiKhoans
                    .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);

                if (taiKhoan == null)
                {
                    TempData["Message"] = "Không tìm thấy tài khoản.";
                    TempData["MessageType"] = "danger";
                    return RedirectToAction("Index");
                }

                if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                {
                    TempData["Message"] = "Tên tài khoản đã tồn tại.";
                    TempData["MessageType"] = "warning";
                    ViewBag.VaiTroList = new SelectList(db.VaiTroes, "VaiTro_id", "TenVaiTro", model.VaiTro_id);
                    return View(model);
                }

                taiKhoan.Username = model.Username;
                taiKhoan.Email = model.Email;
                taiKhoan.VaiTro_id = model.VaiTro_id;

                if (!string.IsNullOrWhiteSpace(model.Password))
                    taiKhoan.Password = model.Password;

                db.SaveChanges();

                TempData["Message"] = "Cập nhật tài khoản thành công!";
                TempData["MessageType"] = "success";
                return RedirectToAction("Index");
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans
                        .Include(t => t.VaiTro)
                        .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);

                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    taiKhoan.Username = model.Username;
                    taiKhoan.Email = model.Email;
                    taiKhoan.VaiTro_id = model.VaiTro_id;

                    if (!string.IsNullOrWhiteSpace(model.Password))
                        taiKhoan.Password = model.Password; // Nên hash lại ở đây (quan trọng bảo mật)

                    db.SaveChanges();

                    return Json(new
                    {
                        success = true,
                        message = "Cập nhật tài khoản thành công!",
                        data = new
                        {
                            taiKhoan.TaiKhoan_id,
                            taiKhoan.Username,
                            taiKhoan.Email,
                            RoleName = taiKhoan.VaiTro?.TenVaiTro,     // để hiển thị trong bảng
                            VaiTro_id = taiKhoan.VaiTro_id             // ← THÊM DÒNG NÀY (QUAN TRỌNG NHẤT!)
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }


        // AJAX: Reset mật khẩu
        [HttpPost]
        public ActionResult ResetPasswordAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản." });

                    taiKhoan.Password = "123456";
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đặt lại mật khẩu thành công! Mật khẩu mới: 123456" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // AJAX: Chi tiết tài khoản
        [HttpGet]
        public ActionResult DetailsAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var taiKhoan = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.TaiKhoan_id == id && t.Deleted_at == null)
                    .Select(t => new
                    {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        Role = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Không có"
                    })
                    .FirstOrDefault();

                if (taiKhoan == null)
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." }, JsonRequestBehavior.AllowGet);

                return Json(new { success = true, data = taiKhoan }, JsonRequestBehavior.AllowGet);
            }
        }
 

        [HttpGet]
        public ActionResult LoadAccounts(int page = 1, int pageSize = 5, string keyword = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                // Lấy danh sách tài khoản chưa bị xóa
                var query = db.TaiKhoans.Include(t => t.VaiTro)
                                        .Where(t => t.Deleted_at == null);

                // Lọc theo từ khóa
                if (!string.IsNullOrWhiteSpace(keyword))
                    query = query.Where(t => t.Username.Contains(keyword) || t.Email.Contains(keyword));

                // Lọc theo vai trò (trừ "Tất Cả")
                if (!string.IsNullOrWhiteSpace(role) && role != "Tất Cả")
                    query = query.Where(t => t.VaiTro.TenVaiTro == role);

                // Tổng số bản ghi
                var totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                // Lấy dữ liệu theo trang

                var accounts = query.OrderBy(t => t.TaiKhoan_id)
                                 .Skip((page - 1) * pageSize)
                                 .Take(pageSize)
                                 .Select(t => new {
                                     t.TaiKhoan_id,
                                     t.Username,
                                     t.Email,
                                     VaiTro_id = (int?)t.VaiTro.VaiTro_id,   // nullable
                                     RoleName = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Chưa có vai trò"
                                 })
                                 .ToList();
                return Json(new { success = true, items = accounts, page, totalPages }, JsonRequestBehavior.AllowGet);
            }
        }
        [HttpGet]
        public ActionResult ExportAllAccounts(string keyword = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaiKhoans.Include(t => t.VaiTro).Where(t => t.Deleted_at == null);

                if (!string.IsNullOrWhiteSpace(keyword))
                    query = query.Where(t => t.Username.Contains(keyword) || t.Email.Contains(keyword));

                if (!string.IsNullOrWhiteSpace(role) && role != "Tất Cả")
                    query = query.Where(t => t.VaiTro.TenVaiTro == role);

                var accounts = query.Select(t => new {
                    t.Username,
                    t.Email,
                    RoleName = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Chưa có vai trò"
                }).ToList();

                return Json(new { success = true, items = accounts }, JsonRequestBehavior.AllowGet);
            }
        }


    }
}