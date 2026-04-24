-- 08_create_security_alerts.sql
USE DaNangSafeMap;

CREATE TABLE SecurityAlerts (
    Id              INT PRIMARY KEY AUTO_INCREMENT,

    -- Ai báo
    UserId          INT NOT NULL,
    AlertTypeId     INT NOT NULL,

    -- TỌA ĐỘ → vẽ marker trên bản đồ
    Latitude        DECIMAL(10, 8) NOT NULL,
    Longitude       DECIMAL(11, 8) NOT NULL,
    AddressText     VARCHAR(500) CHARACTER SET utf8mb4 NULL,

    -- Nội dung
    Title           VARCHAR(200) CHARACTER SET utf8mb4 NOT NULL,
    Description     TEXT CHARACTER SET utf8mb4 NOT NULL,

    -- Thời gian sự cố xảy ra (KHÁC thời gian đăng tin)
    IncidentTime    DATETIME NOT NULL,

    -- TRẠNG THÁI HIỂN THỊ TRÊN BẢN ĐỒ
    Status          ENUM(
        'PENDING_REVIEW',        -- Vừa đăng, chờ xác nhận
        'VISIBLE_UNVERIFIED',    -- Hiển thị MỜ trên bản đồ
        'VISIBLE_VERIFIED',      -- Hiển thị ĐẬM (≥3 người xác nhận)
        'RESOLVED',              -- Đã xử lý → icon XANH LÁ
        'REJECTED',              -- Admin bác bỏ → ẩn
        'EXPIRED'                -- Quá hạn → ẩn
    ) NOT NULL DEFAULT 'PENDING_REVIEW',

    -- Điểm tin cậy (tính tự động khi đăng)
    TrustScore      INT     NOT NULL DEFAULT 0,

    -- Đếm xác nhận cộng đồng
    ConfirmCount    INT     NOT NULL DEFAULT 0,
    DenyCount       INT     NOT NULL DEFAULT 0,

    -- Độ mờ marker (30 = mờ, 100 = đậm)
    Opacity         INT     NOT NULL DEFAULT 30,

    -- Có ảnh/video không
    HasMedia        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Tick "Tôi xác nhận thông tin chính xác"
    UserConfirmed   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Thời gian
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ResolvedAt      DATETIME NULL,
    ExpiresAt       DATETIME NULL,

    FOREIGN KEY (UserId)      REFERENCES Users(Id),
    FOREIGN KEY (AlertTypeId) REFERENCES AlertTypes(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
