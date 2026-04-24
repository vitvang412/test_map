namespace DaNangSafeMap.Models.ViewModels.Alert
{
    /// <summary>
    /// DTO trả về dữ liệu marker cho bản đồ (JSON nhẹ, chỉ chứa thông tin cần hiển thị).
    /// </summary>
    public class AlertMapDto
    {
        public int Id { get; set; }
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? AddressText { get; set; }
        public DateTime IncidentTime { get; set; }

        // Phân loại
        public int AlertTypeId { get; set; }
        public string AlertTypeName { get; set; } = string.Empty;
        public string AlertTypeSlug { get; set; } = string.Empty;
        public string? IconEmoji { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryColor { get; set; } = string.Empty;

        // Hiển thị
        public string Status { get; set; } = string.Empty;
        public int Opacity { get; set; }
        public int ConfirmCount { get; set; }
        public int DenyCount { get; set; }
        public bool HasMedia { get; set; }
        public int TrustScore { get; set; }

        // Ảnh
        public List<string> MediaUrls { get; set; } = new();

        // Người đăng
        public string UserName { get; set; } = string.Empty;
        public int UserReputationScore { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
