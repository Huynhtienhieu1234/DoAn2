using OfficeOpenXml;          // EPPlus
using OfficeOpenXml.Style;    // Style cho Excel
using QuanLyDangKyNgayLD.Areas.Admin.ViewModel;
using QuanLyDangKyNgayLD.Factories;
using System;
using System.Drawing;         // Màu sắc
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Web;
using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.Admin.Controllers
{
    public class AdminTKController : Controller
    {
        private const int PAGE_SIZE = 10;

        // Trang chính
        public ActionResult Index()
        {
            using (var db = DbContextFactory.Create())
            {
                ViewBag.KhoaList = db.Khoas.Select(k => k.TenKhoa).Distinct().OrderBy(x => x).ToList();
            }
            return View();
        }

        // Load dữ liệu phân trang (AJAX → JSON)
        public JsonResult LoadData(string khoa = "", string lop = "", string keyword = "", string status = "", int page = 1, int pageSize = 10)
        {
            if (pageSize <= 0) pageSize = 10;

            using (var db = DbContextFactory.Create())
            {
                var query = from sv in db.SinhViens
                            where sv.Deleted_at == null
                            join lopObj in db.Lops on sv.Lop_id equals lopObj.Lop_id
                            join k in db.Khoas on lopObj.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            select new StudentProgressViewModel
                            {
                                MSSV = sv.MSSV,
                                MSSVDisplay = (sv.TaiKhoan1 != null && sv.TaiKhoan1.Username != null) ? sv.TaiKhoan1.Username : sv.MSSV.ToString(),
                                HoTen = sv.HoTen,
                                Lop = lopObj.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                            };

                if (!string.IsNullOrEmpty(khoa))
                    query = query.Where(x => x.Khoa == khoa);

                if (!string.IsNullOrEmpty(lop))
                    query = query.Where(x => x.Lop == lop);

                if (!string.IsNullOrEmpty(keyword))
                {
                    keyword = keyword.Trim();
                    string trimmedZero = keyword.TrimStart('0');
                    query = query.Where(x => 
                        x.MSSV.ToString().Contains(keyword) || 
                        (trimmedZero.Length > 0 && x.MSSV.ToString().Contains(trimmedZero)) || 
                        (x.MSSVDisplay != null && x.MSSVDisplay.Contains(keyword)) ||
                        (x.HoTen ?? "").Contains(keyword));
                }

                var allData = query.ToList(); // thực thi sớm để tính thống kê

                int tongSV = allData.Count;
                int daHoanThanh = allData.Count(x => x.SoNgay >= 18);
                int chuaHoanThanh = tongSV - daHoanThanh;
                double tienDo = tongSV > 0 ? Math.Round((double)daHoanThanh / tongSV * 100, 1) : 0;

                // Lọc theo trạng thái hoàn thành nếu có
                var filteredData = allData;
                if (status == "completed")
                {
                    filteredData = allData.Where(x => x.SoNgay >= 18).ToList();
                }
                else if (status == "incomplete")
                {
                    filteredData = allData.Where(x => x.SoNgay < 18).ToList();
                }

                int totalItems = filteredData.Count;
                int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / pageSize) : 1;
                page = page < 1 ? 1 : page;
                if (page > totalPages) page = totalPages;

                var listSV = filteredData
                    .OrderBy(x => x.MSSV)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                return Json(new
                {
                    Students = listSV,
                    Stats = new
                    {
                        TongSinhVien = tongSV,
                        DaHoanThanh = daHoanThanh,
                        ChuaHoanThanh = chuaHoanThanh,
                        TienDoHoanThanh = tienDo
                    },
                    Pagination = new
                    {
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalItems = totalItems,
                        TotalPages = totalPages
                    }
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // Lấy danh sách lớp theo khoa
        public JsonResult GetLopByKhoa(string khoa)
        {
            using (var db = DbContextFactory.Create())
            {
                var lops = db.Lops
                    .Where(l => string.IsNullOrEmpty(khoa) || l.Khoa.TenKhoa == khoa)
                    .Select(l => l.TenLop)
                    .Distinct()
                    .OrderBy(x => x)
                    .ToList();

                return Json(lops, JsonRequestBehavior.AllowGet);
            }
        }

        // Xuất Excel bằng EPPlus
        public ActionResult ExportExcel(string khoa = "", string lop = "", string keyword = "", string status = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var query = from sv in db.SinhViens
                            where sv.Deleted_at == null
                            join l in db.Lops on sv.Lop_id equals l.Lop_id
                            join k in db.Khoas on l.Khoa_id equals k.Khoa_id
                            join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                            select new
                            {
                                sv.MSSV,
                                MSSVDisplay = (sv.TaiKhoan1 != null && sv.TaiKhoan1.Username != null) ? sv.TaiKhoan1.Username : sv.MSSV.ToString(),
                                sv.HoTen,
                                Lop = l.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                            };

                if (!string.IsNullOrEmpty(khoa))
                    query = query.Where(x => x.Khoa == khoa);

                if (!string.IsNullOrEmpty(lop))
                    query = query.Where(x => x.Lop == lop);

                if (!string.IsNullOrEmpty(keyword))
                {
                    keyword = keyword.Trim();
                    string trimmedZero = keyword.TrimStart('0');
                    query = query.Where(x => 
                        x.MSSV.ToString().Contains(keyword) || 
                        (trimmedZero.Length > 0 && x.MSSV.ToString().Contains(trimmedZero)) || 
                        (x.MSSVDisplay != null && x.MSSVDisplay.Contains(keyword)) ||
                        (x.HoTen ?? "").Contains(keyword));
                }

                var list = query.ToList();
                if (status == "completed")
                {
                    list = list.Where(x => x.SoNgay >= 18).ToList();
                }
                else if (status == "incomplete")
                {
                    list = list.Where(x => x.SoNgay < 18).ToList();
                }

                list = list.OrderBy(x => x.MSSV).ToList();

                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("ThongKeTienDoLaoDong");

                    // Title
                    ws.Cells["A1:F1"].Merge = true;
                    ws.Cells["A1"].Value = "BÁO CÁO THỐNG KÊ TIẾN ĐỘ LAO ĐỘNG SINH VIÊN";
                    ws.Cells["A1"].Style.Font.Bold = true;
                    ws.Cells["A1"].Style.Font.Size = 14;
                    ws.Cells["A1"].Style.Font.Color.SetColor(Color.White);
                    ws.Cells["A1"].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    ws.Cells["A1"].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(13, 71, 161));
                    ws.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    ws.Cells["A1"].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    ws.Row(1).Height = 32;

                    // Header
                    string[] headers = { "STT", "MSSV", "Họ và tên", "Lớp", "Khoa", "Số ngày hoàn thành" };
                    for (int i = 0; i < headers.Length; i++)
                    {
                        var cell = ws.Cells[2, i + 1];
                        cell.Value = headers[i];
                        cell.Style.Font.Bold = true;
                        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        cell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(235, 243, 255));
                        cell.Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(200, 200, 200));
                        cell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    }
                    ws.Row(2).Height = 24;

                    // Data
                    int row = 3;
                    int stt = 1;
                    foreach (var sv in list)
                    {
                        string mssvText = (sv.MSSVDisplay ?? sv.MSSV.ToString()).Trim();
                        if (mssvText.Length == 9) mssvText = "0" + mssvText;

                        ws.Cells[row, 1].Value = stt;
                        ws.Cells[row, 2].Style.Numberformat.Format = "@";
                        ws.Cells[row, 2].Value = mssvText;
                        ws.Cells[row, 3].Value = sv.HoTen;
                        ws.Cells[row, 4].Value = sv.Lop;
                        ws.Cells[row, 5].Value = sv.Khoa;
                        ws.Cells[row, 6].Value = sv.SoNgay;

                        for (int col = 1; col <= 6; col++)
                        {
                            ws.Cells[row, col].Style.Border.BorderAround(ExcelBorderStyle.Thin, Color.FromArgb(220, 220, 220));
                            ws.Cells[row, col].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }

                        ws.Cells[row, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 4].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        ws.Cells[row, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                        // Highlight hoàn thành
                        if (sv.SoNgay >= 18)
                        {
                            ws.Cells[row, 6].Style.Font.Color.SetColor(Color.FromArgb(46, 125, 50));
                            ws.Cells[row, 6].Style.Font.Bold = true;
                        }

                        row++;
                        stt++;
                    }

                    // Explicit column widths
                    ws.Column(1).Width = 8;
                    ws.Column(2).Width = 16;
                    ws.Column(3).Width = 28;
                    ws.Column(4).Width = 26;
                    ws.Column(5).Width = 32;
                    ws.Column(6).Width = 22;

                    var stream = new MemoryStream();
                    package.SaveAs(stream);
                    stream.Position = 0;

                    return File(stream.ToArray(),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "ThongKeTienDoLaoDong.xlsx");
                }
            }
        }
        // Gửi email 
        [HttpPost]
        public JsonResult SendExcelMail(string email, HttpPostedFileBase excelFile)
        {
            if (excelFile == null || excelFile.ContentLength == 0)
            {
                return Json(new { success = false, message = "Vui lòng chọn file Excel." });
            }

            try
            {
                var fromEmail = "huynhtienhieu11@gmail.com";
                var fromPassword = "ocvspctozbcakfgy";

                var mail = new MailMessage();
                mail.From = new MailAddress(fromEmail, "Hệ thống thống kê lao động");
                mail.To.Add(email);
                mail.Subject = "File Excel thống kê tiến độ lao động";
                mail.Body = "Xin chào,\n\nGửi bạn file Excel thống kê theo yêu cầu.\n\nTrân trọng.";

                mail.Attachments.Add(new Attachment(excelFile.InputStream, excelFile.FileName));

                var smtp = new SmtpClient("smtp.gmail.com", 587)
                {
                    Credentials = new NetworkCredential(fromEmail, fromPassword),
                    EnableSsl = true
                };

                smtp.Send(mail);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Gửi email thất bại: " + ex.Message });
            }
        }





    }
}
