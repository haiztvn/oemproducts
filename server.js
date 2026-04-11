import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";
import productLineRoutes from "./routes/productLineRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

// 1. Cấu hình CORS linh hoạt
// Khi đưa lên Render, bạn có thể cần cấu hình này để Frontend truy cập được
app.use(cors());

app.use(express.json());

// 2. Định nghĩa các Routes
app.use("/categories", categoryRoutes);
app.use("/product-lines", productLineRoutes);
app.use("/products", productRoutes);

// 3. Route kiểm tra nhanh (Health Check)
// Giúp bạn biết Server có đang sống hay không khi truy cập đường dẫn gốc
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// 4. CẤU HÌNH PORT (QUAN TRỌNG NHẤT CHO RENDER)
// Render sẽ tự cấp một cổng qua biến môi trường process.env.PORT
// Nếu không có (chạy ở máy khách) thì nó sẽ dùng 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
});
