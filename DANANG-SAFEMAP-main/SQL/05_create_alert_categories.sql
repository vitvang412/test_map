-- 06_create_alert_categories.sql
USE DaNangSafeMap;

CREATE TABLE AlertCategories (
    Id          INT PRIMARY KEY AUTO_INCREMENT,
    Name        VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
    Slug        VARCHAR(50)  NOT NULL UNIQUE,
    Description VARCHAR(500) CHARACTER SET utf8mb4 NULL,
    ColorHex    VARCHAR(7)   NOT NULL DEFAULT '#FF6B6B',
    SortOrder   INT          NOT NULL DEFAULT 0,
    IsActive    BOOLEAN      NOT NULL DEFAULT TRUE,
    CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu 3 nhóm
INSERT INTO AlertCategories (Name, Slug, Description, ColorHex, SortOrder) VALUES
('Xâm phạm Sở hữu',          'property_crime',   'Trộm cắp, móc túi, cướp giật, đột nhập',   '#E74C3C', 1),
('Trật tự An toàn Xã hội',    'public_disorder',  'Đua xe, ẩu đả, gây rối trật tự',            '#F39C12', 2),
('An ninh Du lịch & Lừa đảo', 'tourism_security', 'Lừa đảo, chèo kéo, chặt chém du khách',     '#E67E22', 3);
