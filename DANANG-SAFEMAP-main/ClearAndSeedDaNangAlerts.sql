-- 1. Xóa dữ liệu cũ (Xóa các bảng phụ thuộc trước)
DELETE FROM [dbo].[AlertMedia];
DELETE FROM [dbo].[AlertVerifications];
DELETE FROM [dbo].[SecurityAlerts];

-- Trả ID tự tăng về 0 
DBCC CHECKIDENT ('SecurityAlerts', RESEED, 0);

-- 2. Lấy tạm 1 User để đứng tên các báo cáo
DECLARE @UserId INT = (SELECT TOP 1 Id FROM [dbo].[Users]);
IF @UserId IS NULL SET @UserId = 1; -- Fallback

-- Cố gắng ánh xạ ID của các AlertType có trong CSDL (Khắc phục trường hợp DB không có ID 1)
DECLARE @T1 INT = 1, @T2 INT = 2, @T3 INT = 3, @T4 INT = 4, @T5 INT = 5, @T6 INT = 6, @T7 INT = 7;
SELECT TOP 1 @T1 = Id FROM [dbo].[AlertTypes] ORDER BY Id ASC;
SELECT TOP 1 @T2 = Id FROM [dbo].[AlertTypes] WHERE Id > @T1 ORDER BY Id ASC; IF @T2 IS NULL SET @T2 = @T1;
SELECT TOP 1 @T3 = Id FROM [dbo].[AlertTypes] WHERE Id > @T2 ORDER BY Id ASC; IF @T3 IS NULL SET @T3 = @T2;
SELECT TOP 1 @T4 = Id FROM [dbo].[AlertTypes] WHERE Id > @T3 ORDER BY Id ASC; IF @T4 IS NULL SET @T4 = @T3;


-- 3. CHUẨN BỊ BẢNG DỮ LIỆU TỪ VỰNG PHONG PHÚ (20 loại sự cố khác nhau)
DECLARE @IncidentData TABLE (ID INT IDENTITY(1,1), TypeId INT, Title NVARCHAR(200), DescText NVARCHAR(MAX));
INSERT INTO @IncidentData (TypeId, Title, DescText) VALUES
(@T1, N'Móc túi balo', N'Đang dạo phố chụp ảnh trên vỉa hè thì bị kẻ gian kéo khóa balo lấy trộm ví tiền và một số giấy tờ quan trọng.'),
(@T2, N'Túm giật đồ trên tay', N'Bị giật túi xách khi đang đứng nghe điện thoại ở sát lề đường, kẻ gian đi xe Sirius đen không do rõ biển số.'),
(@T3, N'Mất đồ cá nhân ở biển', N'Để đồ đạc trên bãi cát lúc xuống tắm biển cùng gia đình, khoảng 15 phút quay lên thì không thấy túi đồ đâu nữa.'),
(@T4, N'Mất trộm xe đạp thể thao', N'Khóa xe bằng dây cáp cẩn thận ngoài quán cafe nhưng bị cắt trộm, nhãn hiệu Giant màu xanh lá.'),
(@T1, N'Cò mồi xe ôm lừa đảo', N'Xe ôm chèo kéo khách tỉnh lạ tại bến xe, xưng là giá chung nhưng chém giá gấp 3 lần so với giá app công nghệ.'),
(@T2, N'Thu phí gửi xe tự phát trái phép', N'Gần khu vực diễn ra sự kiện, một số đối tượng chiếm lòng đường chăng dây thu phí giữ xe 20k-50k/chiếc.'),
(@T3, N'Kẹt xe nghiêm trọng dài hạn', N'Khu vực vòng xuyến ngã tư đang ùn tắc trầm trọng vì tai nạn va quẹt nhỏ giữa 2 xe ô tô, chờ công an giải quyết.'),
(@T4, N'Trộm cạy cửa sổ lúc rạng sáng', N'Đêm khuya nghe tiếng lạch cạch ở góc nhà, ra kiểm tra thì thấy có vết nạy khóa cửa sổ, chưa mất tài sản nhưng rất nguy hiểm.'),
(@T1, N'Thất lạc bé trai 4 tuổi', N'Bé trai 4 tuổi mặc áo siêu nhân đỏ đi lạc ở phố đi bộ đông đúc. Gia đình đang rất hoảng loạn nhờ bảo vệ tìm kiếm quanh khu vực.'),
(@T2, N'Xô xát ẩu đả trên phố', N'Sau khi va chạm giao thông thay vì nói chuyện giải quyết thì hai thanh niên đã cự cãi lớn tiếng và có động tay chân.'),
(@T3, N'Bẻ trộm gương chiếu hậu', N'Đậu xe ô tô sát lề đường để vào mua đồ khoảng 5 phút, khi ra thì bị bẻ luôn mất kính chiếu hậu bên tài xế.'),
(@T4, N'Nhặt được căn cước và ví', N'Trưa nay mình đi đường nhặt được một ví nam màu nâu. Bên trong có CCCD mang tên Lê Văn T. Ai đánh rơi thì tới nhận nhé!'),
(@T1, N'Quán nhậu lấn chiếm vỉa hè', N'Một số hộ kinh doanh mang nguyên bếp than ra vỉa hè nướng thịt khói mù mịt, lấn chiếm đi hết phần đường của người đi bộ.'),
(@T2, N'Ngập úng đường cục bộ', N'Đoạn đường có đoạn bị lõm trũng và tắc cống mương nên nước đọng lên tới bắp chân sau cơn mưa đột ngột đầu giờ chiều.'),
(@T3, N'Đối tượng khả nghi rình mò trọ', N'Camera theo dõi quay lại nam thanh niên lạ mặt lẻn vào dọc hành lang khu trọ sinh viên rình rập giữa trưa.'),
(@T4, N'Tụ tập đua xe nẹt pô ồn ào', N'Một tốp cỡ 10 thanh niên đi xe máy độ chế đang chạy tốc độ rất cao trên đường dọc bờ biển gây nguy hiểm người tham gia giao thông.'),
(@T1, N'Say xỉn quậy phá rắc rối', N'Có nhóm người say xỉn la hét lớn tiếng lảng vảng mượn bật lửa, xin đểu tiền ngay trước cửa một cửa hàng tiện lợi 24h.'),
(@T2, N'Hỏa hoạn do bất cẩn điện', N'Chập điện ở cột điện nhỏ bốc khói đen mùi khét lẹt, lửa đang bén dần khu vực xung quanh dây cáp viễn thông.'),
(@T3, N'Đổ lén xà bần phế thải', N'Có một chiếc ca tải nhỏ đổ lén xà bần phế thải từ công trình xuống bãi đất ngập nước sát khu dân cư gây dơ bẩn môi trường.'),
(@T4, N'Mất tích thú cưng', N'Phát hiện mất một bé mèo ta lông vàng trắng. Bé hay lang thang quanh hẻm nhưng hôm qua không về nhà. Nhờ khu vực quanh đó chú ý giùm. Xin hậu tạ!');


