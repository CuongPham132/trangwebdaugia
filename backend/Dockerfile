FROM node:20-bookworm-slim

WORKDIR /app

# Copy package.json để cài đặt thư viện trước (giúp build nhanh hơn)
COPY package*.json ./
RUN npm install

# Copy toàn bộ code còn lại
COPY . .

# Mở cổng 3000
EXPOSE 3000

# Chạy trực tiếp bằng node như ý bạn muốn
# Mình dùng --watch để bạn sửa code là nó tự nhận (rất tiện khi làm việc nhóm)
CMD ["node", "--watch", "server.js"]