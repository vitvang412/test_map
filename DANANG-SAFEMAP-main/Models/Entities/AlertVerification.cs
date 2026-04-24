using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    /// <summary>
    /// Xác nhận cộng đồng cho sự cố.
    /// Mỗi user chỉ xác nhận 1 lần / alert, cho phép đổi ý 1 lần.
    /// CONFIRM = "Tôi cũng ghi nhận sự việc này"
    /// DENY    = "Tôi không còn ghi nhận sự việc này"
    /// </summary>
    [Table("AlertVerifications")]
    public class AlertVerification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AlertId { get; set; }

        [Required]
        public int UserId { get; set; }

        /// <summary>"CONFIRM" hoặc "DENY"</summary>
        [Required]
        [MaxLength(10)]
        public string VerificationType { get; set; } = string.Empty;

        /// <summary>Vị trí người xác nhận (kiểm tra "ở gần")</summary>
        [Column(TypeName = "decimal(10, 8)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(11, 8)")]
        public decimal? Longitude { get; set; }

        /// <summary>Ghi chú bổ sung (tùy chọn)</summary>
        public string? Comment { get; set; }

        /// <summary>Lưu loại cũ khi đổi ý (NULL = chưa đổi ý, có giá trị = đã đổi 1 lần)</summary>
        [MaxLength(10)]
        public string? PreviousType { get; set; }

        /// <summary>Thời điểm đổi ý</summary>
        public DateTime? ChangedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // ── Navigation ──
        [ForeignKey("AlertId")]
        public SecurityAlert Alert { get; set; } = null!;

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
    }
}
