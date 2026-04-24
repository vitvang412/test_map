using Microsoft.AspNetCore.Mvc;

namespace DaNangSafeMap.Controllers
{
    /// <summary>
    /// MVC Controller để serve các trang Login/Register (trả về View).
    /// Tách biệt với AccountController (API) để tránh conflict.
    /// </summary>
    [Route("[controller]")]
    public class AuthController : Controller
    {
        // GET /Auth/Login
        [HttpGet("Login")]
        public IActionResult Login()
        {
            return View("~/Views/Account/Login.cshtml");
        }

        // GET /Auth/Register
        [HttpGet("Register")]
        public IActionResult Register()
        {
            return View("~/Views/Account/Register.cshtml");
        }

        // GET /Auth/Profile
        [HttpGet("Profile")]
        public IActionResult Profile()
        {
            return View("~/Views/Account/Profile.cshtml");
        }
    }
}
