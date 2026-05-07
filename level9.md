## TC1	Level 1	Đăng ký user thành công → HTTP 201, user lưu DB, có user_id
POST
https://localhost:3000/auth/register
{
    "email": "test1@example.com",
    "username": "test1",
    "password": "123456",
    "role": "customer"
}

## TC2	Level 1	Đăng nhập trả JWT hợp lệ → HTTP 200, token decode được sub + exp
POST
https://localhost:3000/auth/login
{
  "email": "test1@example.com",
  "password": "123456"
}

## TC10	Level 1	Logout invalidate token → gọi lại token cũ trả 401
POST
Authorization: <token>

## TC18	Level 2	Token expired → HTTP 401 "Token expired", không xử lý request
Authorization: <token>
-> chỉnh thời hạn accessToken ngắn rồi đợi hết giờ rồi gọi api bất kì
GET
https://localhost:3000/api/bookings

## TC81	Level 9	SQL injection attempt → query không bypass, HTTP 400/401
* không nối chuỗi khi ghi vào database thì sẽ tránh được sql injection
POST
{
  "email": "' OR '1'='1' --",
  "password": "abc123"
}

## TC83	Level 9	JWT tampering (đổi sub/role) → token decode fail, HTTP 401
dùng https://www.jwt.io/ để đổi body rồi gọi request bất kì
GET
https://localhost:3000/api/bookings

## TC84	Level 9	Unauthorized API access (user gọi admin API) → HTTP 403
PATCH
https://localhost:3000/api/v1/users/5/ban
Authorization: <token>

## TC85	Level 9	Rate limit attack (spam >1000 req/s) → HTTP 429, không sập hệ thống
dùng runner trong postman gọi request bất kì

## TC88	Level 9	mTLS communication → request không có cert bị từ chối
gọi trực tiếp 1 service không thông qua gateway để mô phỏng các service gọi nhau
lần đầu sẽ lỗi do chưa có mTLS, sau đó thêm mTLS vào postman
GET
https://localhost:3002/api/bookings
Authorization: <token>

thêm mTLS
Setting -> app setting -> Certificates -> 
HOST: localhost:3002
CRT file: thêm user-service-cert.pem file vào
KEY file: thêm user-service-key.pem file vào
gọi lại request

## TC91	Level 10	Request không có token → HTTP 401 "Missing token", reject tại API Gateway
gọi API bất kì không có token
GET
https://localhost:3002/api/bookings

## TC92	Level 10	Token không hợp lệ (tampered signature) → HTTP 401 "Invalid token"
gọi API bất kì với token bị sửa đổi (xóa 1 kí tự trong token)
GET
https://localhost:3002/api/bookings

## TC93	Level 10	Token hết hạn (exp < current_time) → HTTP 401 "Token expired"
Authorization: <token>
-> chỉnh thời hạn accessToken ngắn rồi đợi hết giờ rồi gọi api bất kì
GET
https://localhost:3000/api/bookings

## TC94	Level 10	Service-to-service authentication mTLS → không có cert hợp lệ bị từ chối
gọi trực tiếp 1 service không thông qua gateway để mô phỏng các service gọi nhau
lần đầu sẽ lỗi do chưa có mTLS, sau đó thêm mTLS vào postman
GET
https://localhost:3002/api/bookings
Authorization: <token>

thêm mTLS
Setting -> app setting -> Certificates -> 
HOST: localhost:3002
CRT file: thêm user-service-cert.pem file vào
KEY file: thêm user-service-key.pem file vào
gọi lại request

## TC95	Level 10	RBAC – user role gọi /admin/dashboard → HTTP 403 "Access denied"
User gọi phương thức ban (chặn người dùng) của admin
PATCH
https://localhost:3000/api/v1/users/5/ban
Authorization: <token>

## TC97	Level 10	API Gateway chặn request bypass service nội bộ → chỉ cho qua gateway
gọi trực tiếp service nào đó
GET
https://localhost:3009/health

## TC98	Level 10	Rate limiting chống abuse (>100 req/s) → HTTP 429
dùng runner trong postman gọi request bất kì

## TC99	Level 10	Data encryption in transit → chỉ cho phép HTTPS / mTLS
gọi bất kì http sẽ không được
GET
http://localhost:3000/api/bookings
thay vì
https://localhost:3000/api/bookings