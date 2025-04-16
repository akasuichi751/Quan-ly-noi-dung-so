const express = require('express');
const router = express.Router();
const db = require('../db');
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

// ✅ Hiển thị trang quên mật khẩu
router.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { error: null, success: null });
});

// ✅ Xử lý gửi email đặt lại mật khẩu
router.post("/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.render("forgot-password", { error: "Vui lòng nhập email!", success: null });
    }

    db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
        if (err || results.length === 0) {
            return res.render("forgot-password", { error: "Email không tồn tại!", success: null });
        }

        const userId = results[0].id;
        const token = crypto.randomBytes(20).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 giờ

        db.query("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?", [token, expires, userId], async (err) => {
            if (err) {
                return res.render("forgot-password", { error: "Lỗi hệ thống!", success: null });
            }

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
        });
    });
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

    db.query("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()", [token], async (err, results) => {
        if (err || results.length === 0) {
            return res.send("Token không hợp lệ hoặc đã hết hạn!");
        }

        const userId = results[0].id;
        const hashedPassword = await bcrypt.hash(new_password, 10);

        db.query("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?", [hashedPassword, userId], (err) => {
            if (err) {
                return res.send("Lỗi hệ thống!");
            }
            res.redirect("/login");
        });
    });
});

// ✅ Xử lý đăng xuất
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ✅ Hiển thị trang đăng ký
router.get('/register', (req, res) => {
    res.render('register', { message: null });
});

// ✅ Xử lý đăng ký tài khoản
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Kiểm tra xem username đã tồn tại chưa
        const [existingUser] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);

        if (existingUser.length > 0) {
            return res.render('register', { message: '❌ Tên đăng nhập đã tồn tại!' });
        }

        // Mã hóa mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query('INSERT INTO users (username, password) VALUES (?, ?)', 
            [username, hashedPassword]);

        return res.redirect('/login');

    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        return res.render('register', { message: '❌ Lỗi hệ thống!' });
    }
});

module.exports = router;
