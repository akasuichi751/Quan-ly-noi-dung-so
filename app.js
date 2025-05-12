const express = require('express');
const bcrypt = require('bcryptjs'); // Mã hóa mật khẩu
const mysql = require('mysql2');
const crypto = require('crypto');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios');


require('dotenv').config();

const app = express();
const port = 3000;


// ✅ Kết nối MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
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

// Cấu hình để Express phục vụ các file tĩnh từ thư mục gốc (nơi có file app.js)
app.use(express.static(path.join(__dirname)));

// ✅ Cấu hình view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// ✅ Middleware xử lý form & JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/users', userRoutes);

const contentRoutes = require('./routes/contentRoutes');
app.use('/contents', contentRoutes);

// ✅ Import routes nội dung & profile
const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes); 
// Dùng '/auth' để map các route từ 'authRoutes.js'

const profileRoutes = require("./routes/profileRoutes");
app.use("/profile", requireLogin, profileRoutes); // ✅ Kiểm tra đăng nhập trước khi vào profile


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
            return res.render('home', {
                user: req.session.user,
                contents: [],
                keyword: "", // 👉 thêm dòng này để tránh lỗi
                userToken: req.session.userToken || null // cũng nên truyền luôn nếu bạn dùng
            });
        }

        res.render('home', {
            user: req.session.user,
            contents: results,
            keyword: "", // 👉 thêm dòng này để tránh lỗi
            userToken: req.session.userToken || null
        });
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


// ✅ Đăng xuất
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// -------------------- [1] Điều hướng người dùng đến xác thực Facebook --------------------
app.get('/auth/facebook', (req, res) => {
    // Reset token hiện tại
    req.session.userToken = null;
    req.session.tokenExpiresAt = null;

   const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FB_APP_ID}&redirect_uri=${process.env.FB_REDIRECT_URI}&scope=pages_manage_posts,pages_show_list,pages_read_engagement,public_profile,email&response_type=code`;


    console.log("🔍 [Facebook Auth] Trước khi điều hướng:");
    console.log("📦 Session:", req.session);
    console.log("📤 redirect_uri:", process.env.FB_REDIRECT_URI);

    res.redirect(fbAuthUrl);
});


// -------------------- [2] Callback từ Facebook --------------------
app.get('/auth/facebook/callback', async (req, res) => {
  const authorizationCode = req.query.code;

  // Đổi mã xác thực lấy Access Token
  const tokenResponse = await fetch('https://graph.facebook.com/v12.0/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: 'YOUR_APP_ID',
      client_secret: 'YOUR_APP_SECRET',
      redirect_uri: 'YOUR_REDIRECT_URI',
      code: authorizationCode,
    }),
  });

  const tokenData = await tokenResponse.json();

  // Trả về Access Token cho người dùng (hoặc có thể lưu trong cơ sở dữ liệu)
  const accessToken = tokenData.access_token;

  // Truyền access token đến n8n Webhook hoặc gửi về client
  res.redirect(`YOUR_WEBHOOK_URL?access_token=${accessToken}`);
});

// -------------------- [3] Route lưu token Fanpage --------------------
app.get('/luu-token', requireLogin, async (req, res) => {
    const { email, pageId, pageToken } = req.query;

    if (!email || !pageId || !pageToken) {
        console.error("❌ Thiếu thông tin để lưu token.");
        return res.send("❌ Thiếu thông tin token để lưu.");
    }

    try {
        console.log("📥 [Lưu Token] Email:", email, "| Page ID:", pageId);

        await pool.execute(
            `INSERT INTO facebook_tokens (email, page_id, page_token, created_at) 
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
                page_token = VALUES(page_token), 
                created_at = NOW()`,
            [email, pageId, pageToken]
        );

        // Lưu vào session
        req.session.pageAccessToken = pageToken;
        req.session.pageId = pageId;
        req.session.facebookEmail = email;

        console.log("✅ Token đã lưu vào database và session.");
        res.redirect('/home');

    } catch (err) {
        console.error("❌ [DB] Lỗi khi lưu token:", err);
        res.status(500).send("❌ Lỗi khi lưu token vào database.");
    }
});


// -------------------- [4] Middleware kiểm tra token hết hạn --------------------
function isTokenExpired(req) {
    return !req.session.tokenExpiresAt || Date.now() > req.session.tokenExpiresAt;
}

app.use((req, res, next) => {
    if (req.session.userToken && isTokenExpired(req)) {
        console.warn("⚠️ Token Facebook đã hết hạn vào:", new Date(req.session.tokenExpiresAt).toLocaleString());
        return res.redirect('/auth/facebook');
    }
    next();
});

// -------------------- [5] Ngắt kết nối Facebook --------------------
app.get('/disconnect/facebook', requireLogin, (req, res) => {
    delete req.session.userToken;
    delete req.session.tokenExpiresAt;
    delete req.session.pageAccessToken;
    delete req.session.pageId;
    delete req.session.facebookEmail;

    console.log("🔴 Ngắt kết nối Facebook. Session hiện tại:", req.session);
    res.redirect('/home');
});

// -------------------- [6] Route debug session (tùy chọn để kiểm tra) --------------------
app.get('/debug/session', (req, res) => {
    res.send(`
        <h2>🧪 Thông tin Session hiện tại</h2>
        <pre>${JSON.stringify(req.session, null, 2)}</pre>
    `);
});

app.use(express.static('public'));

// API tiếp nhận bài đăng từ n8n
app.post('/api/save-post', (req, res) => {
     res.send('✅ API đã sẵn sàng để nhận POST từ n8n!');
    const { post_id, topic, content, post_end, status, page_id, post_type, post_link, images, user_id } = req.body;

    // Kiểm tra nếu thiếu dữ liệu cần thiết
    if (!post_id || !topic || !content || !user_id) {
        return res.status(400).send({ error: 'Dữ liệu bài đăng thiếu!' });
    }

    // Chuyển các ảnh thành các trường img_1, img_2,... tối đa 10 ảnh
    const imgColumns = [];
    const imgValues = [];
    const imagesArray = images || [];
    
    imagesArray.slice(0, 10).forEach((image, index) => {
        imgColumns.push(`img_${index + 1}`);
        imgValues.push(image);
    });

    // Truy vấn SQL để lưu bài đăng vào cơ sở dữ liệu
    const query = `
        INSERT INTO posts (post_id, topic, content, post_end, status, page_id, post_type, post_link, ${imgColumns.join(", ")}, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${imgValues.map(() => '?').join(", ")}, ?)
    `;

    // Thực hiện query để lưu dữ liệu vào cơ sở dữ liệu
    db.query(query, [post_id, topic, content, post_end, status, page_id, post_type, post_link, ...imgValues, user_id], (err, results) => {
        if (err) {
            console.error('❌ Lỗi khi lưu bài viết:', err);
            return res.status(500).send({ error: 'Lỗi khi lưu bài viết vào cơ sở dữ liệu' });
        }

        console.log('✅ Bài viết đã được lưu vào cơ sở dữ liệu:', results);
        res.status(200).send({ message: 'Bài viết đã được lưu thành công', post_id: results.insertId });
    });
});


// ✅ Khởi động server
app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
