# 📝 Postman Testing Guide - Wallet/Ledger Service

**Version**: 1.0  
**Last Updated**: April 29, 2026  
**Author**: Backend Team

---

## 🎯 Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [API Endpoints Documentation](#api-endpoints-documentation)
4. [Testing Workflows](#testing-workflows)
5. [RabbitMQ Event Mocking](#rabbitmq-event-mocking)
6. [Troubleshooting](#troubleshooting)

---

## Setup & Prerequisites

### Required Tools

- ✅ Postman Desktop Client or Web Client
- ✅ Running CAB Booking System (all services)
- ✅ RabbitMQ Manager (Web UI): `http://localhost:15672`
- ✅ MongoDB Compass or CLI access (for verification)
- ✅ cURL or Python (for RabbitMQ event publishing)

### Services Status Check

Before running tests, verify all services are running:

```bash
# Terminal 1: Check payment service
curl -X GET https://localhost:3005/health --insecure

# Terminal 2: Check driver service
curl -X GET https://localhost:3003/health --insecure

# Terminal 3: Check booking service
curl -X GET https://localhost:3002/health --insecure

# Terminal 4: Check RabbitMQ
curl -X GET http://localhost:15672/api/overview --user admin:password123
```

---

## Environment Configuration

### Step 1: Create Postman Environment

In Postman, create a new environment called `CAB_Booking_Dev`:

```json
{
  "variables": {
    "BASE_URL": {
      "value": "https://localhost",
      "enabled": true
    },
    "DRIVER_SERVICE_URL": {
      "value": "https://localhost:3003",
      "enabled": true
    },
    "PAYMENT_SERVICE_URL": {
      "value": "https://localhost:3005",
      "enabled": true
    },
    "BOOKING_SERVICE_URL": {
      "value": "https://localhost:3002",
      "enabled": true
    },
    "RABBITMQ_URL": {
      "value": "http://localhost:15672",
      "enabled": true
    },
    "DRIVER_ID": {
      "value": "driver_001",
      "enabled": true
    },
    "DRIVER_JWT": {
      "value": "",
      "enabled": true
    },
    "BOOKING_ID": {
      "value": "booking_001",
      "enabled": true
    },
    "PAYMENT_ID": {
      "value": "payment_001",
      "enabled": true
    }
  }
}
```

### Step 2: Configure SSL/TLS (Important!)

Since we're using HTTPS with self-signed certificates:

**In Postman Settings:**

- Settings → General → SSL certificate verification → **OFF**

Or disable per-request:

- For each request → click the `🔒` icon → turn **OFF**

---

## API Endpoints Documentation

### 1️⃣ **Get Driver Wallet** (Current Balance)

**Endpoint**: `GET /api/drivers/wallet`  
**Authentication**: Required (JWT)  
**Description**: Get the driver's current wallet balance and summary

#### Request

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet
Authorization: Bearer {{DRIVER_JWT}}
```

#### cURL Example

```bash
curl -X GET "https://localhost:3003/api/drivers/wallet" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --insecure
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "driverId": "driver_001",
    "balance": 250000,
    "totalEarned": 1500000,
    "totalWithdrawn": 1250000,
    "pendingWithdraw": 0,
    "updatedAt": "2026-04-29T10:30:00.000Z"
  }
}
```

---

### 2️⃣ **Get Wallet Transactions (Simple List)**

**Endpoint**: `GET /api/drivers/wallet/transactions`  
**Authentication**: Required (JWT)  
**Description**: Get paginated wallet transaction history

#### Request

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/transactions?page=1&limit=20
Authorization: Bearer {{DRIVER_JWT}}
```

#### Query Parameters

| Parameter | Type    | Default | Description              |
| --------- | ------- | ------- | ------------------------ |
| `page`    | integer | 1       | Page number (1-indexed)  |
| `limit`   | integer | 20      | Items per page (max 100) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "type": "earn",
        "amount": 150000,
        "status": "completed",
        "description": "Thu nhập từ chuyến booking_001",
        "rideId": "booking_001",
        "createdAt": "2026-04-29T09:30:00.000Z"
      },
      {
        "id": "txn_def456",
        "type": "earn",
        "amount": 100000,
        "status": "completed",
        "description": "Thu nhập từ chuyến booking_002",
        "rideId": "booking_002",
        "createdAt": "2026-04-28T15:45:00.000Z"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 20,
    "balance": 250000
  }
}
```

---

### 3️⃣ **Get Ledger History (Detailed Accounting)** ⭐ **NEW**

**Endpoint**: `GET /api/drivers/wallet/ledger`  
**Authentication**: Required (JWT)  
**Description**: Get detailed ledger entries for accounting and audit trail

#### Request

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/ledger?page=1&limit=50&transactionType=earn&status=completed
Authorization: Bearer {{DRIVER_JWT}}
```

