1.  ĐĂNG KÝ TÀI KHOẢN DRIVER
Method: POST
URL: http://localhost:3000/auth/register
Headers: Content-Type: application/json
Body:
{
    "email": "driver_test@cab.com",
    "username": "Driver Test",
    "password": "password123",
    "role": "driver"
}
![alt text](public/images/10.png)

2. ĐĂNG NHẬP LẤY TOKEN
Method: POST
URL: http://localhost:3000/auth/login
Headers: Content-Type: application/json
Body:
{
    "email": "driver_test@cab.com",
    "password": "password123"
}
![alt text](public/images/11.png)

3. TC13 - Level 2: Driver offline không nhận booking (bước 2 - gọi matching)
POST http://localhost:3000/api/matching/find-driver
Headers:
  Authorization: Bearer {{TOKEN}}
  Content-Type: application/json
Body: {
    "rideId": "RIDE_OFFLINE",
    "userId": "USER_001",
    "pickupLat": 21.0285,
    "pickupLng": 105.8542
}
![alt text](public/images/12.png)

4. TC21 - Level 3: Matching có ETA (có dropoff)
POST http://localhost:3000/api/matching/find-driver
Body: {
    "rideId": "RIDE_ETA",
    "userId": "USER_001",
    "pickupLat": 21.0285,
    "pickupLng": 105.8542,
    "dropoffLat": 21.0385,
    "dropoffLng": 105.8642,
    "vehicleType": "4_seat"
}
![alt text](public/images/13.png)

5. TC22 - Level 3: AI chọn driver online (không dropoff)
POST http://localhost:3000/api/matching/find-driver
Body: {
    "rideId": "RIDE_AI",
    "userId": "USER_001",
    "pickupLat": 21.0285,
    "pickupLng": 105.8542,
    "vehicleType": "4_seat"
}
![alt text](public/images/14.png)

6. TC51 - Level 6: Chọn driver gần nhất (cần 2 driver online)
POST http://localhost:3000/api/matching/find-driver
Body: {
    "rideId": "RIDE_NEAREST",
    "userId": "USER_001",
    "pickupLat": 21.0285,
    "pickupLng": 105.8542
}
![alt text](public/images/15.png)





























MATCHING SERVICE (Port 3010)
1. MATCHING HEALTH CHECK
Method	GET
URL	http://localhost:3010/health
Response: ![alt text](public/images/1.png)

2. TÌM TÀI XẾ (GHÉP ĐÔI)
Method	POST
URL	http://localhost:3010/api/matching/find-driver
Headers	Content-Type: application/json
Body:
json
{
    "rideId": "RIDE_001",
    "userId": "USER_001",
    "pickupLat": 21.0285,
    "pickupLng": 105.8542,
    "vehicleType": "4_seat"
}
Response: ![alt text](public/images/2.png)

3. TÌM TÀI XẾ (KHÔNG LỌC LOẠI XE)
URL	http://localhost:3010/api/matching/find-driver
Body
json
{
    "rideId": "RIDE_002",
    "userId": "USER_002",
    "pickupLat": 21.0300,
    "pickupLng": 105.8550
}
Response: ![alt text](public/images/3.png)

4. LẤY KẾT QUẢ GHÉP ĐÔI
Key	Value
Method	GET
URL	http://localhost:3010/api/matching/result/RIDE_002
Response: ![alt text](public/images/4.png)

5. THỐNG KÊ GHÉP ĐÔI
Method	GET
URL	http://localhost:3010/api/matching/stats
Response: ![alt text](public/images/5.png)





