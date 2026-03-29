# Bước 1: Clone dự án
git clone ........
cd cab-system-backend

# Bước 2: Tạo file .env (nếu chưa có)
# Copy nội dung .env.example vào .env

# Bước 3: Khởi động service
docker-compose up -d postgres pricing-service

# Bước 4: Chờ database khởi động (khoảng 10 giây)
Start-Sleep -Seconds 10

# Bước 5: Seed dữ liệu
docker cp services/pricing-service/src/database/init.sql cab_postgres:/tmp/init.sql
docker exec -it cab_postgres psql -U admin -d pricing_db -f /tmp/init.sql

# Bước 6: Kiểm tra service
curl http://localhost:3006/api/v1/health