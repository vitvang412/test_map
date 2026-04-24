using Microsoft.EntityFrameworkCore;
using DaNangSafeMap.Data;
using DaNangSafeMap.Models.Entities;

namespace DaNangSafeMap.Repositories
{
    /// <summary>
    /// Thực thi các thao tác với bảng Users.
    /// Dùng ApplicationDbContext để kết nối MySQL.
    /// </summary>
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        // ApplicationDbContext được inject tự động qua Dependency Injection
        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            // Tìm user theo email, không phân biệt hoa thường
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        }

        public async Task<User?> GetByGoogleIdAsync(string googleId)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.GoogleId == googleId);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Users
                .AnyAsync(u => u.Email.ToLower() == email.ToLower());
        }

        public async Task<User> CreateAsync(User user)
        {
            // Thêm user vào DbContext và lưu vào database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<User> UpdateAsync(User user)
        {
            // Đánh dấu user là đã thay đổi và lưu
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return user;
        }
    }
}
