const mysql = require('mysql2');

// Cấu hình kết nối MySQL
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',       // Thay đổi nếu user khác
    password: '',       // Thay đổi mật khẩu nếu có
    database: 'content_manager'
});

// Kiểm tra kết nối
db.connect((err) => {
    if (err) {
        console.error('❌ Kết nối MySQL thất bại:', err);
        return;
    }
    console.log('✅ Đã kết nối MySQL thành công!');
});

// Xuất module
module.exports = db;
