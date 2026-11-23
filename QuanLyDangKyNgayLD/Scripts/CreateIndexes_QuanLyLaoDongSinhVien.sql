-- =======================================================================
-- SCRIPT TẠO INDEX TỐI ƯU HIỆU NĂNG CHO CƠ SỞ DỮ LIỆU QUANLYLAODONGSINHVIEN
-- Ngày tạo: 14/11/2026
-- Mô tả: Tăng tốc độ đăng nhập, tìm kiếm, lọc đợt lao động, và JOIN dữ liệu
-- =======================================================================

USE [QuanLyLaoDongSinhVien];
GO

-- 1. Index cho bảng Tài Khoản (Tăng tốc Đăng nhập & Đổi mật khẩu)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TaiKhoan_Username' AND object_id = OBJECT_ID('TaiKhoan'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_TaiKhoan_Username]
    ON [dbo].[TaiKhoan] ([Username])
    INCLUDE ([Password], [VaiTro_id], [Deleted_at]);
    PRINT 'Đã tạo IX_TaiKhoan_Username';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TaiKhoan_ResetToken' AND object_id = OBJECT_ID('TaiKhoan'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_TaiKhoan_ResetToken]
    ON [dbo].[TaiKhoan] ([Reset_token])
    WHERE [Reset_token] IS NOT NULL;
    PRINT 'Đã tạo IX_TaiKhoan_ResetToken';
END
GO

-- 2. Index cho bảng Phiếu Đăng Ký (Tăng tốc tải danh sách đợt & kiểm tra trùng lịch)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PhieuDangKy_TaoDot_TrangThai' AND object_id = OBJECT_ID('PhieuDangKy'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PhieuDangKy_TaoDot_TrangThai]
    ON [dbo].[PhieuDangKy] ([TaoDotLaoDong_id], [TrangThai])
    INCLUDE ([MSSV], [LaoDongTheoLop], [LaoDongCaNhan], [ThoiGian]);
    PRINT 'Đã tạo IX_PhieuDangKy_TaoDot_TrangThai';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PhieuDangKy_MSSV_TrangThai' AND object_id = OBJECT_ID('PhieuDangKy'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PhieuDangKy_MSSV_TrangThai]
    ON [dbo].[PhieuDangKy] ([MSSV], [TrangThai])
    INCLUDE ([TaoDotLaoDong_id]);
    PRINT 'Đã tạo IX_PhieuDangKy_MSSV_TrangThai';
END
GO

-- 3. Index cho bảng Sinh Viên (Tăng tốc JOIN Lớp, Khoa và Tài khoản)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SinhVien_Lop_Deleted' AND object_id = OBJECT_ID('SinhVien'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_SinhVien_Lop_Deleted]
    ON [dbo].[SinhVien] ([Lop_id], [Deleted_at])
    INCLUDE ([MSSV], [HoTen], [TaiKhoan], [Email]);
    PRINT 'Đã tạo IX_SinhVien_Lop_Deleted';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SinhVien_TaiKhoan' AND object_id = OBJECT_ID('SinhVien'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_SinhVien_TaiKhoan]
    ON [dbo].[SinhVien] ([TaiKhoan]);
    PRINT 'Đã tạo IX_SinhVien_TaiKhoan';
END
GO

-- 4. Index cho bảng Tạo Đợt Lao Động (Tăng tốc trang quản lý đợt & lọc ngày)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TaoDotNgayLaoDong_Ngayxoa_NgayLaoDong' AND object_id = OBJECT_ID('TaoDotNgayLaoDong'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_TaoDotNgayLaoDong_Ngayxoa_NgayLaoDong]
    ON [dbo].[TaoDotNgayLaoDong] ([Ngayxoa], [NgayLaoDong])
    INCLUDE ([DotLaoDong], [Buoi], [LoaiLaoDong], [TrangThaiDuyet], [SoLuongSinhVien], [KhuVuc]);
    PRINT 'Đã tạo IX_TaoDotNgayLaoDong_Ngayxoa_NgayLaoDong';
END
GO

-- 5. Index cho bảng Điểm Danh & Thống Kê Số Ngày
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DanhSachDiemDanh_Dot_MSSV' AND object_id = OBJECT_ID('DanhSachDiemDanh'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DanhSachDiemDanh_Dot_MSSV]
    ON [dbo].[DanhSachDiemDanh] ([Dot_id], [MSSV]);
    PRINT 'Đã tạo IX_DanhSachDiemDanh_Dot_MSSV';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SoNgayLaoDong_MSSV' AND object_id = OBJECT_ID('SoNgayLaoDong'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_SoNgayLaoDong_MSSV]
    ON [dbo].[SoNgayLaoDong] ([MSSV])
    INCLUDE ([TongSoNgay]);
    PRINT 'Đã tạo IX_SoNgayLaoDong_MSSV';
END
GO

-- 6. Index cho bảng Lớp (Tăng tốc lọc Lớp theo Khoa)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Lop_Khoa' AND object_id = OBJECT_ID('Lop'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Lop_Khoa]
    ON [dbo].[Lop] ([Khoa_id])
    INCLUDE ([TenLop]);
    PRINT 'Đã tạo IX_Lop_Khoa';
END
GO

-- 7. Index cho bảng Xác Nhận Hoàn Thành
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PhieuXacNhanHoanThanh_MSSV_TrangThai' AND object_id = OBJECT_ID('PhieuXacNhanHoanThanh'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PhieuXacNhanHoanThanh_MSSV_TrangThai]
    ON [dbo].[PhieuXacNhanHoanThanh] ([MSSV], [TrangThai]);
    PRINT 'Đã tạo IX_PhieuXacNhanHoanThanh_MSSV_TrangThai';
END
GO