-- 4. CHUẨN BỊ BẢNG VỊ TRÍ ĐẸP & CHÍNH XÁC XUNG QUANH ĐÀ NẴNG
DECLARE @LocationData TABLE (ID INT IDENTITY(1,1), AddressText NVARCHAR(500), BaseLat FLOAT, BaseLng FLOAT);
INSERT INTO @LocationData (AddressText, BaseLat, BaseLng) VALUES
(N'Cầu Rồng, quận Hải Châu', 16.061111, 108.227778),
(N'Chợ Hàn, đường Trần Phú, Hải Châu', 16.068111, 108.224444),
(N'Bãi biển Mỹ Khê, đầu đường Phạm Văn Đồng', 16.059222, 108.246111),
(N'Trường ĐH Bách Khoa, quận Liên Chiểu', 16.075444, 108.150666),
(N'Sân bay quốc tế Đà Nẵng, cổng chính', 16.052333, 108.204555),
(N'Đường lên Chùa Linh Ứng, Bán đảo Sơn Trà', 16.101999, 108.281999),
(N'Khu vui chơi giải trí Helio Center', 16.036555, 108.220111),
(N'Khu vực dân cư Nam Cẩm Lệ', 16.000444, 108.212333),
(N'Sun World - Công viên Châu Á', 16.040444, 108.224111),
(N'Cầu Sông Hàn, nút giao Lê Duẩn', 16.072222, 108.225278),
(N'Khu vực Đỉnh Bàn Cờ, bán đảo Sơn Trà', 16.113333, 108.270833),
(N'Cầu Tình Yêu (Love Bridge), phía bờ Đông', 16.062500, 108.228333),
(N'Cầu vượt Ngã Ba Huế quy mô lớn', 16.062222, 108.176389),
(N'Sát Chợ Cồn, đường ngã tư Hùng Vương', 16.069444, 108.216389),
(N'Khu vực cổng đi Bến xe Trung tâm Đà Nẵng', 16.055833, 108.167222),
(N'Cổng trường Kinh Tế, quận Ngũ Hành Sơn', 16.042222, 108.242778),
(N'Làng đá mỹ nghệ gần Danh thắng Ngũ Hành Sơn', 16.003889, 108.261667),
(N'Bệnh viện Đa Khoa Đà Nẵng, Hải Châu', 16.075278, 108.216944),
(N'Cổng trước Ga xe lửa Đà Nẵng', 16.076389, 108.214444),
(N'Đỉnh Đèo Hải Vân - ranh giới Huế - ĐN', 16.185278, 108.136667);

