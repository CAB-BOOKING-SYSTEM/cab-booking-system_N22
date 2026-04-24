# 🔐 Security Test Cases

## 81. SQL Injection Attempt

**Mục đích:** Kiểm tra API có bị bypass bằng SQL Injection không

POST http://localhost:3000/auth/login  
Content-Type: application/json

```json
{
  "email": "\" OR 1=1 --",
  "password": "anything"
}
```

Expected:

```json
{
  "message": "Invalid credentials"
}
```

---

## 82. XSS Input Test

**Mục đích:** Kiểm tra API có lưu/hiển thị script không an toàn

POST http://localhost:3000/api/v1/users  
Authorization: Bearer YOUR_TOKEN

```json
{
  "full_name": "<script>alert(\"hack\")</script>",
  "phone_number": "0901234567",
  "email": "test@example.com"
}
```

Expected:

```json
{
  "success": false,
  "error": "Invalid characters detected in full_name (XSS attempt blocked)"
}
```

---

## 83. JWT Tampering

**Mục đích:** Kiểm tra API có verify signature của JWT không

Steps:

1. Login lấy token
2. Decode payload
3. Sửa role thành admin
4. Gửi lại request

Expected:

```json
{
  "message": "Invalid token"
}
```

---

## 84. Unauthorized API Access

GET http://localhost:3000/api/v1/users

Expected:

```json
{
  "message": "Unauthorized: No token provided"
}
```

---

## 85. Rate Limit Attack

```javascript
for (let i = 0; i < 20; i++) {
  pm.sendRequest({
    url: "http://localhost:3000/auth/login",
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    body: {
      mode: "raw",
      raw: JSON.stringify({
        email: "user@example.com",
        password: "wrong",
      }),
    },
  });
}
```

Expected:
HTTP 429 Too Many Requests

---

## 86. Replay Attack

POST http://localhost:3000/api/payments

```json
{
  "user_id": "USR123",
  "amount": 50000
}
```

Expected:

- Lần 1: success
- Lần 2: duplicate bị chặn

---

## 87. Data Encryption at Rest

```bash
docker exec cab_postgres psql -U admin -d payment_db -c "SELECT card_number FROM payments LIMIT 1;"
```

Expected:

- Không thấy plaintext

---

## 88. RBAC Enforcement

Test user thường gọi API admin

Expected:

```json
{
  "message": "Forbidden: Access denied"
}
```

---

## 89. Sensitive Data Masking

GET http://localhost:3000/api/v1/users/3

Expected:

```json
{
  "phone_number": "090***670",
  "email": "n***@example.com"
}
```
