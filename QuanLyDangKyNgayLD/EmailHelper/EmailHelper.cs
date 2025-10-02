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
<html>
<head>
    <style>
        .email-container {{
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #e0e0e0;
            color: #333;
        }}
        .email-header {{
            text-align: center;
        }}
        .email-logo {{
            max-width: 220px;
            margin-bottom: 10px;
        }}
        .email-body {{
            padding: 20px;
            background-color: #fff;
            border-radius: 6px;
            text-align: center;
        }}
         .reset-button {{
            display: inline-block;
            margin: 20px auto 0 auto;
            padding: 12px 24px;
            background-color: #DDDDDD;
            color: #66FFCC;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }}
        .email-footer {{
            margin-top: 30px;
            font-size: 12px;
            text-align: center;
            color: #999;
        }}
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='email-header'>
<a href=""https://github.com/Huynhtienhieu1234/UploadAnh"">
    <img src=""https://raw.githubusercontent.com/Huynhtienhieu1234/UploadAnh/main/logoxoanen.png"" 
         alt=""Logo"" border=""0"" class=""email-logo"">
</a>
        </div>
        <div class='email-body'>
            <p>Xin chào,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p>Vui lòng nhấn vào nút bên dưới để đổi mật khẩu:</p>
            <a href='{resetLink}' class='reset-button'>Đặt lại mật khẩu</a>
            <p style='margin-top: 20px;'>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email.</p>
        </div>
        <div class='email-footer'>
            &copy; {DateTime.Now.Year} Quản lý ngày lao động. Mọi quyền được bảo lưu.
        </div>
    </div>
</body>
</html>";

            using (var message = new MailMessage(fromEmail, toEmail)
            {
                Subject = "Đặt lại mật khẩu",
                Body = body,
                IsBodyHtml = true
            })
            {
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
