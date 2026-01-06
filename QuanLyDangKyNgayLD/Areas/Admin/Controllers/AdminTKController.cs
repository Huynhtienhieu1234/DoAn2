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
            // Trang chỉ load khung, dữ liệu sẽ gọi bằng AJAX
            return View();
        }

        // Load dữ liệu phân trang (AJAX → JSON)
        public JsonResult LoadData(string khoa = "", string lop = "", int page = 1)
        {
            const int PAGE_SIZE = 5;

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
                                HoTen = sv.HoTen,
                                Lop = lopObj.TenLop,
                                Khoa = k.TenKhoa,
                                SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                            };

                if (!string.IsNullOrEmpty(khoa))
                    query = query.Where(x => x.Khoa == khoa);

                if (!string.IsNullOrEmpty(lop))
                    query = query.Where(x => x.Lop == lop);

                var allData = query.ToList(); // thực thi sớm để tránh deferred execution

                int tongSV = allData.Count();
                int daHoanThanh = allData.Count(x => x.SoNgay >= 18);
                int chuaHoanThanh = tongSV - daHoanThanh;
                double tienDo = tongSV > 0 ? Math.Round((double)daHoanThanh / tongSV * 100, 2) : 0;

                int totalPages = tongSV > 0 ? (int)Math.Ceiling((double)tongSV / PAGE_SIZE) : 1;
                page = page < 1 ? 1 : page;
                if (page > totalPages) page = totalPages;

                var listSV = allData
                    .OrderBy(x => x.MSSV)
                    .Skip((page - 1) * PAGE_SIZE)
                    .Take(PAGE_SIZE)
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
        // Xuất Excel bằng EPPlus
        public ActionResult ExportExcel(string khoa = "", string lop = "")
        {
            using (var db = DbContextFactory.Create())
            {
                var data = from sv in db.SinhViens
                           where sv.Deleted_at == null
                           join l in db.Lops on sv.Lop_id equals l.Lop_id
                           join k in db.Khoas on l.Khoa_id equals k.Khoa_id
                           join snld in db.SoNgayLaoDongs on sv.MSSV equals snld.MSSV into snldGroup
                           select new
                           {
                               sv.MSSV,
                               sv.HoTen,
                               Lop = l.TenLop,
                               Khoa = k.TenKhoa,
                               SoNgay = snldGroup.Sum(x => (int?)x.TongSoNgay) ?? 0
                           };

                if (!string.IsNullOrEmpty(khoa))
                    data = data.Where(x => x.Khoa == khoa);

                if (!string.IsNullOrEmpty(lop))
                    data = data.Where(x => x.Lop == lop);

                using (var package = new ExcelPackage())
                {
                    var ws = package.Workbook.Worksheets.Add("DanhSachSinhVien");

                    // Header
                    ws.Cells[1, 1].Value = "STT";
                    ws.Cells[1, 2].Value = "MSSV";
                    ws.Cells[1, 3].Value = "Họ tên";
                    ws.Cells[1, 4].Value = "Lớp";
                    ws.Cells[1, 5].Value = "Khoa";
                    ws.Cells[1, 6].Value = "Số ngày đã hoàn thành";

                    using (var range = ws.Cells[1, 1, 1, 6])
                    {
                        range.Style.Font.Bold = true;
                        range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                        range.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
                        range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                        range.Style.Border.BorderAround(ExcelBorderStyle.Thin);
                    }

                    // Nội dung
                    int row = 2;
                    int stt = 1;
                    foreach (var sv in data)
                    {
                        ws.Cells[row, 1].Value = stt;       // STT
                        ws.Cells[row, 2].Value = sv.MSSV;
                        ws.Cells[row, 3].Value = sv.HoTen;
                        ws.Cells[row, 4].Value = sv.Lop;
                        ws.Cells[row, 5].Value = sv.Khoa;
                        ws.Cells[row, 6].Value = sv.SoNgay;

                        ws.Cells[row, 1, row, 6].Style.Border.BorderAround(ExcelBorderStyle.Thin);
                        ws.Cells[row, 1, row, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                        row++;
                        stt++;
                    }

       

                    var stream = new MemoryStream();
                    package.SaveAs(stream);
                    stream.Position = 0;

                    return File(stream.ToArray(),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "DanhSachSinhVien.xlsx");
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
