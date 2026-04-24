using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DaNangSafeMap.Models.Entities
{
    /// <summary>
    /// BẢNG CHÍNH — Mỗi dòng = 1 marker trên bản đồ Đà Nẵng.
    /// Chứa tọa độ GPS, trạng thái vòng đời, điểm tin cậy, và số xác nhận cộng đồng.
    /// </summary>
    [Table("SecurityAlerts")]
    public class SecurityAlert
    {
        [Key]
        public int Id { get; set; }

        // ── Người báo cáo ──
        [Required]
        public int UserId { get; set; }

        // ── Phân loại sự cố ──
        [Required]
        public int AlertTypeId { get; set; }

        // ── TỌA ĐỘ → vẽ marker trên bản đồ ──
        /// <summary>Vĩ độ (VD: 16.06778000 — Đà Nẵng)</summary>
        [Required]
        [Column(TypeName = "decimal(10, 8)")]
        public decimal Latitude { get; set; }

        /// <summary>Kinh độ (VD: 108.22083100 — Đà Nẵng)</summary>
        [Required]
        [Column(TypeName = "decimal(11, 8)")]
        public decimal Longitude { get; set; }

        /// <summary>Mô tả vị trí bằng text (VD: "Gần chợ Hàn, Q. Hải Châu")</summary>
        [MaxLength(500)]
        public string? AddressText { get; set; }

        // ── Nội dung báo cáo ──
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>Mô tả chi tiết ≥ 20 ký tự</summary>
        [Required]
        public string Description { get; set; } = string.Empty;

        /// <summary>Thời điểm sự cố thực tế xảy ra (KHÁC thời gian đăng tin)</summary>
        [Required]
        public DateTime IncidentTime { get; set; }

        // ── TRẠNG THÁI VÒNG ĐỜI (Lifecycle) ──
        /// <summary>
        /// PENDING_REVIEW       → Vừa đăng, chờ xác nhận
        /// VISIBLE_UNVERIFIED   → Hiển thị MỜ trên bản đồ
        /// VISIBLE_VERIFIED     → Hiển thị ĐẬM (≥3 xác nhận)
        /// RESOLVED             → Đã xử lý (icon xanh lá)
        /// REJECTED             → Admin bác bỏ
        /// EXPIRED              → Hết hạn, tự động ẩn
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "PENDING_REVIEW";

        // ── Điểm tin cậy (tính tự động khi đăng) ──
        /// <summary>
        /// Có ảnh +20, Uy tín cao +30, Mô tả dài +20, Tài khoản mới -20
        /// </summary>
        public int TrustScore { get; set; } = 0;

        // ── Thống kê xác nhận cộng đồng ──
        /// <summary>Số lượt "Tôi cũng ghi nhận sự việc này"</summary>
        public int ConfirmCount { get; set; } = 0;

        /// <summary>Số lượt "Tôi không còn ghi nhận sự việc này"</summary>
        public int DenyCount { get; set; } = 0;

        // ── Hiển thị trên bản đồ ──
        /// <summary>Độ mờ marker: 30 = mờ (chưa xác thực), 100 = đậm (đã xác thực)</summary>
        public int Opacity { get; set; } = 30;

        /// <summary>Có ảnh/video đính kèm không</summary>
        public bool HasMedia { get; set; } = false;

        /// <summary>Người dùng tick "Tôi xác nhận thông tin chính xác"</summary>
        public bool UserConfirmed { get; set; } = false;

        // ── Timestamps ──
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        /// <summary>Thời điểm chuyển sang RESOLVED (icon xanh lá)</summary>
        public DateTime? ResolvedAt { get; set; }

        /// <summary>Thời điểm tự động ẩn khỏi bản đồ</summary>
        public DateTime? ExpiresAt { get; set; }

        // ── Navigation Properties ──
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [ForeignKey("AlertTypeId")]
        public AlertType AlertType { get; set; } = null!;

        public ICollection<AlertMedia> Media { get; set; } = new List<AlertMedia>();
        public ICollection<AlertVerification> Verifications { get; set; } = new List<AlertVerification>();
    }
}
