-- 12_create_notifications.sql
-- Bảng thông báo gửi đến người dùng
USE DaNangSafeMap;

CREATE TABLE IF NOT EXISTS Notifications (
    Id              INT PRIMARY KEY AUTO_INCREMENT,
    UserId          INT NOT NULL,
    Title           VARCHAR(200) CHARACTER SET utf8mb4 NOT NULL,
    Message         TEXT CHARACTER SET utf8mb4 NOT NULL,
    Type            VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    RelatedAlertId  INT NULL,
    IsRead          BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (UserId) REFERENCES Users(Id),
    INDEX idx_notifications_user (UserId),
    INDEX idx_notifications_unread (UserId, IsRead)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
