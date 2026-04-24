using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    /// <summary>
    /// Nhóm sự cố - 3 nhóm chính:
    /// 1. Xâm phạm Sở hữu (property_crime)
    /// 2. Trật tự An toàn Xã hội (public_disorder)
    /// 3. An ninh Du lịch & Lừa đảo (tourism_security)
    /// </summary>
    [Table("AlertCategories")]
    public class AlertCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Slug { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Mã màu HEX cho marker trên bản đồ (VD: "#E74C3C")
        /// </summary>
        [Required]
        [MaxLength(7)]
        public string ColorHex { get; set; } = "#FF6B6B";

        public int SortOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // ── Navigation: 1 Category → nhiều AlertType ──
        public ICollection<AlertType> AlertTypes { get; set; } = new List<AlertType>();
    }
}
