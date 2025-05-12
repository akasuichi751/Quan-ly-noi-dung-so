const db = require('../db');

// Lấy danh sách tất cả người dùng
exports.listUsers = (req, res) => {
  const query = 'SELECT id, username, email, role FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Lỗi khi truy vấn:', err);
      return res.status(500).send('Lỗi khi truy vấn người dùng');
    }
    res.render('users/index', { users: results });
  });
};

// Hiển thị form chỉnh sửa
exports.getEditUser = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Lỗi khi truy vấn:', err);
      return res.status(500).send('Lỗi khi truy vấn người dùng');
    }
    if (results.length === 0) {
      console.error('❌ Không tìm thấy người dùng với ID:', id);
      return res.status(404).send('Không tìm thấy người dùng');
    }
    res.render('users/edit', { user: results[0] });
  });
};

// Xử lý cập nhật người dùng
exports.postEditUser = (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;
  const query = 'UPDATE users SET username=?, email=?, role=? WHERE id=?';
  db.query(query, [username, email, role, id], (err, results) => {
    if (err) {
      console.error('❌ Lỗi khi cập nhật người dùng:', err);
      return res.status(500).send('Lỗi khi cập nhật người dùng');
    }
    console.log(`✅ Người dùng với ID ${id} đã được cập nhật`);
    res.redirect('/users');
  });
};

// Xóa người dùng
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Lỗi khi xóa người dùng:', err);
      return res.status(500).send('Lỗi khi xóa người dùng');
    }
    console.log(`✅ Người dùng với ID ${id} đã được xóa`);
    res.redirect('/users');
  });
};
