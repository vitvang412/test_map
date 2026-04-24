namespace DaNangSafeMap.Models.ViewModels.Alert
{
    /// <summary>
    /// DTO trả về danh sách loại sự cố cho dropdown form báo cáo + legend bản đồ.
    /// </summary>
    public class AlertTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? IconEmoji { get; set; }
        public string? IconUrl { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryColor { get; set; } = string.Empty;
        public int CategoryId { get; set; }
    }
}
