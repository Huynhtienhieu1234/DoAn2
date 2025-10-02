using System.Web.Mvc;

namespace QuanLyDangKyNgayLD.Areas.LopPhoLaoDong
{
    public class LopPhoLaoDongAreaRegistration : AreaRegistration 
    {
        public override string AreaName 
        {
            get 
            {
                return "LopPhoLaoDong";
            }
        }

        public override void RegisterArea(AreaRegistrationContext context) 
        {
            context.MapRoute(
                "LopPhoLaoDong_default",
                "LopPhoLaoDong/{controller}/{action}/{id}",
                new { action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}