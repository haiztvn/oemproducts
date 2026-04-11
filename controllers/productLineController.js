import db from "../db/db.js";


export const getAllProductLines = (req, res) => {
  db.query("SELECT * FROM product_lines", (err, result) => {
    if (err) return res.send(err);
    res.json(result);
  });
};

export const getProductLines = (req, res) => {
  const { categoryId } = req.params;

  db.query(
    "SELECT * FROM product_lines WHERE category_id = ?",
    [categoryId],
    (err, result) => {
      if (err) return res.send(err);
      res.json(result);
    }
  );
};
