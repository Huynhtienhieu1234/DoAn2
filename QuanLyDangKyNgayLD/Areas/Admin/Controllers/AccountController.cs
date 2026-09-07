using OfficeOpenXml;         
using OfficeOpenXml.Style;    
using QuanLyDangKyNgayLD.AuditHelper;
using QuanLyDangKyNgayLD.Factories; 
using QuanLyDangKyNgayLD.Models;    
using System;               
using System.Collections.Generic;
using System.Data.Entity;    
using System.Linq;            
using System.Web.Mvc;         
using System.Drawing;         

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AccountController : Controller
    {
        private const int ITEMS_PER_PAGE = 10;

        // GET: Admin/Account
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
                    query = query.Where(t => t.VaiTro != null && (t.VaiTro.TenVaiTro == role || t.VaiTro.TenVaiTro.Contains(role)));
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



        // lấy dữ liêu
        [HttpGet]
        public ActionResult GetAccounts(int page = 1, int pageSize = 10)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var query = db.TaiKhoans
                        .Include(t => t.VaiTro)
                        .Where(t => t.Deleted_at == null)
                        .OrderBy(t => t.TaiKhoan_id);

                    int totalItems = query.Count();
                    if (pageSize <= 0) pageSize = 10;
                    int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / pageSize) : 1;

                    if (page < 1) page = 1;
                    if (page > totalPages) page = totalPages;

                    var accounts = query
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(t => new
                        {
                            t.TaiKhoan_id,
                            t.Username,
                            t.Email,
                            RoleName = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Chưa có vai trò"
                        })
                        .ToList();

                    return Json(new
                    {
                        data = accounts,
                        currentPage = page,
                        totalPages = totalPages,
                        totalItems = totalItems
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    data = new List<object>(),
                    currentPage = 1,
                    totalPages = 1,
                    totalItems = 0,
                    error = ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }



        [HttpPost]
        public ActionResult CreateAccountAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    if (!ModelState.IsValid)
                        return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                    bool isStudentRole = model.VaiTro_id == 3 || model.VaiTro_id == 4;
                    string rawPassword;

                    if (isStudentRole)
                    {
                        if (string.IsNullOrWhiteSpace(model.Username) || !model.Username.All(char.IsDigit))
                            return Json(new { success = false, message = "MSSV chỉ được phép nhập số, không chứa chữ cái!" });

                        rawPassword = model.Username.Trim();

                        if (rawPassword.Length < 6 || rawPassword.Length > 20)
                            return Json(new { success = false, message = "MSSV phải có từ 6 đến 20 chữ số!" });
                    }
                    else
                    {
                        if (string.IsNullOrWhiteSpace(model.Password))
                            return Json(new { success = false, message = "Mật khẩu không được để trống!" });

                        rawPassword = model.Password.Trim();
                        if (rawPassword.Length < 6)
                            return Json(new { success = false, message = "Mật khẩu phải ít nhất 6 ký tự!" });
                    }

                    // Hash mật khẩu
                    string hashedPassword = PasswordHelper.HashPassword(rawPassword);

                    // Kiểm tra trùng Username
                    var existingTk = db.TaiKhoans.FirstOrDefault(t => t.Username == model.Username);
                    if (existingTk != null)
                    {
                        if (existingTk.Deleted_at == null)
                            return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                        // Tài khoản đã từng bị xóa mềm -> Kích hoạt lại
                        existingTk.Password = hashedPassword;
                        existingTk.Email = model.Email?.Trim();
                        existingTk.VaiTro_id = model.VaiTro_id;
                        existingTk.Deleted_at = null;
                        existingTk.IsLocked = false;
                        db.SaveChanges();

                        if (isStudentRole)
                        {
                            long mssvVal = Convert.ToInt64(existingTk.Username);
                            var existingSv = db.SinhViens.FirstOrDefault(s => s.MSSV == mssvVal);
                            if (existingSv != null)
                            {
                                existingSv.Email = existingTk.Email;
                                existingSv.TaiKhoan = existingTk.TaiKhoan_id;
                                existingSv.Deleted_at = null;
                            }
                            else
                            {
                                var sinhVien = new SinhVien
                                {
                                    MSSV = mssvVal,
                                    Email = existingTk.Email,
                                    TaiKhoan = existingTk.TaiKhoan_id,
                                    Deleted_at = null
                                };
                                db.SinhViens.Add(sinhVien);
                            }
                            db.SaveChanges();
                        }

                        transaction.Commit();
                        return Json(new { success = true, message = isStudentRole ? $"Đã khôi phục và kích hoạt tài khoản sinh viên thành công! Mật khẩu mặc định: <strong>{rawPassword}</strong>" : "Đã khôi phục và kích hoạt tài khoản thành công!" });
                    }

                    // Kiểm tra trùng Email
                    if (!string.IsNullOrWhiteSpace(model.Email) &&
                        db.TaiKhoans.Any(t => t.Email == model.Email && t.Deleted_at == null))
                        return Json(new { success = false, message = "Email đã tồn tại." });

                    // Tạo tài khoản mới
                    var taiKhoan = new TaiKhoan
                    {
                        Username = model.Username.Trim(),
                        Email = model.Email?.Trim(),
                        Password = hashedPassword,
                        VaiTro_id = model.VaiTro_id,
                        Deleted_at = null,
                        IsLocked = false
                    };

                    db.TaiKhoans.Add(taiKhoan);
                    db.SaveChanges();

                    // Nếu là Sinh viên hoặc Lớp phó lao động thì thêm vào bảng SinhVien
                    if (isStudentRole)
                    {
                        long mssvVal = Convert.ToInt64(taiKhoan.Username);
                        var existingSv = db.SinhViens.FirstOrDefault(s => s.MSSV == mssvVal);
                        if (existingSv != null)
                        {
                            existingSv.Email = taiKhoan.Email;
                            existingSv.TaiKhoan = taiKhoan.TaiKhoan_id;
                            existingSv.Deleted_at = null;
                        }
                        else
                        {
                            var sinhVien = new SinhVien
                            {
                                MSSV = mssvVal,
                                Email = taiKhoan.Email,
                                TaiKhoan = taiKhoan.TaiKhoan_id,
                                Deleted_at = null
                            };
                            db.SinhViens.Add(sinhVien);
                        }
                        db.SaveChanges();
                    }

                    transaction.Commit();

                    string successMessage = isStudentRole
                        ? $"Thêm sinh viên thành công! Mật khẩu mặc định = MSSV: <strong>{rawPassword}</strong>"
                        : "Thêm tài khoản thành công!";

                    return Json(new { success = true, message = successMessage });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi: " + inner.Message });
            }
        }




        // Chỉnh sửa
        [HttpPost]
        public ActionResult EditAjax(TaiKhoan model)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    if (!ModelState.IsValid)
                        return Json(new { success = false, message = "Dữ liệu không hợp lệ." });

                    var taiKhoan = db.TaiKhoans
                        .Include(t => t.VaiTro)
                        .FirstOrDefault(t => t.TaiKhoan_id == model.TaiKhoan_id && t.Deleted_at == null);

                    if ((taiKhoan.VaiTro_id == 3 || taiKhoan.VaiTro_id == 4) && taiKhoan.Username != model.Username.Trim())
                    {
                        return Json(new { success = false, message = "Không được phép chỉnh sửa MSSV của sinh viên!" });
                    }

                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản cần chỉnh sửa." });

                    // Kiểm tra trùng Username (ngoại trừ chính nó)
                    if (db.TaiKhoans.Any(t => t.Username == model.Username && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Tên tài khoản đã tồn tại." });

                    // Kiểm tra trùng Email (ngoại trừ chính nó)
                    if (!string.IsNullOrWhiteSpace(model.Email) &&
                        db.TaiKhoans.Any(t => t.Email == model.Email && t.TaiKhoan_id != model.TaiKhoan_id && t.Deleted_at == null))
                        return Json(new { success = false, message = "Email đã tồn tại." });

                    bool isStudentRole = model.VaiTro_id == 3 || model.VaiTro_id == 4;

                    // ✅ Cập nhật thông tin bên bảng TaiKhoan
                    taiKhoan.Username = model.Username.Trim();
                    taiKhoan.Email = model.Email?.Trim();
                    taiKhoan.VaiTro_id = model.VaiTro_id;

                    // Nếu không phải sinh viên thì cho phép đổi mật khẩu
                    if (!isStudentRole && !string.IsNullOrWhiteSpace(model.Password))
                    {
                        if (model.Password.Trim().Length < 6)
                            return Json(new { success = false, message = "Mật khẩu phải ít nhất 6 ký tự!" });

                        taiKhoan.Password = PasswordHelper.HashPassword(model.Password.Trim());
                    }

                    db.SaveChanges();

                    // ✅ Đồng bộ sang bảng SinhVien nếu là sinh viên
                    if (isStudentRole)
                    {
                        var sinhVien = db.SinhViens.FirstOrDefault(s => s.TaiKhoan == taiKhoan.TaiKhoan_id && s.Deleted_at == null);
                        if (sinhVien != null)
                        {
                            sinhVien.MSSV = Convert.ToInt64(taiKhoan.Username); // MSSV = Username mới
                            sinhVien.Email = taiKhoan.Email;                    // Email đồng bộ
                            db.SaveChanges();
                        }
                    }

                    transaction.Commit();

                    return Json(new { success = true, message = "Cập nhật tài khoản thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }


        [HttpGet]
        public ActionResult GetAccountById(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var acc = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null && t.TaiKhoan_id == id)
                    .Select(t => new
                    {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        t.VaiTro_id
                    })
                    .FirstOrDefault();

                return Json(acc, JsonRequestBehavior.AllowGet);
            }
        }

        // Xóa tài khoản
        // Xóa mềm
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản hoặc đã bị xóa." });

                    // 📝 Ghi nhận nhật ký xóa vào QuanLyAuditLog
                    var dataOld = new
                    {
                        taiKhoan.TaiKhoan_id,
                        taiKhoan.Username,
                        taiKhoan.Email,
                        taiKhoan.VaiTro_id,
                        taiKhoan.IsLocked
                    };
                    AuditLogHelper.GhiNhatKy("TaiKhoan", taiKhoan.TaiKhoan_id.ToString(), dataOld, "DELETE");

                    taiKhoan.Deleted_at = DateTime.Now;

                    // Nếu Username là MSSV dạng số thì xóa mềm bên bảng SinhVien luôn
                    if (long.TryParse(taiKhoan.Username, out long mssv))
                    {
                        var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.MSSV == mssv && sv.Deleted_at == null);
                        if (sinhVien != null)
                        {
                            var dataSvOld = new
                            {
                                sinhVien.MSSV,
                                sinhVien.HoTen,
                                sinhVien.Email,
                                sinhVien.Lop_id,
                                sinhVien.TaiKhoan
                            };
                            AuditLogHelper.GhiNhatKy("SinhVien", sinhVien.MSSV.ToString(), dataSvOld, "DELETE");
                            sinhVien.Deleted_at = DateTime.Now;
                        }
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = $"Đã xóa mềm tài khoản '{taiKhoan.Username}'." });
                }
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                return Json(new { success = false, message = "Lỗi: " + detail });
            }
        }

        // Xóa nhiều tài khoản đã chọn
        [HttpPost]
        public ActionResult DeleteMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một tài khoản để xóa." });

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoans = db.TaiKhoans.Where(t => ids.Contains(t.TaiKhoan_id) && t.Deleted_at == null).ToList();
                    if (!taiKhoans.Any())
                        return Json(new { success = false, message = "Không tìm thấy tài khoản hợp lệ để xóa." });

                    int count = 0;
                    foreach (var tk in taiKhoans)
                    {
                        // 📝 Ghi nhận nhật ký xóa
                        var dataOld = new
                        {
                            tk.TaiKhoan_id,
                            tk.Username,
                            tk.Email,
                            tk.VaiTro_id,
                            tk.IsLocked
                        };
                        AuditLogHelper.GhiNhatKy("TaiKhoan", tk.TaiKhoan_id.ToString(), dataOld, "DELETE");

                        tk.Deleted_at = DateTime.Now;
                        count++;

                        if (long.TryParse(tk.Username, out long mssv))
                        {
                            var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.MSSV == mssv && sv.Deleted_at == null);
                            if (sinhVien != null)
                            {
                                var dataSvOld = new
                                {
                                    sinhVien.MSSV,
                                    sinhVien.HoTen,
                                    sinhVien.Email,
                                    sinhVien.Lop_id,
                                    sinhVien.TaiKhoan
                                };
                                AuditLogHelper.GhiNhatKy("SinhVien", sinhVien.MSSV.ToString(), dataSvOld, "DELETE");
                                sinhVien.Deleted_at = DateTime.Now;
                            }
                        }
                    }

                    db.SaveChanges();
                    return Json(new { success = true, message = $"Đã xóa thành công {count} tài khoản đã chọn." });
                }
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                return Json(new { success = false, message = "Lỗi khi xóa: " + detail });
            }
        }



        // Lấy danh sách tài khoản đã xóa
        [HttpGet]
        public ActionResult GetDeletedAccounts()
        {
            using (var db = DbContextFactory.Create())
            {
                var accounts = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at != null)
                    .OrderByDescending(t => t.Deleted_at)
                    .Select(t => new
                    {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        RoleName = t.VaiTro.TenVaiTro,
                        DeletedAt = t.Deleted_at
                    })
                    .ToList();

                return Json(accounts, JsonRequestBehavior.AllowGet);
            }
        }

        // Khôi phục

        [HttpPost]
        public ActionResult RestoreAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at != null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản đã xóa." });

                    taiKhoan.Deleted_at = null;

                    // Nếu Username là MSSV dạng số thì khôi phục bên bảng SinhVien luôn
                    if (long.TryParse(taiKhoan.Username, out long mssv))
                    {
                        var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.MSSV == mssv && sv.Deleted_at != null);
                        if (sinhVien != null)
                        {
                            sinhVien.Deleted_at = null;
                        }
                    }

                    db.SaveChanges();

                    return Json(new { success = true, message = $"Khôi phục tài khoản '{taiKhoan.Username}' thành công." });
                }
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                return Json(new { success = false, message = "Lỗi: " + detail });
            }
        }

        // Khôi phục nhiều tài khoản cùng lúc
        [HttpPost]
        public ActionResult RestoreMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một tài khoản để khôi phục." });

            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoans = db.TaiKhoans.Where(t => ids.Contains(t.TaiKhoan_id) && t.Deleted_at != null).ToList();
                    int count = 0;
                    foreach (var tk in taiKhoans)
                    {
                        tk.Deleted_at = null;
                        if (long.TryParse(tk.Username, out long mssv))
                        {
                            var sinhVien = db.SinhViens.FirstOrDefault(sv => sv.MSSV == mssv && sv.Deleted_at != null);
                            if (sinhVien != null) sinhVien.Deleted_at = null;
                        }
                        count++;
                    }
                    db.SaveChanges();
                    return Json(new { success = true, message = $"Đã khôi phục thành công {count} tài khoản." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi khôi phục: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }

        // Xóa hẳn vĩnh viễn nhiều tài khoản cùng lúc
        [HttpPost]
        public ActionResult DeletePermanentMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một tài khoản để xóa hẳn." });

            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    int deletedCount = 0;
                    foreach (var id in ids)
                    {
                        var taiKhoan = db.TaiKhoans.Include(t => t.VaiTro).FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at != null);
                        if (taiKhoan == null) continue;

                        // Ghi log
                        var dataOld = new
                        {
                            taiKhoan.TaiKhoan_id,
                            taiKhoan.Username,
                            taiKhoan.Email,
                            taiKhoan.VaiTro_id,
                            VaiTro = taiKhoan.VaiTro?.TenVaiTro,
                            taiKhoan.Deleted_at
                        };
                        AuditLogHelper.GhiNhatKy("TaiKhoan", taiKhoan.TaiKhoan_id.ToString(), dataOld, "DELETE_PERMANENT_MULTIPLE");

                        string username = taiKhoan.Username;
                        long mssv = 0;
                        bool isMssv = long.TryParse(username, out mssv);

                        // Xóa QuanLy
                        var quanLies = db.QuanLies.Where(q => q.TaiKhoan == id).ToList();
                        foreach (var ql in quanLies)
                        {
                            var phieuDuyets = db.PhieuDuyets.Where(pd => pd.Nguoiduyet == ql.Quanly_id).ToList();
                            foreach (var pd in phieuDuyets)
                            {
                                var pxns = db.PhieuXacNhanHoanThanhs.Where(p => p.phieuduyet == pd.PhieuDuyet_id).ToList();
                                foreach (var p in pxns) db.PhieuXacNhanHoanThanhs.Remove(p);
                                db.PhieuDuyets.Remove(pd);
                            }
                            db.QuanLies.Remove(ql);
                        }

                        // Xóa SinhVien và toàn bộ dữ liệu liên quan
                        if (isMssv)
                        {
                            AdminStudentController.CascadeDeleteStudent(db, mssv, id);
                        }
                        else
                        {
                            var sinhViens = db.SinhViens.Where(sv => sv.TaiKhoan == id).ToList();
                            foreach (var sv in sinhViens)
                            {
                                AdminStudentController.CascadeDeleteStudent(db, sv.MSSV, id);
                            }
                        }

                        // Xóa tài khoản nếu còn tồn tại
                        var tkToRemove = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id);
                        if (tkToRemove != null)
                        {
                            db.TaiKhoans.Remove(tkToRemove);
                        }
                        deletedCount++;
                    }

                    db.SaveChanges();
                    transaction.Commit();

                    return Json(new { success = true, message = $"✅ Đã xóa hẳn vĩnh viễn {deletedCount} tài khoản cùng toàn bộ dữ liệu liên quan." });
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi khi xóa hẳn hàng loạt: " + inner.Message });
            }
        }

        // Xóa hẳn đơn lẻ
        [HttpPost]
        public ActionResult DeletePermanentAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                using (var transaction = db.Database.BeginTransaction())
                {
                    var taiKhoan = db.TaiKhoans
                        .Include(t => t.VaiTro)
                        .FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at != null);

                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản đã xóa." });

                    // 📝 Ghi nhận nhật ký xóa hẳn
                    var dataOld = new
                    {
                        taiKhoan.TaiKhoan_id,
                        taiKhoan.Username,
                        taiKhoan.Email,
                        taiKhoan.VaiTro_id,
                        VaiTro = taiKhoan.VaiTro?.TenVaiTro,
                        taiKhoan.IsLocked,
                        taiKhoan.Deleted_at
                    };
                    AuditLogHelper.GhiNhatKy("TaiKhoan", taiKhoan.TaiKhoan_id.ToString(), dataOld, "DELETE_PERMANENT");

                    string username = taiKhoan.Username;
                    long mssv = 0;
                    bool isMssv = long.TryParse(username, out mssv);

                    try
                    {
                        // Step 0: Xóa QuanLy (có FK -> TaiKhoan)
                        var quanLies = db.QuanLies.Where(q => q.TaiKhoan == id).ToList();
                        foreach (var ql in quanLies)
                        {
                            var phieuDuyets = db.PhieuDuyets.Where(pd => pd.Nguoiduyet == ql.Quanly_id).ToList();
                            foreach (var pd in phieuDuyets)
                            {
                                var phieuXacNhans = db.PhieuXacNhanHoanThanhs.Where(pxn => pxn.phieuduyet == pd.PhieuDuyet_id).ToList();
                                foreach (var pxn in phieuXacNhans)
                                {
                                    db.PhieuXacNhanHoanThanhs.Remove(pxn);
                                }
                                db.PhieuDuyets.Remove(pd);
                            }
                            db.QuanLies.Remove(ql);
                        }

                        // Step 1: Xóa SinhVien và dữ liệu cascading
                        if (isMssv)
                        {
                            AdminStudentController.CascadeDeleteStudent(db, mssv, id);
                        }
                        else
                        {
                            var sinhViens = db.SinhViens.Where(sv => sv.TaiKhoan == id).ToList();
                            foreach (var sv in sinhViens)
                            {
                                AdminStudentController.CascadeDeleteStudent(db, sv.MSSV, id);
                            }
                        }

                        // Step 2: Xóa TaiKhoan nếu còn
                        var tkToRemove = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id);
                        if (tkToRemove != null)
                        {
                            db.TaiKhoans.Remove(tkToRemove);
                        }

                        db.SaveChanges();
                        transaction.Commit();

                        return Json(new
                        {
                            success = true,
                            message = $"✅ Đã xóa hẳn tài khoản '{username}' cùng toàn bộ dữ liệu liên quan.",
                            username = username
                        });
                    }
                    catch (Exception innerEx)
                    {
                        transaction.Rollback();
                        var fullMessage = innerEx.Message;
                        if (innerEx.InnerException != null)
                        {
                            fullMessage += " | InnerException: " + innerEx.InnerException.Message;
                        }

                        return Json(new
                        {
                            success = false,
                            message = fullMessage
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                var inner = ex;
                while (inner.InnerException != null) inner = inner.InnerException;
                return Json(new { success = false, message = "Lỗi khi xóa hẳn tài khoản: " + inner.Message });
            }
        }













        // xem chi tiết
        [HttpGet]
        public ActionResult GetDetail(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var acc = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);

                if (acc == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy tài khoản." }, JsonRequestBehavior.AllowGet);
                }

                return Json(new
                {
                    success = true,
                    TaiKhoan_id = acc.TaiKhoan_id,
                    Username = acc.Username,
                    Email = acc.Email,
                    RoleName = acc.VaiTro != null ? acc.VaiTro.TenVaiTro : "Chưa có vai trò",

                }, JsonRequestBehavior.AllowGet);
            }
        }
        // Đặt lại mật khẩu mặc định
        [HttpPost]
        public ActionResult ResetPasswordAjax(int id)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var taiKhoan = db.TaiKhoans.FirstOrDefault(t => t.TaiKhoan_id == id && t.Deleted_at == null);
                    if (taiKhoan == null)
                        return Json(new { success = false, message = "Không tìm thấy tài khoản hoặc đã bị xóa." });

                    // Mật khẩu cố định
                    string rawPassword = "123456";
                    string hashedPassword = PasswordHelper.HashPassword(rawPassword);

                    taiKhoan.Password = hashedPassword;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đặt lại mật khẩu thành công! Mật khẩu mới = 123456" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // lọc và tìm kiếm
        [HttpGet]
        public ActionResult FilterSearchAccounts(int page = 1, int pageSize = 20, string search = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaiKhoans
                    .Include(t => t.VaiTro)
                    .Where(t => t.Deleted_at == null);

                // Lọc theo vai trò / Tab phân loại
                if (!string.IsNullOrWhiteSpace(role) && role != "Tất Cả")
                {
                    if (role == "CanBo" || role == "Cán bộ & Quản lý")
                    {
                        // Admin (1) & Quản lý (2)
                        query = query.Where(t => t.VaiTro_id == 1 || t.VaiTro_id == 2 || (t.VaiTro != null && (t.VaiTro.TenVaiTro.Contains("Admin") || t.VaiTro.TenVaiTro.Contains("Quản lý"))));
                    }
                    else if (role == "LopTruong" || role == "Lớp trưởng" || role == "Ban cán sự lớp")
                    {
                        // Lớp trưởng / Lớp phó (4)
                        query = query.Where(t => t.VaiTro_id == 4 || (t.VaiTro != null && (t.VaiTro.TenVaiTro.Contains("Lớp") || t.VaiTro.TenVaiTro.Contains("trưởng"))));
                    }
                    else if (role == "SinhVien" || role == "Sinh viên")
                    {
                        // Sinh viên (3)
                        query = query.Where(t => t.VaiTro_id == 3 || (t.VaiTro != null && t.VaiTro.TenVaiTro.Contains("Sinh viên") && !t.VaiTro.TenVaiTro.Contains("Lớp")));
                    }
                    else
                    {
                        query = query.Where(t => t.VaiTro != null && (t.VaiTro.TenVaiTro == role || t.VaiTro.TenVaiTro.Contains(role)));
                    }
                }

                // Tìm kiếm theo tên tài khoản (Username) hoặc Email
                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(t => t.Username.Contains(search) || (t.Email != null && t.Email.Contains(search)));
                }

                int totalItems = query.Count();
                int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                if (page < 1) page = 1;
                if (page > totalPages && totalPages > 0) page = totalPages;

                var accounts = query
                    .OrderBy(t => t.TaiKhoan_id)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new
                    {
                        t.TaiKhoan_id,
                        t.Username,
                        t.Email,
                        RoleName = t.VaiTro != null ? t.VaiTro.TenVaiTro : "Chưa có vai trò"
                    })
                    .ToList();

                return Json(new
                {
                    data = accounts,
                    currentPage = page,
                    totalPages = totalPages,
                    totalItems = totalItems
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // ==========================================
        // 📥 XUẤT MẪU IMPORT EXCEL CHO TÀI KHOẢN
        // ==========================================
        [HttpGet]
        public ActionResult DownloadTemplate()
        {
            try
            {
                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("Mau_Import_TaiKhoan");

                    // Tiêu đề bảng
                    ws.Cells["A1:E1"].Merge = true;
                    ws.Cells["A1"].Value = "MẪU NHẬP DỮ LIỆU TÀI KHOẢN";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(0, 41, 200));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Row(1).Height = 30;

                    // Headers
                    string[] headers = { 
                        "STT", 
                        "Tên Đăng Nhập (Username) *", 
                        "Mật Khẩu *", 
                        "Email *", 
                        "Tên Vai Trò (Admin / Cán bộ quản lý / Sinh viên / Lớp trưởng) *" 
                    };

                    for (int col = 1; col <= headers.Length; col++)
                    {
                        var cell = ws.Cells[2, col];
                        cell.Value = headers[col - 1];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }
                    ws.Row(2).Height = 25;

                    // Dòng ví dụ mẫu 1
                    ws.Cells[3, 1].Value = 1;
                    ws.Cells[3, 2].Value = "admin_cntt";
                    ws.Cells[3, 3].Value = "123456";
                    ws.Cells[3, 4].Value = "admin_cntt@dthu.edu.vn";
                    ws.Cells[3, 5].Value = "Admin";

                    // Dòng ví dụ mẫu 2
                    ws.Cells[4, 1].Value = 2;
                    ws.Cells[4, 2].Value = "0024000099";
                    ws.Cells[4, 3].Value = "123456";
                    ws.Cells[4, 4].Value = "sv0024000099@dthu.edu.vn";
                    ws.Cells[4, 5].Value = "Sinh viên";

                    // Dòng ví dụ mẫu 3
                    ws.Cells[5, 1].Value = 3;
                    ws.Cells[5, 2].Value = "0024000088";
                    ws.Cells[5, 3].Value = "123456";
                    ws.Cells[5, 4].Value = "sv0024000088@dthu.edu.vn";
                    ws.Cells[5, 5].Value = "Lớp trưởng";

                    for (int r = 3; r <= 5; r++)
                    {
                        for (int col = 1; col <= headers.Length; col++)
                        {
                            ws.Cells[r, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[r, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[r, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 5].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }

                    // Ghi chú hướng dẫn ở dưới
                    int noteRow = 7;
                    ws.Cells[noteRow, 1].Value = "📌 GHI CHÚ HƯỚNG DẪN:";
                    ws.Cells[noteRow, 1].Style.Font.Bold = true;
                    ws.Cells[noteRow, 1].Style.Font.Color.SetColor(Color.Red);

                    ws.Cells[noteRow + 1, 1].Value = "1. Các cột có dấu (*) là bắt buộc phải nhập dữ liệu.";
                    ws.Cells[noteRow + 2, 1].Value = "2. 'Tên Đăng Nhập' và 'Email' không được trùng lặp với tài khoản đã tồn tại trong hệ thống.";
                    ws.Cells[noteRow + 3, 1].Value = "3. 'Mật Khẩu' sẽ được hệ thống tự động mã hóa bảo mật BCrypt an toàn.";
                    ws.Cells[noteRow + 4, 1].Value = "4. 'Tên Vai Trò' phải thuộc một trong các loại: Admin, Cán bộ quản lý, Sinh viên, Lớp trưởng.";

                    // Đặt độ rộng cột cố định chuẩn đẹp
                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 22;
                    ws.Column(3).Width = 16;
                    ws.Column(4).Width = 30;
                    ws.Column(5).Width = 20;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = "Mau_Import_TaiKhoan.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi khi tải mẫu Excel: " + ex.Message);
            }
        }

        // ==========================================
        // 📤 NHẬP DỮ LIỆU EXCEL CHO TÀI KHOẢN
        // ==========================================
        [HttpPost]
        public ActionResult ImportExcel(System.Web.HttpPostedFileBase file)
        {
            OfficeOpenXml.ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

            if (file == null || file.ContentLength == 0)
                return Json(new { success = false, message = "Vui lòng chọn file Excel để nhập dữ liệu." });

            string ext = System.IO.Path.GetExtension(file.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls")
                return Json(new { success = false, message = "Định dạng file không hợp lệ! Vui lòng tải lên file Excel (.xlsx)." });

            var errors = new List<string>();
            int successCount = 0;
            int totalRows = 0;

            try
            {
                using (var package = new ExcelPackage(file.InputStream))
                {
                    var ws = package.Workbook.Worksheets.FirstOrDefault();
                    if (ws == null)
                        return Json(new { success = false, message = "File Excel không chứa bất kỳ sheet dữ liệu nào." });

                    int rowCount = ws.Dimension?.Rows ?? 0;
                    if (rowCount < 2)
                    {
                        return Json(new { success = false, message = "File Excel không có dữ liệu nhập." });
                    }

                    // Tự động tìm dòng bắt đầu dữ liệu
                    int startRow = 3;
                    string cellA1 = ws.Cells[1, 1].Text?.Trim().ToLower() ?? "";
                    string cellB1 = ws.Cells[1, 2].Text?.Trim().ToLower() ?? "";
                    if (cellA1.Contains("stt") || cellB1.Contains("tên") || cellB1.Contains("username"))
                    {
                        startRow = 2; // Header ở dòng 1
                    }

                    using (var db = DbContextFactory.Create())
                    {
                        var roles = db.VaiTroes.ToList();
                        var existingUsernames = new HashSet<string>(
                            db.TaiKhoans.Where(t => t.Deleted_at == null).Select(t => t.Username.ToLower()),
                            StringComparer.OrdinalIgnoreCase
                        );
                        var existingEmails = new HashSet<string>(
                            db.TaiKhoans.Where(t => t.Deleted_at == null && t.Email != null).Select(t => t.Email.ToLower()),
                            StringComparer.OrdinalIgnoreCase
                        );

                        var fileUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        var fileEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                        var newAccounts = new List<TaiKhoan>();

                        for (int row = startRow; row <= rowCount; row++)
                        {
                            var username = ws.Cells[row, 2].Text?.Trim();
                            var password = ws.Cells[row, 3].Text?.Trim();
                            var email = ws.Cells[row, 4].Text?.Trim();
                            var roleName = ws.Cells[row, 5].Text?.Trim();

                            if (string.IsNullOrWhiteSpace(username) && string.IsNullOrWhiteSpace(email))
                                continue;

                            totalRows++;

                            if (string.IsNullOrWhiteSpace(username)) { errors.Add($"Dòng {row}: Tên đăng nhập không được để trống."); continue; }
                            if (string.IsNullOrWhiteSpace(password)) { errors.Add($"Dòng {row}: Mật khẩu không được để trống."); continue; }
                            if (string.IsNullOrWhiteSpace(email)) { errors.Add($"Dòng {row}: Email không được để trống."); continue; }
                            
                            // Nếu thiếu tên vai trò -> Mặc định là Sinh viên
                            if (string.IsNullOrWhiteSpace(roleName))
                            {
                                roleName = "Sinh viên";
                            }

                            if (fileUsernames.Contains(username)) { errors.Add($"Dòng {row}: Tên đăng nhập '{username}' bị trùng trong file."); continue; }
                            if (fileEmails.Contains(email)) { errors.Add($"Dòng {row}: Email '{email}' bị trùng trong file."); continue; }
                            if (existingUsernames.Contains(username)) { errors.Add($"Dòng {row}: Tên đăng nhập '{username}' đã tồn tại."); continue; }
                            if (existingEmails.Contains(email)) { errors.Add($"Dòng {row}: Email '{email}' đã tồn tại."); continue; }

                            var role = roles.FirstOrDefault(r => 
                                r.TenVaiTro.Equals(roleName, StringComparison.OrdinalIgnoreCase) ||
                                (roleName.ToLower().Contains("admin") && r.TenVaiTro.ToLower().Contains("admin")) ||
                                (roleName.ToLower().Contains("quản lý") && r.TenVaiTro.ToLower().Contains("quản lý")) ||
                                (roleName.ToLower().Contains("cán bộ") && r.TenVaiTro.ToLower().Contains("quản lý")) ||
                                (roleName.ToLower().Contains("sinh viên") && r.TenVaiTro.ToLower().Contains("sinh viên")) ||
                                (roleName.ToLower().Contains("lớp trưởng") && r.TenVaiTro.ToLower().Contains("lớp trưởng")) ||
                                (roleName.ToLower().Contains("lớp phó") && (r.TenVaiTro.ToLower().Contains("lớp phó") || r.TenVaiTro.ToLower().Contains("lớp trưởng")))
                            ) ?? roles.FirstOrDefault(r => r.TenVaiTro.ToLower().Contains("sinh viên")) ?? roles.FirstOrDefault();

                            if (role == null) { errors.Add($"Dòng {row}: Không tìm thấy vai trò phù hợp trong hệ thống."); continue; }

                            newAccounts.Add(new TaiKhoan {
                                Username = username,
                                Password = BCrypt.Net.BCrypt.HashPassword(password),
                                Email = email,
                                VaiTro_id = role.VaiTro_id,
                                IsLocked = false
                            });

                            fileUsernames.Add(username);
                            fileEmails.Add(email);
                            existingUsernames.Add(username);
                            existingEmails.Add(email);
                        }

                        if (newAccounts.Count > 0)
                        {
                            db.TaiKhoans.AddRange(newAccounts);
                            db.SaveChanges();
                            successCount = newAccounts.Count;
                        }
                    }
                }

                if (successCount == 0 && errors.Count > 0)
                {
                    return Json(new { success = false, message = "Không có tài khoản nào được nhập.", errors = errors });
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã nhập thành công {successCount}/{totalRows} tài khoản.",
                    successCount = successCount,
                    totalRows = totalRows,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi khi đọc file Excel: " + ex.Message });
            }
        }

        // ==========================================
        // 📊 XUẤT DỮ LIỆU EXCEL CHO TÀI KHOẢN
        // ==========================================
        [HttpGet]
        public ActionResult exportAllAccounts(string keyword = "", string role = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = db.TaiKhoans
                              .Include(t => t.VaiTro)
                              .Where(t => t.Deleted_at == null); // bỏ tài khoản đã xóa mềm

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    keyword = keyword.Trim();
                    query = query.Where(t => (t.Username ?? "").Contains(keyword) ||
                                             (t.Email ?? "").Contains(keyword));
                }

                if (!string.IsNullOrWhiteSpace(role))
                {
                    query = query.Where(t => t.VaiTro != null && t.VaiTro.TenVaiTro == role);
                }

                var accounts = query.OrderBy(t => t.TaiKhoan_id).ToList();

                using (var package = new OfficeOpenXml.ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("DanhSachTaiKhoan");

                    // Tiêu đề
                    ws.Cells["A1:E1"].Merge = true;
                    ws.Cells["A1"].Value = "DANH SÁCH TÀI KHOẢN HỆ THỐNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 15;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(0, 41, 200));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // ======= Header =======
                    string[] headers = { "STT", "Tên tài khoản", "Email", "Vai trò", "Trạng thái" };
                    for (int col = 1; col <= headers.Length; col++)
                    {
                        var cell = ws.Cells[2, col];
                        cell.Value = headers[col - 1];
                        cell.Style.Font.Bold = true;
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        cell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                    }
                    ws.Row(2).Height = 25;

                    // ======= Dữ liệu =======
                    int row = 3;
                    int stt = 1;
                    foreach (var acc in accounts)
                    {
                        ws.Cells[row, 1].Value = stt;
                        ws.Cells[row, 2].Value = acc.Username;
                        ws.Cells[row, 3].Value = acc.Email ?? "";
                        ws.Cells[row, 4].Value = acc.VaiTro?.TenVaiTro ?? "Chưa có vai trò";
                        ws.Cells[row, 5].Value = acc.IsLocked ? "Đã khóa" : "Hoạt động";

                        for (int col = 1; col <= headers.Length; col++)
                        {
                            ws.Cells[row, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            if (col == 1 || col == 4 || col == 5)
                                ws.Cells[row, col].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        }

                        ws.Cells[row, 1].Style.Font.Bold = true; // STT in đậm
                        ws.Cells[row, 2].Style.Font.Bold = true; // Username in đậm

                        row++;
                        stt++;
                    }

                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 22;
                    ws.Column(3).Width = 30;
                    ws.Column(4).Width = 20;
                    ws.Column(5).Width = 16;

                    // Xuất file
                    var fileBytes = package.GetAsByteArray();
                    string fileName = $"DanhSachTaiKhoan_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

                    return File(fileBytes,
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                fileName);
                }
            }
        }




    }
}