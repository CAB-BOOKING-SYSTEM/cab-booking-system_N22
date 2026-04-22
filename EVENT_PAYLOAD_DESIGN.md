# Thiết Kế JSON Payload cho Events từ User Service

## Cab Booking System - Event-Driven Architecture

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Event: user.registered](#event-userregistered)
3. [Event: user.profile_updated](#event-userprofile_updated)
4. [Event: user.account_banned](#event-useraccount_banned)
5. [Giải Thích Chi Tiết](#giải-thích-chi-tiết)
6. [Hướng Dẫn Cho Notification Service](#hướng-dẫn-cho-notification-service)
7. [Best Practices](#best-practices)

---

## Tổng Quan

### Nguyên Tắc Thiết Kế

- **Zero Trust Architecture**: Mọi payload phải có thông tin định danh rõ ràng
- **Event-Driven**: Tất cả sử kiện đều qua RabbitMQ
- **camelCase Naming**: Tất cả trường sử dụng chuẩn camelCase
- **ISO 8601 Timestamps**: Все времена в UTC
- **Schema Versioning**: Hỗ trợ tương thích ngược

### Cấu Trúc Chung

```
Trường Chung (Metadata)
├── eventId: UUID duy nhất
├── eventName: Tên sự kiện
├── timestamp: Thời gian ISO 8601
├── sourceService: Service phát ra
├── sourceVersion: Phiên bản service
├── schemaVersion: Phiên bản schema
├── userId: ID người dùng liên quan
└── data: Dữ liệu thực tế
```

---

## 📌 Implementation Status - Events Phát lên RabbitMQ

| Event Name             | API Endpoint            | Method | Trigger                    | Status           |
| ---------------------- | ----------------------- | ------ | -------------------------- | ---------------- |
| `user.registered`      | `/api/v1/users`         | POST   | Người dùng đăng ký mới     | ✅ Sắp implement |
| `user.profile_updated` | `/api/v1/users/:id`     | PATCH  | Cập nhật thông tin cá nhân | ✅ Sắp implement |
| `user.account_banned`  | `/api/v1/users/:id/ban` | PATCH  | Ban/Unban tài khoản        | ✅ Sắp implement |

**Ghi chú:**

- Những event này sẽ được phát lên RabbitMQ exchange: `user.events`
- Routing key: `user.{action}` (ví dụ: `user.registered`, `user.profile_updated`)
- Notification Service sẽ subscribe những event này để gửi email/SMS

---

## Event: user.registered

### Mô Tả

Phát ra khi một người dùng mới đăng ký tài khoản trên hệ thống.

### JSON Payload (Real Test Data)

```json
{
  "eventId": "evt_9022d82d_71ca_4b9a_93ef_e6718ef80454_001",
  "eventName": "user.registered",
  "timestamp": "2026-04-11T20:04:34.584Z",
  "sourceService": "user-service",
  "sourceVersion": "1.0.0",
  "schemaVersion": "1",
  "userId": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
  "data": {
    "userId": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
    "phoneNumber": "88888888",
    "fullName": "Nguyen Thi C",
    "email": "abc@gmail.com",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "registrationAt": "2026-04-11T20:04:34.584Z",
    "ipAddress": "127.0.0.1",
    "deviceId": "device_test_web_browser"
  }
}
```

### Trigger di kích

API: `POST http://localhost:3009/api/v1/users`

**Request Body:**

```json
{
  "full_name": "Nguyen Thi C",
  "phone_number": "88888888",
  "email": "abc@gmail.com",
  "role": "CUSTOMER"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
    "full_name": "Nguyen Thi C",
    "status": "ACTIVE"
  }
}
```

### Use Cases - Notification Service sử dụng:

- ✉️ Gửi email chào mừng thành viên mới
- 📲 Gửi SMS xác nhận đăng ký
- 📊 Log user activity cho analytics
- 🔐 Ghi nhận sự kiện bảo mật

---

## Event: user.profile_updated

### Mô Tả

Phát ra khi người dùng cập nhật thông tin cá nhân (tên, email, địa chỉ, v.v.).

### JSON Payload

```json
{
  "eventId": "evt_550e8400-e29b-41d4-a716-446655440002",
  "eventName": "user.profile_updated",
  "timestamp": "2026-04-12T11:45:30.456Z",
  "sourceService": "user-service",
  "sourceVersion": "1.0.0",
  "schemaVersion": "1",
  "userId": "usr_a887cfc1-535d-41d0-b836-8e6118ba84db",
  "data": {
    "userId": "usr_a887cfc1-535d-41d0-b836-8e6118ba84db",
    "updatedFields": ["fullName", "email"],
    "previousValues": {
      "fullName": "Nguyen Van A",
      "email": "a@gmail.com"
    },
    "newValues": {
      "fullName": "Nguyen Van A Updated",
      "email": "a.updated@gmail.com"
    },
    "phoneNumber": "0912345678",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "updatedAt": "2026-04-12T11:45:30.456Z",
    "updatedBy": "user_self",
    "ipAddress": "192.168.1.100"
  }
}
```

### Use Cases - Notification Service sử dụng:

- ✉️ Gửi email xác nhận cập nhật
- 🔐 Cảnh báo nếu có thay đổi bảo mật (email, v.v.)
- 📝 Lưu audit trail
- 🔄 Cập nhật cache trong các service khác

---

## Event: user.account_banned

### Mô Tả

Phát ra khi tài khoản người dùng bị khóa/ban do vi phạm chính sách hoặc hoạt động nghi ngờ.

### JSON Payload (Real Test Data)

```json
{
  "eventId": "evt_9022d82d_71ca_4b9a_93ef_ban_003",
  "eventName": "user.account_banned",
  "timestamp": "2026-04-12T09:30:10.456Z",
  "sourceService": "user-service",
  "sourceVersion": "1.0.0",
  "schemaVersion": "1",
  "userId": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
  "data": {
    "userId": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
    "phoneNumber": "88888888",
    "fullName": "Đông Cao hahaha",
    "email": "newestemail@gmail.com",
    "role": "CUSTOMER",
    "banReason": "ADMIN_ACTION",
    "banReasonDescription": "Tài khoản đã bị khóa bởi quản trị viên",
    "bannedAt": "2026-04-12T09:30:10.456Z",
    "bannedBy": "admin_system",
    "banDuration": "PERMANENT",
    "banExpiryDate": null,
    "previousStatus": "ACTIVE",
    "newStatus": "BANNED",
    "notificationSent": false,
    "ipAddress": "127.0.0.1"
  }
}
```

### Trigger di kích

API: `PATCH http://localhost:3009/api/v1/users/9022d82d-71ca-4b9a-93ef-e6718ef80454/ban`

**Request Body:**

```json
{
  "status": "BANNED",
  "reason": "ADMIN_ACTION",
  "reasonDescription": "Tài khoản đã bị khóa bởi quản trị viên"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "9022d82d-71ca-4b9a-93ef-e6718ef80454",
    "full_name": "Đông Cao hahaha",
    "phone_number": "88888888",
    "email": "newestemail@gmail.com",
    "role": "CUSTOMER",
    "status": "BANNED",
    "created_at": "2026-04-11T20:04:34.584Z"
  },
  "message": "User account banned"
}
```

### Ban Reasons (Mã Lý Do)

```
- FRAUD_DETECTED: Phát hiện gian lận
- MULTIPLE_FRAUD_REPORTS: Nhiều báo cáo gian lận
- POLICY_VIOLATION: Vi phạm chính sách
- SUSPICIOUS_ACTIVITY: Hoạt động nghi ngờ
- USER_REQUEST: Yêu cầu từ người dùng
- ADMIN_ACTION: Hành động của admin
- PAYMENT_ISSUE: Vấn đề thanh toán
- HARASSMENT_REPORT: Báo cáo qu骚扰
```

### Use Cases - Notification Service sử dụng:

- ⚠️ Gửi thông báo ban account
- ✉️ Gửi email giải thích lý do ban
- 🔔 Cảnh báo admin
- 📊 Log sự kiện bảo mật lên compliance system
- 🧹 Xóa các booking/ride đang hoạt động

---

## Giải Thích Chi Tiết

### Trường Metadata Chung (áp dụng cho tất cả events)

| Trường          | Kiểu     | Yêu Cầu     | Ý Nghĩa                                                        |
| --------------- | -------- | ----------- | -------------------------------------------------------------- |
| `eventId`       | UUID     | ✅ Bắt buộc | ID duy nhất toàn cầu cho event (tránh trùng lặp và retry)      |
| `eventName`     | String   | ✅ Bắt buộc | Tên event theo format: `{entity}.{action}` (dùng cho routing)  |
| `timestamp`     | ISO 8601 | ✅ Bắt buộc | Thời gian event xảy ra (UTC) - để tracking chronological order |
| `sourceService` | String   | ✅ Bắt buộc | Service phát ra event (Zero Trust - xác thực nguồn)            |
| `sourceVersion` | String   | ✅ Bắt buộc | Phiên bản service (debugging version mismatch)                 |
| `schemaVersion` | String   | ✅ Bắt buộc | Phiên bản schema (backwards compatibility)                     |
| `userId`        | UUID     | ✅ Bắt buộc | ID người dùng liên quan (context trực tiếp)                    |
| `data`          | Object   | ✅ Bắt buộc | Dữ liệu chi tiết của event                                     |

### Trường `data` - user.registered

| Trường           | Kiểu     | Yêu Cầu | Ý Nghĩa                               |
| ---------------- | -------- | ------- | ------------------------------------- |
| `userId`         | UUID     | ✅      | ID duy nhất người dùng                |
| `phoneNumber`    | String   | ✅      | Số điện thoại (primary key)           |
| `fullName`       | String   | ✅      | Tên đầy đủ người dùng                 |
| `email`          | String   | ⚠️      | Email (có thể null)                   |
| `role`           | String   | ✅      | Vai trò: CUSTOMER hoặc DRIVER            |
| `status`         | String   | ✅      | Trạng thái: ACTIVE, SUSPENDED, BANNED |
| `registrationAt` | ISO 8601 | ✅      | Thời điểm đăng ký chính xác           |
| `ipAddress`      | String   | ✅      | IP của client (Security audit)        |
| `deviceId`       | String   | ⚠️      | ID thiết bị (device tracking)         |

### Trường `data` - user.profile_updated

| Trường           | Kiểu          | Yêu Cầu | Ý Nghĩa                            |
| ---------------- | ------------- | ------- | ---------------------------------- |
| `userId`         | UUID          | ✅      | ID người dùng                      |
| `updatedFields`  | Array[String] | ✅      | Danh sách trường được thay đổi     |
| `previousValues` | Object        | ✅      | Giá trị cũ (Audit trail - lịch sử) |
| `newValues`      | Object        | ✅      | Giá trị mới                        |
| `phoneNumber`    | String        | ✅      | Số điện thoại (context)            |
| `role`           | String        | ✅      | Vai trò                            |
| `status`         | String        | ✅      | Trạng thái tài khoản               |
| `updatedAt`      | ISO 8601      | ✅      | Thời gian cập nhật                 |
| `updatedBy`      | String        | ✅      | `user_self` hoặc `admin_{adminId}` |
| `ipAddress`      | String        | ✅      | IP gửi request (Security)          |

### Trường `data` - user.account_banned

| Trường                 | Kiểu             | Yêu Cầu | Ý Nghĩa                                |
| ---------------------- | ---------------- | ------- | -------------------------------------- |
| `userId`               | UUID             | ✅      | ID người dùng bị ban                   |
| `phoneNumber`          | String           | ✅      | Số điện thoại (contact)                |
| `fullName`             | String           | ✅      | Tên đầy đủ                             |
| `email`                | String           | ⚠️      | Email (gửi thông báo)                  |
| `role`                 | String           | ✅      | Vai trò tại thời điểm ban              |
| `banReason`            | String           | ✅      | Mã lý do ban (enum)                    |
| `banReasonDescription` | String           | ✅      | Mô tả chi tiết lý do (dùng cho client) |
| `bannedAt`             | ISO 8601         | ✅      | Thời gian ban                          |
| `bannedBy`             | String           | ✅      | `admin_{id}` hoặc `system_auto`        |
| `banDuration`          | String           | ✅      | PERMANENT hoặc TEMPORARY               |
| `banExpiryDate`        | ISO 8601 \| null | ⚠️      | Ngày hết hạn (null nếu vĩnh viễn)      |
| `previousStatus`       | String           | ✅      | Trạng thái trước: ACTIVE, SUSPENDED    |
| `newStatus`            | String           | ✅      | Trạng thái mới: BANNED                 |
| `notificationSent`     | Boolean          | ✅      | Đã gửi thông báo cho user?             |
| `ipAddress`            | String           | ✅      | IP của request ban (audit)             |

---

## Hướng Dẫn Cho Notification Service

### 1. Cấu Hình RabbitMQ Consumer

```javascript
// notification-service/index.js
const amqp = require("amqplib");

async function connectToRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Declare exchange
  await channel.assertExchange("user.events", "topic", { durable: true });

  // Declare queues
  await channel.assertQueue("notification.user.events", { durable: true });

  // Bind queue to exchange
  await channel.bindQueue(
    "notification.user.events",
    "user.events",
    "user.*", // Lắng nghe tất cả user events
  );

  // Consume messages
  channel.consume("notification.user.events", async (msg) => {
    const event = JSON.parse(msg.content.toString());
    await handleEvent(event);
    channel.ack(msg);
  });
}
```

### 2. Handler cho Từng Event Type

```javascript
async function handleEvent(event) {
  switch (event.eventName) {
    case "user.registered":
      await handleUserRegistered(event);
      break;
    case "user.profile_updated":
      await handleProfileUpdated(event);
      break;
    case "user.account_banned":
      await handleAccountBanned(event);
      break;
    default:
      console.log(`Unknown event: ${event.eventName}`);
  }
}

async function handleUserRegistered(event) {
  const { data } = event;

  // Gửi email chào mừng
  await sendEmail({
    to: data.email,
    template: "welcome",
    subject: "Chào mừng bạn đến với Cab Booking System",
    variables: {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
    },
  });

  // Gửi SMS xác nhận
  if (data.phoneNumber) {
    await sendSMS({
      phone: data.phoneNumber,
      message: `Xin chào ${data.fullName}, bạn đã đăng ký thành công!`,
    });
  }

  // Log sự kiện
  await logEvent({
    eventId: event.eventId,
    eventName: event.eventName,
    userId: data.userId,
    status: "PROCESSED",
    timestamp: new Date(),
  });
}

async function handleProfileUpdated(event) {
  const { data } = event;

  // Gửi email xác nhận cập nhật
  await sendEmail({
    to: data.newValues.email || data.phoneNumber,
    template: "profile_updated",
    subject: "Thông tin cá nhân đã được cập nhật",
    variables: {
      fullName: data.fullName,
      changedFields: data.updatedFields.join(", "),
    },
  });

  // Cảnh báo nếu email thay đổi
  if (data.updatedFields.includes("email")) {
    await sendSecurityAlert({
      userId: data.userId,
      type: "EMAIL_CHANGED",
      oldEmail: data.previousValues.email,
      newEmail: data.newValues.email,
      ipAddress: data.ipAddress,
    });
  }
}

async function handleAccountBanned(event) {
  const { data } = event;

  // Gửi thông báo ban account
  await sendEmail({
    to: data.email,
    template: "account_banned",
    subject: "Thông báo: Tài khoản của bạn đã bị khóa",
    variables: {
      fullName: data.fullName,
      reason: data.banReasonDescription,
      banDate: data.bannedAt,
      expiryDate: data.banExpiryDate,
      supportContact: "support@cab-booking.com",
    },
  });

  // Gửi SMS cảnh báo
  await sendSMS({
    phone: data.phoneNumber,
    message: `Cảnh báo: Tài khoản của bạn đã bị khóa do ${data.banReason}`,
  });

  // Cảnh báo admin
  await notifyAdmin({
    type: "ACCOUNT_BANNED",
    userId: data.userId,
    reason: data.banReason,
    bannedBy: data.bannedBy,
    timestamp: data.bannedAt,
  });
}
```

### 3. Validation & Security

```javascript
function validateEvent(event) {
  // Kiểm tra metadata bắt buộc
  if (!event.eventId || !event.eventName || !event.timestamp) {
    throw new Error("Missing required metadata");
  }

  // Xác thực source service (Zero Trust)
  if (event.sourceService !== "user-service") {
    throw new Error("Invalid source service");
  }

  // Kiểm tra schema version
  if (event.schemaVersion !== "1") {
    console.warn(`Handling event with schema version ${event.schemaVersion}`);
  }

  // Validate data
  if (!event.data || !event.data.userId) {
    throw new Error("Missing user data");
  }

  return true;
}

// Middleware
async function processEvent(event) {
  try {
    validateEvent(event);
    await handleEvent(event);
  } catch (error) {
    console.error(`Error processing event ${event.eventId}:`, error);
    // Send to dead-letter queue
    await sendToDeadLetterQueue(event);
  }
}
```

---

## Best Practices

### 1. Idempotency (Tránh xử lý duplicate)

```javascript
// Lưu eventId đã xử lý
const processedEvents = new Set();

function isEventProcessed(eventId) {
  return processedEvents.has(eventId);
}

async function markEventAsProcessed(eventId) {
  processedEvents.add(eventId);
  // Hoặc lưu vào database
  await EventLog.create({ eventId, processedAt: new Date() });
}
```

### 2. Retry Logic

```javascript
async function handleEventWithRetry(event, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await handleEvent(event);
      return;
    } catch (error) {
      attempt++;
      if (attempt < maxRetries) {
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

### 3. Event Ordering (Đảm bảo thứ tự)

```javascript
// Sắp xếp events theo timestamp
events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
```

### 4. Monitoring & Alerting

```javascript
async function logEventMetrics(event, duration) {
  await metrics.recordEventProcessing({
    eventName: event.eventName,
    sourceService: event.sourceService,
    duration,
    timestamp: new Date(),
  });
}
```

### 5. Dead Letter Queue (DLQ)

```javascript
async function sendToDeadLetterQueue(event, error) {
  await deadLetterQueue.publish({
    eventId: event.eventId,
    eventName: event.eventName,
    error: error.message,
    failedAt: new Date(),
    retryCount: 0,
  });
}
```

---

## Ví Dụ Complete Flow

### Scenario 1: Người dùng đăng ký + Gửi thông báo

```
1. Người dùng gọi POST /api/v1/users
   ↓
2. User Service tạo user trong database
   ↓
3. User Service phát event "user.registered" qua RabbitMQ
   ↓
4. Notification Service nhận event
   ↓
5. Notification Service gửi email chào mừng + SMS
   ↓
6. Notification Service log sự kiện
```

### Scenario 2: Quản trị viên khóa tài khoản gian lận

```
1. Admin phát hiện hoạt động gian lận
   ↓
2. Admin gọi endpoint ban user trên User Service
   ↓
3. User Service cập nhật status = BANNED, phát event "user.account_banned"
   ↓
4. Notification Service nhận event
   ↓
5. Notification Service:
   - Gửi email thông báo cho user
   - Gửi SMS cảnh báo
   - Notify admin dashboard
   - Log sự kiện bảo mật
   ↓
6. Các service khác (booking-service, ride-service) cũng lắng nghe event này
   để hủy các booking/ride đang hoạt động
```

---

## Kết Luận

Cấu trúc JSON payload này đảm bảo:

- ✅ **Zero Trust**: Mỗi event có định danh rõ ràng từ nguồn tin cậy
- ✅ **Scalability**: Hỗ trợ nhiều service consumer
- ✅ **Auditability**: Ghi nhận đầy đủ thông tin cho compliance
- ✅ **Debugging**: Dễ tracking event từ service này sang service khác
- ✅ **Backwards Compatibility**: Schema versioning cho phép phát triển linh hoạt

---

**Ngày cập nhật**: 2026-04-12
**Phiên bản**: 1.0.0
