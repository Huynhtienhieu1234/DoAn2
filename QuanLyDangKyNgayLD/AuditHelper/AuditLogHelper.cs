using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Script.Serialization;

namespace QuanLyDangKyNgayLD.AuditHelper
{
    public class NhatKyThaoTacModel
    {
        public long Id { get; set; }
        public string NguoiThucHien { get; set; }
        public string HanhDong { get; set; }
        public string TenBang { get; set; }
        public string KhoaChinhBiXoa { get; set; }
        public string DuLieuCu { get; set; }
        public string DiaChiIP { get; set; }
        public DateTime ThoiGianThucHien { get; set; }
    }

    public class ThongKeAuditLogModel
    {
        public int TongSoXoa { get; set; }
        public int SoDotLaoDong { get; set; }
        public int SoSinhVien { get; set; }
        public int SoTaiKhoan { get; set; }
        public int SoXacNhanHoanThanh { get; set; }
        public int SoXoaHomNay { get; set; }
    }

    public static class AuditLogHelper
    {
        private static string ConnectionString
        {
            get
            {
                var connStr = ConfigurationManager.ConnectionStrings["QuanLyAuditLogConnection"]?.ConnectionString;
                if (string.IsNullOrWhiteSpace(connStr))
                {
                    // Fallback mặc định nếu chưa cấu hình
                    connStr = "data source=.\\SQLEXPRESS;initial catalog=QuanLyAuditLog;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;";
                }
                return connStr;
            }
        }

        public static string LayDiaChiIP()
        {
            try
            {
                var context = HttpContext.Current;
                if (context == null) return "127.0.0.1";

                string ip = context.Request.ServerVariables["HTTP_X_FORWARDED_FOR"];
                if (string.IsNullOrEmpty(ip) || ip.ToLower() == "unknown")
                {
                    ip = context.Request.ServerVariables["REMOTE_ADDR"];
                }
                if (string.IsNullOrEmpty(ip))
                {
                    ip = context.Request.UserHostAddress;
                }

                if (!string.IsNullOrEmpty(ip) && ip.Contains(","))
                {
                    ip = ip.Split(',')[0].Trim();
                }

                if (ip == "::1") ip = "127.0.0.1";
                return string.IsNullOrEmpty(ip) ? "127.0.0.1" : ip;
            }
            catch
            {
                return "127.0.0.1";
            }
        }

        public static string LayNguoiThucHienHienTai()
        {
            try
            {
                var session = HttpContext.Current?.Session;
                if (session == null) return "Admin (System)";

                var username = session["Username"]?.ToString();
                if (!string.IsNullOrWhiteSpace(username)) return username;

                var maNguoiDung = session["UserId"]?.ToString();
                if (!string.IsNullOrWhiteSpace(maNguoiDung)) return "ID:" + maNguoiDung;

                var tenAdmin = session["TenAdmin"]?.ToString();
                if (!string.IsNullOrWhiteSpace(tenAdmin)) return tenAdmin;

                return "Admin";
            }
            catch
            {
                return "Admin";
            }
        }

        /// <summary>
        /// Ghi nhật ký thao tác xóa vào bảng NhatKyThaoTac của DB QuanLyAuditLog
        /// </summary>
        public static bool GhiNhatKy(string tenBang, string khoaChinhBiXoa, object duLieuCu, string hanhDong = "DELETE", string nguoiThucHien = null, string diaChiIP = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(nguoiThucHien))
                {
                    nguoiThucHien = LayNguoiThucHienHienTai();
                }

                if (string.IsNullOrWhiteSpace(diaChiIP))
                {
                    diaChiIP = LayDiaChiIP();
                }

                string duLieuCuJson = "";
                if (duLieuCu != null)
                {
                    if (duLieuCu is string strData)
                    {
                        duLieuCuJson = strData;
                    }
                    else
                    {
                        var serializer = new JavaScriptSerializer
                        {
                            MaxJsonLength = int.MaxValue
                        };
                        duLieuCuJson = serializer.Serialize(duLieuCu);
                    }
                }

