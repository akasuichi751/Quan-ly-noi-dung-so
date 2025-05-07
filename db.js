const mysql = require('mysql2');

// Cấu hình kết nối MySQL
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',       // Thay đổi nếu user khác
    password: '',       // Thay đổi mật khẩu nếu có
    database: 'content_manager'
});

// Biến đổi kết nối thành Promise sau khi đã tạo kết nối
const db = connection.promise();

// Kiểm tra kết nối
connection.connect((err) => {
    if (err) {
        console.error('❌ Kết nối MySQL thất bại:', err);
        return;
    }
    console.log('✅ Đã kết nối MySQL thành công!');
});

// Export kết nối Promise để sử dụng ở nơi khác trong dự án
module.exports = db;
