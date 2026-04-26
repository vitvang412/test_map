using DaNangSafeMap.Models.Entities;

namespace DaNangSafeMap.Repositories
{
    /// <summary>
    /// Interface định nghĩa các thao tác với bảng SecurityAlerts và liên quan.
    /// </summary>
    public interface IAlertRepository
    {
        // ── Alert Types (NV2) ──
        Task<List<AlertType>> GetAlertTypesAsync();

        // ── CRUD Alerts (NV4) ──
        Task<SecurityAlert> CreateAlertAsync(SecurityAlert alert);
        Task<SecurityAlert?> GetByIdAsync(int id);
        Task<SecurityAlert?> GetByIdWithDetailsAsync(int id);
        Task UpdateAlertAsync(SecurityAlert alert);

        // ── Map Queries (NV5) ──
        Task<List<SecurityAlert>> GetAlertsForMapAsync(
            decimal southLat, decimal northLat,
            decimal westLng, decimal eastLng,
            DateTime fromTime, DateTime toTime);

        Task<List<SecurityAlert>> GetHeatmapDataAsync(
            DateTime fromTime, DateTime toTime);

        // ── Media (NV4) ──
        Task<AlertMedia> AddMediaAsync(AlertMedia media);

        // ── Verifications (NV6) ──
        Task<AlertVerification?> GetVerificationAsync(int alertId, int userId);
        Task AddVerificationAsync(AlertVerification verification);
        Task UpdateVerificationAsync(AlertVerification verification);

        // ── Auto-expire (NV8) ──
        Task<List<SecurityAlert>> GetExpiredAlertsAsync();

        // ── Clustering check (NV4) ──
        Task<int> CountNearbyAlertsAsync(decimal lat, decimal lng, int alertTypeId, int withinMinutes);

        // ── My Reports: Lấy alerts của 1 user ──
        Task<List<SecurityAlert>> GetAlertsByUserAsync(int userId);

        // ── Admin: Lấy danh sách chờ duyệt ──
        Task<List<SecurityAlert>> GetPendingAlertsAsync();

        // ── Admin: Lấy tất cả alerts (có phân trang) ──
        Task<List<SecurityAlert>> GetAllAlertsForAdminAsync(string? status, int page, int pageSize);
        Task<int> CountAllAlertsAsync(string? status);

        // ── Notifications ──
        Task CreateNotificationAsync(Notification notification);
    }
}
