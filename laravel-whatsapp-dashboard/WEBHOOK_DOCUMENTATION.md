# WhatsApp Webhook Documentation

## Overview
Sistem ini menerima webhook dari WhatsApp API untuk otomatis memproses transaksi dan mengelola grup WhatsApp.

## Webhook Endpoint
```
POST /api/webhook/whatsapp
```

## Security
Webhook menggunakan HMAC SHA256 signature untuk validasi:
- Header: `X-Hub-Signature-256`
- Secret: Konfigurasi di `WHATSAPP_WEBHOOK_SECRET`

## Supported Message Formats

### Format 1: Standard Format
```
SKY HOUSE BSD
Unit 1205
Checkout: 14:30
Durasi: 3 jam
Cash
John Doe
150000
```

### Format 2: With Phone Number
```
TREE PARK CITY
Unit 0812
Checkout: 16:00
Durasi: 2 jam
Transfer
Jane Smith - 081234567890
200000
```

### Format 3: Compact Format
```
EMERALD TOWER - Unit 1501 - 18:30 - 4h - QRIS - Bob Wilson - 300000
```

## Webhook Payload Examples

### Message Webhook
```json
{
  "messages": [
    {
      "id": "wamid.HBgNNjI4MTM5...",
      "from": "120363317169602122@g.us",
      "timestamp": "1691234567",
      "type": "text",
      "body": "SKY HOUSE BSD\nUnit 1205\nCheckout: 14:30\nDurasi: 3 jam\nCash\nJohn Doe\n150000"
    }
  ]
}
```

### Group Update Webhook
```json
{
  "groups": [
    {
      "id": "120363317169602122@g.us",
      "name": "SKY HOUSE BSD - Booking",
      "subject": "Grup booking apartemen SKY HOUSE BSD",
      "description": "Grup untuk koordinasi booking apartemen",
      "participant_count": 25,
      "admin_count": 3
    }
  ]
}
```

## Automatic Processing

### Transaction Creation
Sistem akan otomatis:
1. Parse pesan menggunakan regex patterns
2. Identifikasi apartemen berdasarkan nama/kode
3. Extract data customer, unit, waktu, durasi, payment method, amount
4. Hitung komisi (default 5%)
5. Simpan ke database
6. Log aktivitas

### Group Management
Sistem akan otomatis:
1. Update informasi grup (nama, peserta, admin)
2. Track aktivitas terakhir
3. Sinkronisasi data grup

## Error Handling
- Semua error di-log ke Laravel log
- Webhook tetap return 200 OK untuk mencegah retry
- Duplicate message detection menggunakan message_id

## Configuration

### Environment Variables
```env
WHATSAPP_API_URL=https://your-whatsapp-api.com
WHATSAPP_API_TOKEN=your_api_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
WHATSAPP_INSTANCE_ID=your_instance_id
WHATSAPP_PHONE_NUMBER=6281234567890
```

### Supported Apartments
Sistem akan mengenali apartemen berdasarkan:
- Nama lengkap (case insensitive)
- Kode apartemen (case insensitive)

Contoh:
- "SKY HOUSE BSD" atau "SKY"
- "TREE PARK CITY" atau "TREE"
- "EMERALD BINTARO" atau "EMERALD"

### Payment Methods
Sistem mengenali:
- Cash
- Transfer
- QRIS
- OVO
- GoPay
- DANA

## Testing Webhook

### Using cURL
```bash
curl -X POST https://your-domain.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=your_signature" \
  -d '{
    "messages": [
      {
        "id": "test_message_123",
        "from": "120363317169602122@g.us",
        "timestamp": "1691234567",
        "type": "text",
        "body": "SKY HOUSE BSD\nUnit 1205\nCheckout: 14:30\nDurasi: 3 jam\nCash\nJohn Doe\n150000"
      }
    ]
  }'
```

### Expected Response
```json
{
  "status": "success"
}
```

## Monitoring

### Logs
Check Laravel logs untuk:
- Webhook received: `WhatsApp Webhook Received`
- Transaction created: `Transaction created from WhatsApp`
- Errors: `WhatsApp Webhook Error`

### Database Tables
- `transactions`: Data transaksi yang diproses
- `whats_app_groups`: Data grup WhatsApp
- `processed_messages`: Tracking pesan yang sudah diproses
- `activity_logs`: Log semua aktivitas

## Troubleshooting

### Common Issues

1. **Signature Validation Failed**
   - Check `WHATSAPP_WEBHOOK_SECRET`
   - Verify signature calculation

2. **Message Not Parsed**
   - Check message format
   - Verify regex patterns
   - Check apartment name/code

3. **Duplicate Transactions**
   - System automatically prevents duplicates using message_id
   - Check `processed_messages` table

4. **Group Not Found**
   - Add group to system via admin panel
   - Check group_id format

### Debug Mode
Set `APP_DEBUG=true` untuk detailed error messages.

## Production Deployment

### Requirements
- HTTPS endpoint (required for WhatsApp webhooks)
- Valid SSL certificate
- Proper firewall configuration
- Database backup strategy

### Performance
- Webhook processing is asynchronous
- Database indexes on frequently queried fields
- Log rotation untuk mencegah disk penuh

### Security
- Always validate webhook signatures
- Use HTTPS only
- Implement rate limiting if needed
- Regular security updates
