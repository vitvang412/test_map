using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using DaNangSafeMap.Models.ViewModels.Auth;
using DaNangSafeMap.Services.Interfaces;

namespace DaNangSafeMap.Controllers
{
    [ApiController]
    [Route("api/account")]
    public class AccountController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AccountController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST /api/account/register
        // Đăng ký tài khoản mới bằng email/password
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _authService.RegisterAsync(model);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        // POST /api/account/login
        // Đăng nhập bằng email/password → trả về JWT token
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _authService.LoginAsync(model);

            if (!result.Success)
                return Unauthorized(result);

            return Ok(result);
        }

        // POST /api/account/google-login
        // Đăng nhập bằng Google → nhận ID Token từ frontend → trả về JWT
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (string.IsNullOrEmpty(request.IdToken))
                return BadRequest(new { Success = false, Message = "Token không hợp lệ" });

            var result = await _authService.GoogleLoginAsync(request.IdToken);

            if (!result.Success)
                return Unauthorized(result);

            return Ok(result);
        }

        // GET /api/account/profile
        // Lấy thông tin user đang đăng nhập (yêu cầu JWT token trong header)
        [HttpGet("profile")]
        [Authorize]
        public IActionResult Profile()
        {
            // Lấy thông tin từ JWT claims
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var name = User.FindFirst(ClaimTypes.Name)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            return Ok(new
            {
                Id = userId,
                Email = email,
                FullName = name,
                Role = role
            });
        }

        // POST /api/account/logout
        // Đăng xuất (frontend xóa token khỏi localStorage)
        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            // JWT là stateless nên chỉ cần frontend xóa token
            return Ok(new { Success = true, Message = "Đăng xuất thành công" });
        }
    }
}
