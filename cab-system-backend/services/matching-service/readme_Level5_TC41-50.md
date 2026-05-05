# Hướng Dẫn Test Level 5: AI Service Validation (TC41 - TC51)

Tài liệu này hướng dẫn chi tiết cách test các chức năng AI (ETA, Surge, Fraud, Matching, Forecast) thông qua **Postman**. 

---

## 🔑 Bước 0: Đăng nhập & Lấy Token (Bắt buộc)

## 📌 TC41: ETA model output trong range hợp lý
- **Ý nghĩa:** Kiểm tra mô hình dự đoán thời gian di chuyển (ETA). Với quãng đường 5km, ETA không được trả về số âm và phải nhỏ hơn ngưỡng vô lý (ví dụ < 60 phút).
- **URL:** `POST https://localhost:3000/api/ai/predict/eta`
- **Body:**
    ```json
    {
      "distance_km": 5,
      "hour_of_day": 12,
      "day_of_week": 3,
      "traffic_index": 0.5,
      "is_rain": 0
    }
    ```
- **Kiểm tra (PASS khi):**
  - `eta_minutes` > 0
  - `eta_minutes` < 60

---

## 📌 TC42: Pricing surge > 1 khi demand cao
- **Ý nghĩa:** Kiểm tra mô hình giá (Surge Pricing). Khi nhu cầu (demand_index) cao = 2, hệ số nhân giá (surge) phải > 1 và không vượt quá 3x.
- **URL:** `POST https://localhost:3000/api/ai/predict/surge`
- **Body:**
    ```json
    {
      "demand_index": 2,
      "supply_ratio": 0.4,
      "hour_of_day": 18,
      "is_holiday": 0,
      "is_event": 0
    }
    ```
- **Kiểm tra (PASS khi):**
  - `surge_multiplier` > 1.0 và ≤ 3.0.

---

## 📌 TC43: Fraud score > threshold → flagged
- **Ý nghĩa:** Kiểm tra mô hình phát hiện gian lận. Truyền vào dữ liệu giao dịch đáng ngờ (giá quá cao 500k cho đoạn đường quá ngắn 0.5km, gọi nhiều chuyến). Hệ thống phải trả về điểm gian lận cao và bật cờ `is_flagged`.
- **URL:** `POST https://localhost:3000/api/ai/predict/fraud`
- **Body:**
    ```json
    {
      "trip_amount": 500000,
      "trip_distance_km": 0.5,
      "payment_method": 1,
      "num_trips_last_hour": 10,
      "avg_trip_amount": 600000,
      "distance_from_usual_area_km": 30,
      "time_since_last_trip_min": 2
    }
    ```
- **Kiểm tra (PASS khi):**
  - `fraud_score` > `threshold` (0.5)
  - `is_flagged` = `true`

---

## 📌 TC44: Recommendation trả top-3 drivers
- **Ý nghĩa:** Đưa vào danh sách 4 tài xế, yêu cầu hệ thống chỉ trả về danh sách gợi ý gồm đúng 3 tài xế tốt nhất (Top 3), không thiếu không thừa.
- **URL:** `POST https://localhost:3000/api/ai/predict/matching`
- **Body:**
    ```json
    {
      "drivers": [
        { "driver_id": "D1", "distance_km": 5, "driver_rating": 4.0, "acceptance_rate": 0.8, "avg_response_time_sec": 40, "completed_trips": 100, "eta_minutes": 12, "price_estimate": 50000 },
        { "driver_id": "D2", "distance_km": 2, "driver_rating": 4.9, "acceptance_rate": 0.95, "avg_response_time_sec": 15, "completed_trips": 500, "eta_minutes": 5, "price_estimate": 25000 },
        { "driver_id": "D3", "distance_km": 3, "driver_rating": 4.5, "acceptance_rate": 0.9, "avg_response_time_sec": 25, "completed_trips": 300, "eta_minutes": 7, "price_estimate": 35000 },
        { "driver_id": "D4", "distance_km": 8, "driver_rating": 3.5, "acceptance_rate": 0.6, "avg_response_time_sec": 60, "completed_trips": 50, "eta_minutes": 20, "price_estimate": 80000 }
      ],
      "top_n": 3
    }
    ```
- **Kiểm tra (PASS khi):**
  - Mảng `top_drivers` có đúng **3** object.
  - Driver D4 (tệ nhất, xa nhất) bị loại khỏi danh sách.

---

## 📌 TC45: Forecast trả dữ liệu đúng format
- **Ý nghĩa:** Kiểm tra API dự báo nhu cầu tương lai. Output phải trả về đúng schema chứa `timestamp` và giá trị `predicted_demand`.
- **URL:** `POST https://localhost:3000/api/ai/predict/forecast`
- **Body:**
    ```json
    {
      "zone_id": "zone_A",
      "hour": 8,
      "day_of_week": 1,
      "month": 6
    }
    ```
- **Kiểm tra (PASS khi):**
  - Có field `timestamp` chuẩn ISO.
  - Có field `predicted_demand` (số nguyên).

---

## 📌 TC46: Model version được trả về đúng
- **Ý nghĩa:** Đảm bảo mọi kết quả trả về từ AI Platform đều đính kèm thông tin phiên bản mô hình đang chạy (phục vụ audit).
- **Kiểm tra:**
  - Nhìn vào Response của tất cả các API TC41 -> TC45 ở trên. Phải luôn có trường `"model_version": "1.0.0"`.

---

