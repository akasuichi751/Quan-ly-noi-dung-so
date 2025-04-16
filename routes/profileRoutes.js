const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
// ✅ Kết nối MySQL (dùng Pool thay vì createConnection)
const db = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "content_manager",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}



// ✅ Hiển thị trang đổi mật khẩu
router.get("/change-password", requireLogin, (req, res) => {
    res.render("change-password", { error: null, success: null });
});

// ✅ Xử lý đổi mật khẩu
router.post("/change-password", requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const { old_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
        return res.render("change-password", { error: "Mật khẩu mới không khớp!", success: null });
    }

    db.query("SELECT password FROM users WHERE id = ?", [userId], async (err, results) => {
        if (err || results.length === 0) {
            console.error("❌ Lỗi truy vấn:", err);
            return res.render("change-password", { error: "Lỗi hệ thống!", success: null });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            return res.render("change-password", { error: "Mật khẩu cũ không đúng!", success: null });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (err) => {
            if (err) {
                console.error("❌ Lỗi cập nhật mật khẩu:", err);
                return res.render("change-password", { error: "Lỗi hệ thống!", success: null });
            }
            res.render("change-password", { error: null, success: "Đổi mật khẩu thành công!" });
        });
    });
});


// ✅ Trang chỉnh sửa hồ sơ
router.get("/edit", requireLogin, (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
        return res.redirect("/home");
    }

    db.query("SELECT id, username, email FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) {
            console.error("❌ Lỗi lấy dữ liệu user:", err);
            return res.redirect("/home");
        }

        if (results.length === 0) {
            return res.redirect("/home");
        }

        res.render("edit-profile", { user: results[0], error: null });
    });
});

// ✅ Xử lý cập nhật hồ sơ
router.post("/edit", requireLogin, (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
        return res.redirect("/home");
    }

    console.log("📩 Dữ liệu form gửi lên:", req.body); // 🔍 Debug kiểm tra dữ liệu gửi lên

    const { username, email } = req.body;
    if (!username || !email) {
        return res.render("edit-profile", { user: req.session.user, error: "Vui lòng nhập đầy đủ thông tin!" });
    }

    db.query(
        "UPDATE users SET username = ?, email = ? WHERE id = ?",
        [username, email, userId],
        (err, result) => {
            if (err) {
                console.error("❌ Lỗi cập nhật hồ sơ:", err);
                return res.render("edit-profile", { user: req.session.user, error: "Lỗi hệ thống!" });
            }

            // ✅ Cập nhật session user
            req.session.user.username = username;
            req.session.user.email = email;
            
            req.session.save((err) => {
                if (err) {
                    console.error("❌ Lỗi khi lưu session:", err);
                    return res.render("edit-profile", { user: req.session.user, error: "Lỗi hệ thống!" });
                }
                res.redirect("/home");
            });
        }
    );
});

module.exports = router;
