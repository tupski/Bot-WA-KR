<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class MonitoringController extends Controller
{
    public function index()
    {
        // System health metrics
        $systemHealth = $this->getSystemHealth();

        // Recent activities
        $recentActivities = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        // Performance metrics
        $performanceMetrics = $this->getPerformanceMetrics();

        // Error logs
        $errorLogs = $this->getRecentErrors();

        return view('monitoring.index', compact(
            'systemHealth',
            'recentActivities',
            'performanceMetrics',
            'errorLogs'
        ));
    }

    public function logs(Request $request)
    {
        $query = ActivityLog::with('user');

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Search in description
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(50)->withQueryString();
        $users = User::all();
        $actions = ActivityLog::distinct()->pluck('action');

        return view('monitoring.logs', compact('logs', 'users', 'actions'));
    }

    public function systemStatus()
    {
        $status = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'storage' => $this->checkStorage(),
            'queue' => $this->checkQueue(),
            'api' => $this->checkApiEndpoints(),
        ];

        return response()->json($status);
    }

    private function getSystemHealth()
    {
        return [
            'uptime' => $this->getUptime(),
            'memory_usage' => $this->getMemoryUsage(),
            'disk_usage' => $this->getDiskUsage(),
            'database_connections' => $this->getDatabaseConnections(),
            'active_users' => $this->getActiveUsers(),
            'total_transactions' => Transaction::count(),
            'today_transactions' => Transaction::whereDate('created_at', today())->count(),
        ];
    }

    private function getPerformanceMetrics()
    {
        return [
            'avg_response_time' => Cache::remember('avg_response_time', 300, function() {
                return rand(50, 200) . 'ms'; // Placeholder
            }),
            'requests_per_minute' => Cache::remember('requests_per_minute', 60, function() {
                return rand(10, 50); // Placeholder
            }),
            'error_rate' => Cache::remember('error_rate', 300, function() {
                return rand(0, 5) . '%'; // Placeholder
            }),
            'cpu_usage' => $this->getCpuUsage(),
        ];
    }

    private function getRecentErrors()
    {
        // This would typically read from log files
        return collect([
            [
                'timestamp' => now()->subMinutes(5),
                'level' => 'ERROR',
                'message' => 'Database connection timeout',
                'context' => 'webhook processing'
            ],
            [
                'timestamp' => now()->subHours(2),
                'level' => 'WARNING',
                'message' => 'High memory usage detected',
                'context' => 'report generation'
            ]
        ]);
    }

    private function checkDatabase()
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'healthy', 'message' => 'Database connection OK'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Database connection failed'];
        }
    }

    private function checkCache()
    {
        try {
            Cache::put('health_check', 'ok', 10);
            $value = Cache::get('health_check');
            return ['status' => $value === 'ok' ? 'healthy' : 'error', 'message' => 'Cache working'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Cache not working'];
        }
    }

    private function checkStorage()
    {
        $freeSpace = disk_free_space(storage_path());
        $totalSpace = disk_total_space(storage_path());
        $usedPercentage = (($totalSpace - $freeSpace) / $totalSpace) * 100;

        return [
            'status' => $usedPercentage < 90 ? 'healthy' : 'warning',
            'message' => 'Disk usage: ' . round($usedPercentage, 1) . '%'
        ];
    }

    private function checkQueue()
    {
        // Placeholder - would check actual queue status
        return ['status' => 'healthy', 'message' => 'Queue processing normally'];
    }

    private function checkApiEndpoints()
    {
        // Placeholder - would check API endpoint health
        return ['status' => 'healthy', 'message' => 'All API endpoints responding'];
    }

    private function getUptime()
    {
        // Placeholder - would calculate actual uptime
        return '5 days, 12 hours';
    }

    private function getMemoryUsage()
    {
        return round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB';
    }

    private function getDiskUsage()
    {
        $freeSpace = disk_free_space(storage_path());
        $totalSpace = disk_total_space(storage_path());
        $usedPercentage = (($totalSpace - $freeSpace) / $totalSpace) * 100;

        return round($usedPercentage, 1) . '%';
    }

    private function getDatabaseConnections()
    {
        try {
            $connections = DB::select('SHOW STATUS LIKE "Threads_connected"');
            return $connections[0]->Value ?? 'N/A';
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    private function getActiveUsers()
    {
        return User::where('last_login_at', '>=', now()->subHours(24))->count();
    }

    private function getCpuUsage()
    {
        // Placeholder - would get actual CPU usage
        return rand(10, 80) . '%';
    }
}
