const db = require('../db');

// Lấy danh sách tất cả người dùng
exports.listUsers = async (req, res) => {
  const query = 'SELECT id, username, email, role FROM users';
  try {
    const [results] = await db.execute(query); // Sử dụng execute thay vì query
    res.render('users/index', { users: results });
  } catch (err) {
    console.error('❌ Lỗi khi truy vấn:', err);
    return res.status(500).send('Lỗi khi truy vấn người dùng');
  }
};

// Hiển thị form chỉnh sửa
exports.getEditUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (results.length === 0) {
      console.error('❌ Không tìm thấy người dùng với ID:', id);
      return res.status(404).send('Không tìm thấy người dùng');
    }
    res.render('users/edit', { user: results[0] });
  } catch (err) {
    console.error('❌ Lỗi khi truy vấn:', err);
    return res.status(500).send('Lỗi khi truy vấn người dùng');
  }
};

// Xử lý cập nhật người dùng
exports.postEditUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;
  const query = 'UPDATE users SET username=?, email=?, role=? WHERE id=?';
  try {
    await db.execute(query, [username, email, role, id]);
    console.log(`✅ Người dùng với ID ${id} đã được cập nhật`);
    res.redirect('/users');
  } catch (err) {
    console.error('❌ Lỗi khi cập nhật người dùng:', err);
    return res.status(500).send('Lỗi khi cập nhật người dùng');
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    console.log(`✅ Người dùng với ID ${id} đã được xóa`);
    res.redirect('/users');
  } catch (err) {
    console.error('❌ Lỗi khi xóa người dùng:', err);
    return res.status(500).send('Lỗi khi xóa người dùng');
  }
};
