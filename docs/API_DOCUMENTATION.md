# API Documentation - Kakarama Room

Dokumentasi lengkap untuk REST API Kakarama Room System.

## Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

Sistem menggunakan Laravel Sanctum untuk authentication. Semua endpoint (kecuali login/register) memerlukan Bearer token.

### Login
```http
POST /auth/login
Content-Type: application/json

{
    "email": "admin@example.com",
    "password": "password"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": 1,
            "name": "Admin User",
            "email": "admin@example.com",
            "role": "admin"
        },
        "token": "1|abc123def456..."
    },
    "message": "Login successful"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

### Using Token
Include token in all subsequent requests:
```http
Authorization: Bearer {token}
```

## Bookings API

### Get Bookings
```http
GET /bookings
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 25, max: 100)
- `search` (string): Search in customer name, phone, booking code
- `status` (string): Filter by status (pending, confirmed, checked_in, checked_out, cancelled)
- `source` (string): Filter by source (whatsapp, manual)
- `date` (date): Filter by creation date (YYYY-MM-DD)
- `check_in_date` (date): Filter by check-in date
- `sort` (string): Sort field:direction (e.g., created_at:desc)

**Response:**
```json
{
    "success": true,
    "data": {
        "data": [
            {
                "id": 1,
                "booking_code": "KR-20241201-001",
                "customer_name": "John Doe",
                "customer_phone": "6281234567890",
                "room_type": "Standard Double",
                "room_number": "101",
                "check_in_date": "2024-12-25",
                "check_out_date": "2024-12-27",
                "status": "confirmed",
                "source": "whatsapp",
                "final_amount": 700000,
                "created_at": "2024-12-01T10:00:00Z",
                "updated_at": "2024-12-01T10:30:00Z"
            }
        ],
        "current_page": 1,
        "last_page": 5,
        "per_page": 25,
        "total": 125,
        "from": 1,
        "to": 25
    }
}
```

### Get Single Booking
```http
GET /bookings/{id}
Authorization: Bearer {token}
```

### Create Booking
```http
POST /bookings
Authorization: Bearer {token}
Content-Type: application/json

{
    "customer_name": "John Doe",
    "customer_phone": "081234567890",
    "room_type": "Standard Double",
    "room_number": "101",
    "check_in_date": "2024-12-25",
    "check_out_date": "2024-12-27",
    "price_per_night": 350000,
    "total_amount": 700000,
    "final_amount": 700000,
    "source": "manual",
    "payment_method": "cash",
    "notes": "Special request: late check-in"
}
```

**Required Fields:**
- `customer_name` (string)
- `customer_phone` (string)
- `check_in_date` (date)
- `check_out_date` (date)

### Update Booking
```http
PUT /bookings/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "customer_name": "John Doe Updated",
    "room_number": "102",
    "notes": "Updated notes"
}
```

### Delete Booking
```http
DELETE /bookings/{id}
Authorization: Bearer {token}
```

### Booking Status Actions

#### Confirm Booking
```http
PATCH /bookings/{id}/confirm
Authorization: Bearer {token}
```

#### Check In
```http
PATCH /bookings/{id}/checkin
Authorization: Bearer {token}
Content-Type: application/json

{
    "room_number": "101",
    "notes": "Guest arrived early"
}
```

#### Check Out
```http
PATCH /bookings/{id}/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
    "checkout_notes": "Room in good condition"
}
```

#### Cancel Booking
```http
PATCH /bookings/{id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
    "reason": "Customer requested cancellation"
}
```

## WhatsApp Groups API

### Get Groups
```http
GET /whatsapp-groups
Authorization: Bearer {token}
```

**Query Parameters:**
- `is_active` (boolean): Filter by active status
- `auto_parse_enabled` (boolean): Filter by auto-parse status

### Create Group
```http
POST /whatsapp-groups
Authorization: Bearer {token}
Content-Type: application/json

{
    "group_name": "Booking Group 1",
    "group_id": "120363123456789012@g.us",
    "is_active": true,
    "auto_parse_enabled": true,
    "confidence_threshold": 0.7
}
```

### Update Group
```http
PUT /whatsapp-groups/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "is_active": false,
    "auto_parse_enabled": false
}
```

### Get Group by WhatsApp Group ID
```http
GET /whatsapp-groups/by-group-id/{group_id}
Authorization: Bearer {token}
```

## Bot API

**Note:** Bot API endpoints menggunakan Bot Token authentication, bukan user token.

### Create Booking from Bot
```http
POST /bot/bookings
Authorization: Bearer {bot-token}
Content-Type: application/json

{
    "customer_name": "John Doe",
    "customer_phone": "6281234567890",
    "room_type": "Standard Double",
    "check_in_date": "2024-12-25",
    "check_out_date": "2024-12-27",
    "price_per_night": 350000,
    "total_amount": 700000,
    "final_amount": 700000,
    "whatsapp_group_id": 1,
    "source": "whatsapp",
    "raw_message": "Original WhatsApp message",
    "parsing_confidence": 0.95,
    "message_metadata": {
        "message_id": "msg_123",
        "sender_number": "6281234567890",
        "group_id": "120363123456789012@g.us",
        "timestamp": "2024-12-01T10:00:00Z"
    }
}
```

### Get Booking Summary
```http
GET /bot/bookings/summary
Authorization: Bearer {bot-token}
```

