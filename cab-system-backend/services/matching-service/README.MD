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
