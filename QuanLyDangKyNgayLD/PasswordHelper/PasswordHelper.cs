using System;
using BCrypt.Net;

public static class PasswordHelper
{
    public static string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            throw new ArgumentException("password must not be empty", nameof(password));

        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public static bool VerifyPassword(string password, string hashed)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashed))
            return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hashed);
        }
        catch
        {
            return false;
        }
    }

    public static bool IsHashed(string password)
    {
        if (string.IsNullOrEmpty(password))
            return false;

        var p = password.Trim();
        return p.StartsWith("$2a$") || p.StartsWith("$2b$") || p.StartsWith("$2y$");
    }

    // ✅ Hàm mới: xử lý mật khẩu đã chỉnh sửa
    public static string PreparePasswordForSave(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password không được để trống.", nameof(password));

        return IsHashed(password) ? password : HashPassword(password);
    }
}
