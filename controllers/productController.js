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
  const query = req.query.q;
  
  if (!query) {
    return res.status(400).json({ message: "Search query is required" });
  }

  // Tìm kiếm tương đối (LIKE) trong cả 3 cột: Article, oem và name
  const sql = `
    SELECT * FROM products 
    WHERE Article LIKE ? OR oem LIKE ? OR name LIKE ?
  `;
  const searchTerm = `%${query}%`;

  db.query(sql, [searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error("Search Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(results);
  });
};