-- 5. VÒNG LẶP CHÈN TẠO RA 150 VỤ KHÁC NHAU CHI TIẾT
DECLARE @i INT = 1;
WHILE @i <= 150
BEGIN
    -- Chọn ngẫu nhiên 1 trong 20 câu truyện vụ việc
    DECLARE @IncIndex INT = 1 + CAST(RAND() * 20 AS INT);
    -- Chọn ngẫu nhiên 1 trong 20 vị trí
    DECLARE @LocIndex INT = 1 + CAST(RAND() * 20 AS INT);

    -- Lấy thông tin Text từ bảng tạm
    DECLARE @IType INT, @ITitle NVARCHAR(200), @IDesc NVARCHAR(MAX);
    SELECT @IType = TypeId, @ITitle = Title, @IDesc = DescText FROM @IncidentData WHERE ID = @IncIndex;

    -- Lấy thông tin Tọa độ Base từ bảng tạm
    DECLARE @LAddress NVARCHAR(500), @LLat FLOAT, @LLng FLOAT;
    SELECT @LAddress = AddressText, @LLat = BaseLat, @LLng = BaseLng FROM @LocationData WHERE ID = @LocIndex;

    -- JITTER (Lệch tâm ngẫu nhiên): Tránh các sự cố bị xếp chồng khít lên nhau
    -- Mỗi chấm sẽ rơi vào bán kính từ 0.5 đến 1.5 kilomet xung quanh trung tâm của khu vực đó
    SET @LLat = @LLat + (RAND() - 0.5) * 0.015;
    SET @LLng = @LLng + (RAND() - 0.5) * 0.015;

    -- Tình trạng ngẫu nhiên
    DECLARE @rStat FLOAT = RAND();
    DECLARE @Status VARCHAR(30) = 
        CASE 
            WHEN @rStat < 0.6 THEN 'VISIBLE_VERIFIED' 
            WHEN @rStat < 0.8 THEN 'VISIBLE_UNVERIFIED'
            WHEN @rStat < 0.9 THEN 'PENDING_REVIEW'
            ELSE 'RESOLVED' 
        END;
        
    -- Tạo độ lùi thời gian ngẫu nhiên (Từ 0 đến 30 ngày trước)
    DECLARE @TimeOffset INT = CAST((RAND() * 720) AS INT);

    -- Rating cộng đồng mô phỏng
    DECLARE @CConf INT = CAST((RAND() * 25) AS INT);
    DECLARE @CDeny INT = CAST((RAND() * 3) AS INT);
    DECLARE @Opacity INT = CASE WHEN @Status = 'VISIBLE_VERIFIED' THEN 100 ELSE 60 END;

    INSERT INTO [dbo].[SecurityAlerts] 
    (UserId, AlertTypeId, Latitude, Longitude, AddressText, Title, Description, IncidentTime, Status, TrustScore, ConfirmCount, DenyCount, Opacity, HasMedia, UserConfirmed, CreatedAt, UpdatedAt)
    VALUES
    (
        @UserId, 
        @IType, 
        ROUND(@LLat, 8), 
        ROUND(@LLng, 8), 
        @LAddress, 
        @ITitle, 
        @IDesc, 
        DATEADD(hour, -@TimeOffset, GETDATE()), 
        @Status, 
        50 + @CConf, 
        @CConf, 
        @CDeny, 
        @Opacity, 
        0, 
        1, 
        DATEADD(hour, -@TimeOffset, GETDATE()), 
        DATEADD(hour, -@TimeOffset, GETDATE())
    );

    SET @i = @i + 1;
END

PRINT N'✅ Đã xóa sạch dữ liệu cũ và chèn thành công 150 báo cáo chân thực vào Heat Map Đà Nẵng!';
