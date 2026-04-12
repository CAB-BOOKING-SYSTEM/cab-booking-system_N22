HƯỚNG DẪN CHẠY TEST
1. Khởi động MongoDB và RabbitMQ
bash
# Trong thư mục booking-service
docker-compose up -d

# Kiểm tra containers
docker ps
2. Cài đặt dependencies
bash
npm install
3. Khởi động Mock Pricing Service (terminal 1)
bash
npm run mock-pricing
4. Khởi động Booking Service (terminal 2)
bash
npm run dev
![alt text](public/1.png)
![alt text](public/2.png)
![alt text](public/3.png)
![alt text](public/4.png)
![alt text](public/5.png)
![alt text](public/6.png)