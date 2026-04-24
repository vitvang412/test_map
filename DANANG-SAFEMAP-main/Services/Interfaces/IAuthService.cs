using DaNangSafeMap.Models.ViewModels.Auth;

namespace DaNangSafeMap.Services.Interfaces
{
    /// <summary>
    /// Interface định nghĩa các chức năng xác thực người dùng.
    /// AuthService sẽ implement interface này.
    /// </summary>
    public interface IAuthService
    {
        // Đăng ký tài khoản mới bằng email/password
        Task<AuthResponse> RegisterAsync(RegisterViewModel model);

        // Đăng nhập bằng email/password
        Task<AuthResponse> LoginAsync(LoginViewModel model);

        // Đăng nhập bằng Google (nhận ID Token từ frontend)
        Task<AuthResponse> GoogleLoginAsync(string idToken);

        // Tạo JWT token từ thông tin user
        string GenerateJwtToken(Models.Entities.User user);
    }
}
