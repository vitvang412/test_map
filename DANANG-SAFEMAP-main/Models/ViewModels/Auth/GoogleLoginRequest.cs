using System.ComponentModel.DataAnnotations;

namespace DaNangSafeMap.Models.ViewModels.Auth
{
    /// <summary>
    /// Nhận ID Token từ Google sau khi người dùng đăng nhập bằng Google
    /// </summary>
    public class GoogleLoginRequest
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}
