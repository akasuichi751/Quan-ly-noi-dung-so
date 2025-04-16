const express = require('express');
const bcrypt = require('bcryptjs'); // Mã hóa mật khẩu
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;


// Cấu hình để Express phục vụ các file tĩnh từ thư mục gốc (nơi có file app.js)
app.use(express.static(path.join(__dirname)));

// ✅ Cấu hình view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Middleware xử lý form & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Kết nối MySQL
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'content_manager'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err);
    } else {
        console.log('✅ Kết nối MySQL thành công!');
    }
});

// ✅ Cấu hình session lưu vào MySQL
const sessionStore = new MySQLStore({
    expiration: 86400000, // 24 giờ
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 phút kiểm tra session hết hạn
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'content_manager'
});

sessionStore.onReady().then(() => {
    console.log("✅ MySQLStore đã sẵn sàng!");
}).catch(err => {
    console.error("❌ Lỗi MySQLStore:", err);
});

app.use(session({
    secret: '123456', // 🔑 Đổi chuỗi secret này
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: false, httpOnly: true, maxAge: 86400000 } // 24 giờ
}));

// ✅ Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    console.log("🔍 Session hiện tại:", req.session);

    if (!req.session || !req.session.user) {
        console.log("⚠️ Người dùng chưa đăng nhập, chuyển hướng về /login");
        return res.redirect('/login');
    }

    res.locals.user = req.session.user; // Cung cấp user cho tất cả các trang
    next();
}

// ✅ Trang chủ chuyển hướng về đăng nhập
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ✅ Trang đăng nhập
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// ✅ Xử lý đăng nhập
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('❌ Lỗi truy vấn:', err);
            return res.render('login', { error: 'Lỗi hệ thống!' });
        }

        if (results.length === 0) {
            return res.render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu!' });
        }

        const user = results[0];

        // 🔑 Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu!' });
        }

        // ✅ Lưu session người dùng
        req.session.user = { id: user.id, username: user.username, role: user.role };
        req.session.save((err) => {
            if (err) {
                console.error("❌ Lỗi khi lưu session:", err);
                return res.render('login', { error: 'Lỗi hệ thống!' });
            }
            console.log("✅ Đăng nhập thành công, chuyển hướng về /home");
            res.redirect('/home');
        });
    });
});

// ✅ Hiển thị trang quản lý nội dung
app.get('/home', requireLogin, (req, res) => {
    db.query('SELECT * FROM contents', (err, results) => {
        if (err) {
            console.error('❌ Lỗi lấy dữ liệu nội dung:', err);
            return res.render('home', { user: req.session.user, contents: [], keyword: "" });
        }
        res.render('home', { user: req.session.user, contents: results, keyword: "" });
    });
});

// ✅ Tìm kiếm nội dung
app.get('/search', requireLogin, (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.trim() : "";

    if (!keyword) {
        return res.redirect('/home');
    }

    const sql = "SELECT * FROM contents WHERE LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)";
    const searchValue = `%${keyword}%`;

    db.query(sql, [searchValue, searchValue], (err, results) => {
        if (err) {
            console.error("❌ Lỗi truy vấn SQL:", err);
            return res.render('home', { user: req.session.user, contents: [], keyword: "" });
        }
        res.render('home', { user: req.session.user, contents: results, keyword });
    });
});

// ✅ Đăng ký người dùng
app.get('/register', (req, res) => {
    res.render('register', { error: null, success: null });
});

app.post('/register', async (req, res) => {
    const { username, password, confirm_password, role } = req.body;

    if (password !== confirm_password) {
        return res.render('register', { error: 'Mật khẩu xác nhận không khớp!', success: null });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Lỗi truy vấn:', err);
            return res.render('register', { error: 'Lỗi hệ thống, thử lại sau!', success: null });
        }

        if (results.length > 0) {
            return res.render('register', { error: 'Tên đăng nhập đã tồn tại!', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
            [username, hashedPassword, role], 
            (err, result) => {
                if (err) {
                    console.error('Lỗi khi đăng ký:', err);
                    return res.render('register', { error: 'Lỗi hệ thống!', success: null });
                }

                res.render('register', { error: null, success: 'Đăng ký thành công! Vui lòng đăng nhập.' });
            }
        );
    });
});

// ✅ Đăng xuất
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});



const contentRoutes = require('./routes/contentRoutes');
app.use('/contents', contentRoutes);

// ✅ Import routes nội dung & profile
const authRoutes = require('./routes/authRoutes');
app.use('/authRoutes', authRoutes) ;

const profileRoutes = require("./routes/profileRoutes");
app.use("/profile", requireLogin, profileRoutes); // ✅ Kiểm tra đăng nhập trước khi vào profile

// ✅ Khởi động server
app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