                using (var conn = new SqlConnection(ConnectionString))
                {
                    conn.Open();
                    string query = @"INSERT INTO NhatKyThaoTac 
                                    (NguoiThucHien, HanhDong, TenBang, KhoaChinhBiXoa, DuLieuCu, DiaChiIP, ThoiGianThucHien)
                                    VALUES 
                                    (@NguoiThucHien, @HanhDong, @TenBang, @KhoaChinhBiXoa, @DuLieuCu, @DiaChiIP, SYSDATETIME())";

                    using (var cmd = new SqlCommand(query, conn))
                    {
                        cmd.Parameters.Add("@NguoiThucHien", SqlDbType.NVarChar, 100).Value = (object)nguoiThucHien ?? DBNull.Value;
                        cmd.Parameters.Add("@HanhDong", SqlDbType.NVarChar, 20).Value = (object)hanhDong ?? "DELETE";
                        cmd.Parameters.Add("@TenBang", SqlDbType.NVarChar, 100).Value = (object)tenBang ?? DBNull.Value;
                        cmd.Parameters.Add("@KhoaChinhBiXoa", SqlDbType.NVarChar, 100).Value = (object)khoaChinhBiXoa ?? DBNull.Value;
                        cmd.Parameters.Add("@DuLieuCu", SqlDbType.NVarChar, -1).Value = (object)duLieuCuJson ?? DBNull.Value;
                        cmd.Parameters.Add("@DiaChiIP", SqlDbType.VarChar, 45).Value = (object)diaChiIP ?? DBNull.Value;

                        cmd.ExecuteNonQuery();
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
                // Có thể log ra file hoặc console để không làm gián đoạn nghiệp vụ chính
                System.Diagnostics.Debug.WriteLine("Lỗi ghi Audit Log: " + ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Lấy danh sách nhật ký thao tác có lọc và phân trang
        /// </summary>
        public static List<NhatKyThaoTacModel> LayDanhSachNhatKy(string tenBang, string keyword, DateTime? tuNgay, DateTime? denNgay, int page, int pageSize, out int totalRows)
        {
            var list = new List<NhatKyThaoTacModel>();
            totalRows = 0;

            try
            {
                using (var conn = new SqlConnection(ConnectionString))
                {
                    conn.Open();

                    string whereClause = " WHERE 1=1 ";
                    var parameters = new List<SqlParameter>();

                    if (!string.IsNullOrWhiteSpace(tenBang) && tenBang != "ALL")
                    {
                        whereClause += " AND TenBang = @TenBang ";
                        parameters.Add(new SqlParameter("@TenBang", tenBang));
                    }

                    if (!string.IsNullOrWhiteSpace(keyword))
                    {
                        whereClause += " AND (NguoiThucHien LIKE @Keyword OR KhoaChinhBiXoa LIKE @Keyword OR DiaChiIP LIKE @Keyword OR DuLieuCu LIKE @Keyword) ";
                        parameters.Add(new SqlParameter("@Keyword", "%" + keyword.Trim() + "%"));
                    }

                    if (tuNgay.HasValue)
                    {
                        whereClause += " AND ThoiGianThucHien >= @TuNgay ";
                        parameters.Add(new SqlParameter("@TuNgay", tuNgay.Value.Date));
                    }

                    if (denNgay.HasValue)
                    {
                        whereClause += " AND ThoiGianThucHien <= @DenNgay ";
                        parameters.Add(new SqlParameter("@DenNgay", denNgay.Value.Date.AddDays(1).AddTicks(-1)));
                    }

                    // Đếm tổng số bản ghi
                    string countQuery = "SELECT COUNT(*) FROM NhatKyThaoTac " + whereClause;
                    using (var countCmd = new SqlCommand(countQuery, conn))
                    {
                        foreach (var p in parameters)
                        {
                            countCmd.Parameters.Add(new SqlParameter(p.ParameterName, p.Value));
                        }
                        totalRows = Convert.ToInt32(countCmd.ExecuteScalar());
                    }

                    // Lấy danh sách bản ghi phân trang
                    int skip = (page - 1) * pageSize;
                    string selectQuery = $@"SELECT Id, NguoiThucHien, HanhDong, TenBang, KhoaChinhBiXoa, DuLieuCu, DiaChiIP, ThoiGianThucHien
                                            FROM NhatKyThaoTac
                                            {whereClause}
                                            ORDER BY ThoiGianThucHien DESC
                                            OFFSET @Skip ROWS FETCH NEXT @PageSize ROWS ONLY";

                    using (var cmd = new SqlCommand(selectQuery, conn))
                    {
                        foreach (var p in parameters)
                        {
                            cmd.Parameters.Add(new SqlParameter(p.ParameterName, p.Value));
                        }
                        cmd.Parameters.Add(new SqlParameter("@Skip", skip));
                        cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new NhatKyThaoTacModel
                                {
                                    Id = reader.GetInt64(0),
                                    NguoiThucHien = reader.IsDBNull(1) ? "" : reader.GetString(1),
                                    HanhDong = reader.IsDBNull(2) ? "DELETE" : reader.GetString(2),
                                    TenBang = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                    KhoaChinhBiXoa = reader.IsDBNull(4) ? "" : reader.GetString(4),
                                    DuLieuCu = reader.IsDBNull(5) ? "" : reader.GetString(5),
                                    DiaChiIP = reader.IsDBNull(6) ? "" : reader.GetString(6),
                                    ThoiGianThucHien = reader.GetDateTime(7)
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Lỗi đọc Audit Log: " + ex.Message);
            }

            return list;
        }

        /// <summary>
        /// Lấy chi tiết một bản ghi nhật ký thao tác
        /// </summary>
        public static NhatKyThaoTacModel LayChiTietNhatKy(long id)
        {
            try
            {
                using (var conn = new SqlConnection(ConnectionString))
                {
                    conn.Open();
                    string query = @"SELECT Id, NguoiThucHien, HanhDong, TenBang, KhoaChinhBiXoa, DuLieuCu, DiaChiIP, ThoiGianThucHien
                                     FROM NhatKyThaoTac
                                     WHERE Id = @Id";

                    using (var cmd = new SqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", id);
                        using (var reader = cmd.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                return new NhatKyThaoTacModel
                                {
                                    Id = reader.GetInt64(0),
                                    NguoiThucHien = reader.IsDBNull(1) ? "" : reader.GetString(1),
                                    HanhDong = reader.IsDBNull(2) ? "DELETE" : reader.GetString(2),
                                    TenBang = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                    KhoaChinhBiXoa = reader.IsDBNull(4) ? "" : reader.GetString(4),
                                    DuLieuCu = reader.IsDBNull(5) ? "" : reader.GetString(5),
                                    DiaChiIP = reader.IsDBNull(6) ? "" : reader.GetString(6),
                                    ThoiGianThucHien = reader.GetDateTime(7)
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Lỗi lấy chi tiết Audit Log: " + ex.Message);
            }
            return null;
        }

        /// <summary>
        /// Lấy số liệu thống kê cho Dashboard Audit Log
        /// </summary>
        public static ThongKeAuditLogModel LayThongKe()
        {
            var thongKe = new ThongKeAuditLogModel();
            try
            {
                using (var conn = new SqlConnection(ConnectionString))
                {
                    conn.Open();
                    string query = @"SELECT 
                                        COUNT(*) AS TongSo,
                                        SUM(CASE WHEN TenBang = 'TaoDotNgayLaoDong' THEN 1 ELSE 0 END) AS SoDotLaoDong,
                                        SUM(CASE WHEN TenBang = 'SinhVien' THEN 1 ELSE 0 END) AS SoSinhVien,
                                        SUM(CASE WHEN TenBang = 'TaiKhoan' THEN 1 ELSE 0 END) AS SoTaiKhoan,
                                        SUM(CASE WHEN TenBang = 'PhieuXacNhanHoanThanh' THEN 1 ELSE 0 END) AS SoXacNhanHoanThanh,
                                        SUM(CASE WHEN CAST(ThoiGianThucHien AS DATE) = CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END) AS SoXoaHomNay
                                     FROM NhatKyThaoTac";

                    using (var cmd = new SqlCommand(query, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            thongKe.TongSoXoa = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                            thongKe.SoDotLaoDong = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                            thongKe.SoSinhVien = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                            thongKe.SoTaiKhoan = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                            thongKe.SoXacNhanHoanThanh = reader.IsDBNull(4) ? 0 : reader.GetInt32(4);
                            thongKe.SoXoaHomNay = reader.IsDBNull(5) ? 0 : reader.GetInt32(5);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Lỗi lấy thống kê Audit Log: " + ex.Message);
            }
            return thongKe;
        }
    }
}
