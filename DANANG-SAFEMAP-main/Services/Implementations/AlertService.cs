using DaNangSafeMap.Models.Entities;
using DaNangSafeMap.Models.ViewModels.Alert;
using DaNangSafeMap.Repositories;
using DaNangSafeMap.Services.Interfaces;

namespace DaNangSafeMap.Services.Implementations
{
    /// <summary>
    /// Business logic cho bản đồ + báo cáo sự cố.
    /// Tính TrustScore, Opacity, xử lý xác nhận cộng đồng, auto-expire.
    /// </summary>
    public class AlertService : IAlertService
    {
        private readonly IAlertRepository _alertRepo;
        private readonly IUserRepository _userRepo;
        private readonly IWebHostEnvironment _env;

        public AlertService(
            IAlertRepository alertRepo,
            IUserRepository userRepo,
            IWebHostEnvironment env)
        {
            _alertRepo = alertRepo;
            _userRepo = userRepo;
            _env = env;
        }

        // ═══════════════════════════════════════════════
        // NV2: LẤY DANH SÁCH LOẠI SỰ CỐ
        // ═══════════════════════════════════════════════

        public async Task<List<AlertTypeDto>> GetAlertTypesAsync()
        {
            var types = await _alertRepo.GetAlertTypesAsync();
            return types.Select(t => new AlertTypeDto
            {
                Id = t.Id,
                Name = t.Name,
                Slug = t.Slug,
                IconEmoji = t.IconEmoji,
                IconUrl = t.IconUrl,
                CategoryId = t.CategoryId,
                CategoryName = t.Category.Name,
                CategoryColor = t.Category.ColorHex
            }).ToList();
        }

        // ═══════════════════════════════════════════════
        // NV4: TẠO BÁO CÁO MỚI
        // ═══════════════════════════════════════════════

        public async Task<SecurityAlert> CreateAlertAsync(CreateAlertViewModel model, int userId)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null) throw new Exception("Không tìm thấy người dùng");

            // ── Tính TrustScore ──
            int trustScore = 0;
            if (user.ReputationScore >= 7) trustScore += 30;
            if (model.Description.Length >= 100) trustScore += 20;
            if ((DateTime.Now - user.CreatedAt).TotalDays < 7) trustScore -= 20;

            // ── Tạo entity ──
            var alert = new SecurityAlert
            {
                UserId = userId,
                AlertTypeId = model.AlertTypeId,
                Latitude = model.Latitude,
                Longitude = model.Longitude,
                AddressText = model.AddressText,
                Title = model.Title,
                Description = model.Description,
                IncidentTime = model.IncidentTime,
                UserConfirmed = model.UserConfirmed,
                Status = "VISIBLE_UNVERIFIED", // NV2: Hiện lên map ngay lập tức
                TrustScore = trustScore,
                Opacity = 30, // Làm mờ lúc đầu
                HasMedia = false,
                ExpiresAt = DateTime.Now.AddHours(48),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            // ── Kiểm tra ưu tiên đặc biệt ──
            // Uy tín cao + khung giờ nhạy cảm → tăng opacity
            var hour = DateTime.Now.Hour;
            bool sensitiveTime = (hour >= 21 || hour <= 4);
            if (user.ReputationScore >= 7 && sensitiveTime)
            {
                alert.Opacity = 50;
            }

            // ── Lưu DB ──
            await _alertRepo.CreateAlertAsync(alert);

            // ── Kiểm tra auto-clustering ──
            var nearbyCount = await _alertRepo.CountNearbyAlertsAsync(
                model.Latitude, model.Longitude, model.AlertTypeId, 30);
            if (nearbyCount >= 3)
            {
                alert.TrustScore += 20;
                alert.Opacity = Math.Min(alert.Opacity + 20, 100);
                await _alertRepo.UpdateAlertAsync(alert);
            }

            return alert;
        }

        // ═══════════════════════════════════════════════
        // NV4: UPLOAD MEDIA
        // ═══════════════════════════════════════════════