## 📌 TC47: AI latency < 200ms
- **Ý nghĩa:** Đảm bảo tốc độ gọi AI Model cực nhanh để không làm chậm luồng gọi xe.
- **Kiểm tra:**
  - Nhìn vào góc dưới bên phải màn hình Postman, xem thông số **Time** (thời gian phản hồi).
  - Phải hiển thị `< 200 ms`.
  - Hoặc xem trường `latency_ms` trong response body.

---

## 📌 TC48: Drift detection trigger
- **Ý nghĩa:** Kiểm tra xem hệ thống AI có phát hiện được khi luồng dữ liệu thực tế đang lệch (drift) so với lúc huấn luyện hay không.
- **URL:** `POST https://localhost:3000/api/ai/drift/check`
- **Body (cố ý nhập traffic_index = 0.99, distance = 100km):**
    ```json
    {
      "model_name": "eta",
      "current_data": {
        "distance_km": 100,
        "traffic_index": 0.99
      }
    }
    ```
- **Kiểm tra (PASS khi):**
  - `drift_detected` = `true`.
  - Hệ thống chỉ ra `drifted_features` gồm `distance_km` và `traffic_index`.

---

## 📌 TC49: Model fallback khi lỗi (AI Crash Simulation)
- **Ý nghĩa:** Kiểm tra cơ chế tự bảo vệ của hệ thống. Khi service AI bị sập hoặc gặp lỗi timeout, hệ thống Matching không được sập (không crash) mà phải tự động chuyển sang dùng thuật toán tĩnh (Rule-based: ưu tiên tài xế gần nhất + điểm đánh giá cao).
- **Cách test:**
  1. **Mô phỏng AI Model Crash:** Tạm thời tắt container của AI Platform bằng lệnh sau trong Terminal/Command Prompt:
     ```bash
     docker stop cab_ai_platform
     ```
  2. **Gửi Request:** Quay lại Postman, gọi API của TC44 (Recommendation trả top-3 drivers) hoặc API gọi xe chính:
     - **URL:** `POST https://localhost:3000/api/ai/predict/matching` sẽ **không phản hồi** (vì chính service AI đang tắt).
     - **Tốt nhất:** Gọi luồng thật qua Matching Service để xem nó có fallback không. Hiện tại, API này nằm ở `POST https://localhost:3000/api/matching/find-driver` (truyền đủ toạ độ điểm đón/trả).
  3. **Kiểm tra (PASS khi):**
     - Request `find-driver` vẫn trả về thành công 200 OK.
     - Trong log của `matching-service` (mở terminal xem log `docker logs cab_matching`), bạn sẽ thấy dòng chữ cảnh báo: `⚠️ [Fallback] AI model unavailable, using rule-based scoring`.
     - Phản hồi từ API (nếu có metadata) sẽ hiện `usedFallback: true`.
  4. **Phục hồi sau khi test:** Nhớ bật lại service AI bằng lệnh:
     ```bash
     docker start cab_ai_platform
     ```

---

## 📌 TC50: Input bất thường → không crash
- **Ý nghĩa:** Gửi input vô lý (ví dụ quãng đường 1000km) để đảm bảo mô hình có cơ chế chặn/validate, không bị văng lỗi Internal Server Error (500).
- **URL:** `POST https://localhost:3000/api/ai/predict/eta`
- **Body:**
    ```json
    {
      "distance_km": 1000,
      "hour_of_day": 12,
      "day_of_week": 3,
      "traffic_index": 0.5,
      "is_rain": 0
    }
    ```
- **Kiểm tra (PASS khi):**
  - Trả về mã lỗi **422 Unprocessable Entity** (Validation Error).
  - Hệ thống không bị sập.

---



---

## 📌 TC7: Gọi API ETA trả về giá trị > 0
- **Ý nghĩa:** Kiểm tra AI ETA service hoạt động bình thường. Gửi quãng đường 5km với mức giao thông trung bình, hệ thống phải trả ETA > 0 và hợp lý (< 60 phút).
- **URL:** `POST https://localhost:3000/api/ai/predict/eta`
- **Body:**
    ```json
    {
      "distance_km": 5,
      "traffic_level": 0.5
    }
    ```
  > **Lưu ý:** API hỗ trợ cả `traffic_level` lẫn `traffic_index` (cùng ý nghĩa). Các field khác (`hour_of_day`, `day_of_week`, `is_rain`) sẽ dùng giá trị mặc định nếu không truyền.
- **Kiểm tra (PASS khi):**
  - HTTP status = **200**
  - `eta_minutes` > 0
  - `eta_minutes` < 60 (hợp lý)

---

## 📌 TC8: Pricing API trả về giá hợp lệ
- **Ý nghĩa:** Kiểm tra Pricing service hoạt động. Gửi quãng đường 5km với mức demand bình thường (1.0), hệ thống phải trả về giá cước > giá gốc (base fare) và surge >= 1.
- **URL:** `POST https://localhost:3000/api/ai/predict/pricing`
- **Body:**
    ```json
    {
      "distance_km": 5,
      "demand_index": 1.0
    }
    ```
- **Giải thích output:**
  - `base_fare`: Giá mở cửa (12,000 VND)
  - `distance_fare`: Giá theo km (5km × 8,500 = 42,500 VND)
  - `surge_multiplier`: Hệ số tăng giá dựa trên demand
  - `total_price`: Giá cuối = (base_fare + distance_fare) × surge
- **Kiểm tra (PASS khi):**
  - HTTP status = **200**
  - `total_price` > `base_fare` (giá cuối > giá gốc)
  - `surge_multiplier` >= 1.0

