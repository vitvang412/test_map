using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    /// <summary>
    /// Ảnh/Video đính kèm báo cáo sự cố.
    /// Có thể là ảnh gốc từ người báo (ORIGINAL) hoặc từ người xác nhận (VERIFICATION).
    /// </summary>
    [Table("AlertMedia")]
    public class AlertMedia
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AlertId { get; set; }

        [Required]
        public int UserId { get; set; }

        /// <summary>"IMAGE" hoặc "VIDEO"</summary>
        [Required]
        [MaxLength(10)]
        public string MediaType { get; set; } = "IMAGE";

        /// <summary>Đường dẫn lưu trên server (VD: /uploads/alerts/1/abc.jpg)</summary>
        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>Kích thước file (bytes)</summary>
        public long? FileSize { get; set; }

        /// <summary>
        /// ORIGINAL     → Ảnh gốc từ người báo cáo
        /// VERIFICATION → Ảnh bổ sung từ người xác nhận cộng đồng
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string SourceType { get; set; } = "ORIGINAL";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // ── Navigation ──
        [ForeignKey("AlertId")]
        public SecurityAlert Alert { get; set; } = null!;

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
    }
}
