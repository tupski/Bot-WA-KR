<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;

class BotStatusController extends Controller
{
    public function index()
    {
        $botStatus = $this->getBotStatus();
        $qrCode = $this->getQrCode();

        return view('bot-status.index', compact('botStatus', 'qrCode'));
    }

    public function status()
    {
        $status = $this->getBotStatus();
        return response()->json($status);
    }

    public function qrCode()
    {
        $qrCode = $this->getQrCode();
        return response()->json(['qr_code' => $qrCode]);
    }

    public function restart()
    {
        // Simulate bot restart
        Cache::forget('bot_status');
        Cache::forget('bot_qr_code');

        return response()->json(['message' => 'Bot restart initiated']);
    }

    public function logout()
    {
        // Simulate bot logout
        Cache::put('bot_status', [
            'status' => 'disconnected',
            'message' => 'Bot logged out',
            'last_seen' => now(),
            'phone_number' => null,
            'device_name' => null,
        ], 300);

        return response()->json(['message' => 'Bot logged out successfully']);
    }

    private function getBotStatus()
    {
        return Cache::remember('bot_status', 60, function () {
            // In real implementation, this would call actual WhatsApp API
            $statuses = [
                [
                    'status' => 'connected',
                    'message' => 'Bot is online and ready',
                    'last_seen' => now(),
                    'phone_number' => '+62812-3456-7890',
                    'device_name' => 'KakaRama Bot',
                    'battery' => 85,
                    'signal_strength' => 'Strong',
                ],
                [
                    'status' => 'connecting',
                    'message' => 'Bot is connecting...',
                    'last_seen' => now()->subMinutes(2),
                    'phone_number' => null,
                    'device_name' => null,
                    'battery' => null,
                    'signal_strength' => null,
                ],
                [
                    'status' => 'disconnected',
                    'message' => 'Bot is offline',
                    'last_seen' => now()->subMinutes(10),
                    'phone_number' => null,
                    'device_name' => null,
                    'battery' => null,
                    'signal_strength' => null,
                ],
            ];

            return $statuses[array_rand($statuses)];
        });
    }

    private function getQrCode()
    {
        return Cache::remember('bot_qr_code', 30, function () {
            $status = $this->getBotStatus();

            if ($status['status'] === 'disconnected') {
                // Generate a more realistic QR code placeholder
                return $this->generateQrCodePlaceholder();
            }

            return null; // No QR code when connected
        });
    }

    private function generateQrCodePlaceholder()
    {
        // Generate a simple QR-like pattern using SVG
        $size = 200;
        $cellSize = 8;
        $cells = $size / $cellSize;

        $svg = '<svg width="' . $size . '" height="' . $size . '" xmlns="http://www.w3.org/2000/svg">';
        $svg .= '<rect width="' . $size . '" height="' . $size . '" fill="white"/>';

        // Generate random pattern that looks like QR code
        for ($x = 0; $x < $cells; $x++) {
            for ($y = 0; $y < $cells; $y++) {
                // Add corner squares (typical QR code pattern)
                if (($x < 7 && $y < 7) || ($x >= $cells - 7 && $y < 7) || ($x < 7 && $y >= $cells - 7)) {
                    if (($x == 0 || $x == 6 || $y == 0 || $y == 6) ||
                        ($x >= 2 && $x <= 4 && $y >= 2 && $y <= 4)) {
                        $svg .= '<rect x="' . ($x * $cellSize) . '" y="' . ($y * $cellSize) . '" width="' . $cellSize . '" height="' . $cellSize . '" fill="black"/>';
                    }
                } else {
                    // Random pattern for the rest
                    if (rand(0, 100) < 45) { // 45% chance of black cell
                        $svg .= '<rect x="' . ($x * $cellSize) . '" y="' . ($y * $cellSize) . '" width="' . $cellSize . '" height="' . $cellSize . '" fill="black"/>';
                    }
                }
            }
        }

        $svg .= '</svg>';

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
