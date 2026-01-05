import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Okayr" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      replyTo,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
          direction: rtl;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 32px;
          color: #374151;
          line-height: 1.8;
        }
        .content h2 {
          color: #1f2937;
          margin-top: 0;
        }
        .success-icon {
          text-align: center;
          margin: 24px 0;
        }
        .success-icon span {
          display: inline-block;
          width: 64px;
          height: 64px;
          background-color: #10b981;
          border-radius: 50%;
          line-height: 64px;
          font-size: 32px;
          color: white;
        }
        .info-box {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
        }
        .info-box p {
          margin: 0;
          color: #166534;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff !important;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 16px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #6366f1;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Okayr</h1>
        </div>
        <div class="content">
          <div class="success-icon">
            <span>✓</span>
          </div>
          <h2>سلام ${firstName} عزیز،</h2>
          <p>
            از ثبت‌نام شما در <strong>Okayr</strong> بسیار خوشحالیم! 🎉
          </p>
          <p>
            اطلاعات شما با موفقیت در سیستم ثبت شد. حساب کاربری شما در حال بررسی است و به زودی فعال خواهد شد.
          </p>
          <div class="info-box">
            <p>✅ اطلاعات شما با موفقیت ثبت شد</p>
            <p>⏳ حساب کاربری شما در انتظار تأیید است</p>
          </div>
          <p>
            پس از فعال‌سازی حساب، می‌توانید وارد سیستم شده و از امکانات مدیریت OKR استفاده کنید.
          </p>
          <p style="text-align: center;">
            <a href="https://app.okayr.ir/login" class="button">ورود به سیستم</a>
          </p>
          <p>
            اگر سؤالی دارید، با ما در تماس باشید.
          </p>
          <p>
            با احترام،<br>
            تیم Okayr
          </p>
        </div>
        <div class="footer">
          <p>این ایمیل از طرف <a href="https://app.okayr.ir">app.okayr.ir</a> ارسال شده است.</p>
          <p>© ${new Date().getFullYear()} Okayr - تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '🎉 ثبت‌نام شما در Okayr با موفقیت انجام شد',
    html,
  });
}

interface NewUserInfo {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  mobile?: string;
}

