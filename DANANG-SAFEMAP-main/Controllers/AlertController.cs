using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DaNangSafeMap.Models.ViewModels.Alert;
using DaNangSafeMap.Services.Interfaces;

namespace DaNangSafeMap.Controllers
{
    /// <summary>
    /// API Controller cho bản đồ + báo cáo sự cố.
    /// Trả JSON cho frontend JavaScript gọi.
    /// </summary>
    [Route("api/alerts")]
    [ApiController]
    public class AlertController : ControllerBase
    {
        private readonly IAlertService _alertService;

        public AlertController(IAlertService alertService)
        {
            _alertService = alertService;
        }

        // ═══════════════════════════════════════════════
        // GET /api/alerts/types — Danh sách loại sự cố
        // ═══════════════════════════════════════════════
        [HttpGet("types")]
        public async Task<IActionResult> GetAlertTypes()
        {
            var types = await _alertService.GetAlertTypesAsync();
            return Ok(types);
        }

        // ═══════════════════════════════════════════════
        // GET /api/alerts/map — Markers cho bản đồ
        // ═══════════════════════════════════════════════
        [HttpGet("map")]
        public async Task<IActionResult> GetMapAlerts(
            [FromQuery] decimal southLat,
            [FromQuery] decimal northLat,
            [FromQuery] decimal westLng,
            [FromQuery] decimal eastLng,
            [FromQuery] DateTime? fromTime,
            [FromQuery] DateTime? toTime)
        {
            var from = fromTime ?? DateTime.Now.AddHours(-24);
            var to = toTime ?? DateTime.Now;
            var alerts = await _alertService.GetAlertsForMapAsync(
                southLat, northLat, westLng, eastLng, from, to);
            return Ok(alerts);
        }

        // ═══════════════════════════════════════════════
        // GET /api/alerts/heatmap — Dữ liệu heatmap
        // ═══════════════════════════════════════════════
        [HttpGet("heatmap")]
        public async Task<IActionResult> GetHeatmapData(
            [FromQuery] DateTime? fromTime,
            [FromQuery] DateTime? toTime)
        {
            var from = fromTime ?? DateTime.Now.AddDays(-30);
            var to = toTime ?? DateTime.Now;
            var data = await _alertService.GetHeatmapDataAsync(from, to);
            return Ok(data);
        }

        // ═══════════════════════════════════════════════
        // GET /api/alerts/{id} — Chi tiết 1 alert
        // ═══════════════════════════════════════════════
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAlertDetail(int id)
        {
            var alert = await _alertService.GetAlertDetailAsync(id);
            if (alert == null)
                return NotFound(new { message = "Không tìm thấy báo cáo" });
            return Ok(alert);
        }

        // ═══════════════════════════════════════════════
        // POST /api/alerts — Tạo báo cáo mới
        // ═══════════════════════════════════════════════
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateAlert([FromForm] CreateAlertViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = GetUserId();
                var alert = await _alertService.CreateAlertAsync(model, userId);

                // Upload ảnh nếu có
                if (Request.Form.Files.Count > 0)
                {
                    foreach (var file in Request.Form.Files)
                    {
                        await _alertService.UploadMediaAsync(alert.Id, userId, file);
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = "Báo cáo đã được ghi nhận!",
                    alertId = alert.Id
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════
        // POST /api/alerts/{id}/media — Upload ảnh
        // ═══════════════════════════════════════════════
        [HttpPost("{id}/media")]
        [Authorize]
        public async Task<IActionResult> UploadMedia(int id, IFormFile file)
        {
            try
            {
                var userId = GetUserId();
                var media = await _alertService.UploadMediaAsync(id, userId, file);
                return Ok(new
                {
                    success = true,
                    filePath = media.FilePath
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════
        // POST /api/alerts/{id}/verify — Xác nhận cộng đồng
        // ═══════════════════════════════════════════════
        [HttpPost("{id}/verify")]
        [Authorize]
        public async Task<IActionResult> VerifyAlert(int id, [FromBody] VerifyAlertViewModel model)
        {
            try
            {
                var userId = GetUserId();
                var (success, message) = await _alertService.VerifyAlertAsync(id, userId, model);
                if (!success)
                    return BadRequest(new { success = false, message });
                return Ok(new { success = true, message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // ─── Helper: Lấy userId từ JWT ──
        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException("Vui lòng đăng nhập");
            return int.Parse(claim.Value);
        }

        // ═══════════════════════════════════════════════
        // GET /api/alerts/my — Báo cáo của tôi
        // ═══════════════════════════════════════════════
        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyAlerts()
        {
            var userId = GetUserId();
            var alerts = await _alertService.GetMyAlertsAsync(userId);
            return Ok(alerts);
        }

        // ═══════════════════════════════════════════════
        // ADMIN ENDPOINTS
        // ═══════════════════════════════════════════════

        // GET /api/alerts/admin/pending — Danh sách chờ duyệt
        [HttpGet("admin/pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingAlerts()
        {
            var alerts = await _alertService.GetPendingAlertsAsync();
            return Ok(alerts);
        }

        // GET /api/alerts/admin/all?status=&page=&pageSize=
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllAlertsAdmin(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var (items, total) = await _alertService.GetAllAlertsForAdminAsync(status, page, pageSize);
            return Ok(new { items, total, page, pageSize });
        }

        // POST /api/alerts/admin/{id}/approve
        [HttpPost("admin/{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveAlert(int id)
        {
            var adminId = GetUserId();
            var ok = await _alertService.ApproveAlertAsync(id, adminId);
            return ok
                ? Ok(new { success = true, message = "Đã duyệt và hiển thị trên bản đồ" })
                : NotFound(new { success = false, message = "Không tìm thấy báo cáo" });
        }

        // POST /api/alerts/admin/{id}/reject
        [HttpPost("admin/{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectAlert(int id, [FromBody] RejectAlertRequest body)
        {
            var adminId = GetUserId();
            var ok = await _alertService.RejectAlertAsync(id, adminId, body.Reason ?? "Không đủ thông tin");
            return ok
                ? Ok(new { success = true, message = "Đã từ chối báo cáo" })
                : NotFound(new { success = false, message = "Không tìm thấy báo cáo" });
        }
    }

    // Helper model
    public record RejectAlertRequest(string? Reason);
}
