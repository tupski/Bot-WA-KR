<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\DailySummary;
use App\Models\CsSummary;
use App\Models\Apartment;
use App\Models\CustomerService;
use App\Models\ProcessedMessage;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    // Middleware handled in routes

    public function index()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $thisMonth = Carbon::now()->startOfMonth();

        // Today's statistics
        $todayStats = $this->getTodayStatistics($today);

        // Yesterday's statistics for comparison
        $yesterdayStats = $this->getYesterdayStatistics($yesterday);

        // Monthly statistics
        $monthlyStats = $this->getMonthlyStatistics($thisMonth);

        // Recent transactions
        $recentTransactions = Transaction::byDate($today)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Top performing CS today
        $topCs = CsSummary::byDate($today)
            ->orderBy('total_commission', 'desc')
            ->limit(5)
            ->get();

        // Apartment performance today
        $apartmentStats = $this->getApartmentStatistics($today);

        // Chart data for last 7 days
        $chartData = $this->getChartData();

        // Bot status
        $botStatus = $this->getBotStatus();

        return view('dashboard', compact(
            'todayStats',
            'yesterdayStats',
            'monthlyStats',
            'recentTransactions',
            'topCs',
            'apartmentStats',
            'chartData',
            'botStatus'
        ));
    }

    private function getTodayStatistics($date)
    {
        $transactions = Transaction::byDate($date)->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'total_cash' => $transactions->where('payment_method', 'Cash')->sum('amount'),
            'total_transfer' => $transactions->where('payment_method', 'TF')->sum('amount'),
            'net_revenue' => $transactions->sum('net_amount'),
            'avg_booking_value' => $transactions->avg('amount') ?? 0,
        ];
    }

    private function getYesterdayStatistics($date)
    {
        $transactions = Transaction::byDate($date)->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
        ];
    }

    private function getMonthlyStatistics($startDate)
    {
        $transactions = Transaction::where('date_only', '>=', $startDate)->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'unique_cs' => $transactions->pluck('marketing_name')->unique()->count(),
            'active_apartments' => $transactions->pluck('location')->unique()->count(),
        ];
    }

    private function getApartmentStatistics($date)
    {
        return Transaction::byDate($date)
            ->selectRaw('
                location,
                COUNT(*) as booking_count,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission
            ')
            ->groupBy('location')
            ->orderBy('total_revenue', 'desc')
            ->get();
    }

    private function getChartData()
    {
        $last7Days = collect();

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dailySummary = DailySummary::byDate($date)->first();

            $last7Days->push([
                'date' => $date->format('Y-m-d'),
                'date_formatted' => $date->format('d M'),
                'bookings' => $dailySummary->total_bookings ?? 0,
                'revenue' => $dailySummary->total_gross ?? 0,
                'commission' => $dailySummary->total_commission ?? 0,
            ]);
        }

        return $last7Days;
    }

    private function getBotStatus()
    {
        $lastMessage = ProcessedMessage::orderBy('processed_at', 'desc')->first();
        $isOnline = $lastMessage && $lastMessage->processed_at->diffInMinutes(now()) < 10;

        return [
            'is_online' => $isOnline,
            'last_activity' => $lastMessage?->processed_at,
            'total_messages_today' => ProcessedMessage::today()->count(),
            'status_text' => $isOnline ? 'Online' : 'Offline',
            'status_color' => $isOnline ? 'success' : 'danger',
        ];
    }
}
