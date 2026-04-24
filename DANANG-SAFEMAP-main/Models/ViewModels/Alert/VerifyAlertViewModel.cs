using System.ComponentModel.DataAnnotations;

namespace DaNangSafeMap.Models.ViewModels.Alert
{
    /// <summary>
    /// ViewModel nhận dữ liệu xác nhận/phản bác cộng đồng.
    /// </summary>
    public class VerifyAlertViewModel
    {
        /// <summary>"CONFIRM" hoặc "DENY"</summary>
        [Required]
        public string VerificationType { get; set; } = string.Empty;

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string? Comment { get; set; }
    }
}
