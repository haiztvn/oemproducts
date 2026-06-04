import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';

// 1. NHỚ IMPORT HÀM LẤY DÒNG SẢN PHẨM VÀO ĐÂY
import { getProducts, getProductsByCategory, searchProducts, updateProduct, importProducts } from './productController.js';
import { getAllProductLines, getProductLines } from './productLineController.js';
import { getCategories } from './categoryController.js';
import { login, signup, logout, getAllUsers, updateUserStatus, deleteUser } from './authController.js';

export const handleGateway = async (req, res) => {
    try {
        // 1. KIỂM TRA XEM LÀ THÀNH VIÊN HAY LÀ KHÁCH VÃNG LAI
        const token = req.cookies.token;             // Token đăng nhập
        const guestToken = req.cookies.guest_token;   // Token của khách tự động cấp

        const activeToken = token || guestToken;     // Ưu tiên token đăng nhập
        if (!activeToken) return res.status(401).json({ message: "Phiên làm việc không hợp lệ" });

        // 2. LẤY CHÌA KHÓA RA
        const decoded = jwt.verify(activeToken, process.env.JWT_SECRET);
        const secretKeyForThisSession = decoded.sessionKey;

        // 3. GIẢI MÃ PAYLOAD NHƯ BÌNH THƯỜNG
        const { data } = req.body;
        const bytes = CryptoJS.AES.decrypt(data, secretKeyForThisSession);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        const { action, payload } = decryptedData;

        const userRole = decoded?.role || 'Client';

        // 4. PHÂN LUỒNG XỬ LÝ
        switch (action) {
            // ========================================================
            // PHÂN HỆ 1: CÔNG CỘNG (Ai cũng được vào, kể cả khách chưa đăng nhập)
            // ========================================================
            case "TIM_KIEM_SAN_PHAM":
                return await searchProducts(payload, res, secretKeyForThisSession);

            case "LAY_DONG_SAN_PHAM":
                return await getAllProductLines(payload, res, secretKeyForThisSession);

            case "LAY_SAN_PHAM_THEO_DANH_MUC":
                return await getProductsByCategory(payload, res, secretKeyForThisSession);

            case "LAY_SAN_PHAM_THEO_LINE":
                return await getProducts(payload, res, secretKeyForThisSession);

            case "LAY_DONG_SAN_PHAM_THEO_DANH_MUC":
                return await getProductLines(payload, res, secretKeyForThisSession);

            case "LAY_TAT_CA_DANH_MUC":
                return await getCategories(payload, res, secretKeyForThisSession);

            case "DANG_NHAP":
                return await login(payload, res, secretKeyForThisSession);

            case "DANG_KY":
                return await signup(payload, res, secretKeyForThisSession);


            // ========================================================
            // PHÂN HỆ 2: CƠ BẢN (Bắt buộc đăng nhập - Áp dụng cho Mọi Thành Viên)
            // ========================================================
            case "DANG_XUAT":
                if (!token) {
                    return res.status(401).json({ message: "Bạn chưa đăng nhập hoặc phiên đã hết hạn!" });
                }
                return await logout(payload, res, secretKeyForThisSession);


            // ========================================================
            // PHÂN HỆ 3: QUẢN LÝ SẢN PHẨM (Yêu cầu quyền: MANAGER hoặc ADMIN trở lên)
            // ========================================================
            case "CAP_NHAT_SAN_PHAM":
            case "IMPORT_EXCEL_SAN_PHAM":
                // 1. Kiểm tra vòng gửi xe: Đã đăng nhập chưa?
                if (!token) {
                    return res.status(401).json({ message: "Vui lòng đăng nhập để thực hiện thao tác này!" });
                }
                // 2. Kiểm tra vòng an ninh: Có đủ thẩm quyền không?
                if (userRole !== "Admin" && userRole !== "Manager") {
                    return res.status(403).json({ message: "🔒 Từ chối: Bạn cần cấp quyền MANAGER trở lên để chỉnh sửa sản phẩm!" });
                }

                // 3. Phân phối việc nếu hợp lệ
                if (action === "CAP_NHAT_SAN_PHAM") return await updateProduct(payload, res, secretKeyForThisSession);
                if (action === "IMPORT_EXCEL_SAN_PHAM") return await importProducts(payload, res, secretKeyForThisSession);
                break;


            // ========================================================
            // PHÂN HỆ 4: QUẢN TRỊ HỆ THỐNG (Tối cao - CHỈ DUY NHẤT ADMIN ĐƯỢC VÀO)
            // ========================================================
            case "LAY_TAT_CA_TAI_KHOAN":
            case "CAP_NHAT_TRANG_THAI_TAI_KHOAN":
            case "XOA_TAI_KHOAN":
                // 1. Kiểm tra xem có token thành viên không
                if (!token) {
                    return res.status(401).json({ message: "Yêu cầu đăng nhập tài khoản Quản trị viên!" });
                }
                // 2. Ép kính lọc quyền: Khác Admin là đuổi thẳng cánh
                if (userRole !== "Admin") {
                    return res.status(403).json({ message: "🔒 Cảnh báo: Chỉ ADMIN tối cao mới có quyền quản lý thành viên!" });
                }

                // 3. Thực thi mệnh lệnh của sếp tổng Admin
                if (action === "LAY_TAT_CA_TAI_KHOAN") return await getAllUsers(payload, res, secretKeyForThisSession);
                if (action === "CAP_NHAT_TRANG_THAI_TAI_KHOAN") return await updateUserStatus(payload, res, secretKeyForThisSession);
                if (action === "XOA_TAI_KHOAN") return await deleteUser(payload, res, secretKeyForThisSession);
                break;


            // ========================================================
            // TRƯỜNG HỢP GÕ LỆNH BẬT TƯỜNG LỬA CHẶN HACKER
            // ========================================================
            default:
                return res.status(400).json({ message: "Mật lệnh hệ thống không hợp lệ!" });
        }

    } catch (error) {
        console.error("🚨 Lỗi Gateway Gốc:", error.message || error);

        // Nếu lỗi là do Token JWT hoặc giải mã AES sai -> Báo 403
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.message.includes('malformed')) {
            return res.status(403).json({ message: "Phiên làm việc hết hạn hoặc dữ liệu bị can thiệp" });
        }

        // Nếu là các lỗi khác (Rớt DB, sai code logic...) -> Báo 500
        return res.status(500).json({ message: "Hệ thống máy chủ đang gặp sự cố, vui lòng thử lại sau!" });
    }
};