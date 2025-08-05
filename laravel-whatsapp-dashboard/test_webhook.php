<?php

// Test webhook endpoint
$url = 'http://127.0.0.1:8000/api/webhook/whatsapp';

// Sample webhook payload
$payload = [
    'messages' => [
        [
            'id' => 'test_msg_' . time(),
            'from' => '120363317169602122@g.us',
            'timestamp' => time(),
            'type' => 'text',
            'body' => "SKY HOUSE BSD\nUnit 1205\nCheckout: 14:30\nDurasi: 3 jam\nCash\nJohn Doe\n150000"
        ]
    ]
];

$json = json_encode($payload);

// Calculate HMAC signature (optional for testing)
$secret = 'test_secret';
$signature = 'sha256=' . hash_hmac('sha256', $json, $secret);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Hub-Signature-256: ' . $signature
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 200) {
    echo "\n✅ Webhook test successful!\n";
} else {
    echo "\n❌ Webhook test failed!\n";
}
?>
