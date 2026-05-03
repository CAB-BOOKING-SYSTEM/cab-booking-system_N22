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
https://localhost:3000/api/notifications/idkhachhang

Header: Đảm bảo có Authorization: Bearer {{token}} nếu bạn đã bật middleware auth cho route này.

Kiểm tra:

Nếu trong phần data có các object thông báo -> Passed.

Nếu unreadCount (khi gọi endpoint /unread-count) lớn hơn 0 -> Hệ thống tính toán badge chính xác.
![alt text](public/TC24.png)
![alt text](public/tc24_socketio.png) test tren socket io
PS C:\Users\User\Downloads\flodel\cab-booking-system_N22> docker exec -it cab_redis redis-cli
127.0.0.1:6379> keys feature:eta:*
1) "feature:eta:1777570215741"
127.0.0.1:6379> 

What's next:
    Try Docker Debug for seamless, persistent debugging tools in any container or image → docker debug cab_redis
    Learn more at https://docs.docker.com/go/debug-cli/
docker exec -it cab_redis redis-cli
keys feature:eta:*
tc116
Cấu trúc thư mục monitoring
![alt text](public/image.png)
Bước 1: Khởi động hệ thốngMở Terminal tại thư mục gốc và chạy lệnh:PowerShelldocker-compose up -d --build prometheus alertmanager node-exporter
Bước 2: Kiểm tra trạng thái kết nốiTruy cập http://localhost:9090/targets để đảm bảo:cab-notification-service (Port 3040) trạng thái UP.  node-exporter trạng thái UP.  Bước 3: Kịch bản kiểm thử (Simulate Error)Sử dụng Postman gọi liên tục vào API gây lỗi giả lập: POST /api/notifications/simulate-crash[cite: 3].
Kiểm tra trang http://localhost:9090/alerts, trạng thái HighErrorRate sẽ chuyển từ Inactive → Pending → FIRING (Màu đỏ) sau 10 giây.  Kiểm tra hộp thư Gmail hle26625@gmail.com để nhận email cảnh báo chi tiết.  
Test tren postmain bắn lỗi 100 lan 

![alt text](public/TC116_1.png)
![alt text](public/TC116_2.png)
![alt text](public/TC116_2.1.png)
![alt text](public/TC116_3.1.png)
![alt text](public/TC116_3.2.png)
![alt text](public/TC116_3.3.png)



📝 Kết quả đạt đượcMetric ghi nhận: 
Tỷ lệ lỗi được Prometheus tính toán chính xác bằng hàm rate() trong 1 phút[cite: 3].
Email Alert: Thông báo gửi về có đầy đủ thông tin: Tên lỗi, Môi trường (Production), Độ nghiêm trọng (Critical) và Nội dung lỗi[cite: 5, 6].
![alt text](public/TC116_3.3.png)
Bảo mật: Tách biệt luồng dữ liệu ứng dụng (mTLS 3004) và luồng giám sát (HTTP 3040) giúp hệ thống chạy ổn định và an toàn. 