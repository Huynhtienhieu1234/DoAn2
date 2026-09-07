using System;
using System.Linq;
using System.Web.Mvc;
using System.Data.Entity;
using System.Collections.Generic;
using QuanLyDangKyNgayLD.Factories;
using QuanLyDangKyNgayLD.Models;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class ChatBotController : Controller
    {
        // Helper lấy sinh viên hiện tại an toàn
        private SinhVien GetCurrentSinhVien(DB_QLNLD4ROLEEntities1 db)
        {
            if (Session["MSSV"] != null && long.TryParse(Session["MSSV"].ToString(), out long mssvSession))
            {
                var sv = db.SinhViens.Include(s => s.Lop.Khoa).Include(s => s.TaiKhoan1).FirstOrDefault(s => s.MSSV == mssvSession && s.Deleted_at == null);
                if (sv != null) return sv;
            }

            int userId = 0;
            if (Session["UserID"] != null && int.TryParse(Session["UserID"].ToString(), out userId))
            {
                var sv = db.SinhViens.Include(s => s.Lop.Khoa).Include(s => s.TaiKhoan1).FirstOrDefault(s => s.TaiKhoan == userId && s.Deleted_at == null);
                if (sv != null) return sv;
            }

            string username = Session["Username"]?.ToString()?.Trim();
            if (!string.IsNullOrEmpty(username))
            {
                string trimmedZero = username.TrimStart('0');
                string withZero = "0" + username;
                var user = db.TaiKhoans.FirstOrDefault(tk => tk.Username == username || (trimmedZero.Length > 0 && tk.Username == trimmedZero) || tk.Username == withZero);
                if (user != null)
                {
                    var sv = db.SinhViens.Include(s => s.Lop.Khoa).Include(s => s.TaiKhoan1).FirstOrDefault(s => s.TaiKhoan == user.TaiKhoan_id && s.Deleted_at == null);
                    if (sv != null) return sv;
                }

                if (long.TryParse(username, out long mssvFromUser))
                {
                    var sv = db.SinhViens.Include(s => s.Lop.Khoa).Include(s => s.TaiKhoan1).FirstOrDefault(s => s.MSSV == mssvFromUser && s.Deleted_at == null);
                    if (sv != null) return sv;
                }
            }

            return null;
        }

        // 1. API Lấy tiến độ số ngày công đã hoàn thành
        [HttpGet]
        public JsonResult GetCompletedDays()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = GetCurrentSinhVien(db);
                    if (sv == null)
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Vui lòng đăng nhập lại để tra cứu thông tin."
                        }, JsonRequestBehavior.AllowGet);
                    }

                    // Tính số ngày hoàn thành từ bảng SoNgayLaoDong
                    int soNgayTichLuy = db.SoNgayLaoDongs.Where(x => x.MSSV == sv.MSSV).Sum(x => (int?)x.TongSoNgay) ?? 0;
                    
                    // Điểm danh thực tế nếu chưa tổng kết vào SoNgayLaoDong
                    int diemDanhCount = db.DanhSachDiemDanhs
                        .Where(dd => dd.MSSV == sv.MSSV)
                        .Select(dd => DbFunctions.TruncateTime(dd.ThoiGian))
                        .Distinct()
                        .Count();

                    int completedDays = Math.Max(soNgayTichLuy, diemDanhCount);
                    int targetDays = 18; // Mục tiêu chuẩn 18 buổi/ngày theo quy định
                    int remainingDays = Math.Max(0, targetDays - completedDays);
                    double percent = Math.Min(100.0, Math.Round((double)completedDays / targetDays * 100.0, 1));
                    bool isFinished = completedDays >= targetDays;

                    string mssvDisplay = sv.TaiKhoan1?.Username ?? sv.MSSV.ToString();

                    return Json(new
                    {
                        success = true,
                        studentName = sv.HoTen ?? "Sinh viên",
                        mssv = mssvDisplay,
                        lop = sv.Lop != null ? sv.Lop.TenLop : "Chưa có lớp",
                        khoa = sv.Lop?.Khoa != null ? sv.Lop.Khoa.TenKhoa : "Chưa có khoa",
                        completedDays = completedDays,
                        targetDays = targetDays,
                        remainingDays = remainingDays,
                        percent = percent,
                        isFinished = isFinished,
                        message = isFinished
                            ? $"🎉 Chúc mừng bạn đã hoàn thành xuất sắc {completedDays}/{targetDays} ngày lao động ({percent}%)!"
                            : $"📊 Bạn đã tích lũy được {completedDays}/{targetDays} ngày lao động ({percent}%). Còn thiếu {remainingDays} ngày để hoàn thành nghĩa vụ."
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Lỗi hệ thống: " + ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        // Hỗ trợ alias URL cũ nếu có
        [HttpGet]
        public JsonResult GetCompletedDay()
        {
            return GetCompletedDays();
        }

        // 2. API Lấy danh sách lịch lao động sắp tới của sinh viên
        [HttpGet]
        public JsonResult GetUpcomingSchedule()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var sv = GetCurrentSinhVien(db);
                    if (sv == null)
                    {
                        return Json(new { success = false, message = "Vui lòng đăng nhập lại." }, JsonRequestBehavior.AllowGet);
                    }

                    var today = DateTime.Today;

                    var schedules = db.PhieuDangKies
                        .Include(p => p.TaoDotNgayLaoDong)
                        .Where(p => p.MSSV == sv.MSSV && p.TrangThai == "DangKy" && p.TaoDotNgayLaoDong != null && p.TaoDotNgayLaoDong.Ngayxoa == null)
                        .OrderBy(p => p.TaoDotNgayLaoDong.NgayLaoDong)
                        .ToList()
                        .Select(p => new
                        {
                            DotId = p.TaoDotLaoDong_id,
                            NgayLaoDong = p.TaoDotNgayLaoDong.NgayLaoDong.HasValue ? p.TaoDotNgayLaoDong.NgayLaoDong.Value.ToString("dd/MM/yyyy") : "Chưa xác định",
                            NgayDate = p.TaoDotNgayLaoDong.NgayLaoDong,
                            Buoi = p.TaoDotNgayLaoDong.Buoi ?? "Sáng",
                            KhuVuc = p.TaoDotNgayLaoDong.KhuVuc ?? "Khuôn viên trường",
                            LoaiLaoDong = (p.LaoDongTheoLop == true) ? "Theo lớp" : "Cá nhân",
                            TrangThaiDuyet = p.TaoDotNgayLaoDong.TrangThaiDuyet == true ? "Đã duyệt" : "Chờ duyệt",
                            GiaTri = p.TaoDotNgayLaoDong.GiaTri ?? 1,
                            IsPast = p.TaoDotNgayLaoDong.NgayLaoDong.HasValue && p.TaoDotNgayLaoDong.NgayLaoDong.Value.Date < today
                        })
                        .ToList();

                    var upcoming = schedules.Where(s => !s.IsPast).ToList();

                    return Json(new
                    {
                        success = true,
                        total = schedules.Count,
                        upcomingCount = upcoming.Count,
                        schedules = upcoming
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
