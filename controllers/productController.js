import db from "../db/db.js";

export const getProducts = (req, res) => {
  const { lineId } = req.params;

  db.query(
    "SELECT * FROM products WHERE product_line_id = ?",
    [lineId],
    (err, result) => {
      if (err) return res.send(err);
      res.json(result);
    }
  );
};
export const getProductsByCategory = (req, res) => {
  const { categoryId } = req.params;
  // Join bảng products với product_lines để lọc theo category_id
  const sql = `
    SELECT p.*, pl.name as line_name 
    FROM products p
    JOIN product_lines pl ON p.product_line_id = pl.id
    WHERE pl.category_id = ?
  `;
  db.query(sql, [categoryId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
};
export const searchProducts = (req, res) => {
  let query = req.query.q;

  if (!query) {
    return res.status(400).json({ message: "Search query is required" });
  }

  // Bước 1: Loại bỏ tất cả dấu gạch ngang trong từ khóa tìm kiếm của người dùng
  // Ví dụ: "76377445" hoặc "7637-7445" đều trở thành "76377445"
  const cleanQuery = query.replace(/-/g, "");
  const searchTerm = `%${cleanQuery}%`;

  // Bước 2: SQL REPLACE(column, '-', '') giúp bỏ dấu gạch ngang trong DB để so sánh
  const sql = `
    SELECT * FROM products 
    WHERE REPLACE(Article, '-', '') LIKE ? 
       OR REPLACE(oem, '-', '') LIKE ? 
       OR name LIKE ?
  `;

  db.query(sql, [searchTerm, searchTerm, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Search Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(results);
  });
};
