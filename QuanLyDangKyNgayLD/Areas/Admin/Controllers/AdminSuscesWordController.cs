using OfficeOpenXml;
using OfficeOpenXml.Style;
using QuanLyDangKyNgayLD.AuditHelper;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminSuscesWordController : Controller
    {
        // GET: Admin/AdminSuscesWord
        public ActionResult Index()
        {
            return View();
        }

        // Lấy danh sách phiếu xác nhận hoàn thành (liên kết MSSV với SinhVien)
        [HttpGet]
        public ActionResult GetList(int page = 1, int pageSize = 10, string khoa = "", string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = from phieu in db.PhieuXacNhanHoanThanhs
                            join sv in db.SinhViens on phieu.MSSV equals sv.MSSV
                            join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                            join k in db.Khoas on lop.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            from snld in snldGroup.DefaultIfEmpty()
                            where (phieu.TrangThai == "Chờ Xác Nhận" || phieu.TrangThai == null)
                                  && (snld != null && snld.TongSoNgay == 18)
                            select new
                            {
                                id = phieu.id,
                                MSSV = (sv.TaiKhoan1 != null && sv.TaiKhoan1.Username != null) ? sv.TaiKhoan1.Username : sv.MSSV.ToString(),
                                HoTen = sv.HoTen,
                                Lop = lop.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snld != null ? snld.TongSoNgay : 0
                            };

                // ✅ Lọc theo khoa nếu có truyền vào
                if (!string.IsNullOrEmpty(khoa))
                {
                    query = query.Where(x => x.Khoa.Equals(khoa, StringComparison.OrdinalIgnoreCase));
                }

                // ✅ Lọc theo từ khóa nếu có truyền vào
                if (!string.IsNullOrEmpty(keyword))
                {
                    keyword = keyword.Trim();
                    string trimmedZero = keyword.TrimStart('0');
                    query = query.Where(x =>
                        x.MSSV == keyword ||
                        (trimmedZero.Length > 0 && x.MSSV.Contains(trimmedZero)) ||
                        x.HoTen.Contains(keyword) ||
                        x.Lop.Contains(keyword) ||
                        x.Khoa.Contains(keyword));
                }

                query = query.OrderBy(x => x.id);

                int totalItems = query.Count();
                if (pageSize <= 0) pageSize = 10;
                int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / pageSize) : 1;
                if (totalPages < 1) totalPages = 1;
                if (page < 1) page = 1;
                if (page > totalPages) page = totalPages;

                var data = query.Skip((page - 1) * pageSize)
                                .Take(pageSize)
                                .ToList();

                return Json(new
                {
                    data,
                    currentPage = page,
                    totalPages,
                    totalItems
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // Xác nhận Duyệt
        [HttpPost]
        public ActionResult DuyetAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var phieu = db.PhieuXacNhanHoanThanhs.FirstOrDefault(p => p.id == id);
                if (phieu == null)
                    return Json(new { success = false, message = "Không tìm thấy phiếu xác nhận." });

                phieu.TrangThai = "Hoàn Thành";
                phieu.NgayXacNhan = DateTime.Now;
                phieu.NguoiXacNhan = 1;

                var sv = db.SinhViens.FirstOrDefault(s => s.MSSV == phieu.MSSV);
                if (sv == null)
                    return Json(new { success = false, message = "Không tìm thấy sinh viên." });

                // ✅ Ép MSSV (long) sang string để so sánh với Username (string)
                var tk = db.TaiKhoans.FirstOrDefault(t => t.Username == sv.MSSV.ToString());
                if (tk != null)
                {
                    tk.IsLocked = true;
                }

                db.SaveChanges();

                if (!string.IsNullOrEmpty(sv.Email))
                {
                    try
                    {
                        EmailHelperCompletion.SendCompletionEmail(sv.Email, sv.HoTen);
                    }
                    catch (Exception ex)
                    {
                        return Json(new
                        {
                            success = true,
                            message = $"Đã duyệt và khóa tài khoản MSSV {sv.MSSV}, nhưng gửi email thất bại: {ex.Message}"
                        });
                    }
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã duyệt, khóa tài khoản MSSV {sv.MSSV} và gửi email thành công!"
                });
            }
        }

        // Xóa một phiếu xác nhận
        [HttpPost]
        public ActionResult DeleteAjax(int id)
        {
            using (var db = DbContextFactory.Create())
            {
                var phieu = db.PhieuXacNhanHoanThanhs.FirstOrDefault(p => p.id == id);
                if (phieu == null)
                    return Json(new { success = false, message = "Không tìm thấy phiếu xác nhận." });

                // 📝 Ghi nhận nhật ký xóa vào QuanLyAuditLog
                var dataOld = new
                {
                    phieu.id,
                    phieu.MSSV,
                    ThoiGian = phieu.ThoiGian.HasValue ? phieu.ThoiGian.Value.ToString("yyyy-MM-dd HH:mm:ss") : null,
                    phieu.TrangThai,
                    NgayXacNhan = phieu.NgayXacNhan.HasValue ? phieu.NgayXacNhan.Value.ToString("yyyy-MM-dd HH:mm:ss") : null,
                    phieu.NguoiXacNhan,
                    phieu.phieuduyet
                };
                AuditLogHelper.GhiNhatKy("PhieuXacNhanHoanThanh", phieu.id.ToString(), dataOld, "DELETE");

                db.PhieuXacNhanHoanThanhs.Remove(phieu);
                db.SaveChanges();
                return Json(new { success = true, message = "Đã xóa phiếu xác nhận hoàn thành." });
            }
        }

        // Xóa nhiều phiếu xác nhận đã chọn
        [HttpPost]
        public ActionResult DeleteMultipleAjax(List<int> ids)
        {
            if (ids == null || !ids.Any())
                return Json(new { success = false, message = "Vui lòng chọn ít nhất một phiếu để xóa." });

            using (var db = DbContextFactory.Create())
            {
                var phieus = db.PhieuXacNhanHoanThanhs.Where(p => ids.Contains(p.id)).ToList();
                if (!phieus.Any())
                    return Json(new { success = false, message = "Không tìm thấy phiếu hợp lệ để xóa." });

                int count = phieus.Count;
                foreach (var phieu in phieus)
                {
                    var dataOld = new
                    {
                        phieu.id,
                        phieu.MSSV,
                        ThoiGian = phieu.ThoiGian.HasValue ? phieu.ThoiGian.Value.ToString("yyyy-MM-dd HH:mm:ss") : null,
                        phieu.TrangThai,
                        NgayXacNhan = phieu.NgayXacNhan.HasValue ? phieu.NgayXacNhan.Value.ToString("yyyy-MM-dd HH:mm:ss") : null,
                        phieu.NguoiXacNhan,
                        phieu.phieuduyet
                    };
                    AuditLogHelper.GhiNhatKy("PhieuXacNhanHoanThanh", phieu.id.ToString(), dataOld, "DELETE");
                }

                db.PhieuXacNhanHoanThanhs.RemoveRange(phieus);
                db.SaveChanges();
                return Json(new { success = true, message = $"Đã xóa thành công {count} phiếu xác nhận đã chọn." });
            }
        }

        // ==============================================================
        // 📥 XUẤT MẪU IMPORT EXCEL XÁC NHẬN HOÀN THÀNH
        // ==============================================================
        [HttpGet]
        public ActionResult DownloadTemplate()
        {
            try
            {
                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("Mau_XacNhanHoanThanh");

                    // 1. Tiêu đề
                    ws.Cells["A1:E1"].Merge = true;
                    ws.Cells["A1"].Value = "MẪU NHẬP XÁC NHẬN HOÀN THÀNH LAO ĐỘNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(25, 135, 84)); // Green success
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // 2. Header
                    string[] headers = new string[]
                    {
                        "STT",
                        "MSSV (*)",
                        "Họ và Tên (Tham khảo)",
                        "Trạng Thái (*) (Hoàn Thành / Chờ Xác Nhận)",
                        "Ghi Chú"
                    };

                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 248, 240));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        cell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    }
                    ws.Row(2).Height = 28;

                    // 3. Dòng ví dụ mẫu
                    ws.Cells[3, 1].Value = 1;
                    ws.Cells[3, 2].Value = 2115141001;
                    ws.Cells[3, 3].Value = "Nguyễn Văn An";
                    ws.Cells[3, 4].Value = "Hoàn Thành";
                    ws.Cells[3, 5].Value = "Đã hoàn thành xuất sắc 18 buổi lao động";

                    ws.Cells[4, 1].Value = 2;
                    ws.Cells[4, 2].Value = 2115141002;
                    ws.Cells[4, 3].Value = "Trần Thị Bình";
                    ws.Cells[4, 4].Value = "Hoàn Thành";
                    ws.Cells[4, 5].Value = "Đã hoàn thành đủ 18 buổi";

                    ws.Cells[5, 1].Value = 3;
                    ws.Cells[5, 2].Value = 2115141003;
                    ws.Cells[5, 3].Value = "Lê Hoàng Cường";
                    ws.Cells[5, 4].Value = "Chờ Xác Nhận";
                    ws.Cells[5, 5].Value = "Đang kiểm tra thêm hồ sơ";

                    for (int r = 3; r <= 5; r++)
                    {
                        for (int c = 1; c <= headers.Length; c++)
                        {
                            ws.Cells[r, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[r, c].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[r, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[r, 4].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }

                    // 4. Ghi chú hướng dẫn
                    int noteRow = 7;
                    ws.Cells[noteRow, 1].Value = "📌 GHI CHÚ HƯỚNG DẪN:";
                    ws.Cells[noteRow, 1].Style.Font.Bold = true;
                    ws.Cells[noteRow, 1].Style.Font.Color.SetColor(Color.FromArgb(220, 53, 69));

                    ws.Cells[noteRow + 1, 1].Value = "1. 'MSSV' bắt buộc phải là sinh viên đã tồn tại trên hệ thống.";
                    ws.Cells[noteRow + 2, 1].Value = "2. 'Trạng Thái' chỉ chấp nhận: 'Hoàn Thành' hoặc 'Chờ Xác Nhận'.";
                    ws.Cells[noteRow + 3, 1].Value = "3. Khi import với trạng thái 'Hoàn Thành', hệ thống sẽ tự động cập nhật ngày xác nhận và khóa tài khoản sinh viên theo đúng quy định.";
                    ws.Cells[noteRow + 4, 1].Value = "4. Không được nhập trùng lặp cùng một MSSV nhiều lần trong file.";

                    for (int nr = noteRow; nr <= noteRow + 4; nr++)
                    {
                        ws.Cells[nr, 1].Style.Font.Size = 10;
                    }

                    // Đặt độ rộng cột cố định chuẩn đẹp
                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 16;
                    ws.Column(3).Width = 26;
                    ws.Column(4).Width = 22;
                    ws.Column(5).Width = 40;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = "Mau_Import_XacNhanHoanThanh.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi khi tải mẫu Excel: " + ex.Message);
            }
        }

        // ==============================================================
        // 📤 NHẬP DỮ LIỆU XÁC NHẬN HOÀN THÀNH TỪ EXCEL
        // ==============================================================
        [HttpPost]
        public ActionResult ImportExcel(HttpPostedFileBase file)
        {
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
                    var ws = package.Workbook.Worksheets.FirstOrDefault();
                    if (ws == null)
                        return Json(new { success = false, message = "File Excel không chứa bất kỳ sheet dữ liệu nào." });

                    int rowCount = ws.Dimension?.Rows ?? 0;
                    if (rowCount < 3)
                    {
                        return Json(new { success = false, message = "File Excel không có dữ liệu nhập (dữ liệu bắt đầu từ dòng 3)." });
                    }

                    using (var db = DbContextFactory.Create())
                    {
                        var studentDict = db.SinhViens.ToDictionary(s => s.MSSV, s => s);
                        var fileMssvSet = new HashSet<long>();

                        for (int row = 3; row <= rowCount; row++)
                        {
                            var mssvStr = ws.Cells[row, 2].Text?.Trim();
                            var hoTen = ws.Cells[row, 3].Text?.Trim();
                            var trangThaiStr = ws.Cells[row, 4].Text?.Trim();

                            if (string.IsNullOrWhiteSpace(mssvStr) && string.IsNullOrWhiteSpace(hoTen) && string.IsNullOrWhiteSpace(trangThaiStr))
                                continue;

                            totalRows++;

                            if (string.IsNullOrWhiteSpace(mssvStr) || !long.TryParse(mssvStr, out long mssv))
                            {
                                errors.Add($"Dòng {row}: MSSV '{mssvStr}' không hợp lệ (phải là số nguyên).");
                                continue;
                            }

                            if (fileMssvSet.Contains(mssv))
                            {
                                errors.Add($"Dòng {row}: MSSV {mssv} bị trùng lặp trong file Excel.");
                                continue;
                            }
                            fileMssvSet.Add(mssv);

                            if (!studentDict.TryGetValue(mssv, out var sv))
                            {
                                errors.Add($"Dòng {row}: Không tìm thấy sinh viên có MSSV {mssv} trong cơ sở dữ liệu.");
                                continue;
                            }

                            string normalizedTrangThai = "Hoàn Thành";
                            if (!string.IsNullOrWhiteSpace(trangThaiStr))
                            {
                                if (trangThaiStr.IndexOf("hoàn thành", StringComparison.OrdinalIgnoreCase) >= 0 || trangThaiStr.IndexOf("hoan thanh", StringComparison.OrdinalIgnoreCase) >= 0)
                                    normalizedTrangThai = "Hoàn Thành";
                                else if (trangThaiStr.IndexOf("chờ", StringComparison.OrdinalIgnoreCase) >= 0 || trangThaiStr.IndexOf("cho", StringComparison.OrdinalIgnoreCase) >= 0)
                                    normalizedTrangThai = "Chờ Xác Nhận";
                                else
                                    normalizedTrangThai = trangThaiStr;
                            }

                            // Tìm phiếu xác nhận đã có hoặc tạo mới
                            var phieu = db.PhieuXacNhanHoanThanhs.FirstOrDefault(p => p.MSSV == mssv);
                            if (phieu == null)
                            {
                                phieu = new PhieuXacNhanHoanThanh
                                {
                                    MSSV = mssv,
                                    ThoiGian = DateTime.Now,
                                    phieuduyet = null
                                };
                                db.PhieuXacNhanHoanThanhs.Add(phieu);
                            }

                            phieu.TrangThai = normalizedTrangThai;

                            if (normalizedTrangThai == "Hoàn Thành")
                            {
                                phieu.NgayXacNhan = DateTime.Now;
                                phieu.NguoiXacNhan = 1;

                                // Khóa tài khoản sinh viên đã hoàn thành theo quy định
                                string mssvText = mssv.ToString();
                                var tk = db.TaiKhoans.FirstOrDefault(t => t.Username == mssvText);
                                if (tk != null)
                                {
                                    tk.IsLocked = true;
                                }
                            }

                            successCount++;
                        }

                        if (successCount > 0)
                        {
                            db.SaveChanges();
                        }
                    }
                }

                if (successCount == 0 && errors.Count > 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Không có phiếu xác nhận nào được nhập do dữ liệu bị lỗi hoặc trùng lặp.",
                        errors = errors
                    });
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã xử lý thành công {successCount}/{totalRows} sinh viên." + (errors.Count > 0 ? $" Có {errors.Count} dòng không hợp lệ bị bỏ qua." : ""),
                    successCount = successCount,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi khi xử lý file Excel: " + ex.Message });
            }
        }

        // ==============================================================
        // 📊 XUẤT DỮ LIỆU XÁC NHẬN HOÀN THÀNH RA EXCEL
        // ==============================================================
        [HttpGet]
        public ActionResult ExportExcel(string khoa = "", string keyword = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = from phieu in db.PhieuXacNhanHoanThanhs
                            join sv in db.SinhViens on phieu.MSSV equals sv.MSSV
                            join lop in db.Lops on sv.Lop_id equals lop.Lop_id
                            join k in db.Khoas on lop.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            from snld in snldGroup.DefaultIfEmpty()
                            where (phieu.TrangThai == "Chờ Xác Nhận" || phieu.TrangThai == null)
                                  && (snld != null && snld.TongSoNgay == 18)
                            select new
                            {
                                phieu.id,
                                sv.MSSV,
                                sv.HoTen,
                                Lop = lop.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snld != null ? snld.TongSoNgay : 0
                            };

                if (!string.IsNullOrEmpty(khoa))
                {
                    query = query.Where(x => x.Khoa.Equals(khoa, StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrEmpty(keyword))
                {
                    keyword = keyword.Trim();
                    query = query.Where(x =>
                        x.MSSV.ToString() == keyword ||
                        x.HoTen.Equals(keyword, StringComparison.OrdinalIgnoreCase) ||
                        x.Lop.Contains(keyword) ||
                        x.Khoa.Contains(keyword));
                }

                var list = query.OrderBy(x => x.id).ToList();

                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("XacNhanHoanThanh");

                    // Tiêu đề
                    ws.Cells["A1:F1"].Merge = true;
                    ws.Cells["A1"].Value = "DANH SÁCH SINH VIÊN ĐỦ ĐIỀU KIỆN XÁC NHẬN HOÀN THÀNH LAO ĐỘNG";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(25, 135, 84));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    string[] headers = new string[] { "STT", "MSSV", "Họ và Tên", "Lớp", "Khoa", "Số Ngày Hoàn Thành" };

                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 248, 240));
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
                        ws.Cells[row, 2].Value = item.MSSV;
                        ws.Cells[row, 3].Value = item.HoTen;
                        ws.Cells[row, 4].Value = item.Lop;
                        ws.Cells[row, 5].Value = item.Khoa;
                        ws.Cells[row, 6].Value = item.SoNgay;

                        for (int c = 1; c <= headers.Length; c++)
                        {
                            ws.Cells[row, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[row, c].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                        ws.Cells[row, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                        row++;
                        stt++;
                    }

                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 16;
                    ws.Column(3).Width = 26;
                    ws.Column(4).Width = 20;
                    ws.Column(5).Width = 30;
                    ws.Column(6).Width = 24;

                    var fileBytes = package.GetAsByteArray();
                    string fileName = $"DanhSachXacNhanHoanThanh_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
        }
    }
}
