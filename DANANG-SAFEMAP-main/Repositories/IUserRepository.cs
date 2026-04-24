using DaNangSafeMap.Models.Entities;

namespace DaNangSafeMap.Repositories
{
    /// <summary>
    /// Interface định nghĩa các thao tác với bảng Users trong database.
    /// Tầng này chỉ lo việc đọc/ghi database, không chứa business logic.
    /// </summary>
    public interface IUserRepository
    {
        // Tìm user theo ID
        Task<User?> GetByIdAsync(int id);

        // Tìm user theo email (dùng khi đăng nhập)
        Task<User?> GetByEmailAsync(string email);

        // Tìm user theo Google ID (dùng khi đăng nhập bằng Google)
        Task<User?> GetByGoogleIdAsync(string googleId);

        // Kiểm tra email đã tồn tại chưa (dùng khi đăng ký)
        Task<bool> EmailExistsAsync(string email);

        // Tạo user mới (đăng ký)
        Task<User> CreateAsync(User user);

        // Cập nhật thông tin user (ví dụ: LastLoginAt)
        Task<User> UpdateAsync(User user);
    }
}
