-- 10_create_alert_verifications.sql
USE DaNangSafeMap;

CREATE TABLE AlertVerifications (
    Id                INT PRIMARY KEY AUTO_INCREMENT,
    AlertId           INT NOT NULL,
    UserId            INT NOT NULL,

    -- CONFIRM = "Tôi cũng ghi nhận"  |  DENY = "Không còn ghi nhận"
    VerificationType  ENUM('CONFIRM', 'DENY') NOT NULL,

    -- Vị trí người xác nhận
    Latitude          DECIMAL(10, 8) NULL,
    Longitude         DECIMAL(11, 8) NULL,

    Comment           TEXT CHARACTER SET utf8mb4 NULL,

    -- Cho phép đổi ý 1 lần
    PreviousType      ENUM('CONFIRM', 'DENY') NULL,
    ChangedAt         DATETIME NULL,

    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Mỗi user chỉ xác nhận 1 lần / alert
    UNIQUE KEY UK_Alert_User (AlertId, UserId),

    FOREIGN KEY (AlertId) REFERENCES SecurityAlerts(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId)  REFERENCES Users(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
