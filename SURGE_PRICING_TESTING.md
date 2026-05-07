# SURGE PRICING TESTING GUIDE - Postman Only

Tai lieu nay dung de test tinh nang `Surge Pricing` cua du an hien tai theo cach:

- chi dung `Postman`
- khong dung frontend
- test qua `Gateway`
- co test ca:
  - chuc nang cu van chay
  - `Phase 1` surge intelligence
  - `Phase 2` AI surge
  - fallback khi `ai-platform` loi

## 1. Muc tieu test

Can tra loi duoc 5 cau hoi:

1. Code cu co bi anh huong khong
2. Booking tao moi co van chay nhu truoc khong
3. Pricing estimate co van tra gia nhu truoc khong
4. Surge co thay doi theo demand/supply khong
5. Neu AI loi thi he thong co fallback duoc khong

## 2. Service lien quan

Phan surge pricing nay lien quan truc tiep toi:

- `gateway`
- `booking-service`
- `pricing-service`
- `driver-service`
- `ai-platform`
- `redis`

Vai tro:

- `booking-service`: tao demand
- `driver-service`: tao supply
- `pricing-service`: tinh surge va tinh gia
- `ai-platform`: du doan surge cho `Phase 2`
- `redis`: luu counters va surge cache

## 3. Nhung gi da thay doi trong he thong

Sau khi nang cap, pricing se co 2 tang:

### Phase 1

Tinh surge thong minh ngay trong `pricing-service` dua tren:

- `supply`
- `demand`
- `peak hour`
- `weekend/holiday heuristic`
- `zone boost`

### Phase 2

`pricing-service` goi:

- `POST http://ai-platform:8080/predict/surge`

Neu `ai-platform` loi:

- tu fallback ve `Phase 1`

## 4. Dieu can hieu truoc khi test

### 4.1 Surge khong phai tu booking response nhin phat la biet

Muon test dung, phai tach 3 lop:

1. dau vao:
   - co bao nhieu driver online
   - co bao nhieu booking pending

2. surge hien tai:
   - `GET /api/pricing/surge/{zone}`

3. ket qua gia:
   - `POST /api/pricing/estimate`

Neu chi nhin `estimatedFare` tang hay giam ma khong biet:

- zone nao
- supply bao nhieu
- demand bao nhieu

thi de danh gia sai.

### 4.2 Test qua Gateway

Chi dung:

- `https://localhost:3000`

Khong goi service port noi bo neu muc tieu la test nhu he thong that.

### 4.3 Postman phai tat SSL verify

Trong Postman:

1. `Settings`
2. `General`
3. tat `SSL certificate verification`

## 5. Chuan bi Postman Environment

Tao environment ten:

- `CAB_LOCAL_SURGE_TEST`

Them cac bien:

```text
baseUrl = https://localhost:3000

customerEmail = customer_surge_01@cab.com
customerPassword = 123456
customerToken =
customerUserId =

driver1Email = driver_surge_01@cab.com
driver1Password = 123456
driver1Token =
driver1Id =

driver2Email = driver_surge_02@cab.com
driver2Password = 123456
driver2Token =
driver2Id =

driver3Email = driver_surge_03@cab.com
driver3Password = 123456
driver3Token =
driver3Id =

bookingId =
surgeZone = CENTER
estimatedFare =
surgeMultiplier =
modelVersion =
surgeSource =
```

## 6. Collection Postman nen tao

Tao collection:

- `Surge Pricing AI Test`

Tao 5 folder:

1. `00 - Setup Accounts`
2. `01 - Backward Compatibility`
3. `02 - Phase 1 Demand Tracking`
4. `03 - Phase 2 AI Surge`
5. `04 - Fallback Test`

## 7. Setup bat buoc

## 7.1 Register Customer

Method:

- `POST`

URL:

```text
{{baseUrl}}/auth/register
```

Body:

```json
{
  "email": "{{customerEmail}}",
  "username": "customer_surge_01",
  "password": "{{customerPassword}}",
  "role": "customer"
}
```

Chap nhan:

- tao moi thanh cong
- hoac account da ton tai

## 7.2 Register 3 Drivers

Request cho Driver 1:

```json
{
  "email": "{{driver1Email}}",
  "username": "driver_surge_01",
  "password": "{{driver1Password}}",
  "role": "driver"
}
```

Driver 2:

