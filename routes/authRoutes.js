const express = require('express');
const router = express.Router();
const db = require('../db'); // Giữ nguyên kết nối với MySQL
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Cấu hình gửi email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Biểu thức chính quy kiểm tra email hợp lệ
const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

// ✅ Hiển thị trang quên mật khẩu
router.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { error: null, success: null });
});

// ✅ Xử lý gửi email đặt lại mật khẩu
router.post("/forgot-password", async (req, res) => {  // Chú ý async ở đây
    const email = req.body.email.trim();
    if (!email) {
        return res.render("forgot-password", { error: "Vui lòng nhập email!", success: null });
    }

    try {
        const [results] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (results.length === 0) {
            return res.render("forgot-password", { error: "Email không tồn tại!", success: null });
        }

        const userId = results[0].id;
        const token = crypto.randomBytes(20).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 giờ

        await db.query("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?", [token, expires, userId]);

        // Gửi email
        const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;
        await transporter.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Đặt lại mật khẩu",
            html: `<p>Nhấn vào link dưới đây để đặt lại mật khẩu:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>Link này có hiệu lực trong 1 giờ.</p>`
        });

        res.render("forgot-password", { error: null, success: "Email đặt lại mật khẩu đã được gửi!" });
    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        res.render("forgot-password", { error: "Lỗi hệ thống!", success: null });
    }
});

// ✅ Hiển thị trang đặt lại mật khẩu
router.get("/reset-password/:token", (req, res) => {
    const { token } = req.params;

    db.query("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()", [token], (err, results) => {
        if (err || results.length === 0) {
            return res.send("Token không hợp lệ hoặc đã hết hạn!");
        }
        res.render("reset-password", { token, error: null });
    });
});

// ✅ Xử lý đặt lại mật khẩu
router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
        return res.render("reset-password", { token, error: "Mật khẩu không khớp!" });
    }

    try {
        const [results] = await db.query("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()", [token]);
        if (results.length === 0) {
            return res.send("Token không hợp lệ hoặc đã hết hạn!");
        }

        const userId = results[0].id;
        const hashedPassword = await bcrypt.hash(new_password, 10);

        await db.query("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?", [hashedPassword, userId]);

        res.redirect("/login");
    } catch (error) {
        console.error("Lỗi hệ thống khi đặt lại mật khẩu:", error);
        res.send("Lỗi hệ thống!");
    }
});

// ✅ Xử lý đăng xuất
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ✅ Hiển thị trang đăng ký
router.get('/register', (req, res) => {
    res.render('register', { error: null, success: null });
});

// ✅ Xử lý đăng ký tài khoản
router.post('/register', async (req, res) => {
    const { username, password, confirm_password, email, role } = req.body;

    try {
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        // Kiểm tra tên đăng nhập đã tồn tại
        const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [trimmedUsername]);

        if (existingUser.length > 0) {
            return res.render('register', { error: '❌ Tên đăng nhập đã tồn tại!', success: null });
        }

        // Kiểm tra email đã tồn tại
        const [existingEmail] = await db.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
        if (existingEmail.length > 0) {
            return res.render('register', { error: '❌ Email đã tồn tại!', success: null });
        }

        // Kiểm tra email hợp lệ
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.render('register', { error: '❌ Email phải là Gmail hợp lệ!', success: null });
        }

        // Kiểm tra mật khẩu
        if (password !== confirm_password) {
            return res.render('register', { error: '❌ Mật khẩu và mật khẩu xác nhận không khớp!', success: null });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Lưu thông tin vào cơ sở dữ liệu
        await db.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
            [trimmedUsername, hashedPassword, trimmedEmail, role]);

        return res.render('register', { error: null, success: '🎉 Đăng ký thành công! Vui lòng đăng nhập.' });

    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        return res.render('register', { error: '❌ Lỗi hệ thống, vui lòng thử lại!', success: null });
    }
});

module.exports = router;
