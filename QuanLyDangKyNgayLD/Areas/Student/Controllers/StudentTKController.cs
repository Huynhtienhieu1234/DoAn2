using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Web.Mvc;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class StudentTKController : Controller
    {
        // GET: Student/StudentTK
        public ActionResult Index()
        {
            bool isLeader = false;
            string tenLop = "";
            int lopId = 0;

            using (var db = DbContextFactory.Create())
            {
                SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out var user, out var sv, out _);
                if (user != null)
                {
                    isLeader = (user.VaiTro_id == 4);
                    if (sv != null && sv.Lop != null)
                    {
                        tenLop = sv.Lop.TenLop ?? "";
                        lopId = sv.Lop_id ?? 0;
                    }
                }
            }

            ViewBag.IsClassLeader = isLeader;
            ViewBag.TenLop = tenLop;
            ViewBag.LopId = lopId;

            return View();
        }

        // AJAX: Thống kê lao động cho sinh viên
        [HttpGet]
        public JsonResult GetThongKe()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sv, out var authError))
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                    long mssv = sv.MSSV;

                    var tongDot = db.PhieuDangKies.Count(p => p.MSSV == mssv);

                    var daDuyet = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv && d.TrangThaiDuyet == true
                                   select d).Count();

                    var daDiemDanh = db.DanhSachDiemDanhs.Count(dd => dd.MSSV == mssv);

                    var hoanThanh = (from dd in db.DanhSachDiemDanhs
                                     join d in db.TaoDotNgayLaoDongs on dd.Dot_id equals d.TaoDotLaoDong_id
                                     where dd.MSSV == mssv && d.TrangThaiDuyet == true
                                     select d).Count();

                    return Json(new
                    {
                        success = true,
                        tongDot,
                        daDuyet,
                        daDiemDanh,
                        hoanThanh
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy chi tiết ngày lao động sinh viên đã tham gia
        [HttpGet]
        public JsonResult GetChiTietNgay()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sv, out var authError))
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                    long mssv = sv.MSSV;

                    // Lấy dữ liệu thô trước
                    var rawList = (from dd in db.DanhSachDiemDanhs
                                   join d in db.TaoDotNgayLaoDongs on dd.Dot_id equals d.TaoDotLaoDong_id
                                   where dd.MSSV == mssv
                                   orderby dd.ThoiGian descending
                                   select new
                                   {
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.LoaiLaoDong,
                                       d.KhuVuc,
                                       dd.ThoiGian
                                   }).ToList();

                    // Định dạng ngày sau khi đã đưa về bộ nhớ
                    var list = rawList.Select(x => new
                    {
                        Buoi = x.Buoi,
                        Ngay = x.NgayLaoDong != null ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        LoaiLaoDong = x.LoaiLaoDong,
                        DiaDiem = x.KhuVuc,
                        ThoiGianDiemDanh = x.ThoiGian.ToString("dd/MM/yyyy")
                    }).ToList();

                    return Json(new { success = true, list }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // AJAX: Lấy danh sách đợt đã đăng ký (chia nhóm)
        [HttpGet]
        public JsonResult GetDotDaDangKy()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var sv, out var authError))
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                    long mssv = sv.MSSV;

                    var rawList = (from p in db.PhieuDangKies
                                   join d in db.TaoDotNgayLaoDongs on p.TaoDotLaoDong_id equals d.TaoDotLaoDong_id
                                   where p.MSSV == mssv && d.Ngayxoa == null
                                   select new
                                   {
                                       d.TaoDotLaoDong_id,
                                       d.DotLaoDong,
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.KhuVuc,
                                       d.LoaiLaoDong,
                                       DaDuyet = d.TrangThaiDuyet == true,
                                       DaDiemDanh = db.DanhSachDiemDanhs.Any(dd => dd.Dot_id == d.TaoDotLaoDong_id && dd.MSSV == mssv)
                                   }).ToList();

                    var dotList = rawList.Select(x => new
                    {
                        x.TaoDotLaoDong_id,
                        x.DotLaoDong,
                        x.Buoi,
                        NgayLaoDong = x.NgayLaoDong != null ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        x.KhuVuc,
                        x.LoaiLaoDong,
                        x.DaDuyet,
                        x.DaDiemDanh
                    }).OrderByDescending(x => x.NgayLaoDong).ToList();

                    var choDuyet = dotList.Where(x => !x.DaDuyet).ToList();
                    var daDuyet = dotList.Where(x => x.DaDuyet && !x.DaDiemDanh).ToList();
                    var hoanThanh = dotList.Where(x => x.DaDuyet && x.DaDiemDanh).ToList();

                    return Json(new { success = true, choDuyet, daDuyet, hoanThanh }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // =========================================================================
        // AJAX: Thống kê tiến độ ngày lao động của cả lớp (Dành cho Lớp trưởng)
        // =========================================================================
        [HttpGet]
        public JsonResult GetThongKeLop(string keyword = "", string filter = "")
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out var user, out var svHienTai, out var authError))
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                    if (!svHienTai.Lop_id.HasValue)
                        return Json(new { success = false, message = "Sinh viên chưa được phân lớp!" }, JsonRequestBehavior.AllowGet);

                    if (user.VaiTro_id != 4 && user.VaiTro_id != 1 && user.VaiTro_id != 2)
                        return Json(new { success = false, message = "Bạn không có quyền truy cập chức năng này!" }, JsonRequestBehavior.AllowGet);

                    int lopId = svHienTai.Lop_id.Value;
                    string tenLop = svHienTai.Lop?.TenLop ?? "Lớp";

                    // Lấy toàn bộ sinh viên trong lớp
                    var listSV = db.SinhViens
                                   .Where(s => s.Lop_id == lopId && s.Deleted_at == null)
                                   .OrderBy(s => s.MSSV)
                                   .ToList();

                    var mssvList = listSV.Select(s => s.MSSV).ToList();

                    // Lấy tiến độ từ SoNgayLaoDong
                    var soNgayDict = db.SoNgayLaoDongs
                                       .Where(x => mssvList.Contains(x.MSSV))
                                       .ToDictionary(x => x.MSSV, x => x.TongSoNgay ?? 0);

                    // Lấy số ca đã điểm danh
                    var diemDanhDict = db.DanhSachDiemDanhs
                                         .Where(x => mssvList.Contains(x.MSSV))
                                         .GroupBy(x => x.MSSV)
                                         .ToDictionary(g => g.Key, g => g.Count());

                    // Lấy số ca đã đăng ký
                    var dangKyDict = db.PhieuDangKies
                                       .Where(x => mssvList.Contains(x.MSSV) && (x.TrangThai == "DangKy" || x.TrangThai == "DaDuyet" || x.TrangThai == null))
                                       .GroupBy(x => x.MSSV)
                                       .ToDictionary(g => g.Key, g => g.Count());

                    // Lấy trạng thái phê duyệt từ PhieuXacNhanHoanThanh
                    var hoanThanhDict = db.PhieuXacNhanHoanThanhs
                                          .Where(x => mssvList.Contains(x.MSSV))
                                          .GroupBy(x => x.MSSV)
                                          .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.id).FirstOrDefault()?.TrangThai ?? "");

                    var rawData = listSV.Select(s =>
                    {
                        int soNgay = soNgayDict.ContainsKey(s.MSSV) ? soNgayDict[s.MSSV] : 0;
                        int soCaDD = diemDanhDict.ContainsKey(s.MSSV) ? diemDanhDict[s.MSSV] : 0;
                        int soCaDK = dangKyDict.ContainsKey(s.MSSV) ? dangKyDict[s.MSSV] : 0;
                        string statusCert = hoanThanhDict.ContainsKey(s.MSSV) ? hoanThanhDict[s.MSSV] : "";

                        bool isCompleted = soNgay >= 18 || statusCert == "Hoàn Thành";
                        double phanTram = Math.Min(100.0, Math.Round((double)soNgay / 18.0 * 100.0, 1));

                        return new
                        {
                            MSSV = s.MSSV,
                            HoTen = s.HoTen ?? "",
                            GioiTinh = s.GioiTinh ?? "",
                            NgaySinh = s.NgaySinh.HasValue ? s.NgaySinh.Value.ToString("dd/MM/yyyy") : "",
                            SoDienThoai = s.SoDienThoaiSinhVien ?? "",
                            TongSoNgay = soNgay,
                            MucTieu = 18,
                            PhanTram = phanTram,
                            SoCaDiemDanh = soCaDD,
                            SoCaDangKy = soCaDK,
                            IsCompleted = isCompleted,
                            TrangThai = isCompleted ? "Đã hoàn thành" : "Đang tích lũy",
                            TrangThaiDuyet = statusCert
                        };
                    }).ToList();

                    // Thống kê tổng quan lớp
                    int tongSiSo = rawData.Count;
                    int soHoanThanh = rawData.Count(x => x.IsCompleted);
                    int soChuaHoanThanh = tongSiSo - soHoanThanh;
                    double tyLeLop = tongSiSo > 0 ? Math.Round((double)soHoanThanh / tongSiSo * 100.0, 1) : 0;

                    // Bộ lọc & Tìm kiếm
                    var filtered = rawData.AsEnumerable();
                    if (!string.IsNullOrEmpty(keyword))
                    {
                        string kw = keyword.Trim().ToLower();
                        filtered = filtered.Where(x => x.MSSV.ToString().Contains(kw) || x.HoTen.ToLower().Contains(kw));
                    }
                    if (filter == "completed")
                    {
                        filtered = filtered.Where(x => x.IsCompleted);
                    }
                    else if (filter == "in_progress")
                    {
                        filtered = filtered.Where(x => !x.IsCompleted);
                    }

                    return Json(new
                    {
                        success = true,
                        tenLop,
                        tongSiSo,
                        soHoanThanh,
                        soChuaHoanThanh,
                        tyLeLop,
                        data = filtered.ToList()
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // =========================================================================
        // AJAX: Lấy chi tiết lịch sử ca lao động của sinh viên cùng lớp
        // =========================================================================
        [HttpGet]
        public JsonResult GetChiTietLaoDongSinhVien(long mssv)
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out _, out var svHienTai, out var authError))
                        return Json(new { success = false, message = authError }, JsonRequestBehavior.AllowGet);

                    if (!svHienTai.Lop_id.HasValue)
                        return Json(new { success = false, message = "Không có quyền!" }, JsonRequestBehavior.AllowGet);

                    // Kiểm tra sinh viên cần xem có cùng lớp với Lớp trưởng không
                    var targetSV = db.SinhViens.Include("Lop").FirstOrDefault(s => s.MSSV == mssv && s.Lop_id == svHienTai.Lop_id);
                    if (targetSV == null)
                        return Json(new { success = false, message = "Sinh viên không thuộc lớp của bạn!" }, JsonRequestBehavior.AllowGet);

                    var rawList = (from dd in db.DanhSachDiemDanhs
                                   join d in db.TaoDotNgayLaoDongs on dd.Dot_id equals d.TaoDotLaoDong_id
                                   where dd.MSSV == mssv
                                   orderby dd.ThoiGian descending
                                   select new
                                   {
                                       d.DotLaoDong,
                                       d.Buoi,
                                       d.NgayLaoDong,
                                       d.LoaiLaoDong,
                                       d.KhuVuc,
                                       dd.ThoiGian
                                   }).ToList();

                    var list = rawList.Select(x => new
                    {
                        TieuDe = x.DotLaoDong ?? "Đợt lao động",
                        Buoi = x.Buoi ?? "",
                        Ngay = x.NgayLaoDong.HasValue ? x.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "",
                        LoaiLaoDong = x.LoaiLaoDong ?? "",
                        DiaDiem = x.KhuVuc ?? "",
                        ThoiGianDiemDanh = x.ThoiGian.ToString("dd/MM/yyyy HH:mm")
                    }).ToList();

                    int soNgay = db.SoNgayLaoDongs.Where(x => x.MSSV == mssv).Select(x => x.TongSoNgay).FirstOrDefault() ?? 0;

                    return Json(new
                    {
                        success = true,
                        hoTen = targetSV.HoTen,
                        mssv = targetSV.MSSV,
                        tenLop = targetSV.Lop?.TenLop ?? "",
                        soNgay,
                        list
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi hệ thống: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // =========================================================================
        // Xuất file Excel báo cáo tiến độ cả lớp cho Lớp trưởng
        // =========================================================================
        [HttpGet]
        public ActionResult ExportExcelLop(string keyword = "", string filter = "")
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    if (!SessionAuthHelper.ResolveCurrentStudent(HttpContext, db, out var user, out var svHienTai, out _))
                        return RedirectToAction("Login", "Login", new { area = "" });

                    if (!svHienTai.Lop_id.HasValue)
                        return Content("Không có quyền truy cập.");

                    if (user.VaiTro_id != 4 && user.VaiTro_id != 1 && user.VaiTro_id != 2)
                        return Content("Bạn không có quyền xuất báo cáo lớp.");

                    int lopId = svHienTai.Lop_id.Value;
                    string tenLop = svHienTai.Lop?.TenLop ?? "Lop";

                    var listSV = db.SinhViens
                                   .Where(s => s.Lop_id == lopId && s.Deleted_at == null)
                                   .OrderBy(s => s.MSSV)
                                   .ToList();

                    var mssvList = listSV.Select(s => s.MSSV).ToList();
                    var soNgayDict = db.SoNgayLaoDongs.Where(x => mssvList.Contains(x.MSSV)).ToDictionary(x => x.MSSV, x => x.TongSoNgay ?? 0);
                    var diemDanhDict = db.DanhSachDiemDanhs.Where(x => mssvList.Contains(x.MSSV)).GroupBy(x => x.MSSV).ToDictionary(g => g.Key, g => g.Count());
                    var hoanThanhDict = db.PhieuXacNhanHoanThanhs.Where(x => mssvList.Contains(x.MSSV)).GroupBy(x => x.MSSV).ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.id).FirstOrDefault()?.TrangThai ?? "");

                    var rawData = listSV.Select(s =>
                    {
                        int soNgay = soNgayDict.ContainsKey(s.MSSV) ? soNgayDict[s.MSSV] : 0;
                        int soCaDD = diemDanhDict.ContainsKey(s.MSSV) ? diemDanhDict[s.MSSV] : 0;
                        string statusCert = hoanThanhDict.ContainsKey(s.MSSV) ? hoanThanhDict[s.MSSV] : "";
                        bool isCompleted = soNgay >= 18 || statusCert == "Hoàn Thành";
                        return new
                        {
                            s.MSSV,
                            s.HoTen,
                            s.GioiTinh,
                            NgaySinh = s.NgaySinh.HasValue ? s.NgaySinh.Value.ToString("dd/MM/yyyy") : "",
                            s.SoDienThoaiSinhVien,
                            TongSoNgay = soNgay,
                            SoCaDD = soCaDD,
                            IsCompleted = isCompleted,
                            TrangThai = isCompleted ? "Đã hoàn thành (>=18 ngày)" : "Đang tích lũy"
                        };
                    }).ToList();

                    if (!string.IsNullOrEmpty(keyword))
                    {
                        string kw = keyword.Trim().ToLower();
                        rawData = rawData.Where(x => x.MSSV.ToString().Contains(kw) || (x.HoTen != null && x.HoTen.ToLower().Contains(kw))).ToList();
                    }
                    if (filter == "completed") rawData = rawData.Where(x => x.IsCompleted).ToList();
                    else if (filter == "in_progress") rawData = rawData.Where(x => !x.IsCompleted).ToList();

                    using (var package = new ExcelPackage())
                    {
                        var ws = package.Workbook.Worksheets.Add("TienDoLop");
                        // Banner Tiêu đề
                        ws.Cells["A1:H1"].Merge = true;
                        ws.Cells["A1"].Value = $"BÁO CÁO TIẾN ĐỘ NGÀY LAO ĐỘNG - LỚP {tenLop.ToUpper()}";
                        ws.Cells["A1"].Style.Font.Bold = true;
                        ws.Cells["A1"].Style.Font.Size = 14;
                        ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                        ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                        ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(37, 99, 235));
                        ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        ws.Row(1).Height = 35;

                        // Dòng phụ chú
                        ws.Cells["A2:H2"].Merge = true;
                        ws.Cells["A2"].Value = $"Thời gian xuất: {DateTime.Now:dd/MM/yyyy HH:mm} | Sĩ số: {rawData.Count} sinh viên | Tiêu chuẩn hoàn thành: 18 ngày công";
                        ws.Cells["A2"].Style.Font.Italic = true;
                        ws.Cells["A2"].Style.Font.Size = 10;
                        ws.Cells["A2"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Row(2).Height = 20;

                        string[] colHeaders = new string[] { "STT", "MSSV", "Họ và Tên", "Giới Tính", "Ngày Sinh", "Số Ngày Tích Lũy", "Số Ca Đã Làm", "Trạng Thái Hoàn Thành" };
                        for (int i = 0; i < colHeaders.Length; i++)
                        {
                            var cell = ws.Cells[3, i + 1];
                            cell.Value = colHeaders[i];
                            cell.Style.Font.Bold = true;
                            cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                            cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(241, 245, 249));
                            cell.Style.Border.BorderAround(ExcelBorderStyle.Thin);
                            cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        }
                        ws.Row(3).Height = 26;

                        int row = 4;
                        for (int idx = 0; idx < rawData.Count; idx++)
                        {
                            var item = rawData[idx];
                            ws.Cells[row, 1].Value = idx + 1;
                            ws.Cells[row, 2].Value = item.MSSV.ToString();
                            ws.Cells[row, 3].Value = item.HoTen;
                            ws.Cells[row, 4].Value = item.GioiTinh;
                            ws.Cells[row, 5].Value = item.NgaySinh;
                            ws.Cells[row, 6].Value = item.TongSoNgay;
                            ws.Cells[row, 7].Value = item.SoCaDD;
                            ws.Cells[row, 8].Value = item.TrangThai;

                            ws.Cells[row, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 4].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 5].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 7].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            ws.Cells[row, 8].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                            if (item.IsCompleted)
                            {
                                ws.Cells[row, 8].Style.Font.Color.SetColor(Color.FromArgb(22, 163, 74));
                                ws.Cells[row, 8].Style.Font.Bold = true;
                            }
                            else
                            {
                                ws.Cells[row, 8].Style.Font.Color.SetColor(Color.FromArgb(217, 119, 6));
                            }

                            for (int c = 1; c <= 8; c++)
                            {
                                ws.Cells[row, c].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(226, 232, 240));
                            }
                            row++;
                        }

                        // Thiết lập độ rộng các cột rõ ràng (tránh lỗi GenericFontMetricsTextMeasurer của EPPlus 6.x)
                        ws.Column(1).Width = 8;
                        ws.Column(2).Width = 16;
                        ws.Column(3).Width = 28;
                        ws.Column(4).Width = 12;
                        ws.Column(5).Width = 16;
                        ws.Column(6).Width = 20;
                        ws.Column(7).Width = 16;
                        ws.Column(8).Width = 25;

                        var fileBytes = package.GetAsByteArray();
                        string fileName = $"TienDo_LaoDong_{tenLop}_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
                        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
                    }
                }
            }
            catch (Exception ex)
            {
                return Content("Lỗi xuất file Excel: " + ex.Message);
            }
        }
    }
}
