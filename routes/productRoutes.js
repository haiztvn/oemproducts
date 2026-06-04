import express from "express";
import multer from 'multer';
import { getProducts, getProductsByCategory, searchProducts, updateProduct, importProducts } from "../controllers/productController.js";
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/search", searchProducts);

router.get("/category/:categoryId", getProductsByCategory);
router.get("/:lineId", getProducts);

// Đặt verifyToken đứng trước updateProduct
// Bất cứ ai gọi lệnh PUT đều bị chặn lại xét Token trước
router.put('/:id', verifyToken, updateProduct);
router.post('/import', verifyToken, upload.single('fileExcel'), importProducts);

export default router;