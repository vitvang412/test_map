using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace DaNangSafeMap.Controllers
{
    // Yêu cầu quyền Admin cho toàn bộ controller này
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
        // GET: /Admin
        // GET: /Admin/Dashboard
        [HttpGet]
        public IActionResult Dashboard()
        {
            return View();
        }

        // GET: /Admin/AlertModeration — Duyệt báo cáo sự cố
        [HttpGet]
        public IActionResult AlertModeration()
        {
            return View();
        }

        // POST: /Admin/Logout
        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            // Xóa session cookie ở server-side
            await HttpContext.SignOutAsync();
            
            // Xóa token lưu ở cookie (nếu dùng JWT Cookie Middleware)
            Response.Cookies.Delete("jwtToken");

            // Redirect về trang đăng nhập
            return RedirectToAction("Login", "Auth");
        }
    }
}
