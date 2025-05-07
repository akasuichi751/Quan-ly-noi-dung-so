const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Danh sách người dùng
router.get('/', userController.listUsers);

// Trang chỉnh sửa (đúng tên: getEditUser)
router.get('/edit/:id', userController.getEditUser);

// Cập nhật thông tin (đúng tên: postEditUser)
router.post('/edit/:id', userController.postEditUser);

// Xóa người dùng
router.post('/delete/:id', userController.deleteUser);

module.exports = router;