#### Query Parameters

| Parameter         | Type    | Example                                   | Description      |
| ----------------- | ------- | ----------------------------------------- | ---------------- |
| `page`            | integer | 1                                         | Page number      |
| `limit`           | integer | 50                                        | Items per page   |
| `transactionType` | string  | earn, withdraw, refund, bonus, adjustment | Filter by type   |
| `status`          | string  | completed, pending, failed                | Filter by status |
| `startDate`       | ISO8601 | 2026-04-01T00:00:00Z                      | Filter from date |
| `endDate`         | ISO8601 | 2026-04-30T23:59:59Z                      | Filter to date   |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "ledger": [
      {
        "_id": "ledger_001",
        "driverId": "driver_001",
        "walletId": "wallet_123",
        "amount": 150000,
        "transactionType": "earn",
        "referenceId": "txn_abc123",
        "referenceType": "payment",
        "bookingId": "booking_001",
        "paymentId": "payment_001",
        "description": "Payment for booking booking_001",
        "status": "completed",
        "createdAt": "2026-04-29T09:30:00.000Z"
      },
      {
        "_id": "ledger_002",
        "driverId": "driver_001",
        "walletId": "wallet_123",
        "amount": 100000,
        "transactionType": "earn",
        "referenceId": "txn_def456",
        "referenceType": "payment",
        "bookingId": "booking_002",
        "paymentId": "payment_002",
        "description": "Payment for booking booking_002",
        "status": "completed",
        "createdAt": "2026-04-28T15:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "pages": 1
    },
    "summary": {
      "earn": {
        "totalAmount": 250000,
        "count": 2
      },
      "withdraw": {
        "totalAmount": 0,
        "count": 0
      }
    }
  }
}
```

---

### 4️⃣ **Request Withdrawal**

**Endpoint**: `POST /api/drivers/wallet/withdraw`  
**Authentication**: Required (JWT)  
**Description**: Request to withdraw money from wallet (minimum 10,000 VND)

#### Request Body

```json
{
  "amount": 100000,
  "bankAccount": {
    "bankName": "Vietcombank",
    "accountNumber": "1234567890",
    "accountHolder": "NGUYEN VAN A"
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Yêu cầu rút tiền đã được ghi nhận, đang chờ xử lý",
  "data": {
    "transaction": {
      "id": "txn_withdraw_001",
      "type": "withdraw",
      "amount": 100000,
      "status": "pending",
      "description": "Rút tiền về tài khoản Vietcombank",
      "createdAt": "2026-04-29T10:30:00.000Z"
    },
    "remainingBalance": 150000
  }
}
```

---

## Testing Workflows

### Workflow 1: Manual Testing (Without Events)

This tests the basic wallet operations without payment events.

#### Step 1: Get JWT Token

1. Open Postman
2. Send request to **Auth Service** to get JWT token

   ```
   POST https://localhost:3001/api/auth/login
   Content-Type: application/json

   {
     "email": "driver@example.com",
     "password": "password123"
   }
   ```

3. Copy the JWT token and set `{{DRIVER_JWT}}` in environment

#### Step 2: Get Current Wallet

1. Send: `GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet`
2. Verify balance in response

#### Step 3: Get Ledger History

1. Send: `GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/ledger`
2. Check if any entries exist

#### Step 4: Request Withdrawal

1. Send: `POST {{DRIVER_SERVICE_URL}}/api/drivers/wallet/withdraw`
2. Body:
   ```json
   {
     "amount": 50000,
     "bankAccount": {
       "bankName": "Techcombank",
       "accountNumber": "9876543210"
     }
   }
   ```
3. Verify withdrawal shows as "pending"

#### Step 5: Get Updated Ledger

1. Send: `GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/ledger?transactionType=withdraw`
2. Verify withdrawal entry is there

---

### Workflow 2: Full Payment Saga (With RabbitMQ Events) ⭐ IMPORTANT

This tests the complete flow: Payment → RabbitMQ Event → Wallet Credit

#### Prerequisites

- Payment Service running
- Driver Service running
- RabbitMQ running
- Booking with assigned driver exists

#### Step 1: Verify Initial Wallet Balance

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet
Authorization: Bearer {{DRIVER_JWT}}
```

**Expected**: `balance: X`

#### Step 2: Publish Payment.Completed Event to RabbitMQ

Use the script below to manually publish the event:

**Option A: Using Node.js Script**

Create file `publish-payment-event.js`:

```javascript
const amqp = require("amqplib");

async function publishPaymentEvent() {
  try {
    const connection = await amqp.connect(
      "amqp://admin:password123@localhost:5672",
    );
    const channel = await connection.createChannel();

    const exchangeName = "payment.events";
    const routingKey = "payment.completed";

    // Declare exchange
    await channel.assertExchange(exchangeName, "topic", { durable: true });

    // Create the payment event
    const event = {
      eventId: `evt_test_${Date.now()}`,
      eventType: "payment.completed",
      timestamp: new Date().toISOString(),
      data: {
        bookingId: "booking_001",
        paymentId: "payment_001",
        customerId: "customer_001",
        driverId: "driver_001",
        amount: 150000,
        currency: "VND",
      },
    };

    // Publish the event
    channel.publish(
      exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    console.log("✅ Payment event published:", event);

    await channel.close();
    await connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

publishPaymentEvent();
```

Run:

```bash
node publish-payment-event.js
```

**Option B: Using Python**

Create file `publish_payment_event.py`:

```python
import pika
import json
from datetime import datetime

def publish_event():
    # Connect to RabbitMQ
    connection = pika.BlockingConnection(
        pika.PlainCredentials('admin', 'password123')
    )
    channel = connection.channel()

    # Declare exchange
    exchange_name = 'payment.events'
    channel.exchange_declare(exchange=exchange_name, exchange_type='topic', durable=True)

    # Create event
    event = {
        'eventId': f'evt_test_{int(datetime.now().timestamp() * 1000)}',
        'eventType': 'payment.completed',
        'timestamp': datetime.now().isoformat(),
        'data': {
            'bookingId': 'booking_001',
            'paymentId': 'payment_001',
            'customerId': 'customer_001',
            'driverId': 'driver_001',
            'amount': 150000,
            'currency': 'VND'
        }
    }

    # Publish
    channel.basic_publish(
        exchange=exchange_name,
        routing_key='payment.completed',
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)  # persistent
    )

    print(f'✅ Event published: {event}')

    connection.close()

if __name__ == '__main__':
    publish_event()
```

Run:

```bash
python publish_payment_event.py
```

**Option C: Using RabbitMQ Management UI**

1. Go to: `http://localhost:15672`
2. Login: `admin` / `password123`
3. Go to **Exchanges** → Click `payment.events`
4. Scroll down to **Publish message**
5. In **Payload** (JSON):

```json
{
  "eventId": "evt_manual_test_001",
  "eventType": "payment.completed",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "data": {
    "bookingId": "booking_001",
    "paymentId": "payment_001",
    "customerId": "customer_001",
    "driverId": "driver_001",
    "amount": 150000,
    "currency": "VND"
  }
}
```

6. Set **Routing key**: `payment.completed`
7. Click **Publish message**

#### Step 3: Wait for Event Processing

Wait 2-3 seconds for the event to be consumed and processed.

Check Driver Service logs:

```
📦 Payment event received: ...
💳 Processing payment for booking: booking_001
✅ Driver driver_001 wallet credited with 150000 for booking booking_001
```

#### Step 4: Verify Wallet was Credited

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet
Authorization: Bearer {{DRIVER_JWT}}
```

**Expected**: `balance: X + 150000`

#### Step 5: Verify Ledger Entry

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/ledger
Authorization: Bearer {{DRIVER_JWT}}
```

**Expected Response**: New entry with:

```json
{
  "amount": 150000,
  "transactionType": "earn",
  "referenceType": "payment",
  "bookingId": "booking_001",
  "paymentId": "payment_001",
  "status": "completed"
}
```

#### Step 6: Check Ledger with Filters

```http
GET {{DRIVER_SERVICE_URL}}/api/drivers/wallet/ledger?transactionType=earn&status=completed
Authorization: Bearer {{DRIVER_JWT}}
```

**Expected**: List shows only earning transactions

---

## RabbitMQ Event Mocking

### Understanding the Payment Event Format

When Payment Service publishes `payment.completed`, the event structure is:

```json
{
  "eventId": "evt_1234567890_abc123def456",
  "eventType": "payment.completed",
  "timestamp": "2026-04-29T10:30:45.123Z",
  "data": {
    "bookingId": "booking_001", // ← Driver Service looks up booking details
    "paymentId": "payment_001", // ← Optional, stored for reference
    "customerId": "customer_001", // ← Not used by Driver Service
    "driverId": "driver_001", // ← Alternative: included in event data
    "amount": 150000 // ← Alternative: earning amount
  }
}
```

### Key Data Flow

1. **Payment Service** publishes: `payment.completed` with `bookingId`
2. **Driver Service Consumer** receives event
3. Calls **Booking Service API**: `GET /api/bookings/{bookingId}`
4. Gets driver details: `driverId`, `estimatedPrice.total`
5. Calls **Wallet Service**: `addEarning(driverId, amount, bookingId)`
6. Wallet updated + Ledger entry created

### Mocking Different Scenarios

#### Scenario A: Successful Payment (Normal Path)

```json
{
  "eventId": "evt_success_001",
  "eventType": "payment.completed",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "data": {
    "bookingId": "booking_001",
    "paymentId": "payment_001"
  }
}
```

**Expected Result**:

- Booking looked up successfully
- Driver found and identified
- Wallet credited with `estimatedPrice.total`
- Ledger entry created

#### Scenario B: Unknown Booking (Error Handling)

```json
{
  "eventId": "evt_error_001",
  "eventType": "payment.completed",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "data": {
    "bookingId": "booking_nonexistent",
    "paymentId": "payment_001"
  }
}
```

**Expected Result**:

- Booking lookup fails
- Error logged
- Message requeued for retry
- Wallet NOT credited

#### Scenario C: No Driver Assigned Yet

```json
{
  "eventId": "evt_nodriver_001",
  "eventType": "payment.completed",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "data": {
    "bookingId": "booking_waiting_for_driver",
    "paymentId": "payment_001"
  }
}
```

**Expected Result**:

- Booking exists but `driverId` is null
- Warning logged
- Event processed but no wallet update
- Message acknowledged (not requeued)

---

## Troubleshooting

### Issue 1: "SSL certificate verification failed"

**Solution**:

- In Postman: Settings → SSL verification → **OFF**
- OR use `--insecure` flag in cURL
- OR click 🔒 icon in request and disable

### Issue 2: "Unauthorized - Invalid JWT"

**Solution**:

1. Get new JWT token from Auth Service
2. Verify token hasn't expired
3. Check token in `Authorization: Bearer <TOKEN>`

### Issue 3: "Payment event not consumed"

**Check**:

1. Driver Service logs: `✅ Payment Event Consumer started`
2. RabbitMQ logs for errors
3. Verify `payment.events` exchange exists:
   ```bash
   curl -u admin:password123 http://localhost:15672/api/exchanges/%2F
   ```
4. Verify queue is bound:
   ```bash
   curl -u admin:password123 http://localhost:15672/api/queues/%2F/driver.payment.events
   ```

### Issue 4: "Wallet not credited after event published"

**Debug Steps**:

1. Check Driver Service logs for consumer errors
2. Verify Booking Service is accessible:
   ```bash
   curl https://localhost:3002/api/bookings/booking_001 --insecure
   ```
3. Check MongoDB:
   ```bash
   db.ledger_transactions.findOne({driverId: 'driver_001'})
   ```
4. Verify event format matches expected structure

### Issue 5: "Ledger entries not appearing"

**Solution**:

1. Verify Ledger model is loaded:
   ```bash
   db.ledger_transactions.countDocuments()
   ```
2. Check walletService includes ledger logging
3. Verify MongoDB connection is working

---

## Performance Monitoring

### Useful MongoDB Queries

```javascript
// Get driver's total earned
db.ledger_transactions.aggregate([
  { $match: { driverId: "driver_001", transactionType: "earn" } },
  { $group: { _id: null, total: { $sum: "$amount" } } },
]);

// Get daily earnings
db.ledger_transactions.aggregate([
  { $match: { driverId: "driver_001", transactionType: "earn" } },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      daily: { $sum: "$amount" },
    },
  },
  { $sort: { _id: -1 } },
]);

// Get recent transactions
db.wallets.findOne(
  { driverId: "driver_001" },
  { transactions: { $slice: -10 } },
);
```

### RabbitMQ Monitoring

```bash
# Check queue depth
curl -u admin:password123 http://localhost:15672/api/queues/%2F/driver.payment.events

# Check message count
curl -u admin:password123 http://localhost:15672/api/queues/%2F | jq '.[] | {name, messages}'
```

---

## 📋 Test Checklist

- [ ] Create Postman environment with variables
- [ ] Disable SSL verification in Postman settings
- [ ] Get JWT token from Auth Service
- [ ] Test GET /api/drivers/wallet
- [ ] Test GET /api/drivers/wallet/transactions
- [ ] Test GET /api/drivers/wallet/ledger (new)
- [ ] Test POST /api/drivers/wallet/withdraw
- [ ] Publish payment.completed event via RabbitMQ
- [ ] Verify wallet was credited automatically
- [ ] Verify ledger entry was created
- [ ] Test ledger filtering (by transaction type, status, date range)
- [ ] Check MongoDB for entries
- [ ] Verify error handling (missing booking, no driver, etc.)
- [ ] Monitor RabbitMQ queue depth
- [ ] Check Driver Service logs for consumer activity

---

**End of Postman Testing Guide**
