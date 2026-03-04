# 🔔 Notification Service

Microservice chịu trách nhiệm **nhận event từ Kafka**, **lưu lịch sử thông báo vào MongoDB** và **phân phối thông báo real-time** đến người dùng qua **Socket.IO** (khi online) hoặc **Firebase Cloud Messaging – FCM** (khi offline).

---

## 📑 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc](#-kiến-trúc)
- [Luồng xử lý](#-luồng-xử-lý)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Kafka Topics](#-kafka-topics)
- [REST API](#-rest-api)
- [Socket.IO Events](#-socketio-events)
- [Prometheus Metrics](#-prometheus-metrics)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Biến môi trường](#-biến-môi-trường)
- [Docker](#-docker)
- [Monitoring](#-monitoring)

---

## 📌 Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| **Port mặc định** | `3004` |
| **Protocol** | REST HTTP + WebSocket (Socket.IO) |
| **Message Broker** | Apache Kafka |
| **Database** | MongoDB (MongoDB Atlas) |
| **Push Notification** | Firebase Cloud Messaging (FCM) |
| **Metrics** | Prometheus + Grafana |

---

## 🏗️ Kiến trúc

Service được tổ chức theo **3 tầng tách biệt rõ ràng**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INPUTS                            │
│         Kafka Events          │        HTTP REST Requests       │
└──────────────┬────────────────┴────────────┬────────────────────┘
               │                             │
       ┌───────▼──────────┐       ┌──────────▼──────────┐
       │  Kafka Consumer  │       │  REST Controller     │
       │  (consumer.js)   │       │  (notification.      │
       │                  │       │   controller.js)     │
       │ - Parse JSON      │       │ - Đọc params/query  │
       │ - Validate Schema │       │ - Gọi Service       │
       └───────┬──────────┘       └──────────┬──────────┘
               │                             │
               └──────────────┬──────────────┘
                              │
                   ┌──────────▼──────────────┐
                   │   Business Logic Layer   │
                   │  (notificationCore.      │
                   │   service.js)            │
                   │                          │
                   │ - Idempotency check      │
                   │ - Build nội dung          │
                   │ - Lưu MongoDB            │
                   │ - Quyết định kênh gửi    │
                   └──────────┬───────────────┘
                              │
               ┌──────────────┼──────────────────┐
               │              │                  │
       ┌───────▼──────┐ ┌─────▼──────┐  ┌───────▼──────┐
       │  MongoDB      │ │ Socket.IO  │  │    FCM       │
       │  (lưu lịch sử)│ │ (online)   │  │  (offline)   │
       └───────────────┘ └────────────┘  └──────────────┘
```

---

## 🔄 Luồng xử lý

Khi có Kafka event mới:

```
Kafka Event
    │
    ▼
1. Parse JSON  ──── lỗi ──→  bỏ qua (log error)
    │
    ▼
2. Validate Schema  ──── không hợp lệ ──→  bỏ qua (log warning)
    │
    ▼
3. Idempotency Check (sourceEventId)  ──── trùng ──→  bỏ qua (log + metric)
    │
    ▼
4. Build nội dung thông báo (title + body)
    │
    ▼
5. Lưu vào MongoDB  [status = "pending"]
    │
    ▼
6. Thử gửi qua Socket.IO
    ├── User ONLINE  →  gửi thành công  →  status = "sent", deliveryMethod = "in_app_socket"  ✅
    │
    └── User OFFLINE  →  fallback FCM
            ├── FCM thành công  →  status = "sent", deliveryMethod = "push_fcm"  ✅
            └── FCM thất bại    →  status = "failed", ghi lỗi vào retryHistory  ❌
```

---

## 🛠️ Công nghệ sử dụng

| Package | Phiên bản | Mục đích |
|---|---|---|
| `express` | ^5.2.1 | HTTP REST API framework |
| `socket.io` | ^4.8.3 | Real-time WebSocket server |
| `kafkajs` | ^2.2.4 | Kafka consumer |
| `mongoose` | ^9.1.5 | MongoDB ODM |
| `firebase-admin` | ^13.7.0 | Firebase Cloud Messaging (Push Notification) |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `morgan` | ^1.10.1 | HTTP request logger |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^17.2.3 | Quản lý biến môi trường |

---

## 📁 Cấu trúc thư mục

```
notification-service/
├── index.js                        # Entry point — Bootstrap server
├── package.json
├── Dockerfile
├── docker-compose.yml              # Dev stack (Kafka + Redis + Service)
├── docker-stack.yml                # Production Docker Swarm stack
│
├── src/
│   ├── controllers/
│   │   └── notification.controller.js   # Tầng HTTP Controller
│   │
│   ├── services/
│   │   ├── notificationCore.service.js  # Business Logic chính
│   │   └── fcm.service.js               # Giao tiếp Firebase FCM
│   │
│   ├── kafka/
│   │   └── consumer.js                  # Kafka Infrastructure layer
│   │
│   ├── socket/
│   │   └── socketHandler.js             # Socket.IO server & user map
│   │
│   ├── models/
│   │   └── notification.model.js        # Mongoose Schema & Model
│   │
│   ├── routes/
│   │   └── notification.routes.js       # Định nghĩa REST routes
│   │
│   ├── metrics/
│   │   └── prometheus.js                # Prometheus metrics registry
│   │
│   ├── schemas/
│   │   └── events/
│   │       ├── rideAssigned.schema.js       # Validator cho ride.assigned
│   │       ├── paymentCompleted.schema.js   # Validator cho payment.completed
│   │       └── paymentFailed.schema.js      # Validator cho payment.failed
│   │
│   └── firebase/
│       └── fcmService.js
│
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/
│       └── provisioning/
│           ├── dashboards/
│           └── datasources/
│
└── postman/
    └── notification-service.postman_collection.json
```

---

## 📨 Kafka Topics

Service **subscribe** các topics sau:

| Topic | Loại thông báo | Người nhận | Kích hoạt bởi |
|---|---|---|---|
| `ride.assigned` | `RideAssigned` | **Customer** | Ride Service (khi tài xế được phân công) |
| `payment.completed` | `PaymentCompleted` | **Customer / Driver** | Payment Service (thanh toán thành công) |
| `payment.failed` | `PaymentFailed` | **Customer** | Payment Service (thanh toán thất bại) |

### Ví dụ payload `ride.assigned`

```json
{
  "eventId": "evt_001",
  "customerId": "cust_556677",
  "rideId": "ride_abc123",
  "driverInfo": {
    "name": "Nguyễn Văn A",
    "vehicle": "Toyota Vios",
    "plateNumber": "51F-12345"
  },
  "etaMinutes": 5
}
```

### Ví dụ payload `payment.completed`

```json
{
  "eventId": "evt_002",
  "userId": "cust_556677",
  "userRole": "customer",
  "rideId": "ride_abc123",
  "amount": 75000,
  "currency": "VND",
  "paymentMethod": "Momo",
  "transactionId": "txn_xyz789"
}
```

### Ví dụ payload `payment.failed`

```json
{
  "eventId": "evt_003",
  "userId": "cust_556677",
  "rideId": "ride_abc123",
  "amount": 75000,
  "currency": "VND",
  "reason": "Số dư không đủ"
}
```

---

## 🌐 REST API

Base URL: `http://localhost:3004`

### System Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Service info & trạng thái DB |
| `GET` | `/health` | Health check (DB + socket online count + uptime) |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |

### Notification Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/notifications/:userId` | Lấy danh sách thông báo (có phân trang) |
| `GET` | `/notifications/:userId/unread-count` | Đếm số thông báo chưa đọc (badge count) |
| `PATCH` | `/notifications/:notificationId/read` | Đánh dấu 1 thông báo đã đọc |
| `PATCH` | `/notifications/:userId/read-all` | Đánh dấu tất cả thông báo đã đọc |

---

### Chi tiết từng API

#### `GET /notifications/:userId`

Lấy lịch sử thông báo của user, sắp xếp mới nhất trước, hỗ trợ phân trang.

**Query Parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | number | `1` | Trang hiện tại |
| `limit` | number | `20` | Số bản ghi mỗi trang (max: 100) |

**Response `200`:**
```json
{
  "success": true,
  "data": [ /* mảng notification objects */ ],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

---

#### `GET /notifications/:userId/unread-count`

**Response `200`:**
```json
{
  "success": true,
  "userId": "cust_556677",
  "unreadCount": 3
}
```

---

#### `PATCH /notifications/:notificationId/read`

**Request Body:**
```json
{
  "userId": "cust_556677"
}
```

> `userId` bắt buộc để xác minh quyền sở hữu, tránh lỗ hổng IDOR.

**Response `200`:**
```json
{
  "success": true,
  "data": { /* notification đã được cập nhật */ }
}
```

**Response `404`:** Không tìm thấy hoặc không có quyền truy cập.

---

#### `PATCH /notifications/:userId/read-all`

**Response `200`:**
```json
{
  "success": true,
  "message": "Đã đánh dấu đã đọc 3 thông báo.",
  "modifiedCount": 3
}
```

---

## 🔌 Socket.IO Events

Client kết nối tới: `ws://localhost:3004`

### Client → Server

| Event | Payload | Mô tả |
|---|---|---|
| `register` | `userId: string` | Đăng ký userId sau khi đăng nhập để nhận thông báo |

**Ví dụ (React Native / JavaScript):**
```javascript
const socket = io("http://localhost:3004");

// Gửi register ngay sau khi đăng nhập thành công
socket.emit("register", "cust_556677");
```

### Server → Client

| Event | Payload | Mô tả |
|---|---|---|
| `new_notification` | `NotificationPayload` | Server đẩy thông báo mới khi user đang online |

**Ví dụ payload nhận được:**
```json
{
  "notificationId": "64abc...",
  "type": "RideAssigned",
  "title": "Tài xế đang đến!",
  "body": "Tài xế Nguyễn Văn A đang đến đón bạn bằng xe Toyota Vios — BKS: 51F-12345. ETA: 5 phút.",
  "data": { /* Kafka payload gốc */ }
}
```

**Ví dụ lắng nghe (React Native):**
```javascript
socket.on("new_notification", (notification) => {
  console.log("Thông báo mới:", notification.title);
  // Hiển thị toast / badge count trên UI
});
```

---

## 📊 Prometheus Metrics

Endpoint scrape: `GET /metrics`

| Metric | Type | Labels | Mô tả |
|---|---|---|---|
| `cab_notification_kafka_messages_processed_total` | Counter | `topic`, `status` | Tổng Kafka message đã xử lý |
| `cab_notification_sent_total` | Counter | `type`, `delivery_method` | Tổng thông báo đã gửi |
| `cab_notification_socket_online_users` | Gauge | — | Số user đang kết nối Socket.IO |
| `cab_notification_processing_duration_seconds` | Histogram | `topic` | Latency xử lý từ Kafka đến lưu DB |
| `cab_notification_duplicate_events_total` | Counter | `topic` | Số event trùng bị bỏ qua (idempotency) |

Ngoài ra còn có các **default Node.js metrics** với prefix `cab_notification_` (CPU, memory, event loop, heap, v.v.)

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- Node.js >= 18
- MongoDB Atlas (hoặc MongoDB local)
- Kafka (Confluent Platform hoặc Apache Kafka)
- Firebase project với Service Account key

### Cài đặt dependencies

```bash
cd cab-system-backend/services/notification-service
npm install
```

### Chạy development

```bash
npm run dev     # nodemon — tự reload khi thay đổi code
```

### Chạy production

```bash
npm start       # node index.js
```

---

## ⚙️ Biến môi trường

Tạo file `.env` trong thư mục `notification-service/`:

```env
# ── Server ────────────────────────────────────────────────────────
PORT=3004
NODE_ENV=development

# ── MongoDB ───────────────────────────────────────────────────────
DB_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# ── Kafka ─────────────────────────────────────────────────────────
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true          # false = tắt Kafka, chỉ chạy REST + Socket.IO

# ── Firebase FCM ──────────────────────────────────────────────────
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/cab-booking-firebase-adminsdk.json
FCM_DEV_TEST_TOKEN=          # FCM token thật để test push notification khi dev

# ── CORS ──────────────────────────────────────────────────────────
CORS_ORIGIN=*               # Production: thay bằng domain cụ thể
```

> ⚠️ **Không commit file** `.env` và `cab-booking-firebase-adminsdk.json` lên Git.

### Cấu hình Firebase

1. Vào **Firebase Console** → **Project Settings** → **Service Accounts**
2. Nhấn **"Generate new private key"**
3. Lưu file JSON vào: `src/config/cab-booking-firebase-adminsdk.json`

---

## 🐳 Docker

### Chạy toàn bộ stack với Docker Compose

Stack bao gồm: **Zookeeper + Kafka + Redis + Notification Service**

```bash
cd cab-system-backend/services/notification-service

# Build & start
docker compose up --build -d

# Xem logs
docker compose logs -f notification-service

# Dừng
docker compose down
```

### Ports được expose

| Service | Port |
|---|---|
| Notification Service | `3004` |
| Kafka | `9092` |
| Redis | `6379` |

### Resource limits (mỗi container)

| Limit | Giá trị |
|---|---|
| CPU | 0.5 core |
| Memory | 512 MB |

---

## 📈 Monitoring

### Chạy Prometheus + Grafana

```bash
# Từ thư mục notification-service/
docker compose -f docker-stack.yml up -d
```

| Service | URL |
|---|---|
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |

Grafana dashboard được **provision tự động** từ thư mục `monitoring/grafana/provisioning/`.

---

## 🗄️ MongoDB Schema

Collection: `notifications`

| Field | Type | Mô tả |
|---|---|---|
| `userId` | String | ID người nhận |
| `userRole` | `customer` \| `driver` \| `admin` | Vai trò người nhận |
| `type` | `RideAssigned` \| `PaymentCompleted` \| `PaymentFailed` \| ... | Loại thông báo |
| `title` | String | Tiêu đề (max 255 ký tự) |
| `body` | String | Nội dung (max 2000 ký tự) |
| `payload` | Mixed | Metadata gốc từ Kafka |
| `sourceEventId` | String (unique, sparse) | Kafka eventId — đảm bảo idempotency |
| `status` | `pending` \| `sent` \| `failed` \| `read` | Vòng đời thông báo |
| `deliveryMethod` | Array | Kênh đã gửi: `in_app_socket`, `push_fcm` |
| `errorMessage` | String | Lỗi cuối cùng nếu gửi thất bại |
| `retryCount` | Number | Số lần đã retry |
| `retryHistory` | Array | Chi tiết lỗi từng lần retry |
| `readAt` | Date | Thời điểm user đọc |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — query lịch sử thông báo
- `{ userId: 1, status: 1 }` — đếm badge count
- `{ status: 1, retryCount: 1 }` — retry worker quét bản ghi failed

---

## ⚠️ Lưu ý khi Scale-out

> Socket.IO hiện dùng **in-memory Map** để lưu `userId → socket.id`.
> Phù hợp với **1 instance** (dev/staging).
>
> Khi deploy **Docker Swarm / Kubernetes** với nhiều replica, cần thay bằng
> **Redis Adapter** (`socket.io-redis`) để đồng bộ trạng thái giữa các node.

```bash
npm install @socket.io/redis-adapter ioredis
```

---

*Notification Service — CAB Booking System · IUH Team N22*
