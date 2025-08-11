# Convert Firebase Service Account to Base64
Write-Host "Converting Firebase Service Account to Base64..." -ForegroundColor Yellow

try {
    $content = Get-Content "credentials\firebase-service-account.json" -Raw
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $base64 = [System.Convert]::ToBase64String($bytes)
    
    # Save to file
    $base64 | Out-File "credentials\firebase-service-account-base64.txt" -Encoding UTF8
    
    Write-Host "✅ Base64 conversion completed!" -ForegroundColor Green
    Write-Host "📄 Base64 saved to: credentials\firebase-service-account-base64.txt" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Copy the base64 content and run:" -ForegroundColor Cyan
    Write-Host 'supabase secrets set FIREBASE_SERVICE_ACCOUNT="<paste_base64_here>"' -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
