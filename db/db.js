import mysql from "mysql2";

// const db = mysql.createPool({
//   host: "topoto.org",
//   user: "u545267825_hai_autoparts",
//   password: "071023Hai*",
//   database: "u545267825_oemproducts",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,            // Tên user mặc định của phpMyAdmin thường là 'root'
  password: process.env.DB_PASSWORD,            // Mật khẩu mặc định của XAMPP/WAMP thường để trống
  database: process.env.DB_NAME, // Tên database bạn tạo trong phpMyAdmin
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// test kết nối
db.query("SELECT 1", (err) => {
  if (err) {
    console.log("❌ MySQL lỗi:", err);
  } else {
    console.log("✅ MySQL OK");
  }
});

export default db.promise();