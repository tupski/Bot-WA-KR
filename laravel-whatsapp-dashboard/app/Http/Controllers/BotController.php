<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process as SymfonyProcess;

class BotController extends Controller
{
    private $botPath;
    private $sessionPath;
    
    public function __construct()
    {
        $this->middleware('auth');
        $this->botPath = base_path('../'); // Root directory where bot is located
        $this->sessionPath = $this->botPath . 'session';
    }

    /**
     * Show bot status page
     */
    public function index()
    {
        $status = $this->getBotStatus();
        $qrCode = $this->getQRCode();
        
        return view('bot.index', compact('status', 'qrCode'));
    }

    /**
     * Get bot status via API
     */
    public function status()
    {
        $status = $this->getBotStatus();
        return response()->json($status);
    }

    /**
     * Get QR code for WhatsApp connection
     */
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
            $command = 'node index.js';
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

    /**
     * Restart WhatsApp bot
     */
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

    /**
     * Logout from WhatsApp (clear session)
     */
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
            'session_path' => $this->sessionPath
        ];
    }

    /**
     * Check if bot is running
     */
    private function isBotRunning()
    {
        $pid = $this->getBotPid();
        
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
