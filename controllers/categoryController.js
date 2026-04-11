import db from "../db/db.js";

export const getCategories = (req, res) => {
  db.query("SELECT * FROM categories", (err, result) => {
    if (err) return res.send(err);
    res.json(result);
  });
};