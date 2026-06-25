import pool from '../db/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// Thêm hàm helper này vào đầu file, sau các import
const cookieConfig = () => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.autoparts.com' : undefined,
  path: '/'
});

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// 1. HÀM ĐĂNG KÝ (TỰ ĐỘNG GÁN TRẠNG THÁI CHỜ DUYỆT)
// ==========================================
export const signup = async (payload, res, secretKey) => {
  const { username, password } = payload;

  try {
    if (!username || !password) {
      const errorMsg = JSON.stringify({ message: "Vui lòng điền đầy đủ thông tin!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(400).json({ maHoaData: encryptedError });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🔥 SỬA ĐỔI: Thêm trường status rõ ràng là 'pending' khi chèn vào DB
    const [result] = await pool.query(
      'INSERT INTO users (username, password, status) VALUES (?, ?, ?)',
      [username, hashedPassword, 'pending']
    );

    // 🔥 SỬA ĐỔI: Thông báo rõ ràng cho người dùng biết cần phải đợi duyệt
    const successMsg = JSON.stringify({
      message: 'Đăng ký thành công! Vui lòng liên hệ Admin để được phê duyệt tài khoản.'
    });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();

    return res.status(201).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi Đăng ký:", err);
    const errorMsg = JSON.stringify({ message: 'Lỗi hệ thống hoặc tài khoản đã tồn tại!' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};

// ==========================================
// 2. HÀM ĐĂNG NHẬP (KIỂM TRA QUYỀN TRUY CẬP)
// ==========================================
export const login = async (payload, res, secretKey) => {
  const { username, password } = payload;

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      const errorMsg = JSON.stringify({ message: 'Tài khoản không tồn tại' });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(401).json({ maHoaData: encryptedError });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const errorMsg = JSON.stringify({ message: 'Sai mật khẩu' });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(401).json({ maHoaData: encryptedError });
    }

    // =========================================================
    // 🔥 BƯỚC ĐỘT PHÁ BẢO MẬT: KIỂM TRA TRẠNG THÁI PHÊ DUYỆT
    // =========================================================
    if (user.status !== 'approved') {
      let notifyMessage = 'Tài khoản của bạn đang chờ Admin phê duyệt, vui lòng quay lại sau!';

      // Đề phòng trường hợp sau này bạn khóa tài khoản của ai đó (đổi thành 'blocked')
      if (user.status === 'blocked') {
        notifyMessage = 'Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Admin.';
      }

      const errorMsg = JSON.stringify({ message: notifyMessage });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();

      // Trả về lỗi 403 (Forbidden - Bị cấm vào)
      return res.status(403).json({ maHoaData: encryptedError });
    }

    // =========================================================
    // 3. NẾU ĐÃ APPROVED -> TIẾN HÀNH ĐẺ KHÓA VIP NHƯ CŨ
    // =========================================================
    const newSessionKey = crypto.randomBytes(16).toString('hex');

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, sessionKey: newSessionKey },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const cookieOptions = cookieConfig();


    res.clearCookie('guest_token', cookieOptions);

    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 3600000
    });

    const successPayload = JSON.stringify({
      message: 'Đăng nhập thành công!',
      username: user.username,
      role: user.role,
      sessionKey: newSessionKey
    });

    const encryptedSuccess = CryptoJS.AES.encrypt(successPayload, secretKey).toString();
    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi Đăng nhập:", err);
    const errorMsg = JSON.stringify({ message: 'Lỗi hệ thống không xác định' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};

// ==========================================
// 3. HÀM ĐĂNG XUẤT (GIỮ NGUYÊN CODE TỐT CỦA BẠN)
// ==========================================
export const logout = async (payload, res, secretKey) => {
  try {
    const cookieOptions = cookieConfig();

    res.clearCookie('token', cookieOptions);
    res.clearCookie('guest_token', cookieOptions);

    const successMsg = JSON.stringify({ message: 'Đã đăng xuất và xóa phiên làm việc thành công!' });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();

    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi khi đăng xuất:", err);
    const errorMsg = JSON.stringify({ message: 'Lỗi server khi đăng xuất' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};
// ==========================================
// 4. LẤY DANH SÁCH TẤT CẢ TÀI KHOẢN (TRỪ MẬT KHẨU)
// ==========================================
export const getAllUsers = async (payload, res, secretKey) => {
  try {
    // Chỉ lấy id, username và status để đảm bảo an toàn dữ liệu
    const [users] = await pool.query('SELECT id, username, status, role FROM users ORDER BY id DESC');

    const successPayload = JSON.stringify(users);
    const encryptedSuccess = CryptoJS.AES.encrypt(successPayload, secretKey).toString();
    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi lấy danh sách user:", err);
    const errorMsg = JSON.stringify({ message: 'Không thể tải danh sách tài khoản!' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};

// ==========================================
// 5. CẬP NHẬT TRẠNG THÁI & PHÂN QUYỀN TÀI KHOẢN (ĐÃ NÂNG CẤP)
// ==========================================
export const updateUserStatus = async (payload, res, secretKey) => {
  const { userId, status, role } = payload; // 🔥 Nhận thêm trường role từ Frontend gửi lên

  try {
    if (!userId) {
      const errorMsg = JSON.stringify({ message: "Thiếu ID tài khoản cần cập nhật!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(400).json({ maHoaData: encryptedError });
    }

    // 🚀 THUẬT TOÁN SQL ĐỘNG: Tự chế câu lệnh tùy theo dữ liệu gửi lên
    let sql = 'UPDATE users SET ';
    let fields = [];
    let params = [];

    if (status) {
      fields.push('status = ?');
      params.push(status);
    }

    if (role) {
      fields.push('role = ?');
      params.push(role);
    }

    // Nếu không gửi cả status lẫn role thì báo lỗi luôn
    if (fields.length === 0) {
      const errorMsg = JSON.stringify({ message: "Không có dữ liệu nào được thay đổi!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(400).json({ maHoaData: encryptedError });
    }

    // Nối các trường lại bằng dấu phẩy và thêm điều kiện WHERE id = ?
    sql += fields.join(', ') + ' WHERE id = ?';
    params.push(userId); // Bỏ userId vào cuối cùng của mảng tham số

    // Chạy câu lệnh SQL đã được tối ưu
    await pool.query(sql, params);

    const successMsg = JSON.stringify({ message: 'Cập nhật thông tin tài khoản thành công!' });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();
    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi cập nhật user:", err);
    const errorMsg = JSON.stringify({ message: 'Lỗi hệ thống, không thể cập nhật thông tin tài khoản!' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};

// ==========================================
// 6. XÓA BỎ HOÀN TOÀN MỘT TÀI KHOẢN
// ==========================================
export const deleteUser = async (payload, res, secretKey) => {
  const { userId } = payload;

  try {
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    const successMsg = JSON.stringify({ message: 'Xóa tài khoản thành công!' });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();
    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi xóa user:", err);
    const errorMsg = JSON.stringify({ message: 'Lỗi hệ thống, không thể xóa tài khoản!' });
    const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
    return res.status(500).json({ maHoaData: encryptedError });
  }
};