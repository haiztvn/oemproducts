import db from "../db/db.js";
import xlsx from "xlsx";
import { LRUCache } from "lru-cache";
import CryptoJS from 'crypto-js';

// 1. Lấy sản phẩm theo Dòng sản phẩm (product_line)
export const getProducts = async (payload, res, secretKey) => {
  // THAY ĐỔI QUAN TRỌNG: Lấy lineId từ payload thay vì req.params
  const { lineId } = payload;

  try {
    // Câu lệnh query MySQL giữ nguyên 100%
    const [result] = await db.query(
      "SELECT * FROM products WHERE product_line_id = ?",
      [lineId]
    );
    
    // BƯỚC 1: Biến mảng sản phẩm thành chuỗi chữ
    const jsonString = JSON.stringify(result);

    // BƯỚC 2: Mã hóa chuỗi bằng khóa phiên động truyền từ Gateway xuống
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

    // BƯỚC 3: Trả cục dữ liệu đã băm nát về cho React qua Network
    return res.status(200).json({ maHoaData: encryptedData });

  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm theo lineId:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy dữ liệu" });
  }
};

// 2. Lấy sản phẩm theo Danh mục (category)
export const getProductsByCategory = async (payload, res, secretKey) => {
  // THAY ĐỔI QUAN TRỌNG: Lấy categoryId từ payload do React gửi lên
  const { categoryId } = payload;

  const sql = `
    SELECT p.*, pl.name as line_name 
    FROM products p
    JOIN product_lines pl ON p.product_line_id = pl.id
    WHERE pl.category_id = ?
  `;

  try {
    // Câu lệnh query MySQL giữ nguyên 100%
    const [result] = await db.query(sql, [categoryId]);
    
    // BƯỚC 1: Biến mảng kết quả dữ liệu thành chuỗi chữ
    const jsonString = JSON.stringify(result);

    // BƯỚC 2: Mã hóa chuỗi bằng khóa phiên động truyền từ Gateway xuống
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();

    // BƯỚC 3: Trả cục dữ liệu đã băm nát về cho React qua Network
    return res.status(200).json({ maHoaData: encryptedData });

  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm theo categoryId:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy dữ liệu" });
  }
};

// 3.1 THIẾT LẬP RAM CACHE VỚI 2 NGUYÊN TẮC VÀNG Cho Tìm Kiếm
const productCache = new LRUCache({
  max: 1000, // NGUYÊN TẮC LRU: Chỉ cho phép chứa tối đa 1.000 từ khóa tìm kiếm trong RAM. Vượt mức sẽ tự đá cái cũ nhất ra.
  ttl: 1000 * 60 * 60, // NGUYÊN TẮC TTL: Mỗi dữ liệu chỉ được sống 1 tiếng (3.600.000 mili-giây).

  // (Tùy chọn) Bật log để bạn xem lúc nó tự xóa rác
  dispose: (value, key) => {
    console.log(`🧹 Cache bị dọn dẹp (Xóa khỏi RAM): ${key}`);
  }
});