        public async Task<AlertMedia> UploadMediaAsync(int alertId, int userId, IFormFile file)
        {
            var alert = await _alertRepo.GetByIdAsync(alertId);
            if (alert == null) throw new Exception("Không tìm thấy báo cáo");

            // Validate file
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm" };
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                throw new Exception("Loại file không được hỗ trợ. Chỉ chấp nhận ảnh (JPG, PNG) và video (MP4).");

            if (file.Length > 10 * 1024 * 1024) // 10MB
                throw new Exception("File quá lớn. Kích thước tối đa là 10MB.");

            // Tạo thư mục
            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "alerts", alertId.ToString());
            Directory.CreateDirectory(uploadDir);

            // Tên file unique
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadDir, fileName);

            // Lưu file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Tạo entity
            var mediaType = extension is ".mp4" or ".webm" ? "VIDEO" : "IMAGE";
            var media = new AlertMedia
            {
                AlertId = alertId,
                UserId = userId,
                MediaType = mediaType,
                FilePath = $"/uploads/alerts/{alertId}/{fileName}",
                FileName = file.FileName,
                FileSize = file.Length,
                SourceType = alert.UserId == userId ? "ORIGINAL" : "VERIFICATION",
                CreatedAt = DateTime.Now
            };

            await _alertRepo.AddMediaAsync(media);

            // Cập nhật alert
            if (!alert.HasMedia)
            {
                alert.HasMedia = true;
                alert.TrustScore += 20;
                alert.Opacity = Math.Max(alert.Opacity, 50);
                alert.UpdatedAt = DateTime.Now;
                await _alertRepo.UpdateAlertAsync(alert);
            }

            return media;
        }

        // ═══════════════════════════════════════════════
        // NV5: LẤY DỮ LIỆU BẢN ĐỒ
        // ═══════════════════════════════════════════════

        public async Task<List<AlertMapDto>> GetAlertsForMapAsync(
            decimal southLat, decimal northLat,
            decimal westLng, decimal eastLng,
            DateTime fromTime, DateTime toTime)
        {
            var alerts = await _alertRepo.GetAlertsForMapAsync(
                southLat, northLat, westLng, eastLng, fromTime, toTime);

            return alerts.Select(MapToDto).ToList();
        }

        public async Task<AlertMapDto?> GetAlertDetailAsync(int alertId)
        {
            var alert = await _alertRepo.GetByIdWithDetailsAsync(alertId);
            if (alert == null) return null;
            return MapToDto(alert);
        }

        public async Task<List<object>> GetHeatmapDataAsync(DateTime fromTime, DateTime toTime)
        {
            var alerts = await _alertRepo.GetHeatmapDataAsync(fromTime, toTime);
            return alerts.Select(a => (object)new
            {
                lat = a.Latitude,
                lng = a.Longitude,
                intensity = Math.Max(1, a.TrustScore / 10 + a.ConfirmCount)
            }).ToList();
        }

        // ═══════════════════════════════════════════════
        // NV6: XÁC NHẬN CỘNG ĐỒNG
        // ═══════════════════════════════════════════════

        public async Task<(bool Success, string Message)> VerifyAlertAsync(
            int alertId, int userId, VerifyAlertViewModel model)
        {
            var alert = await _alertRepo.GetByIdAsync(alertId);
            if (alert == null)
                return (false, "Không tìm thấy báo cáo");

            if (alert.UserId == userId)
                return (false, "Không thể xác nhận báo cáo của chính mình");

            var existing = await _alertRepo.GetVerificationAsync(alertId, userId);

            if (existing != null)
            {
                // Đã xác nhận → kiểm tra đổi ý
                if (existing.PreviousType != null)
                    return (false, "Bạn chỉ được đổi ý 1 lần");

                if (existing.VerificationType == model.VerificationType)
                    return (false, "Bạn đã xác nhận loại này rồi");

                // Cho đổi ý
                existing.PreviousType = existing.VerificationType;
                existing.VerificationType = model.VerificationType;
                existing.ChangedAt = DateTime.Now;
                existing.Comment = model.Comment;
                await _alertRepo.UpdateVerificationAsync(existing);
            }
            else
            {
                // Tạo mới
                var verification = new AlertVerification
                {
                    AlertId = alertId,
                    UserId = userId,
                    VerificationType = model.VerificationType,
                    Latitude = model.Latitude,
                    Longitude = model.Longitude,
                    Comment = model.Comment,
                    CreatedAt = DateTime.Now
                };
                await _alertRepo.AddVerificationAsync(verification);
            }

            // ── Cập nhật thống kê alert ──
            await RecalculateAlertStats(alert);

            return (true, model.VerificationType == "CONFIRM"
                ? "Cảm ơn bạn đã xác nhận thông tin!"
                : "Cảm ơn bạn đã phản hồi!");
        }

        // ═══════════════════════════════════════════════
        // NV8: AUTO-EXPIRE
        // ═══════════════════════════════════════════════

        public async Task ProcessExpiredAlertsAsync()
        {
            var expiredAlerts = await _alertRepo.GetExpiredAlertsAsync();
            foreach (var alert in expiredAlerts)
            {
                alert.Status = "EXPIRED";
                alert.UpdatedAt = DateTime.Now;
                await _alertRepo.UpdateAlertAsync(alert);
            }

            if (expiredAlerts.Count > 0)
            {
                Console.WriteLine($"[AlertExpiration] Đã ẩn {expiredAlerts.Count} alerts hết hạn.");
            }
        }

        // ═══════════════════════════════════════════════
        // PRIVATE HELPERS
        // ═══════════════════════════════════════════════

        /// <summary>Đếm lại ConfirmCount/DenyCount và cập nhật Opacity/Status</summary>
        private async Task RecalculateAlertStats(SecurityAlert alert)
        {
            var fullAlert = await _alertRepo.GetByIdWithDetailsAsync(alert.Id);
            if (fullAlert == null) return;

            var confirmCount = fullAlert.Verifications.Count(v => v.VerificationType == "CONFIRM");
            var denyCount = fullAlert.Verifications.Count(v => v.VerificationType == "DENY");

            fullAlert.ConfirmCount = confirmCount;
            fullAlert.DenyCount = denyCount;

            // Quy tắc 1: ≥3 xác nhận VÀ nhiều hơn phản bác → VERIFIED + đậm
            if (confirmCount >= 3 && confirmCount > denyCount)
            {
                fullAlert.Status = "VISIBLE_VERIFIED";
                fullAlert.Opacity = 100;
            }
            // Quy tắc 2: ≥3 phản bác VÀ nhiều hơn xác nhận → giảm opacity
            else if (denyCount >= 3 && denyCount > confirmCount)
            {
                fullAlert.Opacity = 20;
            }
            // Quy tắc 3: Có 1-2 xác nhận → tăng dần
            else if (confirmCount > 0)
            {
                fullAlert.Opacity = Math.Min(30 + (confirmCount * 20), 80);
            }

            fullAlert.UpdatedAt = DateTime.Now;
            await _alertRepo.UpdateAlertAsync(fullAlert);
        }

        /// <summary>Chuyển Entity → DTO cho frontend</summary>
        private static AlertMapDto MapToDto(SecurityAlert a)
        {
            return new AlertMapDto
            {
                Id = a.Id,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                Title = a.Title,
                Description = a.Description,
                AddressText = a.AddressText,
                IncidentTime = a.IncidentTime,
                AlertTypeId = a.AlertTypeId,
                AlertTypeName = a.AlertType?.Name ?? "",
                AlertTypeSlug = a.AlertType?.Slug ?? "",
                IconEmoji = a.AlertType?.IconEmoji,
                CategoryName = a.AlertType?.Category?.Name ?? "",
                CategoryColor = a.AlertType?.Category?.ColorHex ?? "#666",
                Status = a.Status,
                Opacity = a.Opacity,
                ConfirmCount = a.ConfirmCount,
                DenyCount = a.DenyCount,
                HasMedia = a.HasMedia,
                TrustScore = a.TrustScore,
                MediaUrls = a.Media?.Where(m => m.IsActive)
                    .Select(m => m.FilePath).ToList() ?? new(),
                UserName = a.User?.FullName ?? "Ẩn danh",
                UserReputationScore = a.User?.ReputationScore ?? 5,
                CreatedAt = a.CreatedAt
            };
        }

        // ═══════════════════════════════════════════════
        // MY REPORTS
        // ═══════════════════════════════════════════════

        public async Task<List<AlertMapDto>> GetMyAlertsAsync(int userId)
        {
            var alerts = await _alertRepo.GetAlertsByUserAsync(userId);
            return alerts.Select(MapToDto).ToList();
        }

        // ═══════════════════════════════════════════════
        // ADMIN: DUYỆT BÁO CÁO
        // ═══════════════════════════════════════════════

        public async Task<List<AlertMapDto>> GetPendingAlertsAsync()
        {
            var alerts = await _alertRepo.GetPendingAlertsAsync(); // Sẽ fetch VISIBLE_UNVERIFIED
            return alerts.Select(MapToDto).ToList();
        }

        public async Task<(List<AlertMapDto> Items, int Total)> GetAllAlertsForAdminAsync(
            string? status, int page, int pageSize)
        {
            var alerts = await _alertRepo.GetAllAlertsForAdminAsync(status, page, pageSize);
            var total = await _alertRepo.CountAllAlertsAsync(status);
            return (alerts.Select(MapToDto).ToList(), total);
        }

        /// <summary>
        /// Admin APPROVE: chuyển sang VISIBLE_VERIFIED → Xác nhận cứng.
        /// </summary>
        public async Task<bool> ApproveAlertAsync(int alertId, int adminUserId)
        {
            var alert = await _alertRepo.GetByIdAsync(alertId);
            if (alert == null) return false;

            alert.Status = "VISIBLE_VERIFIED";  // Hiện thị đầy đủ trên bản đồ
            alert.Opacity = 100;               // Sáng rõ nhất - đã xác thực
            alert.UpdatedAt = DateTime.Now;
            // Không expire: Đã duyệt luôn hiện trên bản đồ mãi mãi (cho đến khi Admin xóa)
            alert.ExpiresAt = DateTime.Now.AddYears(10);
            await _alertRepo.UpdateAlertAsync(alert);
            return true;
        }

        /// <summary>
        /// Admin REJECT: ẩn alert, lưu lý do.
        /// </summary>
        public async Task<bool> RejectAlertAsync(int alertId, int adminUserId, string reason)
        {
            var alert = await _alertRepo.GetByIdAsync(alertId);
            if (alert == null) return false;

            alert.Status = "REJECTED";
            alert.UpdatedAt = DateTime.Now;
            alert.AddressText = $"[Từ chối] {reason}";
            await _alertRepo.UpdateAlertAsync(alert);
            return true;
        }

        /// <summary>
        /// Admin đánh dấu thiếu bằng chứng — hiện mờ trên bản đồ, thông báo cho user bổ sung.
        /// </summary>
        public async Task<bool> MarkInsufficientEvidenceAsync(int alertId, int adminUserId, string reason)
        {
            var alert = await _alertRepo.GetByIdAsync(alertId);
            if (alert == null) return false;

            alert.Status = "INSUFFICIENT_EVIDENCE";
            alert.Opacity = 25;
            alert.UpdatedAt = DateTime.Now;
            // Giữ ExpiresAt ngắn hạn: 24h kể từ lúc đánh dấu
            alert.ExpiresAt = DateTime.Now.AddHours(24);
            await _alertRepo.UpdateAlertAsync(alert);

            // Tạo thông báo cho người dùng bổ sung bằng chứng
            await _alertRepo.CreateNotificationAsync(new Notification
            {
                UserId = alert.UserId,
                Title = "Báo cáo cần bổ sung bằng chứng",
                Message = string.IsNullOrWhiteSpace(reason)
                    ? $"Báo cáo \"{alert.Title}\" của bạn cần thêm ảnh hoặc mô tả chi tiết hơn để được xác thực."
                    : $"Báo cáo \"{alert.Title}\": {reason}. Vui lòng bổ sung thêm bằng chứng.",
                Type = "INSUFFICIENT_EVIDENCE",
                RelatedAlertId = alertId,
                CreatedAt = DateTime.Now
            });

            return true;
        }
    }
}
