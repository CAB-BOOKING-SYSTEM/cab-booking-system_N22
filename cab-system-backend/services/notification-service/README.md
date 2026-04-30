import thu viện cho noti
npm install socket.io-client
TC09: Notification gửi thành công
Mô tả: Kiểm tra khả năng nhận và xử lý thông báo khi có sự kiện Booking hoặc Payment.

1. Thông tin Test Case
Context: Booking đã được tạo thành công trong hệ thống.

Input (JSON):

JSON
{
  "user_id": "1",
  "message": "Your ride is confirmed"
}
Endpoint: POST {{gateway_url}}/api/notifications/test

2. Các bước thực hiện
Bước 1: Mở Postman, chọn phương thức POST.

Bước 2: Nhập URL:POST
 https://localhost:3000/api/notifications/test (hoặc port 3004 nếu bắn trực tiếp).

Bước 3: Tại tab Body -> chọn raw -> định dạng JSON. Dán cục Input phía trên vào.

Bước 4: Nhấn Send.

3. Kết quả mong đợi (Expected Result)
HTTP Status: 200 OK.

Response Body: Hệ thống trả về trạng thái "status": "sent".

Log: Trong Terminal của cab_notification, xuất hiện log xác nhận gửi thông báo thành công.
![alt text](public/TC9.png)
![alt text](public/thongbao_socketio.png) socket.io
TC24
Cách thực hiện trên Postman để thầy thấy "xịn" nhất:
Thiết lập: Chọn phương thức GET.

Nhập URL: https://localhost:3000/api/notifications/1.

Header: Đảm bảo có Authorization: Bearer {{token}} nếu bạn đã bật middleware auth cho route này.

Kiểm tra:

Nếu trong phần data có các object thông báo -> Passed.

Nếu unreadCount (khi gọi endpoint /unread-count) lớn hơn 0 -> Hệ thống tính toán badge chính xác.
![alt text](public/TC24.png)
![alt text](public/tc24_socketio.png) test tren socket io
