import mysql from "mysql2";

const db = mysql.createPool({
  host: "topoto.org",
  user: "u545267825_hai_autoparts",
  password: "071023Hai*",
  database: "u545267825_oemproducts",
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

export default db;