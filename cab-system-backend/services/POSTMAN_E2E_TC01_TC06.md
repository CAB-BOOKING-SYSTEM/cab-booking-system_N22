### [TC-01] Đăng ký khách hàng trả về user hợp lệ (Level 1)
**Method:** `POST`
**URL:** `{{base_url}}/auth/register`
**Headers:**
- Content-Type: application/json

**Pre-request Script:**
```javascript
const ts = Date.now();
pm.environment.set('customer_email', `e2e.customer.${ts}@mail.com`);
pm.environment.set('customer_username', `e2e_customer_${ts}`);
pm.environment.set('customer_password', 'P@ssw0rd123!');
```

**Body:**
```json
{
  "email": "{{customer_email}}",
  "username": "{{customer_username}}",
  "password": "{{customer_password}}",
  "role": "customer"
}
```

**Tests Script:**
```javascript
pm.test('Status code is 201', function () {
  pm.response.to.have.status(201);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Response has user.id/email/role', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('user');
  pm.expect(jsonData.user).to.have.property('id');
  pm.expect(jsonData.user).to.have.property('email');
  pm.expect(jsonData.user).to.have.property('role');
  pm.environment.set('user_id', jsonData.user.id);
});
```

### [TC-02] Đăng nhập trả JWT hợp lệ (Level 1)
**Method:** `POST`
**URL:** `{{base_url}}/auth/login`
**Headers:**
- Content-Type: application/json

**Body:**
```json
{
  "email": "{{customer_email}}",
  "password": "{{customer_password}}"
}
```

**Tests Script:**
```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Response has accessToken + user', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('accessToken');
  pm.expect(jsonData).to.have.property('user');
  pm.expect(jsonData.user).to.have.property('id');

  pm.environment.set('access_token', jsonData.accessToken);
  pm.environment.set('user_id', jsonData.user.id);
});
```

### [TC-03] Đăng ký tài khoản tài xế để phục vụ luồng ghép chuyến (Level 1)
**Method:** `POST`
**URL:** `{{base_url}}/api/drivers/register`
**Headers:**
- Content-Type: application/json
- Authorization: Bearer {{access_token}}

**Pre-request Script:**
```javascript
const ts = Date.now();
pm.environment.set('driver_phone', `090${String(ts).slice(-7)}`);
pm.environment.set('driver_email', `e2e.driver.${ts}@mail.com`);
pm.environment.set('driver_name', `E2E Driver ${ts}`);
pm.environment.set('driver_plate', `51F${String(ts).slice(-5)}`);
```

**Body:**
```json
{
  "phone": "{{driver_phone}}",
  "fullName": "{{driver_name}}",
  "licensePlate": "{{driver_plate}}",
  "vehicleType": "4_seat",
  "email": "{{driver_email}}"
}
```

**Tests Script:**
```javascript
pm.test('Status code is 201', function () {
  pm.response.to.have.status(201);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Response contains driverId', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.have.property('driverId');
  pm.environment.set('driver_id', jsonData.data.driverId);
});
```

### [TC-04] Tài xế chuyển trạng thái Online (Level 1)
**Method:** `POST`
**URL:** `{{base_url}}/api/drivers/{{driver_id}}/toggle-status`
**Headers:**
- Content-Type: application/json
- Authorization: Bearer {{access_token}}

**Body:**
```json
{
  "status": "online"
}
```

**Tests Script:**
```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Driver status is online', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
  pm.expect(jsonData.data).to.have.property('status', 'online');
});
```

### [TC-05] Tạo Booking thành công và lưu booking_id (Level 1 + Idempotency)
**Method:** `POST`
**URL:** `{{base_url}}/api/bookings`
**Headers:**
- Content-Type: application/json
- Authorization: Bearer {{access_token}}
- Idempotency-Key: {{idempotency_key}}

**Pre-request Script:**
```javascript
pm.environment.set('idempotency_key', `idem-${Date.now()}`);
```

**Body:**
```json
{
  "pickupLocation": {
    "lat": 10.7769,
    "lng": 106.7009,
    "address": "Ben Thanh Market, District 1, Ho Chi Minh City",
    "name": "Ben Thanh"
  },
  "dropoffLocation": {
    "lat": 10.7626,
    "lng": 106.6602,
    "address": "Ho Chi Minh University of Technology, District 10",
    "name": "HCMUT"
  },
  "vehicleType": "car_4",
  "paymentMethod": "cash",
  "distance": 7.5,
  "duration": 25
}
```

> Lưu ý mapping `vehicleType` giữa service:
> - driver-service `4_seat`  -> booking-service `car_4`
> - driver-service `7_seat`  -> booking-service `car_7`
> - driver-service `luxury`  -> booking-service **không hỗ trợ trực tiếp** (cần map nghiệp vụ riêng trước khi tạo booking)

**Tests Script:**
```javascript
pm.test('Status code is 201', function () {
  pm.response.to.have.status(201);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Booking created and booking_id extracted', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
  pm.expect(jsonData.data).to.have.property('_id');
  pm.environment.set('booking_id', jsonData.data._id);
});
```

### [TC-06] Lấy danh sách booking của user (Level 1)
**Method:** `GET`
**URL:** `{{base_url}}/api/bookings?page=1&limit=10`
**Headers:**
- Content-Type: application/json
- Authorization: Bearer {{access_token}}

**Tests Script:**
```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response time < 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test('Booking list contains created booking', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.eql(true);
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.be.an('array');

  const createdBookingId = pm.environment.get('booking_id');
  if (createdBookingId) {
    const found = jsonData.data.some(item => item._id === createdBookingId);
    pm.expect(found, 'Created booking should appear in listing').to.eql(true);
  }
});
```
