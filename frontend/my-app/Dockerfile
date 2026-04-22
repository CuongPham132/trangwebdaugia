FROM node:20-bookworm-slim

WORKDIR /app

# 1. Cài đặt thư viện (Giữ lại node_modules trong Docker)
COPY package*.json ./
RUN npm install

# 2. Copy code
COPY . .

# 3. Mở cổng mặc định của Vite
EXPOSE 5173

# 4. Lệnh khởi chạy thần thánh để sửa code là nhận ngay
CMD ["npm", "run", "dev", "--", "--host"]