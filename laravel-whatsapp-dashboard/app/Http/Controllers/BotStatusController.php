<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process as SymfonyProcess;

class BotStatusController extends Controller
{
    private $botPath;
    private $sessionPath;

    public function __construct()
    {
        $this->botPath = base_path('../'); // Root directory where bot is located
        $this->sessionPath = $this->botPath . 'session';
    }

    public function index()
    {
        $botStatus = $this->getBotStatus();
        $qrCode = $this->getQRCode();

        return view('bot-status.index', compact('botStatus', 'qrCode'));
    }

    public function status()
    {
        $status = $this->getBotStatus();

        // Add debug info
        $status['debug'] = [
            'bot_path' => $this->botPath,
            'session_path' => $this->sessionPath,
            'session_exists' => is_dir($this->sessionPath),
            'pid_file_exists' => file_exists($this->botPath . 'bot.pid'),
            'qr_file_exists' => file_exists($this->botPath . 'qr-code.txt')
        ];

        return response()->json($status);
    }

    public function qrCode()
    {
        $qrCode = $this->getQRCode();
        return response()->json(['qr_code' => $qrCode]);
    }

    /**
     * Start WhatsApp bot
     */
    public function start()
    {
        try {
            // Check if bot is already running
            if ($this->isBotRunning()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bot is already running'
                ]);
            }

            // Start bot process in background
            $process = new SymfonyProcess(['node', 'index.js'], $this->botPath);
            $process->setTimeout(null);
            $process->start();

            // Store process ID
            $this->storeBotPid($process->getPid());

            Log::info('WhatsApp Bot started', ['pid' => $process->getPid()]);

            return response()->json([
                'success' => true,
                'message' => 'Bot started successfully',
                'pid' => $process->getPid()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to start WhatsApp Bot: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to start bot: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stop WhatsApp bot
     */
    public function stop()
    {
        try {
            $pid = $this->getBotPid();

            if (!$pid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bot is not running'
                ]);
            }

            // Kill the process
            if (PHP_OS_FAMILY === 'Windows') {
                exec("taskkill /F /PID $pid");
            } else {
                exec("kill -9 $pid");
            }

            // Remove PID file
            $this->removeBotPid();

            Log::info('WhatsApp Bot stopped', ['pid' => $pid]);

            return response()->json([
                'success' => true,
                'message' => 'Bot stopped successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to stop WhatsApp Bot: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to stop bot: ' . $e->getMessage()
            ], 500);
        }
    }

    public function restart()
    {
        try {
            // Stop bot first
            $this->stop();

            // Wait a moment
            sleep(2);

            // Start bot again
            return $this->start();

        } catch (\Exception $e) {
            Log::error('Failed to restart WhatsApp Bot: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to restart bot: ' . $e->getMessage()
            ], 500);
        }
    }

    public function logout()
    {
        try {
            // Stop bot first
            $this->stop();

            // Clear session directory
            if (is_dir($this->sessionPath)) {
                $this->deleteDirectory($this->sessionPath);
            }

            Log::info('WhatsApp Bot logged out - session cleared');

            return response()->json([
                'success' => true,
                'message' => 'Bot logged out successfully. Session cleared.'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to logout WhatsApp Bot: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to logout: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get bot status
     */
    private function getBotStatus()
    {
        // Try to read from status file first (most accurate)
        $statusFile = storage_path('app/bot-status.json');
        $qrFile = storage_path('app/qr-code.txt');

        if (file_exists($statusFile)) {
            $statusData = json_decode(file_get_contents($statusFile), true);
            if ($statusData) {
                // Verify PID if status says connected
                if ($statusData['status'] === 'CONNECTED' && isset($statusData['pid'])) {
                    if (!$this->isProcessRunning($statusData['pid'])) {
                        $statusData['status'] = 'DISCONNECTED';
                        $statusData['last_seen'] = now()->toISOString();
                    }
                }

                // Check for QR code
                $statusData['qr_available'] = file_exists($qrFile);
                if ($statusData['qr_available']) {
                    $statusData['qr_code'] = file_get_contents($qrFile);
                }

                // Convert to expected format
                return [
                    'status' => strtolower($statusData['status']),
                    'is_running' => $statusData['status'] === 'CONNECTED',
                    'has_session' => $statusData['status'] === 'CONNECTED',
                    'pid' => $statusData['pid'] ?? null,
                    'session_path' => $this->sessionPath,
                    'last_seen' => $statusData['last_seen'] ?? null,
                    'qr_available' => $statusData['qr_available'] ?? false,
                    'qr_code' => $statusData['qr_code'] ?? null
                ];
            }
        }

        // Fallback to old method
        $isRunning = $this->isBotRunning();
        $hasSession = $this->hasSession();
        $pid = $this->getBotPid();

        $status = 'disconnected';
        if ($isRunning && $hasSession) {
            $status = 'connected';
        } elseif ($isRunning && !$hasSession) {
            $status = 'connecting';
        }

        return [
            'status' => $status,
            'is_running' => $isRunning,
            'has_session' => $hasSession,
            'pid' => $pid,
            'session_path' => $this->sessionPath,
            'qr_available' => file_exists($qrFile),
            'qr_code' => file_exists($qrFile) ? file_get_contents($qrFile) : null
        ];
    }

    /**
     * Check if bot is running
     */
    private function isBotRunning()
    {
        $pid = $this->getBotPid();
        return $this->isProcessRunning($pid);
    }

    /**
     * Check if a process is running by PID
     */
    private function isProcessRunning($pid)
    {
        if (!$pid) {
            return false;
        }

        // Check if process is still running
        if (PHP_OS_FAMILY === 'Windows') {
            $output = shell_exec("tasklist /FI \"PID eq $pid\" 2>NUL");
            return strpos($output, (string)$pid) !== false;
        } else {
            $output = shell_exec("ps -p $pid 2>/dev/null");
            return strpos($output, (string)$pid) !== false;
        }
    }

    /**
     * Check if WhatsApp session exists
     */
    private function hasSession()
    {
        return is_dir($this->sessionPath) && count(glob($this->sessionPath . '/*')) > 0;
    }

    /**
     * Get QR code from bot
     */
    private function getQRCode()
    {
        $qrFile = $this->botPath . 'qr-code.txt';

        if (file_exists($qrFile)) {
            $qrCode = file_get_contents($qrFile);
            return trim($qrCode);
        }

        return null;
    }

    /**
     * Store bot process ID
     */
    private function storeBotPid($pid)
    {
        file_put_contents($this->botPath . 'bot.pid', $pid);
    }

    /**
     * Get bot process ID
     */
    private function getBotPid()
    {
        $pidFile = $this->botPath . 'bot.pid';

        if (file_exists($pidFile)) {
            return (int) file_get_contents($pidFile);
        }

        return null;
    }

    /**
     * Remove bot PID file
     */
    private function removeBotPid()
    {
        $pidFile = $this->botPath . 'bot.pid';

        if (file_exists($pidFile)) {
            unlink($pidFile);
        }
    }

    /**
     * Delete directory recursively
     */
    private function deleteDirectory($dir)
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);

        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;

            if (is_dir($path)) {
                $this->deleteDirectory($path);
            } else {
                unlink($path);
            }
        }

        rmdir($dir);
    }
}
