using OfficeOpenXml;
using OfficeOpenXml.Style;
using QuanLyDangKyNgayLD.AuditHelper;
using System;
using System.Drawing;
using System.Globalization;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminAuditLogController : Controller
    {
        // GET: Admin/AdminAuditLog
        public ActionResult Index()
        {
            var thongKe = AuditLogHelper.LayThongKe();
            ViewBag.ThongKe = thongKe;
            return View();
        }

        // AJAX: Lấy danh sách nhật ký có phân trang và bộ lọc
        [HttpGet]
        public ActionResult GetLogsAjax(string tenBang = "ALL", string keyword = "", string tuNgay = "", string denNgay = "", int page = 1, int pageSize = 10)
        {
            try
            {
                DateTime? dtTuNgay = null;
                DateTime? dtDenNgay = null;

                if (!string.IsNullOrWhiteSpace(tuNgay) && DateTime.TryParseExact(tuNgay, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime d1))
                {
                    dtTuNgay = d1;
                }
                if (!string.IsNullOrWhiteSpace(denNgay) && DateTime.TryParseExact(denNgay, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime d2))
                {
                    dtDenNgay = d2;
                }

                int totalRows;
                var list = AuditLogHelper.LayDanhSachNhatKy(tenBang, keyword, dtTuNgay, dtDenNgay, page, pageSize, out totalRows);
                int totalPages = (int)Math.Ceiling((double)totalRows / pageSize);

                var formattedList = list.ConvertAll(x => new
                {
                    x.Id,
                    x.NguoiThucHien,
                    x.HanhDong,
                    x.TenBang,
                    TenBangHienThi = LayTenBangHienThi(x.TenBang),
                    x.KhoaChinhBiXoa,
                    x.DuLieuCu,
                    x.DiaChiIP,
                    ThoiGian = x.ThoiGianThucHien.ToString("HH:mm:ss dd/MM/yyyy"),
                    ThoiGianIso = x.ThoiGianThucHien.ToString("yyyy-MM-dd HH:mm:ss")
                });

                return Json(new
                {
                    success = true,
                    data = formattedList,
                    totalItems = totalRows,
                    totalPages = totalPages,
                    currentPage = page
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy chi tiết bản ghi nhật ký
        [HttpGet]
        public ActionResult GetDetailAjax(long id)
        {
            try
            {
                var log = AuditLogHelper.LayChiTietNhatKy(id);
                if (log == null)
                    return Json(new { success = false, message = "Không tìm thấy bản ghi nhật ký." }, JsonRequestBehavior.AllowGet);

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        log.Id,
                        log.NguoiThucHien,
                        log.HanhDong,
                        log.TenBang,
                        TenBangHienThi = LayTenBangHienThi(log.TenBang),
                        log.KhoaChinhBiXoa,
                        log.DuLieuCu,
                        log.DiaChiIP,
                        ThoiGian = log.ThoiGianThucHien.ToString("HH:mm:ss dd/MM/yyyy")
                    }
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy thống kê cập nhật nhanh
        [HttpGet]
        public ActionResult GetStatsAjax()
        {
            try
            {
                var thongKe = AuditLogHelper.LayThongKe();
                return Json(new { success = true, data = thongKe }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // Xuất file Excel nhật ký thao tác xóa
        [HttpGet]
        public ActionResult ExportExcel(string tenBang = "ALL", string keyword = "", string tuNgay = "", string denNgay = "")
        {
            try
            {
                DateTime? dtTuNgay = null;
                DateTime? dtDenNgay = null;

                if (!string.IsNullOrWhiteSpace(tuNgay) && DateTime.TryParseExact(tuNgay, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime d1))
                {
                    dtTuNgay = d1;
                }
                if (!string.IsNullOrWhiteSpace(denNgay) && DateTime.TryParseExact(denNgay, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime d2))
                {
                    dtDenNgay = d2;
                }

                int totalRows;
                var list = AuditLogHelper.LayDanhSachNhatKy(tenBang, keyword, dtTuNgay, dtDenNgay, 1, 5000, out totalRows);

                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("NhatKyXoa");

                    // Tiêu đề
                    ws.Cells["A1:G1"].Merge = true;
                    ws.Cells["A1"].Value = "BÁO CÁO NHẬT KÝ THAO TÁC XÓA DỮ LIỆU";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 16;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(0, 41, 200));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Row(1).Height = 35;

                    // Headers
                    string[] headers = { "STT", "Thời Gian", "Người Thực Hiện", "Hành Động", "Bảng Bị Xóa", "Khóa Chính", "Địa Chỉ IP" };
                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 253));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }
                    ws.Row(2).Height = 25;

                    // Data
                    int rowIndex = 3;
                    for (int i = 0; i < list.Count; i++)
                    {
                        var item = list[i];
                        ws.Cells[rowIndex, 1].Value = i + 1;
                        ws.Cells[rowIndex, 2].Value = item.ThoiGianThucHien.ToString("dd/MM/yyyy HH:mm:ss");
                        ws.Cells[rowIndex, 3].Value = item.NguoiThucHien;
                        ws.Cells[rowIndex, 4].Value = item.HanhDong;
                        ws.Cells[rowIndex, 5].Value = LayTenBangHienThi(item.TenBang);
                        ws.Cells[rowIndex, 6].Value = item.KhoaChinhBiXoa;
                        ws.Cells[rowIndex, 7].Value = item.DiaChiIP;

                        for (int col = 1; col <= 7; col++)
                        {
                            ws.Cells[rowIndex, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            if (col == 1 || col == 2 || col == 4 || col == 7)
                                ws.Cells[rowIndex, col].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        }

                        rowIndex++;
                    }

                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 20;
                    ws.Column(3).Width = 22;
                    ws.Column(4).Width = 16;
                    ws.Column(5).Width = 22;
                    ws.Column(6).Width = 18;
                    ws.Column(7).Width = 18;
                    ws.Column(8).Width = 40;

                    byte[] fileBytes = package.GetAsByteArray();
                    string fileName = $"NhatKyXoa_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                    return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi khi xuất file Excel: " + ex.Message);
            }
        }

        private static string LayTenBangHienThi(string tenBang)
        {
            switch (tenBang)
            {
                case "TaoDotNgayLaoDong":
                    return "Tạo Đợt Lao Động";
                case "SinhVien":
                    return "Danh Sách Sinh Viên";
                case "TaiKhoan":
                    return "Quản Lý Tài Khoản";
                case "PhieuXacNhanHoanThanh":
                    return "Xác Nhận Hoàn Thành";
                default:
                    return tenBang ?? "Chưa xác định";
            }
        }
    }
}
