import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";
import productLineRoutes from "./routes/productLineRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();
app.use(cors());
app.use(express.json()); // Thêm dòng này để xử lý dữ liệu JSON nếu cần

app.use("/categories", categoryRoutes);
app.use("/product-lines", productLineRoutes);
app.use("/products", productRoutes);

app.listen(3000, () => console.log("🚀 Server tại http://localhost:3000"));