```json
{
  "email": "{{driver2Email}}",
  "username": "driver_surge_02",
  "password": "{{driver2Password}}",
  "role": "driver"
}
```

Driver 3:

```json
{
  "email": "{{driver3Email}}",
  "username": "driver_surge_03",
  "password": "{{driver3Password}}",
  "role": "driver"
}
```

## 7.3 Login Customer

Method:

- `POST`

URL:

```text
{{baseUrl}}/auth/login
```

Body:

```json
{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}"
}
```

Tab `Tests`:

```javascript
const res = pm.response.json();

if (res.access_token) {
  pm.environment.set("customerToken", res.access_token);
}

if (res.token_payload && res.token_payload.sub) {
  pm.environment.set("customerUserId", res.token_payload.sub);
}
```

## 7.4 Login Driver 1/2/3

Body Driver 1:

```json
{
  "email": "{{driver1Email}}",
  "password": "{{driver1Password}}"
}
```

Tests:

```javascript
const res = pm.response.json();

if (res.access_token) {
  pm.environment.set("driver1Token", res.access_token);
}

if (res.token_payload && res.token_payload.driver_id) {
  pm.environment.set("driver1Id", res.token_payload.driver_id);
}
```

Lam tuong tu cho Driver 2 va Driver 3.

## 7.5 Toggle Driver Online

Method:

- `POST`

URL:

```text
{{baseUrl}}/api/drivers/toggle-status
```

Headers:

```text
Authorization: Bearer {{driver1Token}}
Content-Type: application/json
```

Body:

```json
{
  "status": "online"
}
```

Lam y chang cho 3 driver.

Muc dich:

- tao `supply`
- driver-service se cap nhat count ve pricing-service

## 7.6 Xac nhan driver online

Method:

- `GET`

URL:

```text
{{baseUrl}}/api/drivers/online/list?lat=10.7626&lng=106.6823&radius=5
```

Headers:

```text
Authorization: Bearer {{customerToken}}
```

Neu co driver tra ve, coi nhu setup supply da co.

## 8. Cac request Postman dung de test surge

## 8.1 Get Surge By Zone

Method:

- `GET`

URL:

```text
{{baseUrl}}/api/pricing/surge/{{surgeZone}}
```

Headers:

```text
Authorization: Bearer {{customerToken}}
```

Tests:

```javascript
const res = pm.response.json();
const data = res.data || {};

if (data.multiplier !== undefined) {
  pm.environment.set("surgeMultiplier", data.multiplier);
}

if (data.modelVersion) {
  pm.environment.set("modelVersion", data.modelVersion);
}

if (data.source) {
  pm.environment.set("surgeSource", data.source);
}
```

## 8.2 Estimate Fare

Method:

- `POST`

URL:

```text
{{baseUrl}}/api/pricing/estimate
```

Headers:

```text
Authorization: Bearer {{customerToken}}
Content-Type: application/json
```

Body:

```json
{
  "pickupLocation": {
    "lat": 10.7626,
    "lng": 106.6823,
    "address": "Quan 5"
  },
  "dropoffLocation": {
    "lat": 10.7769,
    "lng": 106.7009,
    "address": "Quan 2"
  },
  "vehicleType": "car_4",
  "paymentMethod": "cash",
  "distance": 5.2,
  "duration": 15
}
```

Tab `Tests`:

```javascript
const res = pm.response.json();
const data = res.data || {};

if (data.estimatedFare !== undefined) {
  pm.environment.set("estimatedFare", data.estimatedFare);
}

if (data.surgeMultiplier !== undefined) {
  pm.environment.set("surgeMultiplier", data.surgeMultiplier);
}

if (data.modelVersion) {
  pm.environment.set("modelVersion", data.modelVersion);
}

if (data.surgeSource) {
  pm.environment.set("surgeSource", data.surgeSource);
}
```

## 8.3 Create Booking

Method:

- `POST`

URL:

```text
{{baseUrl}}/api/bookings
```

Headers:

```text
Authorization: Bearer {{customerToken}}
Content-Type: application/json
```

Body:

```json
{
  "pickupLocation": {
    "lat": 10.7626,
    "lng": 106.6823,
    "address": "Quan 5"
  },
  "dropoffLocation": {
    "lat": 10.7769,
    "lng": 106.7009,
    "address": "Quan 2"
  },
  "vehicleType": "car_4",
  "paymentMethod": "cash",
  "distance": 5.2,
  "duration": 15
}
```

