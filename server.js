import 'dotenv/config';
import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";
import productLineRoutes from "./routes/productLineRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { handleGateway } from "./controllers/gatewayController.js";
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const app = express();

// 1. Cấu hình CORS linh hoạt
// Khi đưa lên Render, bạn có thể cần cấu hình này để Frontend truy cập được
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.PORTFRONTEND, // Điền đúng địa chỉ React của bạn
  credentials: true // BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ NHẬN COOKIE
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'BiMatPhuTungXeHoi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,     // Bắt buộc là true khi chạy online
    sameSite: 'none', // Bắt buộc là none vì topoto.org và onrender.com khác domain gốc
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.json());
app.use(cookieParser());

// TRONG FILE backend/server.js
app.get('/api/init-session', (req, res) => {
  try {
    // 1. 🔥 NẾU ĐÃ CÓ TOKEN ĐĂNG NHẬP (VIP) -> Trích xuất khóa cũ trả về, không đẻ khóa mới
    if (req.cookies.token) {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      // SỬA TẠI ĐÂY: Trả thêm username và role từ Token VIP về để React đồng bộ lại khi F5
      return res.status(200).json({
        guestKey: decoded.sessionKey,
        username: decoded.username,
        role: decoded.role
      });
    }

    // 2. 🔥 NẾU ĐÃ CÓ GUEST_TOKEN (KHÁCH CŨ) -> Trích xuất khóa cũ trả về, KHÔNG ĐẺ KHÓA MỚI
    if (req.cookies.guest_token) {
      const decoded = jwt.verify(req.cookies.guest_token, process.env.JWT_SECRET);
      // SỬA TẠI ĐÂY: Khách vãng lai mặc định gán quyền Client
      return res.status(200).json({ guestKey: decoded.sessionKey, role: 'Client' });
    }

    // 3. CHỈ KHI TRỐNG TRƠN HOÀN TOÀN (Lần đầu tiên vào web) -> Mới đẻ khóa mới tinh
    const guestKey = crypto.randomBytes(16).toString('hex');
    const guestToken = jwt.sign({ sessionKey: guestKey }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.cookie('guest_token', guestToken, {
      httpOnly: true,
      secure: false, // localhost
      sameSite: 'lax',
      path: '/'
    });

    // SỬA TẠI ĐÂY: Mặc định gán quyền Client
    return res.status(200).json({ guestKey: guestKey, role: 'Client' });

  } catch (error) {
    // Đề phòng trường hợp Token cũ lưu trong máy bị hết hạn hoặc lỗi thời
    // Tiến hành xóa sạch để làm lại bộ khóa mới
    res.clearCookie('token', { path: '/' });
    res.clearCookie('guest_token', { path: '/' });

    const fallbackKey = crypto.randomBytes(16).toString('hex');
    const fallbackToken = jwt.sign({ sessionKey: fallbackKey }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.cookie('guest_token', fallbackToken, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });

    // SỬA TẠI ĐÂY: Mặc định gán quyền Client
    return res.status(200).json({ guestKey: fallbackKey, role: 'Client' });
  }
});

app.post("/api/gateway", handleGateway);

// 4. CẤU HÌNH PORT (QUAN TRỌNG NHẤT CHO RENDER)
// Render sẽ tự cấp một cổng qua biến môi trường process.env.PORT
// Nếu không có (chạy ở máy khách) thì nó sẽ dùng 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
});