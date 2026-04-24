using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        // Thông tin cá nhân
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        public DateOnly? DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? Gender { get; set; }  // "Nam", "Nữ", "Khác"

        [MaxLength(255)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? Avatar { get; set; }

        // Đăng nhập
        [Required]
        [MaxLength(255)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? PasswordHash { get; set; }  // NULL nếu đăng nhập Google

        // Google OAuth
        [MaxLength(255)]
        public string? GoogleId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AuthProvider { get; set; } = "Local";  // "Local" hoặc "Google"

        // Phân quyền
        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "User";  // "Admin", "Moderator", "User"

        // Trạng thái
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? LastLoginAt { get; set; }

        // ── Điểm uy tín cộng đồng (1-10) ──
        /// <summary>
        /// Điểm uy tín: 1-2 (mới), 3-5 (thành viên), 6-8 (tin cậy), 9-10 (uy tín)
        /// Ảnh hưởng đến độ hiển thị tin và quyền hạn trên bản đồ.
        /// </summary>
        public int ReputationScore { get; set; } = 5;

        // ── Navigation ──
        public ICollection<SecurityAlert>? SecurityAlerts { get; set; }
    }
}
