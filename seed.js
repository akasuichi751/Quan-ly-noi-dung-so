const connection = require('./db');

// Câu lệnh SQL để chèn dữ liệu
const sql = `
INSERT INTO contents (title, description, media_url) VALUES
('Hướng dẫn sử dụng Node.js', 'Bài viết hướng dẫn lập trình với Node.js cơ bản.', 'https://example.com/nodejs-guide.jpg'),
('Giới thiệu về MySQL', 'Tìm hiểu cơ bản về MySQL và cách quản lý cơ sở dữ liệu.', 'https://example.com/mysql-intro.png'),
('Làm web với Express.js', 'Cách sử dụng Express.js để xây dựng trang web.', 'https://example.com/express-tutorial.mp4'),
('Quản lý nội dung số', 'Hệ thống quản lý nội dung số (CMS) với Node.js và MySQL.', 'https://example.com/cms-demo.pdf'),
('Học lập trình JavaScript', 'Khóa học lập trình JavaScript từ cơ bản đến nâng cao.', 'https://example.com/js-course.jpg');
`;

// Thực thi truy vấn
connection.query(sql, (err, results) => {
    if (err) {
        console.error('❌ Lỗi khi chèn dữ liệu:', err);
    } else {
        console.log('✅ Dữ liệu đã được thêm thành công!');
    }
    connection.end(); // Đóng kết nối sau khi chèn xong
});
