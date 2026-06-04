import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  // 1. Lấy token từ header của request gửi lên
  // Phía Frontend (React) khi gọi API phải gửi kèm token trong header 'Authorization'
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập hoặc không có quyền truy cập!" });
  }

  // 2. Cắt chữ 'Bearer ' đi để lấy đúng chuỗi token
  const token = authHeader.split(' ')[1];

  try {
    // 3. Giải mã token bằng Khóa bí mật (phải giống hệt JWT_SECRET lúc đăng nhập)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Lưu thông tin user (vừa giải mã được) vào req để các hàm phía sau có thể dùng nếu cần
    req.user = decoded; 
    
    // 4. Lệnh bài hợp lệ! Cho phép đi tiếp vào controller (hàm updateProduct)
    next(); 
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};