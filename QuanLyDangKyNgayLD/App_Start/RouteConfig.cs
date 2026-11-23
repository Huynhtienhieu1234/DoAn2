using System.Web.Mvc;
using System.Web.Routing;

namespace QuanLyDangKyNgayLD
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            // Route cho Swagger API Documentation
            routes.MapRoute(
                name: "SwaggerRoute",
                url: "swagger",
                defaults: new { controller = "Swagger", action = "Index" },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );

            routes.MapRoute(
                name: "SwaggerJsonRoute",
                url: "swagger/json",
                defaults: new { controller = "Swagger", action = "Spec" },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );

            // Route riêng cho Login (ưu tiên trước)
            routes.MapRoute(
                name: "LoginDirect",
                url: "Login",
                defaults: new { controller = "Login", action = "Login" },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );

            routes.MapRoute(
                name: "Login",
                url: "Login/{action}/{id}",
                defaults: new { controller = "Login", action = "Login", id = UrlParameter.Optional },
                namespaces: new[] { "QuanLyDangKyNgayLD.Controllers" }
            );

            // Route tương thích cho đường dẫn /Account cũ
            routes.MapRoute(
                name: "LegacyAccount",
                url: "Account/{action}/{id}",
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
