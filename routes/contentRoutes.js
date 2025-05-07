const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const axios = require('axios'); 
// ✅ Kết nối MySQL
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'content_manager'
});

// ✅ Kiểm tra kết nối
db.connect((err) => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err);
    } else {
        console.log('✅ Kết nối MySQL thành công!');
    }
});

// ✅ Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.locals.user = req.session.user; // Truyền user vào tất cả các trang
    next();
}

// ✅ Hiển thị danh sách nội dung
router.get('/', requireLogin, (req, res) => {
    const message = req.query.message || "";// Nhận thông báo từ query params
    db.query('SELECT * FROM contents', (err, results) => {
        if (err) {
            console.error('❌ Lỗi lấy dữ liệu nội dung:', err);
            return res.status(500).send('Lỗi lấy dữ liệu nội dung!');
        }

        res.render('home', { contents: results, user: req.session.user, keyword: "" ,message }); // ✅ Đảm bảo `keyword` tồn tại
    });
});

// ✅ Trang thêm nội dung
router.get('/add', requireLogin, (req, res) => {
    res.render('add-content', { user: req.session.user });
});

// ✅ Xử lý thêm nội dung
router.post('/add', requireLogin, (req, res) => {
    const { title, description, media_url } = req.body;

    db.query('INSERT INTO contents (title, description, media_url) VALUES (?, ?, ?)', 
    [title, description, media_url], (err) => {
        if (err) {
            console.error('❌ Lỗi thêm nội dung:', err);
            return res.status(500).send('Lỗi thêm nội dung!');
        }
        res.redirect('/contents?message=thêm nội dung thành công!');
    });
});

// ✅ Trang sửa nội dung
router.get('/edit/:id', requireLogin, (req, res) => {
    db.query('SELECT * FROM contents WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            console.error('❌ Lỗi lấy dữ liệu:', err);
            return res.status(500).send('Lỗi lấy dữ liệu!');
        }
        if (results.length === 0) return res.status(404).send('Không tìm thấy nội dung!');
        res.render('edit-content', { content: results[0], user: req.session.user });
    });
});

// ✅ Xử lý cập nhật nội dung
router.post('/edit/:id', requireLogin, (req, res) => {
    const { title, description, media_url } = req.body;

    db.query('UPDATE contents SET title=?, description=?, media_url=? WHERE id=?', 
    [title, description, media_url, req.params.id], (err) => {
        if (err) {
            console.error('❌ Lỗi cập nhật nội dung:', err);
            return res.status(500).send('Lỗi cập nhật nội dung!');
        }
        res.redirect('/contents?message=Nội dung đã được sửa thành công!');
    });
});

// ✅ Xóa nội dung
router.post('/delete/:id', requireLogin, (req, res) => {
    db.query('DELETE FROM contents WHERE id=?', [req.params.id], (err) => {
        if (err) {
            console.error('❌ Lỗi xóa nội dung:', err);
            return res.status(500).send('Lỗi xóa nội dung!');
        }
        res.redirect('/contents?message=Nội dung đã được xóa thành công!');
    });
});

// ✅ Xử lý tìm kiếm nội dung
router.get('/search', requireLogin, (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.trim() : "";
    const message = req.query.message || ""; // Lấy thông báo nếu có
    if (!keyword) {
        return res.redirect('/contents');
    }

    const sql = "SELECT * FROM contents WHERE LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)";
    const searchValue = `%${keyword}%`;

    db.query(sql, [searchValue, searchValue], (err, results) => {
        if (err) {
            console.error("❌ Lỗi truy vấn SQL:", err);
            return res.render('home', { contents: [], user: req.session.user, keyword: "" });
        }
        res.render('home', { contents: results, user: req.session.user, keyword ,message  });
    });
});

router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    db.query('SELECT * FROM contents', (err, results) => {
        if (err) {
            console.error('❌ Lỗi lấy dữ liệu nội dung:', err);
            return res.status(500).send('Lỗi lấy dữ liệu nội dung!');
        }

        res.render('home', { 
            contents: results, 
            user: req.session.user, 
            message: req.query.message || ""  // ✅ Thêm biến message
        });
    });
});

// GET /contents/api/data
router.post('/api/data', async (req, res) => {
    try {
      const { fb_id, fb_link, content_text, media_ids, status } = req.body;
  
      await db.query(`
        INSERT INTO content (fb_id, fb_link, body, media_ids, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [fb_id, fb_link, content_text, JSON.stringify(media_ids), status || 'đang đăng']);
  
      res.status(200).json({ message: 'Lưu thành công' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi lưu dữ liệu' });
    }
  });
  




module.exports = router;