Tests:

```javascript
const res = pm.response.json();
if (res.data && res.data.id) {
  pm.environment.set("bookingId", res.data.id);
}
```

## 8.4 Cancel Booking

Method:

- `PATCH` hoac `POST` tuy route hien tai cua booking-service trong repo cua ban

Ban can dung dung route booking cancel dang co trong project.
Neu route qua gateway cua ban la dang:

```text
{{baseUrl}}/api/bookings/{{bookingId}}/cancel
```

thi body:

```json
{
  "reason": "Test cancel for surge"
}
```

Muc dich:

- giam `demand`

## 9. Test backward compatibility

Day la phan de tra loi cau:

- tinh nang moi co lam hu code cu khong

## TC-BC-01: Estimate cu van chay

### Buoc lam

1. Login customer
2. Goi `Estimate Fare`

### PASS khi

- response `success = true`
- van co `estimatedFare`
- van co `currency`
- van co `total`

### Chung cu moi them

Dong thoi phai thay:

- `surgeMultiplier`
- `modelVersion`
- `surgeSource`

### Ket luan

Neu request estimate cu van chay, thi tinh nang moi khong pha estimate flow.

## TC-BC-02: Booking cu van tao duoc

### Buoc lam

1. Goi `Create Booking`

### PASS khi

- response `success = true`
- co `bookingId`
- booking khong fail vi pricing sync hay surge sync

### Ket luan

Neu booking van tao duoc, thi demand tracking moi khong lam vo flow tao booking.

## 10. Test Phase 1 demand tracking

## TC-P1-01: Tao booking lam tang demand

### Muc tieu

Kiem tra `booking-service` co day demand sang `pricing-service` khong.

### Buoc lam

1. Goi `Get Surge By Zone` va ghi lai `multiplier` hien tai
2. Goi `Create Booking`
3. Cho 2-5 giay
4. Goi `Get Surge By Zone` lai

### PASS khi

Mot trong 2 truong hop sau:

- `multiplier` tang len
- hoac `multiplier` chua tang nhung `modelVersion/source` la live logic moi, khong phai gia tri DB cu

### Ghi chu

Demand tang 1 lan co the chua du lam multiplier nhay manh.
Vi vay nen lap 3-5 booking de nhin ro hon.

## TC-P1-02: Huy booking lam giam demand

### Buoc lam

1. Tao 1 booking
2. Ghi lai `bookingId`
3. Huy booking do
4. Goi `Get Surge By Zone` lai

### PASS khi

- surge khong tang vo ly sau khi da giam demand
- neu truoc do demand cao, multiplier co xu huong giam hoac on dinh hop ly

## TC-P1-03: Surge khong bao gio duoi 1.0

### Buoc lam

1. Goi `Get Surge By Zone`
2. Goi `Estimate Fare`

### PASS khi

- `multiplier >= 1.0`
- `surgeMultiplier >= 1.0`

Neu thap hon 1.0 thi sai logic pricing.

## 11. Test Phase 1 pricing behavior

## TC-P1-04: Demand tang thi gia estimate tang

### Muc tieu

Kiem tra surge that su anh huong len gia, khong chi thay doi tren endpoint `/surge`.

### Buoc lam

1. Goi `Estimate Fare` lan 1
2. Ghi lai:
   - `estimatedFare`
   - `surgeMultiplier`
3. Tao them nhieu booking cung zone
4. Goi `Estimate Fare` lan 2

### PASS khi

- `surgeMultiplier` lan 2 >= lan 1
- `estimatedFare` lan 2 >= lan 1

### FAIL khi

- surge endpoint tang
- nhung estimate fare khong doi

Khi do co the pricing dang doc sai source.

## 12. Test Phase 2 AI surge

## TC-P2-01: Estimate co model/source AI

### Dieu kien

`ai-platform` dang chay

### Buoc lam

1. Goi `Estimate Fare`
2. Xem response

### PASS khi

- `success = true`
- co `modelVersion`
- co `surgeSource`
- `surgeSource` phan anh duoc Phase 2

Vi du chap nhan:

- `phase2-ai-platform`

### Khong nen ket luan sai

Neu chi thay `surgeMultiplier` ma khong thay `source/modelVersion`, chua du de noi dang dung AI.

