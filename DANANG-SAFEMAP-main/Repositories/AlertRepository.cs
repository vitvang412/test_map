using Microsoft.EntityFrameworkCore;
using DaNangSafeMap.Data;
using DaNangSafeMap.Models.Entities;

namespace DaNangSafeMap.Repositories
{
    /// <summary>
    /// Thực thi các thao tác với SecurityAlerts và bảng liên quan.
    /// </summary>
    public class AlertRepository : IAlertRepository
    {
        private readonly ApplicationDbContext _context;

        public AlertRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ═══════════════════════════════════════════════
        // ALERT TYPES
        // ═══════════════════════════════════════════════

        public async Task<List<AlertType>> GetAlertTypesAsync()
        {
            return await _context.AlertTypes
                .Include(t => t.Category)
                .Where(t => t.IsActive && t.Category.IsActive)
                .OrderBy(t => t.SortOrder)
                .ToListAsync();
        }

        // ═══════════════════════════════════════════════
        // CRUD ALERTS
        // ═══════════════════════════════════════════════

        public async Task<SecurityAlert> CreateAlertAsync(SecurityAlert alert)
        {
            _context.SecurityAlerts.Add(alert);
            await _context.SaveChangesAsync();
            return alert;
        }

        public async Task<SecurityAlert?> GetByIdAsync(int id)
        {
            return await _context.SecurityAlerts.FindAsync(id);
        }

        public async Task<SecurityAlert?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.SecurityAlerts
                .Include(a => a.AlertType)
                    .ThenInclude(t => t.Category)
                .Include(a => a.User)
                .Include(a => a.Media.Where(m => m.IsActive))
                .Include(a => a.Verifications)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task UpdateAlertAsync(SecurityAlert alert)
        {
            _context.SecurityAlerts.Update(alert);
            await _context.SaveChangesAsync();
        }

        // ═══════════════════════════════════════════════
        // MAP QUERIES
        // ═══════════════════════════════════════════════

        public async Task<List<SecurityAlert>> GetAlertsForMapAsync(
            decimal southLat, decimal northLat,
            decimal westLng, decimal eastLng,
            DateTime fromTime, DateTime toTime)
        {
            return await _context.SecurityAlerts
                .Include(a => a.AlertType)
                    .ThenInclude(t => t.Category)
                .Include(a => a.User)
                .Include(a => a.Media.Where(m => m.IsActive))
                .Where(a =>
                    // ✅ VISIBLE_VERIFIED: Admin đã duyệt → luôn hiển thị (bỏ qua time filter)
                    (a.Status == "VISIBLE_VERIFIED"
                        && a.Latitude >= southLat && a.Latitude <= northLat
                        && a.Longitude >= westLng && a.Longitude <= eastLng)
                    ||
                    // ⏳ VISIBLE_UNVERIFIED: Mới đăng → marker mờ, lọc theo thời gian
                    (a.Status == "VISIBLE_UNVERIFIED"
                        && a.Latitude >= southLat && a.Latitude <= northLat
                        && a.Longitude >= westLng && a.Longitude <= eastLng
                        && a.IncidentTime >= fromTime && a.IncidentTime <= toTime)
                    ||
                    // 🕐 PENDING_REVIEW: Dữ liệu cũ, cũng hiện mờ để cộng đồng xác nhận
                    (a.Status == "PENDING_REVIEW"
                        && a.Latitude >= southLat && a.Latitude <= northLat
                        && a.Longitude >= westLng && a.Longitude <= eastLng
                        && a.IncidentTime >= fromTime && a.IncidentTime <= toTime)
                )
                .OrderByDescending(a => a.CreatedAt)
                .Take(500)
                .ToListAsync();
        }

        public async Task<List<SecurityAlert>> GetHeatmapDataAsync(
            DateTime fromTime, DateTime toTime)
        {
            return await _context.SecurityAlerts
                .Where(a => a.Status == "VISIBLE_UNVERIFIED" || a.Status == "VISIBLE_VERIFIED")
                .Where(a => a.IncidentTime >= fromTime && a.IncidentTime <= toTime)
                .Select(a => new SecurityAlert
                {
                    Latitude = a.Latitude,
                    Longitude = a.Longitude,
                    TrustScore = a.TrustScore,
                    ConfirmCount = a.ConfirmCount
                })
                .ToListAsync();
        }

        // ═══════════════════════════════════════════════
        // MEDIA
        // ═══════════════════════════════════════════════

