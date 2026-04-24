-- 11_create_indexes.sql
USE DaNangSafeMap;

-- Tìm alerts theo vùng bản đồ (spatial)
CREATE INDEX idx_alerts_location     ON SecurityAlerts(Latitude, Longitude);

-- Lọc theo trạng thái + thời gian (heatmap, time-slider)
CREATE INDEX idx_alerts_status_time  ON SecurityAlerts(Status, CreatedAt DESC);

-- Lọc theo thời gian sự cố (time-slider)
CREATE INDEX idx_alerts_incident     ON SecurityAlerts(IncidentTime DESC);

-- Auto-expire job
CREATE INDEX idx_alerts_expires      ON SecurityAlerts(ExpiresAt);

-- Xác nhận cộng đồng
CREATE INDEX idx_verifications       ON AlertVerifications(AlertId, VerificationType);

-- Media theo alert
CREATE INDEX idx_media_alert         ON AlertMedia(AlertId);
