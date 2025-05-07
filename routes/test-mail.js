require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail, // Email người dùng yêu cầu quên mật khẩu
    subject: 'Lấy lại mật khẩu của bạn',
    text: `Chúng tôi đã nhận được yêu cầu lấy lại mật khẩu cho tài khoản của bạn. Vui lòng click vào liên kết dưới đây để đặt lại mật khẩu: \n\n${resetLink}\n\nNếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.`
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('❌ Lỗi:', error);
    } else {
        console.log('✅ Email gửi thành công:', info.response);
    }
});
