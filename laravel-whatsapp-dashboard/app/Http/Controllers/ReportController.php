<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\CsSummary;
use App\Models\DailySummary;
use App\Models\Apartment;
use App\Models\CustomerService;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ReportsExport;

class ReportController extends Controller
{
    public function index()
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        // Current month stats
        $currentMonthStats = $this->getMonthlyStats($currentMonth);
        $lastMonthStats = $this->getMonthlyStats($lastMonth);

        // Daily trend for current month
        $dailyTrend = $this->getDailyTrend($currentMonth);

        // Top performers
        $topMarketing = $this->getTopMarketing($currentMonth);
        $topApartments = $this->getTopApartments($currentMonth);

        // Payment method breakdown
        $paymentBreakdown = $this->getPaymentBreakdown($currentMonth);

        return view('reports.index', compact(
            'currentMonthStats',
            'lastMonthStats',
            'dailyTrend',
            'topMarketing',
            'topApartments',
            'paymentBreakdown'
        ));
    }

    public function daily(Request $request)
    {
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        $selectedDate = Carbon::parse($date);

        // Use bot logic: business day from 12:00 yesterday to 11:59 today
        $startDateTime = $selectedDate->copy()->subDay()->setTime(12, 0, 0);
        $endDateTime = $selectedDate->copy()->setTime(11, 59, 59);

        // Daily summary (keep using date_only for compatibility)
        $dailySummary = DailySummary::byDate($selectedDate)->first();

        // Transactions using bot business day logic
        $transactions = Transaction::whereBetween('created_at', [$startDateTime, $endDateTime])
            ->orderBy('created_at', 'desc')
            ->get();

        // Marketing performance for the day
        $csPerformance = CsSummary::byDate($selectedDate)
            ->orderBy('total_commission', 'desc')
            ->get();

        // Apartment performance using bot business day logic
        $apartmentPerformance = Transaction::whereBetween('created_at', [$startDateTime, $endDateTime])
            ->selectRaw('
                location,
                COUNT(*) as booking_count,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission,
                AVG(amount) as avg_amount
            ')
            ->groupBy('location')
            ->orderBy('total_revenue', 'desc')
            ->get();

        // Hourly breakdown using bot business day logic
        $hourlyBreakdown = Transaction::whereBetween('created_at', [$startDateTime, $endDateTime])
            ->selectRaw('
                HOUR(created_at) as hour,
                COUNT(*) as booking_count,
                SUM(amount) as total_revenue
            ')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        return view('reports.daily', compact(
            'selectedDate',
            'dailySummary',
            'transactions',
            'csPerformance',
            'apartmentPerformance',
            'hourlyBreakdown'
        ));
    }

    public function monthly(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $selectedMonth = Carbon::parse($month . '-01');

        // Monthly summary
        $monthlyStats = $this->getMonthlyStats($selectedMonth);

        // Daily breakdown for the month
        $dailyBreakdown = DailySummary::whereBetween('date', [
            $selectedMonth->startOfMonth()->copy(),
            $selectedMonth->endOfMonth()->copy()
        ])->orderBy('date')->get();

        // CS performance for the month
        $csPerformance = Transaction::whereBetween('date_only', [
            $selectedMonth->startOfMonth()->copy(),
            $selectedMonth->endOfMonth()->copy()
        ])
        ->selectRaw('
            customer_name,
            COUNT(*) as total_bookings,
            SUM(amount) as total_revenue,
            SUM(commission) as total_commission,
            AVG(amount) as avg_amount
        ')
        ->groupBy('customer_name')
        ->orderBy('total_commission', 'desc')
        ->get();

        // Apartment performance for the month
        $apartmentPerformance = Transaction::whereBetween('date_only', [
            $selectedMonth->startOfMonth()->copy(),
            $selectedMonth->endOfMonth()->copy()
        ])
        ->selectRaw('
            location,
            COUNT(*) as total_bookings,
            SUM(amount) as total_revenue,
            SUM(commission) as total_commission,
            AVG(amount) as avg_amount
        ')
        ->groupBy('location')
        ->orderBy('total_revenue', 'desc')
        ->get();

        return view('reports.monthly', compact(
            'selectedMonth',
            'monthlyStats',
            'dailyBreakdown',
            'csPerformance',
            'apartmentPerformance'
        ));
    }

    public function custom(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // Custom period stats
        $customStats = $this->getCustomPeriodStats($start, $end);

        // Daily breakdown
        $dailyBreakdown = DailySummary::whereBetween('date', [$start, $end])
            ->orderBy('date')
            ->get();

        // Customer performance
        $csPerformance = Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                customer_name,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission,
                AVG(amount) as avg_amount
            ')
            ->groupBy('customer_name')
            ->orderBy('total_commission', 'desc')
            ->get();

        // Apartment performance
        $apartmentPerformance = Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                location,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission,
                AVG(amount) as avg_amount
            ')
            ->groupBy('location')
            ->orderBy('total_revenue', 'desc')
            ->get();

        return view('reports.custom', compact(
            'start',
            'end',
            'customStats',
            'dailyBreakdown',
            'csPerformance',
            'apartmentPerformance'
        ));
    }

    public function export(Request $request)
    {
        $type = $request->get('type', 'monthly');
        $period = $request->get('period', Carbon::now()->format('Y-m'));

        $filename = "report_{$type}_{$period}_" . now()->format('Y-m-d_H-i-s') . '.xlsx';

        return Excel::download(new ReportsExport($type, $period), $filename);
    }

    private function getMonthlyStats($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        $transactions = Transaction::whereBetween('date_only', [$start, $end])->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'total_net' => $transactions->sum('net_amount'),
            'total_cash' => $transactions->where('payment_method', 'Cash')->sum('amount'),
            'total_transfer' => $transactions->where('payment_method', 'TF')->sum('amount'),
            'avg_booking_value' => $transactions->avg('amount') ?? 0,
            'unique_marketing' => $transactions->pluck('customer_name')->unique()->count(),
            'unique_apartments' => $transactions->pluck('location')->unique()->count(),
        ];
    }

    private function getDailyTrend($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return DailySummary::whereBetween('date', [$start, $end])
            ->orderBy('date')
            ->get();
    }

    private function getTopMarketing($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                marketing_name,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission
            ')
            ->groupBy('marketing_name')
            ->orderBy('total_commission', 'desc')
            ->limit(5)
            ->get();
    }

    private function getTopApartments($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                location,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission
            ')
            ->groupBy('location')
            ->orderBy('total_revenue', 'desc')
            ->limit(5)
            ->get();
    }

    private function getPaymentBreakdown($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                payment_method,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue
            ')
            ->groupBy('payment_method')
            ->get();
    }

    private function getCustomPeriodStats($start, $end)
    {
        $transactions = Transaction::whereBetween('date_only', [$start, $end])->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'total_net' => $transactions->sum('net_amount'),
            'total_cash' => $transactions->where('payment_method', 'Cash')->sum('amount'),
            'total_transfer' => $transactions->where('payment_method', 'TF')->sum('amount'),
            'avg_booking_value' => $transactions->avg('amount') ?? 0,
            'unique_marketing' => $transactions->pluck('marketing_name')->unique()->count(),
            'unique_apartments' => $transactions->pluck('location')->unique()->count(),
            'days_count' => $start->diffInDays($end) + 1,
        ];
    }
}
