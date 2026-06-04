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

// ✅ Thêm trust proxy cho Render
app.set('trust proxy', 1);

// ✅ CORS hỗ trợ cả production lẫn localhost
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.PORTFRONTEND,       // domain production VD: https://topoto.org
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ✅ Hàm helper tạo cookie options theo môi trường
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',   // true trên Render, false ở local
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // none cho cross-domain
  path: '/'
});

app.get('/api/init-session', (req, res) => {
  try {
    if (req.cookies.token) {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      return res.status(200).json({
        guestKey: decoded.sessionKey,
        username: decoded.username,
        role: decoded.role
      });
    }

    if (req.cookies.guest_token) {
      const decoded = jwt.verify(req.cookies.guest_token, process.env.JWT_SECRET);
      return res.status(200).json({ guestKey: decoded.sessionKey, role: 'Client' });
    }

    const guestKey = crypto.randomBytes(16).toString('hex');
    const guestToken = jwt.sign({ sessionKey: guestKey }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // ✅ Dùng cookieOptions() thay vì hardcode secure/sameSite
    res.cookie('guest_token', guestToken, cookieOptions());

    return res.status(200).json({ guestKey: guestKey, role: 'Client' });

  } catch (error) {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('guest_token', { path: '/' });

    const fallbackKey = crypto.randomBytes(16).toString('hex');
    const fallbackToken = jwt.sign({ sessionKey: fallbackKey }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // ✅ Dùng cookieOptions() thay vì hardcode secure/sameSite
    res.cookie('guest_token', fallbackToken, cookieOptions());

    return res.status(200).json({ guestKey: fallbackKey, role: 'Client' });
  }
});

app.post("/api/gateway", handleGateway);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
});