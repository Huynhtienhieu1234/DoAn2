using System;
using System.Net;
using System.Net.Mail;

public static class EmailHelperCompletion
{
    public static bool SendCompletionEmail(string toEmail, string studentName)
    {
        try
        {
            var fromEmail = "huynhtienhieu11@gmail.com";
            var fromPassword = "ocvs pcto zbca kfgy"; // App password Gmail

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
        .email-body {{
            padding: 20px;
            background-color: #fff;
            border-radius: 6px;
            text-align: center;
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
            <img src=""https://raw.githubusercontent.com/Huynhtienhieu1234/UploadAnh/main/logoxoanen.png"" 
                 alt=""Logo"" border=""0"" style='max-width:220px;margin-bottom:10px;'>
        </div>
        <div class='email-body'>
            <h2 style='color:#00acc1'>Xin chào {studentName},</h2>
            <p>Bạn đã được xác nhận <strong>Hoàn thành lao động</strong> vào ngày <strong>{DateTime.Now:dd/MM/yyyy}</strong>.</p>
            <p>Chúc mừng bạn đã hoàn tất nghĩa vụ lao động theo quy định của khoa.</p>
            <p style='margin-top: 20px;'>Vui lòng lưu lại email này để làm minh chứng khi cần thiết.</p>
        </div>
        <div class='email-footer'>
            &copy; {DateTime.Now.Year} Quản lý ngày lao động. Mọi quyền được bảo lưu.
        </div>
    </div>
</body>
</html>";

            using (var message = new MailMessage(fromEmail, toEmail)
            {
                Subject = "Thông báo hoàn thành lao động",
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
