using DaNangSafeMap.Models.Entities;
using DaNangSafeMap.Models.ViewModels.Alert;
using Microsoft.AspNetCore.Http;

namespace DaNangSafeMap.Services.Interfaces
{
    /// <summary>
    /// Interface cho AlertService — chứa business logic bản đồ + báo cáo sự cố.
    /// </summary>
    public interface IAlertService
    {
        // ── NV2: Lấy danh sách loại sự cố ──
        Task<List<AlertTypeDto>> GetAlertTypesAsync();

        // ── NV4: Tạo báo cáo mới ──
        Task<SecurityAlert> CreateAlertAsync(CreateAlertViewModel model, int userId);
        Task<AlertMedia> UploadMediaAsync(int alertId, int userId, IFormFile file);

        // ── NV5: Lấy dữ liệu bản đồ ──
        Task<List<AlertMapDto>> GetAlertsForMapAsync(
            decimal southLat, decimal northLat,
            decimal westLng, decimal eastLng,
            DateTime fromTime, DateTime toTime);
        Task<AlertMapDto?> GetAlertDetailAsync(int alertId);
        Task<List<object>> GetHeatmapDataAsync(DateTime fromTime, DateTime toTime);

        // ── NV6: Xác nhận cộng đồng ──
        Task<(bool Success, string Message)> VerifyAlertAsync(
            int alertId, int userId, VerifyAlertViewModel model);

        // ── NV8: Auto-expire ──
        Task ProcessExpiredAlertsAsync();

        // ── My Reports ──
        Task<List<AlertMapDto>> GetMyAlertsAsync(int userId);

        // ── Admin ──
        Task<List<AlertMapDto>> GetPendingAlertsAsync();
        Task<(List<AlertMapDto> Items, int Total)> GetAllAlertsForAdminAsync(string? status, int page, int pageSize);
        Task<bool> ApproveAlertAsync(int alertId, int adminUserId);
        Task<bool> RejectAlertAsync(int alertId, int adminUserId, string reason);
    }
}