## TC-P2-02: GET surge tra metadata AI

### Buoc lam

1. Goi `Get Surge By Zone`

### PASS khi

- co `multiplier`
- co `modelVersion`
- co `source`

Neu `source` = AI hoac fallback tu AI thi cung la bang chung he thong dang dung logic moi.

## 13. Test fallback khi AI loi

## TC-FB-01: AI down nhung estimate van chay

### Cach test

1. Tam dung container `cab_ai_platform`
2. Quay lai Postman
3. Goi `Estimate Fare`

### PASS khi

- request van `success = true`
- van co `estimatedFare`
- van co `surgeMultiplier`
- `surgeSource` chuyen ve fallback

Vi du co the thay:

- `phase2-fallback-to-phase1`
- hoac nguon fallback tuong duong

### FAIL khi

- `ai-platform` down la estimate chet theo

## TC-FB-02: GET surge van tra multiplier khi AI down

### Buoc lam

1. Khi `ai-platform` dang down
2. Goi `Get Surge By Zone`

### PASS khi

- van tra `multiplier`
- van co `source`
- system khong sap

## 14. Test khong pha logic cu

## TC-REG-01: Create booking nhieu lan khong vo flow

### Buoc lam

1. Tao 3 booking lien tiep
2. Kiem tra ca 3 deu tao duoc

### PASS khi

- khong co booking nao fail vi demand sync
- response booking van format nhu cu

## TC-REG-02: Driver online khong lam loi pricing

### Buoc lam

1. Cho driver online
2. Goi `Estimate Fare`
3. Goi `Get Surge By Zone`

### PASS khi

- khong loi
- surge van doc duoc

## 15. Mau viet ket qua testcase

## Mau 1 - Backward compatibility pass

```text
TC-BC-01 - PASS

Bang chung:
- POST /api/pricing/estimate tra success = true
- Van co estimatedFare, total, currency
- Co them surgeMultiplier, modelVersion, surgeSource

Ket luan:
- Tinh nang surge moi khong pha estimate flow cu
```

## Mau 2 - Phase 1 pass

```text
TC-P1-04 - PASS

Bang chung:
- Estimate lan 1: surgeMultiplier = 1.0, estimatedFare = 51000
- Tao them 4 booking trong cung zone CENTER
- Estimate lan 2: surgeMultiplier = 1.3, estimatedFare = 66300

Ket luan:
- Demand tang lam surge tang va gia estimate tang theo
```

## Mau 3 - Phase 2 pass

```text
TC-P2-01 - PASS

Bang chung:
- Estimate response co modelVersion
- surgeSource = phase2-ai-platform

Ket luan:
- Pricing dang doc surge tu AI layer
```

## Mau 4 - Fallback pass

```text
TC-FB-01 - PASS

Bang chung:
- Da dung ai-platform
- POST /api/pricing/estimate van tra success = true
- Co surgeMultiplier
- surgeSource = phase2-fallback-to-phase1

Ket luan:
- AI loi nhung pricing van song nho fallback
```

## 16. Neu test that ky thi nen chup gi

Moi case nen chup:

- URL request
- body request
- response `Pretty`
- cac field:
  - `estimatedFare`
  - `surgeMultiplier`
  - `modelVersion`
  - `surgeSource`
  - `bookingId`

Neu can bao cao dep:

- chup `Get Surge By Zone` truoc va sau khi tao booking
- chup `Estimate Fare` truoc va sau khi demand tang

## 17. Thu tu test de khuyen nghi

Lam theo thu tu nay de de theo doi:

1. setup account va token
2. cho driver online
3. test `estimate` cu van chay
4. test `create booking` cu van chay
5. test `Get Surge By Zone`
6. tao them booking de tang demand
7. test `estimate` lai
8. test `Phase 2`
9. tat `ai-platform`
10. test fallback

## 18. Ket luan

Neu test dung theo file nay, ban se tra loi duoc day du:

- code cu co bi vo hay khong
- demand co duoc day sang pricing hay khong
- surge co thay doi theo load hay khong
- gia co doi theo surge hay khong
- AI co duoc dung khong
- AI loi thi fallback co song khong

Neu ban muon, buoc tiep theo minh co the lam them:

- viet san bo `Postman Tests` script cho tung request
- hoac tao hẳn file `Postman collection JSON` de import vao Postman chay luon
