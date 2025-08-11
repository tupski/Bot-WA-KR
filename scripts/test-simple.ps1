# Simple test for Edge Function
Write-Host "Testing Edge Function..." -ForegroundColor Green

$url = "https://rvcknyuinfssgpgkfetx.supabase.co/functions/v1/send-push-notification"
$payload = '{"token": "test_token_123", "title": "Test", "body": "Testing deployment"}'

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $payload -ContentType "application/json"
    Write-Host "Success: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