**Query Parameters:**
- `date` (date): Specific date (default: today)
- `group_id` (string): Filter by WhatsApp group ID

**Response:**
```json
{
    "success": true,
    "data": {
        "date": "2024-12-01",
        "total_bookings": 15,
        "today_bookings": 5,
        "pending_bookings": 3,
        "confirmed_bookings": 10,
        "cancelled_bookings": 2,
        "total_revenue": 5250000,
        "whatsapp_bookings": 12,
        "manual_bookings": 3
    }
}
```

### Get Today's Bookings
```http
GET /bot/bookings/today
Authorization: Bearer {bot-token}
```

### Update Bot Status
```http
POST /bot/status
Authorization: Bearer {bot-token}
Content-Type: application/json

{
    "status": "online",
    "metadata": {
        "uptime": 3600,
        "messageCount": 150,
        "errorCount": 2,
        "lastActivity": "2024-12-01T10:00:00Z",
        "system": {
            "memory": "256MB",
            "cpu": "15%"
        }
    }
}
```

### Record Bot Activity
```http
POST /bot/activity
Authorization: Bearer {bot-token}
Content-Type: application/json

{
    "type": "message_processed",
    "data": {
        "message_id": "msg_123",
        "group_id": "120363123456789012@g.us",
        "processing_time": 1.5,
        "success": true,
        "booking_created": true
    }
}
```

## Dashboard API

### Get Dashboard Statistics
```http
GET /dashboard/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "today": {
            "new_bookings": 5,
            "confirmed_bookings": 8,
            "revenue": 2800000,
            "whatsapp_bookings": 4
        },
        "this_month": {
            "total_bookings": 125,
            "confirmed_bookings": 98,
            "total_revenue": 43750000,
            "unique_customers": 87
        },
        "current": {
            "pending_bookings": 12,
            "checked_in": 5,
            "active_groups": 3
        },
        "last_updated": "2024-12-01T10:00:00Z"
    }
}
```

### Get Booking Trends
```http
GET /dashboard/booking-trends
Authorization: Bearer {token}
```

**Query Parameters:**
- `days` (int): Number of days (default: 7, max: 30)

**Response:**
```json
{
    "success": true,
    "data": {
        "labels": ["2024-11-25", "2024-11-26", "2024-11-27", "2024-11-28", "2024-11-29", "2024-11-30", "2024-12-01"],
        "data": [8, 12, 15, 10, 18, 22, 16]
    }
}
```

## Reports API

### Generate Report
```http
POST /reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
    "type": "bookings",
    "date_from": "2024-11-01",
    "date_to": "2024-11-30",
    "status": "confirmed",
    "source": "whatsapp",
    "format": "csv"
}
```

**Report Types:**
- `bookings`: Booking report
- `revenue`: Revenue report
- `customers`: Customer report
- `groups`: WhatsApp groups report

**Formats:**
- `csv`: CSV file
- `excel`: Excel file
- `pdf`: PDF file

## Export API

### Export Bookings
```http
POST /export/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
    "filters": {
        "status": "confirmed",
        "date_from": "2024-11-01",
        "date_to": "2024-11-30"
    },
    "format": "csv"
}
```

### Export Dashboard Data
```http
POST /export/dashboard
Authorization: Bearer {token}
```

## Health Check

### System Health
```http
GET /health
```

**Response:**
```json
{
    "success": true,
    "status": "healthy",
    "timestamp": "2024-12-01T10:00:00Z",
    "services": {
        "database": "healthy",
        "redis": "healthy",
        "storage": "healthy"
    }
}
```

### Bot Health
```http
GET /bot/health
Authorization: Bearer {bot-token}
```

## Error Responses

### Standard Error Format
```json
{
    "success": false,
    "message": "Error description",
    "errors": {
        "field_name": ["Validation error message"]
    },
    "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `429`: Too Many Requests
- `500`: Internal Server Error

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Invalid or missing token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `BOT_OFFLINE`: WhatsApp bot is offline
- `DATABASE_ERROR`: Database connection issue

## Rate Limiting

API endpoints are rate limited:
- **General API**: 60 requests per minute per user
- **Bot API**: 120 requests per minute per bot
- **Export API**: 5 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1638360000
```

## Webhooks

### Booking Events
Configure webhook URLs to receive real-time booking events:

#### Booking Created
```json
{
    "event": "booking.created",
    "data": {
        "booking": { /* booking object */ },
        "timestamp": "2024-12-01T10:00:00Z"
    }
}
```

#### Booking Status Changed
```json
{
    "event": "booking.status_changed",
    "data": {
        "booking": { /* booking object */ },
        "old_status": "pending",
        "new_status": "confirmed",
        "timestamp": "2024-12-01T10:00:00Z"
    }
}
```

## SDK & Libraries

### JavaScript/Node.js
```javascript
const KakaramaAPI = require('@kakarama/api-client');

const client = new KakaramaAPI({
    baseURL: 'https://your-domain.com/api/v1',
    token: 'your-api-token'
});

// Get bookings
const bookings = await client.bookings.list({
    status: 'confirmed',
    page: 1
});
```

### PHP
```php
use Kakarama\ApiClient\Client;

$client = new Client([
    'base_url' => 'https://your-domain.com/api/v1',
    'token' => 'your-api-token'
]);

// Create booking
$booking = $client->bookings()->create([
    'customer_name' => 'John Doe',
    'customer_phone' => '081234567890',
    // ... other fields
]);
```
