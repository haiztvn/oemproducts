import db from "../db/db.js";
import CryptoJS from 'crypto-js';

export const getAllProductLines = async (payload, res, secretKey) => {
  try {
    // Câu lệnh lấy dữ liệu từ MySQL giữ nguyên 100%
    const [productLines] = await db.query('SELECT * FROM product_lines'); 

    // BƯỚC 1: Biến mảng dòng sản phẩm thành chuỗi chữ (String)
    const jsonString = JSON.stringify(productLines);

    // BƯỚC 2: Mã hóa chuỗi bằng khóa phiên động được truyền từ Gateway xuống
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

    // BƯỚC 3: Trả cục dữ liệu đã băm nát về cho React qua Network
    return res.status(200).json({ maHoaData: encryptedData });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi khi lấy dòng sản phẩm' });
  }
};

export const getProductLines = async (payload, res, secretKey) => {
  // ĐỔI THAY ĐỔI QUAN TRỌNG: Lấy categoryId từ payload (do React gửi lên trong hộp đen)
  // Thay vì lấy từ req.params như ngày xưa
  const { categoryId } = payload; 

  try {
    // Câu lệnh query MySQL giữ nguyên 100%
    const [result] = await db.query(
      "SELECT * FROM product_lines WHERE category_id = ?",
      [categoryId]
    );
    
    // BƯỚC 1: Biến mảng kết quả thành chuỗi chữ
    const jsonString = JSON.stringify(result);

    // BƯỚC 2: Mã hóa chuỗi bằng khóa phiên động được truyền từ Gateway xuống
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

    // BƯỚC 3: Trả cục dữ liệu đã băm nát về cho React qua Network
    return res.status(200).json({ maHoaData: encryptedData });
    
  } catch (err) {
    console.error("Lỗi khi lấy dòng sản phẩm theo danh mục:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy dữ liệu" });
  }
};