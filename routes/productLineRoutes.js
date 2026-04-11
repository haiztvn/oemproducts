import express from "express";
import {getAllProductLines, getProductLines } from "../controllers/productLineController.js";

const router = express.Router();
router.get("/all", getAllProductLines);
router.get("/:categoryId", getProductLines);

export default router;