-- 11_add_insufficient_evidence_status.sql
-- Thêm trạng thái INSUFFICIENT_EVIDENCE cho báo cáo thiếu bằng chứng
USE DaNangSafeMap;

ALTER TABLE SecurityAlerts
    MODIFY COLUMN Status ENUM(
        'PENDING_REVIEW',
        'VISIBLE_UNVERIFIED',
        'VISIBLE_VERIFIED',
        'INSUFFICIENT_EVIDENCE',
        'RESOLVED',
        'REJECTED',
        'EXPIRED'
    ) NOT NULL DEFAULT 'PENDING_REVIEW';
