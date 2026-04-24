1. Health Check - Kiểm tra service
Method: GET
URL: http://localhost:3002/api/health
Response:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0"
}
```

2. Đăng ký customer
Method: POST
URL: http://localhost:3002/api/auth/register
Body:
```json
{
  "email": "customer2@cab.com",
  "username": "Customer Two",
  "password": "123456",
  "phone_number": "0900000003",
  "role": "customer"
}
```
Kỳ vọng:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 4,
    "email": "customer2@cab.com",
    "phone_number": "0900000003",
    "username": "Customer Two",
    "role": "customer",
    "status": "ACTIVE",
    "driver_id": null,
    "driver_status": null
  }
}
```

3. Đăng ký driver
Method: POST
URL: http://localhost:3002/api/auth/register
Body:
```json
{
  "email": "driver2@cab.com",
  "username": "Driver Two",
  "password": "123456",
  "phone_number": "0900000004",
  "role": "driver",
  "driver_id": "DRV002",
  "driver_status": "ONLINE"
}
```
Kỳ vọng: tạo được user role `driver` và gắn `driver_id`.

4. Login admin
Method: POST
URL: http://localhost:3002/api/auth/login
Body:
```json
{
  "email": "admin@cab.com",
  "password": "123456"
}
```
Kỳ vọng:
```json
{
  "message": "Login successful",
  "access_token": "<JWT>",
  "token_type": "Bearer",
  "token_payload": {
    "sub": "1",
    "driver_id": null,
    "email": "admin@cab.com",
    "role": "admin",
    "username": "Admin System",
    "exp": 9999999999
  }
}
```

5. Login driver
Method: POST
URL: http://localhost:3002/api/auth/login
Body:
```json
{
  "email": "driver@cab.com",
  "password": "123456"
}
```
Kỳ vọng: `token_payload` đọc được `sub`, `exp`, `driver_id: "DRV001"`.

