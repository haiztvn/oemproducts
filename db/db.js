import mysql from "mysql2";

const db = mysql.createPool({
  host: "topoto.org",
  user: "u545267825_hai_autoparts",
  password: "071023Hai*",
  database: "u545267825_oemproducts",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000, // Tăng lên 30s
  ssl: {
    rejectUnauthorized: false // Thử thêm dòng này để bỏ qua kiểm tra chứng chỉ SSL
  }
});

// Test kết nối bằng Promise để bắt lỗi chính xác hơn
const testConnection = async () => {
  try {
    const connection = await db.promise().getConnection();
    console.log("✅ MySQL OK - Đã kết nối thành công tới topoto.org");
    connection.release(); // Trả lại kết nối vào pool
  } catch (err) {
    console.error("❌ MySQL lỗi kết nối chi tiết:", err.message);
    console.error("Mã lỗi:", err.code); // Xem mã lỗi là ETIMEDOUT hay ECONNREFUSED
  }
};

testConnection();

export default db;
