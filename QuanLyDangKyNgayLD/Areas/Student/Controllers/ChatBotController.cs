using System;
using System.Linq;
using System.Web.Mvc;
using System.Data.Entity;
using QuanLyDangKyNgayLD.Factories;

namespace QuanLyDangKyNgayLD.Areas.Student.Controllers
{
    public class ChatBotController : Controller
    {
        [HttpGet]
        public JsonResult GetCompletedDays()
        {
            try
            {
                using (var db = DbContextFactory.Create())
                {
                    var mssvStr = Session["MSSV"]?.ToString();
                    if (string.IsNullOrEmpty(mssvStr))
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Phiên đăng nhập đã hết hạn."
                        }, JsonRequestBehavior.AllowGet);
                    }

                    if (!long.TryParse(mssvStr, out long mssv))
                    {
                        return Json(new
                        {
                            success = false,
                            message = "MSSV không hợp lệ."
                        }, JsonRequestBehavior.AllowGet);
                    }

                    var completedDays = db.DanhSachDiemDanhs
                        .Where(dd => dd.MSSV == mssv)
                        .Select(dd => DbFunctions.TruncateTime(dd.ThoiGian))
                        .Distinct()
                        .Count();

                    return Json(new
                    {
                        success = true,
                        completedDays = completedDays,
                        message = $"Bạn đã hoàn thành {completedDays} ngày lao động."
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}
