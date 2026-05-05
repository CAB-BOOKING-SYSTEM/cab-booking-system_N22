# Hướng Dẫn Test AI Agent Logic - Chỉ Dùng Postman

Tài liệu này được viết lại theo đúng yêu cầu:

- Chỉ dùng `Postman`
- Không dùng frontend
- Test qua `Gateway`
- Viết cụ thể từng bước cho phần `6. AI Agent Logic`

Phần này dùng để test các testcase:

- `TC23`, `TC28`, `TC51`, `TC52`, `TC53`, `TC54`, `TC55`, `TC56`, `TC57`, `TC58`, `TC59`, `TC60`

---

## 1. Đầu tiên cần hiểu đúng về "chọn đại đại" là gì

Nếu em chỉ bấm `POST /api/matching/find-driver` và thấy nó trả về một `driverId`, thì **chưa đủ** để kết luận agent chọn đúng.

Đó là "chọn đại đại" theo nghĩa:

- Mình thấy có kết quả, nhưng không đối chiếu với danh sách driver online trước đó
- Mình không so driver được chọn với `distance`, `rating`, `status`
- Mình không biết agent chọn driver gần nhất thật hay chỉ trả về driver bất kỳ
- Mình không biết có loại driver offline hay không

Muốn test đúng phần `AI Agent Logic`, mỗi lần match phải có 3 lớp chứng cứ:

1. **Chứng cứ đầu vào:** danh sách driver online hiện tại là ai, distance bao nhiêu, rating bao nhiêu
2. **Chứng cứ kết quả:** `find-driver` trả về driver nào, top candidates nào
3. **Chứng cứ đối chiếu:** driver được chọn có hợp lý so với danh sách trước khi match không

Nói ngắn gọn:

- Chỉ nhìn `driverId` là chưa đủ
- Phải đối chiếu với `online/list`, `GET /api/drivers/{id}`, `topCandidates`, `meta`

---

## 2. Có dùng frontend không

Không.

Toàn bộ hướng dẫn này chỉ dùng:

- `Postman`
- Nếu cần thì xem `docker logs` để chụp log backend

Frontend không liên quan đến việc chấm logic phần 6.

---

## 3. Test qua đâu

Chỉ test qua `Gateway`:

- Base URL: `https://localhost:3000`

Không cần mở app web. Không cần click UI. Không cần test trên mobile/web frontend.

---

## 4. Lưu ý rất quan trọng trước khi test

### 4.1 Matching qua Gateway có cần token

Nếu gọi:

- `POST https://localhost:3000/api/matching/find-driver`
- `GET https://localhost:3000/api/matching/result/{rideId}`

thì **có cần Bearer token** vì gateway đang gắn `authMiddleware` cho `/api/matching`.

### 4.2 Driver toggle status cũng cần token

Nếu gọi:

- `POST https://localhost:3000/api/drivers/toggle-status`

thì phải dùng token của driver.

### 4.3 Postman phải bỏ qua SSL local

Vì gateway local đang dùng HTTPS cert nội bộ.

Trong Postman:

1. Vào `Settings`
2. Chọn `General`
3. Tắt `SSL certificate verification`

Nếu không tắt, request đến `https://localhost:3000` rất dễ bị SSL error.

---

## 5. Chuẩn bị Postman Environment

Tạo environment tên ví dụ: `CAB_LOCAL_AI_TEST`

Thêm các biến sau:

```text
baseUrl = https://localhost:3000
customerEmail = customer_ai_01@cab.com
customerPassword = 123456
customerToken =

driver1Email = driver_ai_01@cab.com
driver1Password = 123456
driver1Token =

driver2Email = driver_ai_02@cab.com
driver2Password = 123456
driver2Token =

driver3Email = driver_ai_03@cab.com
driver3Password = 123456
driver3Token =

rideId =
selectedDriverId =
traceId =
```

---

## 6. Collection Postman nên tạo

