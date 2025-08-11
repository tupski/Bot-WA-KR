# Supabase Edge Function Deployment

## Prerequisites

1. Install Supabase CLI (Windows):

**Option 1: Via Chocolatey (Recommended)**
```bash
# Install Chocolatey first if not installed
# https://chocolatey.org/install

choco install supabase
```

**Option 2: Via Scoop**
```bash
# Install Scoop first if not installed
# https://scoop.sh/

scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option 3: Manual Download**
```bash
# Download latest release from:
# https://github.com/supabase/cli/releases
# Extract supabase.exe and add to PATH
```

2. Verify installation:
```bash
supabase --version
```

3. Login to Supabase:
```bash
supabase login
```

4. Link to your project:
```bash
supabase link --project-ref rvcknyuinfssgpgkfetx
```

## Environment Variables Setup

### 1. Prepare Firebase Service Account

Convert your Firebase service account JSON to base64:

```bash
# On Windows (PowerShell)
$content = Get-Content "credentials/firebase-service-account.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [System.Convert]::ToBase64String($bytes)
Write-Output $base64

# On Linux/Mac
base64 -i credentials/firebase-service-account.json
```

### 2. Set Environment Variables

```bash
# Set Firebase Service Account (base64 encoded)
supabase secrets set FIREBASE_SERVICE_ACCOUNT="<base64_encoded_service_account>"

# Verify secrets
supabase secrets list
```

## Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy send-push-notification

# Test the function
supabase functions invoke send-push-notification --data '{
  "token": "test_token",
  "title": "Test Notification",
  "body": "This is a test notification"
}'
```

## Function URL

After deployment, your function will be available at:
```
https://rvcknyuinfssgpgkfetx.supabase.co/functions/v1/send-push-notification
```

## Testing

### 1. Test with curl:

```bash
curl -X POST 'https://rvcknyuinfssgpgkfetx.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "DEVICE_FCM_TOKEN",
    "title": "Test Notification",
    "body": "This is a test from Edge Function",
    "data": {
      "type": "test",
      "channel": "kakarama_notifications"
    }
  }'
```

### 2. Test from React Native:

```javascript
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    token: 'DEVICE_FCM_TOKEN',
    title: 'Test Notification',
    body: 'This is a test from React Native',
    data: {
      type: 'test',
      channel: 'kakarama_notifications'
    }
  }
});
```

## Monitoring

Check function logs:
```bash
supabase functions logs send-push-notification
```

Check notification logs in database:
```sql
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;
```

## Troubleshooting

### Common Issues:

1. **Firebase Service Account Error**
   - Ensure the service account JSON is properly base64 encoded
   - Verify the service account has FCM permissions

2. **Function Timeout**
   - Check Firebase Admin SDK initialization
   - Verify network connectivity

3. **Invalid FCM Token**
   - Ensure the device token is valid and not expired
   - Test with a fresh token from the app

### Debug Mode:

Enable debug logging by adding to your function:
```typescript
console.log('Debug info:', { token, title, body, data });
```

## Security Notes

1. Never commit the Firebase service account JSON to Git
2. Use environment variables for all sensitive data
3. Regularly rotate service account keys
4. Monitor function usage and logs
5. Set up proper RLS policies for notification_logs table
