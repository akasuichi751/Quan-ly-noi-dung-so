const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config({ path: "./gmail.env" }); // Nạp gmail.env
// Cấu hình gửi email


// Biểu thức chính quy kiểm tra email hợp lệ
const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

// ✅ Hiển thị trang quên mật khẩu

// Tạo transporter gửi email bằng Gmail
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GET: Hiển thị form quên mật khẩu
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { error: null, success: null });
});

// POST: Xử lý gửi email đặt lại mật khẩu
router.post("/forgot-password", (req, res) => {
  const email = req.body.email.trim();

  if (!email) {
    return res.render("forgot-password", { error: "Vui lòng nhập email!", success: null });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("❌ Lỗi truy vấn:", err);
      return res.render("forgot-password", { error: "Lỗi hệ thống!", success: null });
    }

    if (results.length === 0) {
      return res.render("forgot-password", { error: "Email không tồn tại!", success: null });
    }

    const userId = results[0].id;
    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 giờ

    db.query("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?", [token, expires, userId], async (err) => {
      if (err) {
        console.error("❌ Lỗi cập nhật token:", err);
        return res.render("forgot-password", { error: "Lỗi hệ thống!", success: null });
      }

      const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;

      try {
        await transporter.sendMail({
          from: `"Support" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Đặt lại mật khẩu",
          html: `
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để đặt lại:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Link sẽ hết hạn sau 1 giờ.</p>
          `,
        });

        console.log("✅ Email đã được gửi tới:", email);
        res.render("forgot-password", { error: null, success: "Email đặt lại mật khẩu đã được gửi!" });
      } catch (emailErr) {
        console.error("❌ Lỗi khi gửi email:", emailErr);
        res.render("forgot-password", { error: "Không thể gửi email. Vui lòng thử lại!", success: null });
      }
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
    res.render('register', { error: null, success: null });
});

// ✅ Xử lý đăng ký tài khoản
router.post('/register', async (req, res) => {
    const { username, password, confirm_password, email, role } = req.body;

    try {
         // Loại bỏ khoảng trắng ở đầu và cuối tên người dùng và email
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        // Kiểm tra xem tên đăng nhập đã tồn tại chưa
        const [existingUser] = await db.promise().query('SELECT * FROM users WHERE username = ?', [trimmedUsername]);

        if (existingUser.length > 0) {
            return res.render('register', { error: '❌ Tên đăng nhập đã tồn tại!' ,success:null });
        }

        const [existingEmail] = await db.promise().query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
        // Kiểm tra email có hợp lệ không (chỉ hỗ trợ email @gmail.com)
        if (!emailRegex.test(trimmedEmail)) {
            return res.render('register', { error: '❌ Email phải là một Gmail hợp lệ!',success:null });
        }

        // Kiểm tra mật khẩu và mật khẩu xác nhận có khớp không
        if (password !== confirm_password) {
            return res.render('register', { error: '❌ Mật khẩu và mật khẩu xác nhận không khớp!',success:null });
        }

        // Mã hóa mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Lưu thông tin vào cơ sở dữ liệu
        await db.promise().query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
        [trimmedUsername, hashedPassword, trimmedEmail, role]);
        
        return res.render('register', { error: null, success: '🎉 Đăng ký thành công! Vui lòng đăng nhập.' });
        return res.redirect('/login');

    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        return res.render('register', { error: '❌ Lỗi hệ thống, vui lòng thử lại!' ,success:null});
    }
});

module.exports = router;
