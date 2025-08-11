# Test Supabase Edge Function - send-push-notification
Write-Host "🧪 Testing Supabase Edge Function: send-push-notification" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# Edge Function URL
$url = "https://rvcknyuinfssgpgkfetx.supabase.co/functions/v1/send-push-notification"

# Test payload
$payload = @{
    token = "test_token_123"
    title = "Test Notification"
    body = "Testing Edge Function deployment from PowerShell"
    data = @{
        type = "test"
        channel = "kakarama_notifications"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
} | ConvertTo-Json -Depth 3

Write-Host "📡 Sending test request..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host "Payload: $payload" -ForegroundColor Gray
Write-Host ""

try {
    # Make the request
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $payload -ContentType "application/json" -Headers @{
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMzNTI4NzQsImV4cCI6MjAzODkyODg3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8"
    }
    
    Write-Host "✅ Edge Function Response:" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
    
    if ($response.success) {
        Write-Host ""
        Write-Host "🎉 Test PASSED! Edge Function is working correctly." -ForegroundColor Green
        Write-Host "Message ID: $($response.messageId)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Test FAILED! Edge Function returned error." -ForegroundColor Red
        Write-Host "Error: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Test FAILED! Error calling Edge Function:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        Write-Host "Response Headers:" -ForegroundColor Yellow
        $_.Exception.Response.Headers | Format-Table | Write-Host -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check Supabase Dashboard for function logs" -ForegroundColor White
Write-Host "2. Verify notification_logs table for test entry" -ForegroundColor White
Write-Host "3. Test with real FCM token from mobile app" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Useful Links:" -ForegroundColor Cyan
Write-Host "- Dashboard: https://supabase.com/dashboard/project/rvcknyuinfssgpgkfetx/functions" -ForegroundColor White
Write-Host "- Logs: supabase functions logs send-push-notification" -ForegroundColor White
