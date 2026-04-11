import express from "express";
import { getProducts, getProductsByCategory, searchProducts } from "../controllers/productController.js";

const router = express.Router();

router.get("/search", searchProducts);

router.get("/category/:categoryId", getProductsByCategory);
router.get("/:lineId", getProducts);

export default router;