        public async Task<AlertMedia> AddMediaAsync(AlertMedia media)
        {
            _context.AlertMedia.Add(media);
            await _context.SaveChangesAsync();
            return media;
        }

        // ═══════════════════════════════════════════════
        // VERIFICATIONS
        // ═══════════════════════════════════════════════

        public async Task<AlertVerification?> GetVerificationAsync(int alertId, int userId)
        {
            return await _context.AlertVerifications
                .FirstOrDefaultAsync(v => v.AlertId == alertId && v.UserId == userId);
        }

        public async Task AddVerificationAsync(AlertVerification verification)
        {
            _context.AlertVerifications.Add(verification);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateVerificationAsync(AlertVerification verification)
        {
            _context.AlertVerifications.Update(verification);
            await _context.SaveChangesAsync();
        }

        // ═══════════════════════════════════════════════
        // AUTO-EXPIRE
        // ═══════════════════════════════════════════════

        public async Task<List<SecurityAlert>> GetExpiredAlertsAsync()
        {
            var now = DateTime.Now;
            return await _context.SecurityAlerts
                .Where(a =>
                    // Không ảnh + 0 xác nhận + quá 24h
                    (a.Status == "VISIBLE_UNVERIFIED" && !a.HasMedia
                        && a.ConfirmCount == 0 && a.CreatedAt < now.AddHours(-24))
                    ||
                    // Có ảnh nhưng 0 xác nhận + quá 48h
                    (a.Status == "VISIBLE_UNVERIFIED" && a.HasMedia
                        && a.ConfirmCount == 0 && a.CreatedAt < now.AddHours(-48))
                    ||
                    // PENDING quá 24h
                    (a.Status == "PENDING_REVIEW" && a.CreatedAt < now.AddHours(-24))
                    ||
                    // RESOLVED quá 24h
                    (a.Status == "RESOLVED" && a.ResolvedAt != null
                        && a.ResolvedAt < now.AddHours(-24))
                )
                .ToListAsync();
        }

        // ═══════════════════════════════════════════════
        // CLUSTERING CHECK
        // ═══════════════════════════════════════════════

        public async Task<int> CountNearbyAlertsAsync(
            decimal lat, decimal lng, int alertTypeId, int withinMinutes)
        {
            var since = DateTime.Now.AddMinutes(-withinMinutes);
            // ~200m ≈ 0.0018 degrees
            const decimal radius = 0.0018m;

            return await _context.SecurityAlerts
                .Where(a => a.AlertTypeId == alertTypeId)
                .Where(a => a.Status != "REJECTED" && a.Status != "EXPIRED")
                .Where(a => Math.Abs(a.Latitude - lat) < radius)
                .Where(a => Math.Abs(a.Longitude - lng) < radius)
                .Where(a => a.CreatedAt >= since)
                .CountAsync();
        }
        // ═══════════════════════════════════════════════
        // MY REPORTS
        // ═══════════════════════════════════════════════

        public async Task<List<SecurityAlert>> GetAlertsByUserAsync(int userId)
        {
            return await _context.SecurityAlerts
                .Include(a => a.AlertType)
                    .ThenInclude(t => t.Category)
                .Include(a => a.Media.Where(m => m.IsActive))
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        // ═══════════════════════════════════════════════
        // ADMIN MANAGEMENT
        // ═══════════════════════════════════════════════

        public async Task<List<SecurityAlert>> GetPendingAlertsAsync()
        {
            return await _context.SecurityAlerts
                .Include(a => a.AlertType)
                    .ThenInclude(t => t.Category)
                .Include(a => a.User)
                .Include(a => a.Media.Where(m => m.IsActive))
                // Lấy cả PENDING_REVIEW (cũ) và VISIBLE_UNVERIFIED (đang chờ Admin duyệt thêm)
                .Where(a => a.Status == "VISIBLE_UNVERIFIED" || a.Status == "PENDING_REVIEW")
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<SecurityAlert>> GetAllAlertsForAdminAsync(
            string? status, int page, int pageSize)
        {
            var query = _context.SecurityAlerts
                .Include(a => a.AlertType)
                    .ThenInclude(t => t.Category)
                .Include(a => a.User)
                .Include(a => a.Media.Where(m => m.IsActive))
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> CountAllAlertsAsync(string? status)
        {
            var query = _context.SecurityAlerts.AsQueryable();
            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);
            return await query.CountAsync();
        }
    }
}
