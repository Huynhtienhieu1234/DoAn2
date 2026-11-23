using System;
using System.Configuration;
using System.IO;
using System.Net;
using System.Net.Mail;

public static class EmailHelperCompletion
{
    public static bool SendCompletionEmail(string toEmail, string studentName)
    {
        string error;
        return SendCompletionEmail(toEmail, studentName, out error);
    }

    public static bool SendCompletionEmail(string toEmail, string studentName, out string errorMessage)
    {
        errorMessage = string.Empty;
        try
        {
            var fromEmail = ConfigurationManager.AppSettings["SmtpSenderEmail"];
            if (string.IsNullOrWhiteSpace(fromEmail))
                fromEmail = "huynhtienhieu11@gmail.com";

            var fromPassword = ConfigurationManager.AppSettings["SmtpAppPassword"];
            if (string.IsNullOrWhiteSpace(fromPassword))
                fromPassword = "ocvs pcto zbca kfgy"; // App password Gmail

            var smtp = new SmtpClient
            {
                Host = "smtp.gmail.com",
                Port = 587,
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(fromEmail, fromPassword)
            };

            string logoPath = GetLogoPath();
            bool hasLogo = !string.IsNullOrEmpty(logoPath) && File.Exists(logoPath);

            string logoHtml = hasLogo
                ? @"<table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' style='margin: 0 auto 14px auto;'>
                        <tr>
                            <td align='center' valign='middle' style='background-color: #ffffff; width: 80px; height: 80px; border-radius: 50%; padding: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);'>
                                <img src=""cid:logo_dhdthap"" 
                                     alt=""Logo Đại học Đồng Tháp"" 
                                     width=""64"" 
                                     style=""display: block; width: 64px; height: auto; border: 0; outline: none; margin: 0 auto;"">
                            </td>
                        </tr>
                    </table>"
                : "";

            string body = $@"
<!DOCTYPE html>
<html lang='vi'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Thông báo hoàn thành lao động</title>
</head>
<body style='margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
    <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='background-color: #f1f5f9; padding: 40px 15px;'>
        <tr>
            <td align='center'>
                <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>
                    <!-- Header Banner -->
                    <tr>
                        <td align='center' style='padding: 32px 30px 24px 30px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); text-align: center;'>
                            {logoHtml}
                            <h2 style='margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;'>
                                TRƯỜNG ĐẠI HỌC ĐỒNG THÁP
                            </h2>
                            <p style='margin: 4px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;'>
                                Hệ Thống Quản Lý Lao Động Sinh Viên
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style='padding: 36px 36px 28px 36px;'>
                            <div style='text-align: center; margin-bottom: 20px;'>
                                <span style='display: inline-block; font-size: 40px;'>🎉</span>
                                <h3 style='margin: 8px 0 0 0; color: #059669; font-size: 22px; font-weight: 700;'>
                                    Chúc Mừng Hoàn Thành Lao Động!
                                </h3>
                            </div>
                            <p style='margin: 0 0 14px 0; color: #334155; font-size: 15px; line-height: 1.6;'>
                                Xin chào <strong>{studentName}</strong>,
                            </p>
                            <p style='margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;'>
                                Hệ thống xác nhận bạn đã hoàn thành đủ chỉ tiêu và nghĩa vụ lao động theo quy định vào ngày <strong>{DateTime.Now:dd/MM/yyyy}</strong>.
                            </p>

                            <!-- Info Box -->
                            <div style='background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 18px 20px; margin: 24px 0;'>
                                <p style='margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 700;'>
                                    ✅ Trạng thái: <span style='color: #059669;'>ĐÃ HOÀN THÀNH</span>
                                </p>
                                <p style='margin: 0; color: #047857; font-size: 13px; line-height: 1.5;'>
                                    Kết quả lao động của bạn đã được lưu vào hệ thống cơ sở dữ liệu của nhà trường.
                                </p>
                            </div>

                            <p style='margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;'>
                                📌 <em>Vui lòng lưu giữ email này để phục vụ việc đối chiếu hoặc làm minh chứng khi cần thiết.</em>
                            </p>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style='padding: 0 36px;'>
                            <hr style='border: none; border-top: 1px solid #f1f5f9; margin: 0;'>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style='padding: 24px 36px 30px 36px; text-align: center; background-color: #ffffff;'>
                            <p style='margin: 0 0 6px 0; color: #64748b; font-size: 13px; font-weight: 600;'>
                                Trường Đại Học Đồng Tháp
                            </p>
                            <p style='margin: 0 0 8px 0; color: #94a3b8; font-size: 12px;'>
                                783 Phạm Hữu Lầu, Phường 6, TP. Cao Lãnh, Đồng Tháp
                            </p>
                            <p style='margin: 0; color: #cbd5e1; font-size: 11px;'>
                                &copy; {DateTime.Now.Year} Quản Lý Ngày Lao Động Sinh Viên. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

            using (var message = new MailMessage
            {
                From = new MailAddress(fromEmail, "Đại học Đồng Tháp - Quản Lý Lao Động", System.Text.Encoding.UTF8),
                Subject = "🎉 [ĐH Đồng Tháp] Xác nhận hoàn thành nghĩa vụ lao động",
                SubjectEncoding = System.Text.Encoding.UTF8
            })
            {
                message.To.Add(toEmail);

                var avHtml = AlternateView.CreateAlternateViewFromString(body, System.Text.Encoding.UTF8, System.Net.Mime.MediaTypeNames.Text.Html);

                if (hasLogo)
                {
                    var logoResource = new LinkedResource(logoPath, "image/png")
                    {
                        ContentId = "logo_dhdthap",
                        TransferEncoding = System.Net.Mime.TransferEncoding.Base64
                    };
                    logoResource.ContentType.Name = Path.GetFileName(logoPath);
                    avHtml.LinkedResources.Add(logoResource);
                }

                message.AlternateViews.Add(avHtml);
                message.IsBodyHtml = true;

                smtp.Send(message);
            }

            return true;
        }
        catch (Exception ex)
        {
            string fullErr = ex.ToString();
            string innerErr = ex.InnerException != null ? ex.InnerException.Message : string.Empty;

            if (fullErr.Contains("Daily user sending limit exceeded") || fullErr.Contains("5.4.5"))
            {
                errorMessage = "Hòm thư Gmail (" + (ConfigurationManager.AppSettings["SmtpSenderEmail"] ?? "người gửi") + ") đã vượt quá hạn mức gửi trong ngày của Google (Daily sending limit exceeded).";
            }
            else if (fullErr.Contains("5.5.1") || fullErr.Contains("5.7.8") || fullErr.Contains("Username and Password not accepted") || fullErr.Contains("Authentication Required") || fullErr.Contains("BadCredentials"))
            {
                errorMessage = "Sai Mật khẩu ứng dụng Gmail (App Password) cho tài khoản " + (ConfigurationManager.AppSettings["SmtpSenderEmail"]) + ". Lưu ý: Mật khẩu ứng dụng 16 ký tự phải được tạo từ chính tài khoản Gmail này (tại myaccount.google.com -> Bảo mật -> Xác minh 2 bước -> Mật khẩu ứng dụng).";
            }
            else if (!string.IsNullOrEmpty(innerErr))
            {
                errorMessage = $"{ex.Message} ({innerErr})";
            }
            else
            {
                errorMessage = ex.Message;
            }
            Console.WriteLine("Lỗi gửi mail: " + ex.ToString());
            return false;
        }
    }

    private static string GetLogoPath()
    {
        string[] candidateNames = { "logo_dhdthap.png", "logo_wiki.png" };
        foreach (var name in candidateNames)
        {
            try
            {
                if (System.Web.Hosting.HostingEnvironment.IsHosted)
                {
                    string mapped = System.Web.Hosting.HostingEnvironment.MapPath("~/Content/images/" + name);
                    if (!string.IsNullOrEmpty(mapped) && File.Exists(mapped))
                        return mapped;
            }
            }
            catch { }

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string path = Path.Combine(baseDir, "Content", "images", name);
            if (File.Exists(path))
                return path;

            string parentPath = Path.Combine(baseDir, "..", "Content", "images", name);
            if (File.Exists(parentPath))
                return Path.GetFullPath(parentPath);
        }
        return null;
    }
}
