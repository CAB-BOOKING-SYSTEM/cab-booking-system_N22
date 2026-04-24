# Review Service - Hướng dẫn kiểm thử tích hợp

Tài liệu này hướng dẫn kiểm thử luồng review thông qua API Gateway và cách liên kết dữ liệu review với các testcase tích hợp/AI.
## Đầu tiên: Liên hệ với checklist testcase của project

Review-service có thể không xuất hiện như testcase độc lập trong checklist, nhưng là dữ liệu cho các testcase khác thuộc Level 3 - integration và Level 6- AI logic.

### Mapping testcase #28 (MCP context được fetch thành công)
Sau khi tạo review:
- service cập nhật Redis key: `driver_features:<driverId>`
- dữ liệu này bổ sung context chất lượng tài xế cho MCP/AI
- context tổng thể (ETA/pricing/driver) sẽ có thêm thành phần rating từ review-service

Kiểm tra nhanh:

```bash
docker exec cab_redis redis-cli GET driver_features:DRV_001
```

### Mapping testcase #52 (AI chọn driver rating cao hơn)
Tạo dữ liệu review cho 2 tài xế:
- `DRV_A` rating trung bình ~4.0
- `DRV_B` rating trung bình ~4.9

Khi đó AI/Matching có cơ sở chọn `DRV_B` dù khoảng cách xa hơn một chút, thay vì chỉ dựa vào distance.


## 1. Điều kiện trước khi test

Chạy từ thư mục gốc project:

```bash
docker compose --env-file .env up -d --build
```

Xem log:

```bash
docker compose logs -f gateway review-service auth-service
```

Kỳ vọng log review-service có:
- `[DB] PostgreSQL connected successfully`
- `[Redis] Redis connected successfully`
- `[RabbitMQ] RabbitMQ connected successfully`
- `[PaymentConsumer] Listening for payment.completed events...`

## 2. Zero Trust (bắt buộc đi qua gateway)

API review phải gọi qua gateway:
- `POST http://localhost:3000/reviews`

Gọi trực tiếp review-service (`:3007`) sẽ bị chặn theo thiết kế.

## 3. Đăng nhập trước qua Auth Service

### 3.1 Đăng ký
`POST http://localhost:3000/auth/register`

```json
{
  "email": "review_tester@example.com",
  "username": "reviewtester",
  "password": "12345678",
  "role": "customer"
}
```

### 3.2 Đăng nhập
`POST http://localhost:3000/auth/login`

```json
{
  "email": "review_tester@example.com",
  "password": "12345678"
}
```

Lưu `accessToken` để dùng cho request tiếp theo.

## 4. Mở khóa booking để được review (bắt buộc)

Tạo review chỉ thành công sau khi có sự kiện `payment.completed`.

RabbitMQ UI: `http://localhost:15672`
- Exchange: `payment.events`
- Routing key: `payment.completed`

Payload mẫu:

```json
{
  "eventId": "evt-001",
  "eventType": "payment.completed",
  "timestamp": "2026-04-24T04:20:00.000Z",
  "data": {
    "bookingId": "BK123",
    "customerId": "1",
    "driverId": "DRV_001",
    "amount": 120000,
    "status": "COMPLETED"
  }
}
```

Lưu ý:
- `customerId` trong event phải trùng user id trong JWT (`sub` hoặc `id`).

## 5. Tạo đánh giá (case thành công)

`POST http://localhost:3000/reviews`

Headers:
- `Authorization: Bearer <accessToken>`
- `Content-Type: application/json`

Body:

```json
{
  "bookingId": "BK123",
  "rating": 4.9,
  "comment": "Great ride",
  "tags": ["safe", "friendly"]
}
```

Kỳ vọng:
- `201 Created`
- response có:
  - `driverFeatures.averageRating`
  - `driverFeatures.totalReviews`
  - `eventId` (event `review.created` đã publish)

## 6. Các case lỗi quan trọng

### 6.1 Thiếu token
`POST /reviews` không có `Authorization` -> `401` hoặc `403`.

### 6.2 Booking chưa sẵn sàng
Dùng booking chưa unlock bằng payment event -> `400 Booking is not ready for review`.

### 6.3 Sai customer
`customerId` trong Redis/event khác user trong token -> `403 You cannot review another customer's booking`.

### 6.4 Đánh giá trùng
Gửi lại cùng booking -> `409 This booking has already been reviewed`.


## 8. Xử lý lỗi nhanh

- `Cannot POST /reviews`: sai route gateway hoặc container đang chạy code cũ.
- JSON parse error ở gateway: body JSON sai cú pháp (thường do dấu phẩy cuối).
- `Booking is not ready`: chưa publish payment event hoặc sai booking id.
- `Cannot review another customer's booking`: sai `customerId` giữa token và event.