Tạo collection tên: `AI Agent Logic - Section 6`

Trong collection này tạo các request theo đúng thứ tự:

1. `Auth - Register Customer`
2. `Auth - Register Driver 1`
3. `Auth - Register Driver 2`
4. `Auth - Register Driver 3`
5. `Auth - Login Customer`
6. `Auth - Login Driver 1`
7. `Auth - Login Driver 2`
8. `Auth - Login Driver 3`
9. `Driver - Toggle Online Driver 1`
10. `Driver - Toggle Online Driver 2`
11. `Driver - Toggle Online Driver 3`
12. `Driver - Online List`
13. `Matching - Find Driver`
14. `Matching - Get Result`
15. `Driver - Get Selected Driver Info`

Sau đó mới tạo thêm folder riêng cho từng testcase.

---

## 7. Các request setup bắt buộc

### 7.1 Auth - Register Customer

**Method:** `POST`

**URL:**
```
{{baseUrl}}/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body raw JSON:**
```json
{
  "email": "{{customerEmail}}",
  "username": "customer_ai_01",
  "password": "{{customerPassword}}",
  "role": "customer"
}
```

Chấp nhận 1 trong 2 trường hợp: đăng ký thành công, hoặc tài khoản đã tồn tại. Mục đích của request này chỉ là đảm bảo có customer để login.

### 7.2 Auth - Register Driver 1/2/3

**URL:**
```
{{baseUrl}}/auth/register
```

**Body Driver 1:**
```json
{
  "email": "{{driver1Email}}",
  "username": "driver_ai_01",
  "password": "{{driver1Password}}",
  "role": "driver"
}
```

**Body Driver 2:**
```json
{
  "email": "{{driver2Email}}",
  "username": "driver_ai_02",
  "password": "{{driver2Password}}",
  "role": "driver"
}
```

**Body Driver 3:**
```json
{
  "email": "{{driver3Email}}",
  "username": "driver_ai_03",
  "password": "{{driver3Password}}",
  "role": "driver"
}
```

### 7.3 Auth - Login Customer

**Method:** `POST`

**URL:**
```
{{baseUrl}}/auth/login
```

**Body:**
```json
{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}"
}
```

**Tab Tests:**
```javascript
const res = pm.response.json();

if (res.access_token) {
  pm.environment.set("customerToken", res.access_token);
}

if (res.token_payload && res.token_payload.sub) {
  pm.environment.set("customerUserId", res.token_payload.sub);
}
```

Sau khi bấm Send, mở Environment và xác nhận `customerToken` đã có giá trị.

### 7.4 Auth - Login Driver 1

**Body:**
```json
{
  "email": "{{driver1Email}}",
  "password": "{{driver1Password}}"
}
```

**Tests:**
```javascript
const res = pm.response.json();

if (res.access_token) {
  pm.environment.set("driver1Token", res.access_token);
}