6. Decode access token
Copy `access_token` rồi decode ở:
[jwt.io](https://jwt.io/)

Kỳ vọng:
- Có `sub`
- Có `exp`
- Driver token có `driver_id`

7. Lấy profile bằng Bearer token
Method: GET
URL: http://localhost:3002/api/auth/profile
Headers:
```txt
Authorization: Bearer <access_token>
```
Kỳ vọng:
```json
{
  "message": "Protected route accessed successfully",
  "user": {
    "id": 2,
    "username": "Driver Test",
    "email": "driver@cab.com",
    "role": "driver",
    "driver_id": "DRV001"
  }
}
```

8. Refresh token
Method: POST
URL: http://localhost:3002/api/auth/refresh
Yêu cầu:
- Dùng cùng session đã login để cookie `refreshToken` được gửi lên
- Nếu test bằng Postman, bật cookie jar hoặc gửi cookie `refreshToken` thủ công

Kỳ vọng:
```json
{
  "message": "Token refreshed successfully",
  "access_token": "<new JWT>",
  "token_type": "Bearer",
  "token_payload": {
    "sub": "2",
    "driver_id": "DRV001"
  }
}
```

9. Logout
Method: POST
URL: http://localhost:3002/api/auth/logout
Headers:
```txt
Authorization: Bearer <access_token>
```
Kỳ vọng:
```json
{
  "message": "Logged out successfully"
}
```

10. Test token bị revoke
Method: GET
URL: http://localhost:3002/api/auth/profile
Headers:
```txt
Authorization: Bearer <old access_token>
```
Kỳ vọng:
```json
{
  "message": "Token has been revoked"
}
```

11. Chạy SQL init cho PostgreSQL
File:
`scripts/init.db.sql`

Ví dụ:
```bash
psql -h localhost -U postgres -d cab_booking -f scripts/init.db.sql
```

Tài khoản seed để test nhanh:
- `admin@cab.com` / `123456`
- `driver@cab.com` / `123456`
- `customer@cab.com` / `123456`

12. Test theo mô hình zero trust
Nguyên tắc test:
- Không tin request nào nếu không có token hợp lệ
- Mỗi lần vào protected route đều phải verify JWT
- Refresh token phải đúng session hiện tại
- Sai mật khẩu nhiều lần thì khóa tạm tài khoản
- Logout xong thì token cũ không dùng lại được

13. Test truy cập không có token
Method: GET
URL: http://localhost:3002/api/auth/profile
Kỳ vọng:
```json
{
  "message": "No token provided"
}
```

14. Test JWT hợp lệ
Các bước:
- Login bằng `driver@cab.com` / `123456`
- Copy `access_token`
- Decode bằng [jwt.io](https://jwt.io/)

Kỳ vọng payload có:
```json
{
  "sub": "2",
  "driver_id": "DRV001",
  "email": "driver@cab.com",
  "role": "driver",
  "username": "Driver Test",
  "exp": 9999999999,
  "iss": "auth-service",
  "aud": "cab-booking-clients"
}
```

15. Test protected route chỉ cho token hợp lệ
Method: GET
URL: http://localhost:3002/api/auth/profile
Headers:
```txt
Authorization: Bearer <access_token_hợp_lệ>
```
Kỳ vọng:
- Trả về `200`
- Có thông tin user

16. Test token sai hoặc token giả
Method: GET
URL: http://localhost:3002/api/auth/profile
Headers:
```txt
Authorization: Bearer abc.xyz.invalid
```
Kỳ vọng:
```json
{
  "message": "Invalid token"
}
```

17. Test access token hết hạn
Cách test nhanh:
- Tạm set `.env` trong `auth-service`:
```env
JWT_EXPIRES_IN=5s
```
- Restart service
- Login lấy token
- Đợi 10 giây
- Gọi lại `GET /api/auth/profile`

Kỳ vọng:
```json
{
  "message": "Token expired"
}
```

18. Test refresh token rotation
Các bước:
- Login 1 lần để nhận `access_token` và cookie `refreshToken`
- Gọi `POST /api/auth/refresh`
- Lưu `access_token` mới
- Gọi lại `POST /api/auth/refresh` với cookie refresh cũ

Kỳ vọng:
- Lần refresh đầu thành công
- Lần dùng refresh cũ bị từ chối:
```json
{
  "message": "Invalid or reused refresh token"
}
```

19. Test lock tài khoản khi login sai nhiều lần
Method: POST
URL: http://localhost:3002/api/auth/login
Body:
```json
{
  "email": "customer@cab.com",
  "password": "sai-mat-khau"
}
```
Các bước:
- Gọi sai liên tiếp 5 lần
- Lần kế tiếp thử đúng mật khẩu ngay

Kỳ vọng:
```json
{
  "message": "Account temporarily locked due to failed login attempts",
  "locked_until": "..."
}
```

20. Test mở khóa sau thời gian chờ
Các bước:
- Sau khi bị lock, chờ hết thời gian khóa
- Login lại bằng đúng mật khẩu

Kỳ vọng:
- Đăng nhập lại được
- `failed_login_count` reset về `0`

21. Test logout theo zero trust
Các bước:
- Login lấy `access_token`
- Gọi `POST /api/auth/logout`
- Dùng lại access token cũ gọi `GET /api/auth/profile`

Kỳ vọng:
- Logout trả `200`
- Token cũ bị chặn do blacklist/revoke

22. Test trạng thái tài khoản
Bạn có thể sửa trực tiếp trong PostgreSQL:
```sql
UPDATE auth_users
SET status = 'SUSPENDED'
WHERE email = 'customer@cab.com';
```

Rồi login lại:
```json
{
  "email": "customer@cab.com",
  "password": "123456"
}
```

Kỳ vọng:
- Không cho truy cập như tài khoản active

23. Checklist zero trust tối thiểu
- `sub` đọc được trong JWT
- `exp` đọc được trong JWT
- Driver token có `driver_id`
- Không có token thì không vào được protected route
- Token sai/hết hạn bị từ chối
- Refresh token cũ không reuse được
- Login sai nhiều lần bị lock tạm
- Logout xong token cũ không dùng lại được
