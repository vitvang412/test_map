-- 09_create_alert_media.sql
USE DaNangSafeMap;

CREATE TABLE AlertMedia (
    Id          INT PRIMARY KEY AUTO_INCREMENT,
    AlertId     INT          NOT NULL,
    UserId      INT          NOT NULL,
    MediaType   ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
    FilePath    VARCHAR(500) NOT NULL,
    FileName    VARCHAR(255) NOT NULL,
    FileSize    BIGINT       NULL,
    SourceType  ENUM('ORIGINAL', 'VERIFICATION') NOT NULL DEFAULT 'ORIGINAL',
    IsActive    BOOLEAN      NOT NULL DEFAULT TRUE,
    CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (AlertId) REFERENCES SecurityAlerts(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId)  REFERENCES Users(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
