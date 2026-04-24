using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DaNangSafeMap.Controllers
{
    public class MapController : Controller
    {
        private readonly IConfiguration _configuration;

        public MapController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public IActionResult Index()
        {
            // Đọc 2 key riêng biệt từ appsettings.json:
            // - MaptileKey: dùng cho goongjs.accessToken (hiển thị bản đồ nền)
            // - RestApiKey: dùng cho REST API (Geocoding, Directions, Places...)
            ViewData["GoongMaptileKey"] = _configuration["GoongMaps:MaptileKey"];
            ViewData["GoongRestApiKey"]  = _configuration["GoongMaps:RestApiKey"];
            return View();
        }

        [Authorize]
        public IActionResult MyReports()
        {
            return View();
        }
    }
}