export async function sendAdminNotificationEmail(user: NewUserInfo) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@okayr.ir';
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
          direction: rtl;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 32px;
          color: #374151;
          line-height: 1.8;
        }
        .content h2 {
          color: #1f2937;
          margin-top: 0;
        }
        .user-info {
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .user-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .user-info td {
          padding: 8px 0;
          border-bottom: 1px solid #fde68a;
        }
        .user-info td:first-child {
          font-weight: bold;
          color: #92400e;
          width: 120px;
        }
        .user-info tr:last-child td {
          border-bottom: none;
        }
        .action-box {
          background-color: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
          text-align: center;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #ffffff !important;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 8px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 کاربر جدید ثبت‌نام کرد</h1>
        </div>
        <div class="content">
          <h2>اطلاعات کاربر جدید:</h2>
          <div class="user-info">
            <table>
              <tr>
                <td>نام:</td>
                <td>${user.firstName}</td>
              </tr>
              <tr>
                <td>نام خانوادگی:</td>
                <td>${user.lastName}</td>
              </tr>
              <tr>
                <td>ایمیل:</td>
                <td>${user.email}</td>
              </tr>
              <tr>
                <td>نام کاربری:</td>
                <td>${user.username}</td>
              </tr>
              <tr>
                <td>موبایل:</td>
                <td>${user.mobile || 'وارد نشده'}</td>
              </tr>
              <tr>
                <td>تاریخ ثبت‌نام:</td>
                <td>${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR')}</td>
              </tr>
            </table>
          </div>
          <div class="action-box">
            <p>برای بررسی و فعال‌سازی حساب کاربر، وارد پنل مدیریت شوید:</p>
            <a href="https://app.okayr.ir/admin" class="button">پنل مدیریت</a>
          </div>
        </div>
        <div class="footer">
          <p>این ایمیل به صورت خودکار از سیستم Okayr ارسال شده است.</p>
          <p>© ${new Date().getFullYear()} Okayr</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🔔 کاربر جدید: ${user.firstName} ${user.lastName} ثبت‌نام کرد`,
    html,
    replyTo: user.email,
  });
}

export async function sendAccountActivatedEmail(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
          direction: rtl;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 32px;
          color: #374151;
          line-height: 1.8;
        }
        .content h2 {
          color: #1f2937;
          margin-top: 0;
        }
        .success-icon {
          text-align: center;
          margin: 24px 0;
        }
        .success-icon span {
          display: inline-block;
          width: 80px;
          height: 80px;
          background-color: #10b981;
          border-radius: 50%;
          line-height: 80px;
          font-size: 40px;
          color: white;
        }
        .info-box {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
          text-align: center;
        }
        .info-box p {
          margin: 8px 0;
          color: #065f46;
          font-size: 16px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff !important;
          padding: 16px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: 16px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #10b981;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 حساب شما فعال شد!</h1>
        </div>
        <div class="content">
          <div class="success-icon">
            <span>✓</span>
          </div>
          <h2>تبریک ${firstName} عزیز! 🎊</h2>
          <p>
            خبر خوب! حساب کاربری شما در <strong>Okayr</strong> با موفقیت فعال شد.
          </p>
          <div class="info-box">
            <p>✅ حساب شما اکنون فعال است</p>
            <p>🚀 آماده شروع هستید!</p>
          </div>
          <p>
            از همین الان می‌توانید وارد سیستم شده و از تمام امکانات استفاده کنید.
          </p>
          <p style="text-align: center;">
            <a href="https://app.okayr.ir/login" class="button">ورود به Okayr</a>
          </p>
          <p>
            اگر سؤالی دارید، خوشحال می‌شویم کمکتان کنیم.
          </p>
          <p>
            با آرزوی موفقیت،<br>
            تیم Okayr
          </p>
        </div>
        <div class="footer">
          <p>این ایمیل از طرف <a href="https://app.okayr.ir">app.okayr.ir</a> ارسال شده است.</p>
          <p>© ${new Date().getFullYear()} Okayr - تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '🎉 حساب کاربری شما در Okayr فعال شد!',
    html,
  });
}

export async function sendAccountDeactivatedEmail(to: string, firstName: string) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
          direction: rtl;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 32px;
          color: #374151;
          line-height: 1.8;
        }
        .content h2 {
          color: #1f2937;
          margin-top: 0;
        }
        .warning-icon {
          text-align: center;
          margin: 24px 0;
        }
        .warning-icon span {
          display: inline-block;
          width: 80px;
          height: 80px;
          background-color: #f59e0b;
          border-radius: 50%;
          line-height: 80px;
          font-size: 40px;
          color: white;
        }
        .info-box {
          background-color: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .info-box p {
          margin: 8px 0;
          color: #92400e;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #f59e0b;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ وضعیت حساب کاربری</h1>
        </div>
        <div class="content">
          <div class="warning-icon">
            <span>!</span>
          </div>
          <h2>سلام ${firstName} عزیز،</h2>
          <p>
            به اطلاع می‌رسانیم که حساب کاربری شما در <strong>Okayr</strong> به حالت غیرفعال درآمده است.
          </p>
          <div class="info-box">
            <p>⏸️ حساب شما موقتاً غیرفعال شده است</p>
            <p>📧 برای اطلاعات بیشتر با پشتیبانی تماس بگیرید</p>
          </div>
          <p>
            اگر فکر می‌کنید این اتفاق به اشتباه افتاده یا سؤالی دارید، لطفاً با تیم پشتیبانی ما تماس بگیرید.
          </p>
          <p>
            با احترام،<br>
            تیم Okayr
          </p>
        </div>
        <div class="footer">
          <p>این ایمیل از طرف <a href="https://app.okayr.ir">app.okayr.ir</a> ارسال شده است.</p>
          <p>© ${new Date().getFullYear()} Okayr - تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '⚠️ وضعیت حساب کاربری شما در Okayr',
    html,
  });
}

