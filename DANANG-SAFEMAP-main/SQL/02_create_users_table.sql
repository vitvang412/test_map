-- Nếu bảng chưa có mới tạo, còn có rồi thì giữ nguyên dữ liệu
-- DROP TABLE IF EXISTS Users; (đã bị vô hiệu hóa để tránh mất dữ liệu)
CREATE TABLE Users (
    Id           INT PRIMARY KEY AUTO_INCREMENT,

    -- Thông tin cá nhân (Dùng VARCHAR + CHARACTER SET utf8mb4 thay cho NVARCHAR)
    FullName     VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL,
    DateOfBirth  DATE            NULL,
    Gender       ENUM('Nam', 'Nữ', 'Khác') NULL,
    Address      VARCHAR(255) CHARACTER SET utf8mb4 NULL,
    Avatar       VARCHAR(500)    NULL,

    -- Đăng nhập
    Email        VARCHAR(255)    NOT NULL UNIQUE,
    PasswordHash VARCHAR(255)    NULL COMMENT 'NULL nếu đăng nhập bằng Google',

    -- Google OAuth
    GoogleId     VARCHAR(255)    NULL UNIQUE,
    AuthProvider ENUM('Local', 'Google') NOT NULL DEFAULT 'Local',

    -- Phân quyền
    Role         ENUM('Admin', 'User') NOT NULL DEFAULT 'User',

    -- Trạng thái
    IsActive     BOOLEAN         NOT NULL DEFAULT TRUE,
    CreatedAt    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastLoginAt  DATETIME        NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;