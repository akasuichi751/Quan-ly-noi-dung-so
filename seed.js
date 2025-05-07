const connection = require('./db');

// Thực thi truy vấn
connection.query(sql, (err, results) => {
    if (err) {
        console.error('❌ Lỗi khi chèn dữ liệu:', err);
    } else {
        console.log('✅ Dữ liệu đã được thêm thành công!');
    }
    connection.end(); // Đóng kết nối sau khi chèn xong
});
