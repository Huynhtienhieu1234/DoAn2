-- =======================================================================
-- SCRIPT SEED DỮ LIỆU ĐẦY ĐỦ CHO HỆ THỐNG QUẢN LÝ LAO ĐỘNG SINH VIÊN
-- Ngày tạo: 17/11/2026
-- Mô tả: Nạp tài khoản Quản lý, Khu vực, Đợt lao động, Phiếu đăng ký,
--        Điểm danh, Tiến độ số ngày tích lũy và Phiếu xác nhận hoàn thành.
-- =======================================================================

USE [QuanLyLaoDongSinhVien];
GO

-- 1. BẢNG QUẢN LÝ (QuanLy)
IF NOT EXISTS (SELECT 1 FROM [dbo].[QuanLy] WHERE [Quanly_id] = 1)
BEGIN
    SET IDENTITY_INSERT [dbo].[QuanLy] ON;
    INSERT INTO [dbo].[QuanLy] ([Quanly_id], [Hoten], [Gioitinh], [Diachi], [SoDienThoaiQuanLy], [TaiKhoan])
    VALUES (1, N'ThS. Lê Hoàng Nam', 1, N'Phòng Công tác Sinh viên, ĐH Đồng Tháp', '0918234567', 89);
    SET IDENTITY_INSERT [dbo].[QuanLy] OFF;
    PRINT 'Đã tạo Quanly_id = 1 cho tài khoản ql1';
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[TaiKhoan] WHERE [Username] = 'ql_supham')
BEGIN
    INSERT INTO [dbo].[TaiKhoan] ([Username], [Password], [Email], [VaiTro_id])
    VALUES ('ql_supham', '$2a$11$kj4viDzNHXvblhjeUdWPzukvcc4RlvIzB2GLIVD.x7uiVkHEEH6x.', 'ql_supham@dthu.edu.vn', 2);
    
    DECLARE @newTkId INT = SCOPE_IDENTITY();
    INSERT INTO [dbo].[QuanLy] ([Hoten], [Gioitinh], [Diachi], [SoDienThoaiQuanLy], [TaiKhoan])
    VALUES (N'ThS. Nguyễn Thị Mai', 0, N'Tòa nhà Điều hành - ĐH Đồng Tháp', '0903876543', @newTkId);
    PRINT 'Đã tạo tài khoản và hồ sơ Quản lý ql_supham';
END
GO

-- 2. BẢNG KHU VỰC (KhuVuc)
MERGE INTO [dbo].[KhuVuc] AS Target
USING (VALUES
    ('KV01', N'Sân trường trung tâm'),
    ('KV02', N'Sân vận động & Khu thể thao'),
    ('KV03', N'Khuôn viên Giảng đường A'),
    ('KV04', N'Khuôn viên Giảng đường B & C'),
    ('KV05', N'Khu Ký túc xá sinh viên'),
    ('KV06', N'Thư viện trung tâm & Vườn hoa'),
    ('KV07', N'Khu nhà xe & Căn tin trường')
) AS Source ([MaKhuVuc], [TenKhuVuc])
ON Target.[TenKhuVuc] = Source.[TenKhuVuc]
WHEN NOT MATCHED THEN
    INSERT ([MaKhuVuc], [TenKhuVuc])
    VALUES (Source.[MaKhuVuc], Source.[TenKhuVuc]);
GO
PRINT 'Đã đồng bộ danh mục Khu vực';
GO
