# 🚀 User Service API - Postman Test

Tài liệu này mô tả các API liên quan đến quản lý người dùng trong hệ thống.

---

## 📑 Table of Contents

1. [Create User](#1-create-user)
2. [Login](#2-login)
3. [Create User (User Service)](#3-create-user-user-service)
4. [Get Profile](#4-get-profile)
5. [Update Profile](#5-update-profile)
6. [Add Location](#6-add-location)
7. [Get Locations](#7-get-locations)
8. [Delete Location](#8-delete-location)
9. [Ban/Unban User](#9-banunban-user)
10. [Get Users (Admin)](#10-get-users-admin)

---

## 1. Create User

### 📌 Endpoint

```http
POST http://localhost:3000/auth/register
```

### 🧾 Request Body

```json
{
  "email": "user@test.com",
  "password": "123456",
  "username": "Test User",
  "role": "customer"
}
```

### ✅ Response

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@test.com",
    "role": "customer"
  }
}
```

---

## 2. Login

### 📌 Endpoint

```http
POST http://localhost:3000/auth/login
```

### 📌 Headers

```
Content-Type: application/json
```

### 🧾 Request Body

```json
{
  "email": "user@test.com",
  "password": "123456"
}
```

### ✅ Response

```json
{
  "message": "Login successful",
  "accessToken": "YOUR_ACCESS_TOKEN",
  "user": {
    "id": 1,
    "email": "user@test.com",
    "username": "Test User",
    "role": "customer"
  }
}
```

---

## 3. Create User (User Service)

### 📌 Endpoint

```http
POST http://localhost:3000/api/v1/users
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 🧾 Request Body

```json
{
  "full_name": "Nguyễn Văn A",
  "phone_number": "0901234567",
  "email": "nguyenvana@example.com",
  "role": "RIDER"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nguyễn Văn A",
    "phone_number": "0901234567",
    "email": "nguyenvana@example.com",
    "role": "RIDER",
    "status": "ACTIVE",
    "created_at": "2026-04-24T06:26:48.156Z"
  }
}
```

---

## 4. Get Profile

### 📌 Endpoint

```http
GET http://localhost:3000/api/v1/users/1
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nguyễn Văn A",
    "phone_number": "090***_567",
    "email": "n***@example.com",
    "role": "RIDER",
    "status": "ACTIVE",
    "created_at": "2026-04-24T06:26:48.156Z",
    "updated_at": "2026-04-24T06:26:48.156Z"
  }
}
```

---

## 5. Update Profile

### 📌 Endpoint

```http
PATCH http://localhost:3000/api/v1/users/1
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### 🧾 Request Body

```json
{
  "full_name": "Nguyễn Văn A Updated",
  "email": "updated@example.com"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nguyễn Văn A Updated",
    "phone_number": "0901234567",
    "email": "updated@example.com",
    "role": "RIDER",
    "status": "ACTIVE",
    "created_at": "2026-04-24T06:26:48.156Z",
    "updated_at": "2026-04-24T06:32:30.944Z"
  },
  "audit": {
    "previousValues": {
      "full_name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com"
    },
    "newValues": {
      "full_name": "Nguyễn Văn A Updated",
      "email": "updated@example.com"
    }
  }
}
```

---

## 6. Add Location

### 📌 Endpoint

```http
POST http://localhost:3000/api/v1/users/1/locations
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### 🧾 Request Body

```json
{
  "label": "Nhà riêng",
  "address": "123 Đường ABC, Hà Nội",
  "lat": 21.0285,
  "lng": 105.8542
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "label": "Nhà riêng",
    "address": "123 Đường ABC, Hà Nội",
    "lat": "21.02850000",
    "lng": "105.85420000",
    "created_at": "2026-04-24T06:34:08.328Z"
  }
}
```

---

## 7. Get Locations

### 📌 Endpoint

```http
GET http://localhost:3000/api/v1/users/1/locations
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### ✅ Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "label": "Nhà riêng",
      "address": "123 Đường ABC, Hà Nội",
      "lat": "21.02850000",
      "lng": "105.85420000",
      "created_at": "2026-04-24T06:34:08.328Z"
    }
  ],
  "count": 1
}
```

---

## 8. Delete Location

### 📌 Endpoint

```http
DELETE http://localhost:3000/api/v1/users/1/locations/1
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### ✅ Response

```json
{
  "success": true,
  "message": "Location deleted",
  "data": {
    "id": 1,
    "user_id": 1,
    "label": "Nhà riêng",
    "address": "123 Đường ABC, Hà Nội",
    "lat": "21.02850000",
    "lng": "105.85420000",
    "created_at": "2026-04-24T06:34:08.328Z"
  }
}
```

---

## 9. Ban/Unban User

### 📌 Endpoint

```http
PATCH http://localhost:3000/api/v1/users/1/ban
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### 🧾 Request Body

```json
{
  "status": "BANNED",
  "reason": "VIOLATION",
  "reasonDescription": "Vi phạm điều khoản dịch vụ"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Nguyễn Văn A Updated",
    "phone_number": "0901234567",
    "email": "updated@example.com",
    "role": "RIDER",
    "status": "BANNED",
    "created_at": "2026-04-24T06:26:48.156Z",
    "updated_at": "2026-04-24T06:39:54.866Z"
  },
  "message": "User account banned"
}
```

---

## 10. Get Users (Admin)

### 📌 Endpoint

```http
GET http://localhost:3000/api/v1/users?page=1&limit=10&status=ACTIVE&role=RIDER
```

### 📌 Headers

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### ✅ Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total_items": 0,
    "total_pages": 0,
    "current_page": 1,
    "limit": 10
  }
}
```
