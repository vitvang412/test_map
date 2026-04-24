namespace DaNangSafeMap.Models.ViewModels.Auth
{
    /// <summary>
    /// Kết quả trả về sau khi đăng nhập/đăng ký thành công hay thất bại
    /// </summary>
    public class AuthResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Token { get; set; }      // JWT token (null nếu thất bại)
        public UserDto? User { get; set; }      // Thông tin user (null nếu thất bại)
    }

    /// <summary>
    /// Thông tin user trả về cho frontend (không có PasswordHash)
    /// </summary>
    public class UserDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string Role { get; set; } = string.Empty;
        public string AuthProvider { get; set; } = string.Empty;
    }
}