if (res.token_payload && res.token_payload.driver_id) {
  pm.environment.set("driver1Id", res.token_payload.driver_id);
}
```

Làm y chang cho Driver 2 và Driver 3, chỉ đổi tên biến: `driver2Token`, `driver2Id`, `driver3Token`, `driver3Id`.

### 7.5 Driver - Toggle Online Driver 1

**Method:** `POST`

**URL:**
```
{{baseUrl}}/api/drivers/toggle-status
```

**Headers:**
```
Authorization: Bearer {{driver1Token}}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "online"
}
```

Làm y chang cho Driver 2 và Driver 3.

**PASS setup khi response có dạng:**
```json
{
  "success": true,
  "data": {
    "driverId": "...",
    "status": "online"
  }
}
```

### 7.6 Driver - Online List

**Method:** `GET`

**URL:**
```
{{baseUrl}}/api/drivers/online/list?lat=21.0285&lng=105.8542&radius=5
```

**Headers:**
```
Authorization: Bearer {{customerToken}}
```

**Tại sao request này quan trọng:**

- Đây là danh sách đối chiếu đầu vào trước khi match
- Ở đây sẽ thấy driver nào đang online
- Có thể thấy `distanceKm` của từng driver

Nếu response trả về list online drivers, lưu lại raw response này để làm bằng chứng cho các testcase `TC23`, `TC51`, `TC57`.

---

## 8. Request matching chuẩn để dùng lặp đi lặp lại

### 8.1 Matching - Find Driver

**Method:** `POST`

**URL:**
```
{{baseUrl}}/api/matching/find-driver
```

**Headers:**
```
Authorization: Bearer {{customerToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "rideId": "RIDE_TC23_001",
  "userId": "USER_001",
  "pickupLat": 21.0285,
  "pickupLng": 105.8542,
  "dropoffLat": 21.0385,
  "dropoffLng": 105.8642,
  "vehicleType": "4_seat"
}
```

**Tab Tests:**
```javascript
const res = pm.response.json();

if (res.data && res.data.driverId) {
  pm.environment.set("selectedDriverId", res.data.driverId);
}

if (res.meta && res.meta.traceId) {
  pm.environment.set("traceId", res.meta.traceId);
}

if (res.data && res.data.rideId) {
  pm.environment.set("rideId", res.data.rideId);
}
```

### 8.2 Matching - Get Result

**Method:** `GET`

**URL:**
```
{{baseUrl}}/api/matching/result/{{rideId}}
```

**Headers:**
```
Authorization: Bearer {{customerToken}}
```

### 8.3 Driver - Get Selected Driver Info

**Method:** `GET`

**URL:**
```
{{baseUrl}}/api/drivers/{{selectedDriverId}}
```

**Headers:**
```
Authorization: Bearer {{customerToken}}
```

Request này dùng để xem status, rating và currentLocation của driver được chọn.

---

## 9. Cách test từng testcase chỉ bằng Postman

### TC23 - AI Agent chọn driver hợp lệ và đang ONLINE

**Mục tiêu:** Chứng minh rằng agent không trả về một driver bất kỳ, mà trả về driver đang online và có mặt trong danh sách online.

**Bước làm:**

1. Chạy `Driver - Online List`
2. Xác nhận có ít nhất 1 driver online
3. Chạy `Matching - Find Driver`
4. Chạy `Driver - Get Selected Driver Info`

**Cách đối chiếu:**

So sánh `selectedDriverId` trong response matching có xuất hiện trong `Driver - Online List` không, và `GET /api/drivers/{{selectedDriverId}}` có `status = online` không.

**PASS khi:**
- `success = true`
- Có `data.driverId`
- Driver được chọn nằm trong danh sách online
- Driver được chọn có `status = online`

**FAIL khi:**
- Trả về driver không có trong online list
- Trả về driver `offline`
- Response bị lỗi `404`, `500`

---

### TC28 - Context fetch đầy đủ

**Mục tiêu:** Chứng minh matching không chạy mù, mà đã lấy đủ context để ra quyết định.

Context ở đây gồm: danh sách nearby drivers, driver details, feature data, ETA data, kết quả AI scoring.

**Bước làm:**

1. Chạy `Driver - Online List`
2. Chạy `Matching - Find Driver` với đủ `pickup`, `dropoff`, `vehicleType`
3. Chạy `Matching - Get Result`

**Cần nhìn field nào:**

Trong response `find-driver`, tìm:
- `data.topCandidates`
- `data.etaMinutes`
- `meta.candidatesCount`
- `meta.modelVersion`
- `meta.decisionLog`

**PASS khi:**
- Response thành công
- Có `topCandidates`
- Có `etaMinutes`
- Có `decisionLog`
- Có `candidatesCount > 0`

**FAIL khi:**
- Response thành công nhưng không có bằng chứng đã scoring
- Không có `topCandidates`
- Không có `meta`

---

### TC51 - Agent chọn driver gần nhất

**Cái này test thế nào mới không bị "chọn đại":**

Không được chỉ nhìn `driverId`. Phải đối chiếu với `distanceKm` từ danh sách online.

**Bước làm:**

1. Chạy `Driver - Online List` với `lat/lng` giống pickup
2. Ghi lại driver nào đang online và `distanceKm` của từng driver
3. Chạy `Matching - Find Driver`
4. Xem `data.driverId` và `data.topCandidates`

**PASS khi:**
- Driver được chọn là driver có `distanceKm` nhỏ nhất
- Hoặc driver đó đứng top 1 trong `topCandidates` và online list cũng xác nhận nó gần nhất

**FAIL khi:**
- Online list cho thấy `D2` gần nhất nhưng matching lại trả `D1`
- Trong khi không có lý do bù trừ rõ ràng nào

**Ghi chú thực tế:**

Case này chỉ chấm được nếu online list hiện tại có nhiều driver có `distanceKm` khác nhau. Nếu cả 3 driver đều cùng vị trí hoặc không có `currentLocation` đúng nghĩa, thì testcase này **không đủ dữ liệu để kết luận**. Khi đó không được viết "pass" mà phải viết:

> `Inconclusive - dữ liệu driver chưa đủ phân hóa distance`

---

### TC52 - Agent cân nhắc rating cao

**Mục tiêu:** Chứng minh agent không chỉ nhìn khoảng cách, mà còn cân nhắc rating.

**Bước làm:**

1. Chạy `Driver - Online List`
2. Lấy 2 driver trong danh sách
3. Gọi `GET /api/drivers/{driverId1}` và `GET /api/drivers/{driverId2}`
4. Ghi lại distance và rating của mỗi driver
5. Chạy `Matching - Find Driver`
6. Xem `selectedDriverId` và `topCandidates`

**Logic chấm:**

Nếu có tình huống D1 gần hơn nhưng rating thấp, D2 xa hơn chút nhưng rating cao hơn, mà hệ thống vẫn đưa D2 lên cao, thì đó là bằng chứng agent có cân nhắc rating.

**PASS khi:**
- Có bằng chứng so sánh được giữa `distance` và `rating`
- Kết quả matching phản ánh có cân nhắc rating

**FAIL khi:**
- Response không có `topCandidates`
- Không có dữ liệu rating để đối chiếu

> **Rất quan trọng:** Nếu không đối chiếu rating mà chỉ thấy nó chọn 1 driver nào đó thì đó vẫn là "chọn đại". Case này bắt buộc phải chụp: `GET online list`, `GET driver info` của ít nhất 2 driver, và `find-driver response`.

---

### TC53 - Agent cân bằng ETA và price

**Mục tiêu:** Chứng minh matching có dùng context chuyên sâu hơn là chỉ distance.

**Bước làm:**

1. Chạy `Matching - Find Driver` có `dropoffLat/dropoffLng`
2. Xem response: `data.etaMinutes`, `data.topCandidates`, `meta.decisionLog`

**PASS khi:**
- Có `etaMinutes`
- Có `decisionLog`
- Kết quả matching có dấu hiệu scoring tổng hợp

**Không nên chấm sai ở chỗ nào:**

Repo hiện tại không expose 1 field `price` rõ ràng ở response matching để so từng con số price trong Postman. Vì vậy, với Postman-only, có thể kết luận hệ thống có sử dụng ETA/scoring tổng hợp, nhưng không nên khẳng định chi tiết "giá A thắng giá B" nếu response không đưa ra dữ liệu đó.

**Cách viết kết quả cho đúng:**

Nên viết: `Pass mục tiêu API/orchestration: response có etaMinutes, topCandidates, decisionLog`

Không nên viết: `Pass 100% đã tối ưu giá` nếu không có số liệu giá để đối chiếu.

---

### TC54 - Agent gọi đúng tool, đúng thứ tự

**Mục tiêu:** Case này khó hơn vì Postman chỉ thấy response, không thấy thứ tự gọi tool bên trong.

**Nếu chỉ dùng Postman thì chấm đến mức nào:**

Chỉ chấm được ở mức:
- Request có `dropoff`
- Response thành công
- Có `etaMinutes`
- Có `decisionLog`

Điều đó cho thấy flow cần thiết đã chạy.

**Nếu muốn chấm chắc thứ tự tool:**

Cần chụp thêm backend log: `Calling AI Platform /predict/matching`, `Calling AI Platform /predict/eta`.

**Kết luận thực tế:**

Với Postman only, case này nên ghi:

> `Pass một phần ở mức API behavior`

Hoặc:

> `Cần log backend nếu muốn xác nhận thứ tự tool call`

Không nên viết "pass full" nếu chưa có log.

---

### TC55 - Agent xử lý khi thiếu context, không crash

**Request riêng cho case này:**

```json
{
  "rideId": "RIDE_TC55_001",
  "userId": "USER_001",
  "pickupLat": 21.0285,
  "pickupLng": 105.8542,
  "vehicleType": "4_seat"
}
```

Không gửi `dropoffLat`, `dropoffLng`.

**Bước làm:**

1. Chạy request trên
2. Xem response
3. Chạy `Matching - Get Result` nếu cần

**PASS khi:**
- Không bị `500`
- Vẫn trả kết quả hợp lệ
- Vẫn có `driverId` hoặc trả lời có kiểm soát

**FAIL khi:**
- Service crash
- Bị lỗi server vì thiếu dropoff

Case này Postman test rất đẹp, không cần frontend, không cần DB.

---

### TC56 - Agent retry khi service AI/ETA lỗi

**Case này Postman có test được không:**

Có, nhưng cần thao tác thêm ở backend để tạo lỗi.

**Cách test:**

1. Tạm dừng `cab_ai_platform`
2. Quay lại Postman, chạy `Matching - Find Driver`
3. Xem response

**PASS khi:**
- Request không fail ngay do timeout ngay lập tức
- Vẫn có response có kiểm soát
- Nếu fallback được thì càng tốt

**Bằng chứng tốt nhất:** response Postman + log backend có retry.

**Nếu chỉ có Postman mà không có log:**

Vẫn có thể ghi: `Hệ thống không sập ngay, có xu hướng fallback`

Nhưng không nên viết: `Đã xác nhận retry 2 lần` nếu chưa có log.

---

### TC57 - Agent loại bỏ driver offline

**Bước làm:**

1. Chọn 1 driver đang online
2. Gọi request `toggle-status` cho driver đó thành `offline`
3. Chạy `Driver - Online List`
4. Chạy `Matching - Find Driver`

**Cách đối chiếu:**

- Driver offline vừa tắt không còn xuất hiện trong `online/list`
- Matching cũng không được trả về driver đó

**PASS khi:**
- Driver offline không còn trong online list
- Selected driver không phải là offline driver

**FAIL khi:**
- Offline rồi mà vẫn được assign

Case này Postman test rất rõ, không cần frontend.

---

### TC58 - Agent log decision đầy đủ, có traceId

**Trong Postman kiểm gì:**

Trong response `find-driver`, tìm:
- `meta.traceId`
- `meta.decisionLog`

**PASS khi:**
- Có `traceId`
- Có `decisionLog`
- `decisionLog` không rỗng

**Nếu muốn chụp đẹp:**

Trong Postman tab `Pretty`, chụp rõ `meta.traceId` và `meta.decisionLog`.

Case này Postman cover rất tốt.

---

### TC59 - Agent xử lý nhiều request song song

**Postman test cách nào:**

Cách dễ nhất là dùng `Postman Runner`.

**Tạo request:**

Tạo request `Matching - Find Driver - Parallel` giống request matching thường, nhưng body đổi `rideId`:

```json
{
  "rideId": "RIDE_TC59_{{$randomInt}}",
  "userId": "USER_001",
  "pickupLat": 21.0285,
  "pickupLng": 105.8542,
  "dropoffLat": 21.0385,
  "dropoffLng": 105.8642,
  "vehicleType": "4_seat"
}
```

**Cách chạy:**

1. Mở Collection Runner
2. Chọn request này
3. Chạy nhiều lần liên tiếp, ví dụ `5` hoặc `10` lần

**PASS khi:**
- Nhiều request đều không crash
- Nhiều request đều có kết quả
- Mỗi response có `meta.traceId` riêng

**FAIL khi:**
- Request bị chết ngẫu nhiên
- `500` hàng loạt
- Response bị lặp sai `rideId`

> **Lưu ý:** Postman Runner là đủ cho mục đích demo. Nó không giống stress test thuần load testing, nhưng đủ để minh họa `TC59`.

---

### TC60 - Agent fallback rule-based khi AI crash

**Cách test:**

1. Tạm dừng `cab_ai_platform`
2. Chạy `Matching - Find Driver`
3. Xem response

**Cần nhìn field nào:**
- `meta.usedFallback`
- `data.usedFallback`

**PASS khi:**
- Request vẫn thành công
- `usedFallback = true`

**FAIL khi:**
- AI sập là matching sập theo
- Không có kết quả nào dù là fallback

Case này Postman có thể kết luận khá rõ nếu response có field fallback.

---

## 10. Mẫu ghi kết quả testcase cho đúng

### Mẫu viết cho TC23

```text
TC23 - PASS

Bằng chứng:
- Online list trước khi match có driver DRV001, DRV002
- Matching trả driverId = DRV001
- GET /api/drivers/DRV001 cho thấy status = online

Kết luận:
- Agent chọn driver hợp lệ và đang online
```

### Mẫu viết cho TC51

```text
TC51 - PASS

Bằng chứng:
- Online list tại pickup cho thấy:
  DRV001 distanceKm = 1.2
  DRV002 distanceKm = 2.8
  DRV003 distanceKm = 3.1
- Matching trả driverId = DRV001
- DRV001 đứng top 1 trong topCandidates

Kết luận:
- Agent chọn driver gần nhất, không phải chọn ngẫu nhiên
```

### Mẫu viết khi không đủ chứng cứ

```text
TC52 - INCONCLUSIVE

Lý do:
- Có response matching
- Nhưng không đối chiếu được rating giữa các driver
- Không đủ chứng cứ để kết luận agent có cân nhắc rating hay không
```

Đây là cách viết trung thực. Không nên ép thành `PASS` khi chứng cứ chưa đủ.

---

## 11. Tổng kết xem case nào Postman cover tốt nhất

**Postman cover rất tốt:**
- `TC23`, `TC28`, `TC55`, `TC57`, `TC58`, `TC59`, `TC60`

**Postman cover được nhưng cần đối chiếu kỹ:**
- `TC51`, `TC52`, `TC53`

**Postman chỉ cover một phần, muốn chắc cần log backend:**
- `TC54`, `TC56`

---

## 12. Kết luận cuối cùng

Nếu chỉ dùng Postman và không dùng frontend, em vẫn test được phần 6.

Nhưng nhớ 3 quy tắc:

1. Không chỉ nhìn có `driverId` là báo pass
2. Luôn đối chiếu với `online/list`, `GET /drivers/{id}`, `topCandidates`, `meta`
3. Nếu chứng cứ chưa đủ thì ghi `Inconclusive`, đó không phải yếu — đó là trung thực

Nếu cần, bước tiếp theo có thể làm tiếp 1 trong 2 việc:

- Viết sẵn bộ `Postman test scripts` cho từng request
- Hoặc tạo hẳn file `Postman collection JSON` để import vào Postman chạy luôn