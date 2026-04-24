using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    /// <summary>
    /// Loại sự cố cụ thể - 7 loại:
    /// Trộm xe, Móc túi, Trộm đột nhập, Đua xe, Ẩu đả, Lừa đảo, Chặt chém giá
    /// </summary>
    [Table("AlertTypes")]
    public class AlertType
    {
        [Key]
        public int Id { get; set; }

        /// <summary>FK → AlertCategories (thuộc nhóm nào)</summary>
        [Required]
        public int CategoryId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Slug { get; set; } = string.Empty;

        /// <summary>Emoji icon hiển thị trên bản đồ (VD: "🏍️", "👛")</summary>
        [MaxLength(10)]
        public string? IconEmoji { get; set; }

        /// <summary>URL icon tùy chỉnh (nếu không dùng emoji)</summary>
        [MaxLength(500)]
        public string? IconUrl { get; set; }

        public int SortOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // ── Navigation ──
        [ForeignKey("CategoryId")]
        public AlertCategory Category { get; set; } = null!;

        public ICollection<SecurityAlert> SecurityAlerts { get; set; } = new List<SecurityAlert>();
    }
}
