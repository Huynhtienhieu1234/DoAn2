using System;
using System.Data.Entity;
using System.Linq;
using System.Web;
using System.Web.Security;
using QuanLyDangKyNgayLD.Models;

namespace QuanLyDangKyNgayLD.Factories   // đổi namespace cho rõ nghĩa
{
    public static class DbContextFactory
    {
        public static DB_QLNLD4ROLEEntities1 Create()
        {
            return new DB_QLNLD4ROLEEntities1();
        }
    }

    /// <summary>
    /// Khôi phục thông tin đăng nhập từ Session hoặc cookie FormsAuthentication khi AppDomain khởi động lại.
    /// </summary>
    public static class SessionAuthHelper
    {
        public static string ExtractAuthenticatedUsername(HttpContextBase httpContext)
        {
            if (httpContext == null) return null;

            var sessionUsername = httpContext.Session?["Username"]?.ToString()?.Trim();
            if (!string.IsNullOrEmpty(sessionUsername))
                return sessionUsername;

            var identity = httpContext.User?.Identity;
            if (identity != null && identity.IsAuthenticated && !string.IsNullOrWhiteSpace(identity.Name))
                return identity.Name.Trim();

            var authCookie = httpContext.Request?.Cookies[FormsAuthentication.FormsCookieName];
            if (authCookie != null && !string.IsNullOrEmpty(authCookie.Value))
            {
                try
                {
                    var ticket = FormsAuthentication.Decrypt(authCookie.Value);
                    if (ticket != null && !ticket.Expired && !string.IsNullOrWhiteSpace(ticket.Name))
                        return ticket.Name.Trim();
                }
                catch
                {
                    // Bỏ qua cookie không hợp lệ hoặc hết hạn
                }
            }

            return null;
        }

        private static TaiKhoan FindAccountByUsername(DB_QLNLD4ROLEEntities1 db, string username)
        {
            if (string.IsNullOrWhiteSpace(username)) return null;

            string trimmed = username.Trim();
            string trimmedZero = trimmed.TrimStart('0');
            string withZero = "0" + trimmed;

            return db.TaiKhoans
                .Include(t => t.VaiTro)
                .FirstOrDefault(t =>
                    t.Deleted_at == null &&
                    (t.Username == trimmed ||
                     (trimmedZero.Length > 0 && t.Username == trimmedZero) ||
                     t.Username == withZero));
        }

        public static TaiKhoan ResolveAuthenticatedAccount(HttpContextBase httpContext, DB_QLNLD4ROLEEntities1 db)
        {
            if (httpContext == null || db == null) return null;

            TaiKhoan tk = null;
            var session = httpContext.Session;

            if (session?["User"] is TaiKhoan sessionUser)
            {
                tk = db.TaiKhoans.Include(t => t.VaiTro)
                    .FirstOrDefault(t => t.TaiKhoan_id == sessionUser.TaiKhoan_id && t.Deleted_at == null);
            }

            if (tk == null && session != null)
            {
                var rawUserId = session["UserId"] ?? session["UserID"];
                if (rawUserId != null && int.TryParse(rawUserId.ToString(), out int uid))
                {
                    tk = db.TaiKhoans.Include(t => t.VaiTro)
                        .FirstOrDefault(t => t.TaiKhoan_id == uid && t.Deleted_at == null);
                }
            }

            if (tk == null)
            {
                string username = ExtractAuthenticatedUsername(httpContext);
                if (!string.IsNullOrEmpty(username))
                {
                    tk = FindAccountByUsername(db, username);
                }
            }

            if (tk != null && session != null)
            {
                session["UserID"] = tk.TaiKhoan_id;
                session["UserId"] = tk.TaiKhoan_id;
                session["Username"] = tk.Username;
                session["VaiTroId"] = tk.VaiTro_id;
                session["Role"] = tk.VaiTro != null ? tk.VaiTro.TenVaiTro : session["Role"];
                session["User"] = tk;
            }

            return tk;
        }

        public static bool ResolveCurrentStudent(
            HttpContextBase httpContext,
            DB_QLNLD4ROLEEntities1 db,
            out TaiKhoan taiKhoan,
            out SinhVien sinhVien,
            out string errorMessage)
        {
            taiKhoan = ResolveAuthenticatedAccount(httpContext, db);
            sinhVien = null;
            errorMessage = null;

            var session = httpContext?.Session;

            if (taiKhoan != null)
            {
                int taiKhoanId = taiKhoan.TaiKhoan_id;
                string accountUsername = (taiKhoan.Username ?? "").Trim();

                sinhVien = db.SinhViens
                    .Include(s => s.TaiKhoan1.VaiTro)
                    .Include(s => s.Lop.Khoa)
                    .Include(s => s.Anh)
                    .FirstOrDefault(s => s.TaiKhoan == taiKhoanId && s.Deleted_at == null);

                if (sinhVien == null && long.TryParse(accountUsername, out long mssvFromAccount))
                {
                    sinhVien = db.SinhViens
                        .Include(s => s.TaiKhoan1.VaiTro)
                        .Include(s => s.Lop.Khoa)
                        .Include(s => s.Anh)
                        .FirstOrDefault(s => s.MSSV == mssvFromAccount && s.Deleted_at == null);
                }
            }

            if (sinhVien == null && session?["MSSV"] != null && long.TryParse(session["MSSV"].ToString(), out long mssvSession))
            {
                sinhVien = db.SinhViens
                    .Include(s => s.TaiKhoan1.VaiTro)
                    .Include(s => s.Lop.Khoa)
                    .Include(s => s.Anh)
                    .FirstOrDefault(s => s.MSSV == mssvSession && s.Deleted_at == null);

                if (taiKhoan == null && sinhVien?.TaiKhoan1 != null)
                {
                    taiKhoan = sinhVien.TaiKhoan1;
                    session["UserID"] = taiKhoan.TaiKhoan_id;
                    session["UserId"] = taiKhoan.TaiKhoan_id;
                    session["Username"] = taiKhoan.Username;
                    session["VaiTroId"] = taiKhoan.VaiTro_id;
                    session["Role"] = taiKhoan.VaiTro?.TenVaiTro;
                    session["User"] = taiKhoan;
                }
            }

            if (sinhVien != null)
            {
                if (session != null)
                {
                    session["MSSV"] = sinhVien.MSSV;
                    session["HoTen"] = sinhVien.HoTen;
                }
                return true;
            }

            if (taiKhoan != null)
            {
                errorMessage = $"Tài khoản hiện tại ({taiKhoan.Username}) không phải tài khoản sinh viên. Nếu bạn đang đăng nhập Admin trên cùng trình duyệt, hãy dùng trình duyệt khác hoặc cửa sổ ẩn danh cho Sinh viên!";
                return false;
            }

            errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
            return false;
        }
    }
}
