# 1. Chọn môi trường Node.js nhẹ nhất (Alpine)
FROM node:18-alpine

# 2. Tạo thư mục làm việc trong container
WORKDIR /app

# 3. Copy file định nghĩa thư viện trước (để tận dụng cache)
COPY package*.json ./

# 4. Cài đặt thư viện
RUN npm install --production

# 5. Copy toàn bộ code nguồn vào
COPY . .

# 6. Mở cổng (Port) mà service này chạy
# Lưu ý: Sửa số 3001 này thành port tương ứng của từng service (User: 3002, Booking: 3003...)
EXPOSE 3009

# 7. Lệnh chạy server
CMD ["npm", "start"] 