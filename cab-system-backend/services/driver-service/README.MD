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
![alt text](../driver-service/public/images/10.png)

2. ĐĂNG NHẬP LẤY TOKEN
Method: POST
URL: http://localhost:3000/auth/login
Headers:
  Content-Type: application/json
Body (raw JSON):
{
    "email": "driver_test@cab.com",
    "password": "password123"
}
![alt text](../driver-service/public/images/11.png)

3. TEST CASE TC5 - Driver online
Method: POST
URL: http://localhost:3000/api/drivers/toggle-status
Headers:
  Authorization: Bearer {{TOKEN}}
  Content-Type: application/json
Body:
{
    "status": "online"
}
![alt text](../driver-service/public/images/12.png)

4. TC13 - Level 2: Driver offline không nhận booking
POST http://localhost:3000/api/drivers/toggle-status
Headers: Authorization: Bearer {{TOKEN}}
Body: {
    "status": "offline"
}
![alt text](../driver-service/public/images/13.png)

5. TC18 - Level 2: Token expired → 401
POST http://localhost:3000/api/drivers/toggle-status
Headers: Authorization: Bearer {{EXPIRED_TOKEN}}
Body: {
    "status": "online"
}
![alt text](../driver-service/public/images/14.png)

6. TC84 - Level 9: Unauthorized (no token)
POST http://localhost:3000/api/drivers/toggle-status
Body: {
    "status": "online"
}
![alt text](../driver-service/public/images/15.png)

































1. Health Check - Kiểm tra service
Phương thức: GET
URL: http://localhost:3003/health
Response: ![alt text](public/images/1.png)

2. LẤY THÔNG TIN TÀI XẾ (Không cần token)
Method: GET
URL: http://localhost:3003/api/drivers/DRV_1776071743601_hqdlqp
Response: ![alt text](public/images/2.png)


3. CẬP NHẬT VỊ TRÍ
Method	POST
URL	http://localhost:3003/api/drivers/DRV_1776071743601_hqdlqp/location
Body:
json
{
    "lat": 21.0285,
    "lng": 105.8542,
    "speed": 35.5,
    "heading": 180
}
Response: ![alt text](public/images/3.png)

4. CHUYỂN ONLINE
Method	POST
URL	http://localhost:3003/api/drivers/DRV_1776071743601_hqdlqp/toggle-status
Body:
json
{
    "status": "online"
}
Response: ![alt text](public/images/4.png)

5. DANH SÁCH TÀI XẾ ONLINE
Method	GET
URL	http://localhost:3003/api/drivers/online/list
Response: ![alt text](public/images/5.png)

6. DANH SÁCH TÀI XẾ GẦN (BÁN KÍNH 2KM)
Method	GET
URL	http://localhost:3003/api/drivers/online/list?lat=21.0285&lng=105.8542&radius=2
Response: ![alt text](public/images/6.png)

7. CẬP NHẬT HỒ SƠ
Method	PUT
URL	http://localhost:3003/api/drivers/DRV_1776071743601_hqdlqp/profile
Body:
json
{
    "fullName": "Nguyễn Văn A (Đã cập nhật)",
    "vehicleType": "7_seat"
}
Response: ![alt text](public/images/7.png)

8. LỊCH SỬ VỊ TRÍ
Method	GET
URL	http://localhost:3003/api/drivers/DRV_1776071743601_hqdlqp/location-history?limit=10
Response: ![alt text](public/images/8.png)

9. CHUYỂN OFFLINE
Method	POST
URL	http://localhost:3003/api/drivers/DRV_xxx/toggle-status
Body:
json
{
    "status": "offline"
}
Response: ![alt text](public/images/9.png)

