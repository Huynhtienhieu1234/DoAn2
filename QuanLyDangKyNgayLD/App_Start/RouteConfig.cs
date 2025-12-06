using System.Web.Mvc;
using System.Web.Routing;

namespace QuanLyDangKyNgayLD
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            // Route riêng cho Login (ưu tiên trước)
            routes.MapRoute(
                name: "Login",
                url: "Login/{action}/{id}",
                defaults: new { controller = "Login", action = "Login", id = UrlParameter.Optional },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );

            // Route mặc định cho toàn bộ ứng dụng
            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Login", action = "Login", id = UrlParameter.Optional },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );
        }
    }
}
