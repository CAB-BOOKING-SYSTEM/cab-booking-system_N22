# Hướng Dẫn Test Review Service (Bao gồm Microservices & Zero Trust)

Tài liệu này hướng dẫn cách test các API của `review-service` áp dụng kiến trúc **Zero Trust (JWT)** và giao tiếp **Event-Driven qua RabbitMQ / Redis**.

## 1. Chuẩn bị Token (Zero Trust)
Bắt buộc phải có thẻ JWT để truy cập bất cứ API nào trong project. Để thuận tiện cho việc thiết lập Postman, đây là một Token đã được tạo sẵn (với `customerId` bằng `c1f71a93-8b59-4d64-87fd-e8ef8c8bdfe8`):

=> Copy nguyên chuỗi này và gán vào thẻ `Authorization: Bearer <TOKEN>` trên Postman:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImMxZjcxYTkzLThiNTktNGQ2NC04N2ZkLWU4ZWY4YzhiZGZlOCIsInJvbGUiOiJDVVNUT01FUiJ9.qdLbIMmWhvlgoYnBa6gjusCRpZI7ekG8qiRDRfEyPz8
```

---

## 2. Test luồng Review

### Bước A: Tạo giả lập hóa đơn (Mở khóa Review)
Chỉ khách hàng đã "được trừ tiền" (có trạng thái `READY_FOR_REVIEW`) mới được quyền đánh giá chuyến xe. 

**Cách giả lập nhanh nhất bằng Redis:**
Chạy lệnh này trên Terminal (Mở Tab mới) để báo hệ thống rằng chuyến đi đã sẵn sàng:
```bash
docker exec cab_redis redis-cli set "booking_review_ready:880e8400-e29b-41d4-a716-446655441111" '{"bookingId":"880e8400-e29b-41d4-a716-446655441111","customerId":"c1f71a93-8b59-4d64-87fd-e8ef8c8bdfe8","driverId":"999e8400-e29b-41d4-a716-446655449999","status":"READY_FOR_REVIEW"}'
```

### Bước B: Bắn API Review trên Postman
Tạo một Request mới trên Postman:
- **Method:** `POST`
- **URL:** `http://localhost:3007/api/v1/reviews`
- **Authorization:** `Bearer Token` (Dán JWT ở phần 1).
- **Body -> raw -> JSON:**
```json
{
    "bookingId": "880e8400-e29b-41d4-a716-446655441111",
    "rating": 5,
    "comment": "Tài xế thân thiện, xe thơm mùi quế.",
    "tags": ["Sạch sẽ", "Chuyên nghiệp"]
}
```
**=> Phản hồi hợp lệ:** Status `201 Created`.

---

## 3. Test API Báo Cáo Chuyến Đi (Trip Report)

API này dùng để báo cáo tài xế phóng nhanh / vượt ẩu.
- **Method:** `POST`
- **URL:** `http://localhost:3007/api/v1/reviews/report`
- **Authorization:** `Bearer Token` (Dán JWT ở phần 1).
- **Body -> raw -> JSON:**
```json
{
    "rideId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Tài xế đi nguy hiểm",
    "description": "Anh ta phóng 100km/h ở khu dân cư."
}
```
**=> Phản hồi hợp lệ:** Status `201 Created` kèm `reportId` mới được thêm vào DB.

---

## 4. Cách check Event đã bắn lên RabbitMQ chưa?
1. Đăng nhập RabbitMQ UI (Guest/Guest): `http://localhost:15672/`
2. Sang tab **Queues**, tạo một queue bất kỳ tên là `test_event`.
3. Nhấp vào nó, kéo xuống phần Bindings. Add vào:
   - Exchange: `review.events`
   - Routing key: `review.created`
4. Quay lại Postman bắn thử API Review bước 2 thêm phát nữa.
5. Quay lại Tab Queues, mở `test_event` ra bấm **Get message**, bạn sẽ thấy thông báo Event vừa được bắn lên.
