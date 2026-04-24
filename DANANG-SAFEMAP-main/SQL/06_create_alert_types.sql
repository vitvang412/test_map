-- 07_create_alert_types.sql
USE DaNangSafeMap;

CREATE TABLE AlertTypes (
    Id          INT PRIMARY KEY AUTO_INCREMENT,
    CategoryId  INT          NOT NULL,
    Name        VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
    Slug        VARCHAR(50)  NOT NULL UNIQUE,
    IconEmoji   VARCHAR(10)  NULL,
    IconUrl     VARCHAR(500) NULL,
    SortOrder   INT          NOT NULL DEFAULT 0,
    IsActive    BOOLEAN      NOT NULL DEFAULT TRUE,
    CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (CategoryId) REFERENCES AlertCategories(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7 loại sự cố
INSERT INTO AlertTypes (CategoryId, Name, Slug, IconEmoji, SortOrder) VALUES
(1, 'Trộm cắp xe máy',     'theft_motorbike',    '🏍️', 1),
(1, 'Móc túi / Cướp giật', 'pickpocket_robbery', '👛',  2),
(1, 'Trộm đột nhập',       'burglary',           '🏠',  3),
(2, 'Đua xe / Nẹt pô',     'street_racing',      '🏎️', 4),
(2, 'Ẩu đả / Gây rối',     'fighting_disorder',  '👊',  5),
(3, 'Lừa đảo / Chèo kéo',  'scam_tourist',       '⚠️',  6),
(3, 'Chặt chém giá',        'overcharging',       '💰',  7);