// 3.2 Tìm kiếm sản phẩm
export const searchProducts = async (payload, res, secretKey) => {

  // THAY ĐỔI QUAN TRỌNG 1: Lấy từ khóa 'q' từ payload do React gửi lên trong hộp đen
  const q = payload.q; 
  if (!q) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    // Tạo chìa khóa RAM từ chữ khách gõ
    const cacheKey = `search_${q.trim().toLowerCase()}`;

    // ==========================================
    // BƯỚC A: KIỂM TRA RAM TRƯỚC (CACHE HIT)
    // ==========================================
    if (productCache.has(cacheKey)) {
      const cachedRows = productCache.get(cacheKey); // Lấy mảng sản phẩm gốc từ RAM ra

      // BĂM NÁT dữ liệu từ RAM bằng khóa phiên trước khi gửi ra Network
      const jsonString = JSON.stringify(cachedRows);
      const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
      
      return res.status(200).json({ maHoaData: encryptedData });
    }

    // ==========================================
    // BƯỚC B: NẾU RAM CHƯA CÓ, XUỐNG MYSQL TÌM (CACHE MISS)
    // ==========================================
    const cleanQuery = q.replace(/-/g, "");
    const searchTerm = `%${cleanQuery}%`;
    const originalTerm = `%${q}%`; 

    const sql = `
      SELECT * FROM products 
      WHERE REPLACE(Article, '-', '') LIKE ? 
         OR REPLACE(oem, '-', '') LIKE ? 
         OR name LIKE ?
    `;

    const [rows] = await db.query(sql, [searchTerm, searchTerm, originalTerm]);

    // ==========================================
    // BƯỚC C: CẤT VÀO RAM VÀ MÃ HÓA TRẢ KẾT QUẢ
    // ==========================================
    if (rows.length > 0) {
      // Lưu mảng gốc (rows) vào RAM để các phiên làm việc của người khác vẫn dùng chung được
      productCache.set(cacheKey, rows); 
    }
    
    // BĂM NÁT dữ liệu từ MySQL bằng khóa phiên trước khi gửi ra Network
    const jsonString = JSON.stringify(rows);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
    
    return res.status(200).json({ maHoaData: encryptedData });

  } catch (err) {
    console.error("Search Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// 4. Cập nhật thông tin sản phẩm
export const updateProduct = async (payload, res, secretKey) => {
  
  // THAY ĐỔI QUAN TRỌNG: Gom tất cả id và các thông tin cần sửa từ payload ra
  const { id, name, Article, oem, product_line_id } = payload;

  try {
    // Câu lệnh SQL UPDATE giữ nguyên 100%
    const sql = `
      UPDATE products 
      SET name = ?, Article = ?, oem = ?, product_line_id = ?
      WHERE id = ?
    `;

    // Thực thi câu lệnh với các biến lấy từ payload
    const [result] = await db.query(sql, [name, Article, oem, product_line_id, id]);

    // Kiểm tra xem có sản phẩm nào thực sự bị thay đổi không
    if (result.affectedRows === 0) {
      const errorMsg = JSON.stringify({ message: "Không tìm thấy sản phẩm hoặc dữ liệu không đổi!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(404).json({ maHoaData: encryptedError });
    }

    // MÃ HÓA THÔNG BÁO THÀNH CÔNG TRƯỚC KHI GỬI (Để network đồng bộ mã hóa hoàn toàn)
    const successMsg = JSON.stringify({ message: "Cập nhật sản phẩm thành công!" });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();

    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi khi cập nhật sản phẩm:", err);
    // Đối với lỗi hệ thống nghiêm trọng, trả về dạng thường để Dev dễ debug
    return res.status(500).json({ message: "Lỗi server khi cập nhật dữ liệu" });
  }
};

// 5.  Thêm product bằng excel
export const importProducts = async (payload, res, secretKey) => {
  // THAY ĐỔI QUAN TRỌNG: Lấy chuỗi mã hóa Base64 của file từ payload
  const { fileBase64 } = payload; 

  try {
    if (!fileBase64) {
      const errorMsg = JSON.stringify({ message: "Vui lòng chọn file Excel!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(400).json({ maHoaData: encryptedError });
    }

    // BƯỚC THẦN THÁNH: Chuyển chuỗi chữ Base64 ngược lại thành cục Buffer để thư viện xlsx đọc
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Đọc file Excel từ bộ nhớ Buffer vừa nặn ra
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Chuyển file Excel thành mảng chứa các hàng (Giữ nguyên logic cực tốt của bạn)
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rawData.slice(1);

    if (dataRows.length === 0) {
      const errorMsg = JSON.stringify({ message: "File Excel không có dữ liệu!" });
      const encryptedError = CryptoJS.AES.encrypt(errorMsg, secretKey).toString();
      return res.status(400).json({ maHoaData: encryptedError });
    }

    // Lấy dữ liệu nghiêm chỉnh theo vị trí cột (Giữ nguyên logic của bạn)
    const values = dataRows
      .filter(row => row.length > 0)
      .map(row => [
        row[0] !== undefined ? String(row[0]).trim() : '',            
        row[1] !== undefined ? String(row[1]).trim() : '',            
        row[2] !== undefined ? String(row[2]).trim() : '',            
        row[3] !== undefined && row[3] !== '' ? Number(row[3]) : null 
      ]);

    // Thực hiện chèn hàng loạt vào MySQL
    const sql = `INSERT INTO products (name, Article, oem, product_line_id) VALUES ?`;
    await db.query(sql, [values]);

    // MÃ HÓA THÔNG BÁO THÀNH CÔNG TRƯỚC KHI TRẢ VỀ
    const successMsg = JSON.stringify({ message: `Đã nhập thành công ${values.length} sản phẩm từ Excel!` });
    const encryptedSuccess = CryptoJS.AES.encrypt(successMsg, secretKey).toString();

    return res.status(200).json({ maHoaData: encryptedSuccess });

  } catch (err) {
    console.error("Lỗi khi import Excel:", err);
    return res.status(500).json({ message: "Lỗi server khi xử lý file Excel" });
  }
};

