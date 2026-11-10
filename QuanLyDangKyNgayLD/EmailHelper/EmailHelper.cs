using System;
using System.Net;
using System.Net.Mail;

public static class EmailHelper
{
    public static bool SendPasswordResetEmail(string toEmail, string resetLink)
    {
        try
        {
            var fromEmail = "huynhtienhieu11@gmail.com";
            var fromPassword = "ocvs pcto zbca kfgy"; // App password

            var smtp = new SmtpClient
            {
                Host = "smtp.gmail.com",
                Port = 587,
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(fromEmail, fromPassword)
            };

            string body = $@"
<!DOCTYPE html>
<html lang='vi'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Đặt lại mật khẩu</title>
</head>
<body style='margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
    <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='background-color: #f1f5f9; padding: 40px 15px;'>
        <tr>
            <td align='center'>
                <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;'>
                    <!-- Header Banner -->
                    <tr>
                        <td align='center' style='padding: 32px 30px 24px 30px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); text-align: center;'>
                            <img src='https://raw.githubusercontent.com/Huynhtienhieu1234/UploadAnh/main/logoxoanen.png' 
                                 alt='Logo Đại học Đồng Tháp' 
                                 width='110' 
                                 style='display: block; margin: 0 auto 12px auto; max-width: 110px; height: auto; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));'>
                            <h2 style='margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;'>
                                TRƯỜNG ĐẠI HỌC ĐỒNG THÁP
                            </h2>
                            <p style='margin: 4px 0 0 0; color: #dbeafe; font-size: 13px; font-weight: 500;'>
                                Hệ Thống Quản Lý Lao Động Sinh Viên
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style='padding: 36px 36px 28px 36px;'>
                            <h3 style='margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;'>
                                Yêu cầu đặt lại mật khẩu 🔐
                            </h3>
                            <p style='margin: 0 0 14px 0; color: #334155; font-size: 15px; line-height: 1.6;'>
                                Xin chào,
                            </p>
                            <p style='margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;'>
                                Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này. Nếu bạn là người gửi yêu cầu, vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới:
                            </p>

                            <!-- CTA Button -->
                            <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='margin: 28px 0;'>
                                <tr>
                                    <td align='center'>
                                        <a href='{resetLink}' 
                                           target='_blank'
                                           style='display: inline-block; padding: 14px 36px; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); text-align: center; border: 1px solid #1d4ed8;'>
                                            👉 Đặt Lại Mật Khẩu
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Notice Box -->
                            <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 24px 0 20px 0;'>
                                <p style='margin: 0; color: #475569; font-size: 13px; line-height: 1.5;'>
                                    <strong style='color: #b45309;'>⚠️ Lưu ý bảo mật:</strong><br>
                                    • Liên kết này chỉ có hiệu lực trong thời gian ngắn.<br>
                                    • Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này. Mật khẩu của bạn vẫn được an toàn.
                                </p>
                            </div>

                            <!-- Link Fallback -->
                            <p style='margin: 20px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5; word-break: break-all;'>
                                Nếu không thể bấm vào nút trên, bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br>
                                <a href='{resetLink}' style='color: #2563eb; text-decoration: underline;'>{resetLink}</a>
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
                Subject = "🔐 [ĐH Đồng Tháp] Yêu cầu đặt lại mật khẩu tài khoản",
                Body = body,
                IsBodyHtml = true
            })
            {
                message.To.Add(toEmail);
                smtp.Send(message);
            }

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Lỗi gửi mail: " + ex.ToString());

            return false;
        }


    }
}
