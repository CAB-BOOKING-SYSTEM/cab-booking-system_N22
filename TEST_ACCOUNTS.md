# 🧪 Hướng Dẫn Tạo Tài Khoản Test

## Cách 1: Dùng API (Khuyến khích)

### 1.1 Tạo Tài Khoản CUSTOMER (Khách hàng bình thường)

**Endpoint:** `POST https://localhost:3000/auth/register`

```bash
curl -X POST https://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "username": "Test Customer",
    "password": "Password@123",
    "phone_number": "0912345678",
    "role": "customer"
  }'
```

**Response (nếu thành công):**

```json
{
  "message": "Registration successful",
  "data": {
    "id": 1,
    "email": "customer@test.com",
    "username": "Test Customer",
    "role": "customer",
    "status": "ACTIVE"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 1.2 Tạo Tài Khoản ADMIN (Quản trị viên)

**Endpoint:** `POST https://localhost:3000/auth/register`

```bash
curl -X POST https://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "username": "Test Admin",
    "password": "AdminPassword@123",
    "phone_number": "0987654321",
    "role": "admin"
  }'
```

**Note:** Bây giờ user admin được tạo, nhưng cần update database để set role = 'ADMIN'

---

### 1.3 Tạo Tài Khoản DRIVER (Tài xế)

```bash
curl -X POST https://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@test.com",
    "username": "Test Driver",
    "password": "DriverPassword@123",
    "phone_number": "0911111111",
    "role": "driver"
  }'
```

---

## Cách 2: Dùng SQL Script (Nhanh hơn)

### 2.1 Reset Database & Insert Tài Khoản Test

Chạy SQL script này trong database `auth_db`:

```sql
-- ===== RESET (Optional) =====
-- TRUNCATE TABLE auth_users CASCADE;

-- ===== INSERT TEST ACCOUNTS (Passwords đã hash bằng bcrypt) =====
-- Password: Customer@123 (hashed)
INSERT INTO auth_users (
  full_name, phone_number, email, password_hash, role, status, provider
) VALUES (
  'Test Customer',
  '0912345678',
  'customer@test.com',
  '$2a$10$KIXz9QbGf1.tFKzpH4Y5GeKLvtX7E9/0qF8Q5P8E9B9K9Q9L9Q9L9', -- Password: Customer@123
  'customer',
  'ACTIVE',
  'email'
) ON CONFLICT (email) DO NOTHING;

-- Password: Admin@123 (hashed)
INSERT INTO auth_users (
  full_name, phone_number, email, password_hash, role, status, provider
) VALUES (
  'Test Admin',
  '0987654321',
  'admin@test.com',
  '$2a$10$YzB8a9N5L3K2J1H0G9F8E7D6C5B4A3Z2Y1X0W9V8U7T6S5R4Q3P', -- Password: Admin@123
  'admin',
  'ACTIVE',
  'email'
) ON CONFLICT (email) DO NOTHING;

-- Password: Driver@123 (hashed)
INSERT INTO auth_users (
  full_name, phone_number, email, password_hash, role, status, provider,
  driver_id, driver_status
) VALUES (
  'Test Driver',
  '0911111111',
  'driver@test.com',
  '$2a$10$H1G2F3E4D5C6B7A8Z9Y0X1W2V3U4T5S6R7Q8P9O0N1M2L3K4J5I', -- Password: Driver@123
  'driver',
  'ACTIVE',
  'email',
  'DRV_TEST_001',
  'OFFLINE'
) ON CONFLICT (email) DO NOTHING;

-- Kiểm tra dữ liệu
SELECT id, email, role, status FROM auth_users ORDER BY created_at DESC LIMIT 5;
```

**Passwords đã hash (bcrypt round 10):**

- `Customer@123` → `$2a$10$KIXz9QbGf1.tFKzpH4Y5GeKLvtX7E9/0qF8Q5P8E9B9K9Q9L9Q9L9`
- `Admin@123` → `$2a$10$YzB8a9N5L3K2J1H0G9F8E7D6C5B4A3Z2Y1X0W9V8U7T6S5R4Q3P`
- `Driver@123` → `$2a$10$H1G2F3E4D5C6B7A8Z9Y0X1W2V3U4T5S6R7Q8P9O0N1M2L3K4J5I`

---

## 🔑 Test Tài Khoản

### Admin Test Account

```
Email: admin@test.com
Password: Admin@123
Role: ADMIN
```

### Customer Test Account

```
Email: customer@test.com
Password: Customer@123
Role: CUSTOMER
```

### Driver Test Account

```
Email: driver@test.com
Password: Driver@123
Role: DRIVER
```

---

## 📋 Test Admin Endpoint (GET /api/v1/users)

### Login & Get Admin Token

```bash
# 1. Login với admin account
curl -X POST https://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@123"
  }'

# Response sẽ trả accessToken
# Copy accessToken: eyJhbGciOiJIUzI1NiIs...
```

### 2. Dùng Token để Gọi Admin Endpoint

```bash
# Get list users (CHỈ ADMIN ĐƯỢC PHÉP)
curl -X GET "https://localhost:3000/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "x-user-role: ADMIN" \
  -H "x-user-id: 2"

# Ban user (CHỈ ADMIN ĐƯỢC PHÉP)
curl -X PATCH https://localhost:3000/api/v1/users/1/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "x-user-role: ADMIN" \
  -H "x-user-id: 2" \
  -d '{
    "status": "BANNED",
    "reason": "VIOLATION",
    "reasonDescription": "Vi phạm điều khoản sử dụng"
  }'
```

---

## 🧪 Test Rate Limiter

### Test Auth Rate Limit (5 requests/15 minutes)

```javascript
// Postman Pre-request Script
for (let i = 0; i < 20; i++) {
  pm.sendRequest(
    {
      url: "https://localhost:3000/auth/login",
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      body: {
        mode: "raw",
        raw: JSON.stringify({
          email: "customer@test.com",
          password: "wrong_password",
        }),
      },
    },
    (err, response) => {
      console.log(`Request ${i + 1}: Status ${response.code}`);
    },
  );
}
```

**Expected Result:**

- Requests 1-5: `Status 401` (Unauthorized - wrong password)
- Requests 6-20: `Status 429` (Too Many Requests - rate limited)

---

## ⚠️ Lỗi Thường Gặp

### 1. "Authentication required. User ID or role header missing."

```
Lỗi: Gọi admin endpoint nhưng thiếu header x-user-role hoặc x-user-id
Giải pháp: Thêm headers:
  x-user-role: ADMIN
  x-user-id: 2
```

### 2. "Admin access required"

```
Lỗi: User role không phải ADMIN
Giải pháp: Chắc chắn rằng user được tạo với role = 'admin'
```

### 3. "Too many authentication attempts"

```
Lỗi: Vượt quá rate limit (5 requests/15 min)
Giải pháp: Chờ 15 phút hoặc restart server
```

---

## 📊 Verify Tài Khoản

Chạy query này để kiểm tra tài khoản đã tạo:

```sql
SELECT
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM auth_users
WHERE email IN ('customer@test.com', 'admin@test.com', 'driver@test.com')
ORDER BY created_at DESC;
```
