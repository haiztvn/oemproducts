import db from "../db/db.js";
import CryptoJS from 'crypto-js'; 

// ĐỔI: (req, res) thành (payload, res, secretKey)
export const getCategories = async (payload, res, secretKey) => {
  try {
    // Câu lệnh lấy dữ liệu từ MySQL vẫn giữ nguyên 100%
    const [categories] = await db.query('SELECT * FROM categories'); 

    // BƯỚC 1: Biến mảng danh mục thành chuỗi chữ (String)
    const jsonString = JSON.stringify(categories);

    // BƯỚC 2: Mã hóa chuỗi bằng chiếc chìa khóa phiên động được truyền từ Gateway xuống
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

    // BƯỚC 3: Trả cục dữ liệu đã băm nát về cho React qua Network
    return res.status(200).json({ maHoaData: encryptedData });

  } catch (err) {
    console.error(err);
    // Trả lỗi về dạng bình thường để hệ thống biết đường xử lý nếu rớt mạng/sập DB
    return res.status(500).json({ message: 'Lỗi khi lấy danh mục' });
  }
};