<?php

namespace App\Http\Controllers;

use App\Models\CustomerService;
use App\Models\Transaction;
use App\Models\CsSummary;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CustomerServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CustomerService::query();

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        // Sort
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $customerServices = $query->paginate(15)->withQueryString();

        // Get performance stats for current month
        $currentMonth = Carbon::now()->startOfMonth();
        $performanceStats = $this->getPerformanceStats($currentMonth);

        return view('customer-services.index', compact(
            'customerServices',
            'performanceStats'
        ));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return view('customer-services.create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:customer_services,name',
            'full_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'commission_rate' => 'required|numeric|min:0|max:100',
            'target_monthly' => 'required|numeric|min:0',
            'join_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $customerService = CustomerService::create($validated);

        ActivityLog::log('created', $customerService, null, $validated, 'Customer Service created');

        return redirect()->route('customer-services.index')
            ->with('success', 'Customer Service berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(CustomerService $customerService)
    {
        // Get performance data for different periods
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        // Today's performance
        $todayPerformance = $this->getCsPerformance($customerService, $today, $today);

        // This month's performance
        $thisMonthPerformance = $this->getCsPerformance($customerService, $thisMonth, Carbon::now());

        // Last month's performance
        $lastMonthPerformance = $this->getCsPerformance($customerService, $lastMonth, $lastMonth->copy()->endOfMonth());

        // Recent transactions
        $recentTransactions = Transaction::where('cs_name', $customerService->name)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Monthly trend (last 6 months)
        $monthlyTrend = $this->getMonthlyTrend($customerService);

        return view('customer-services.show', compact(
            'customerService',
            'todayPerformance',
            'thisMonthPerformance',
            'lastMonthPerformance',
            'recentTransactions',
            'monthlyTrend'
        ));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(CustomerService $customerService)
    {
        return view('customer-services.edit', compact('customerService'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CustomerService $customerService)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:customer_services,name,' . $customerService->id,
            'full_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'commission_rate' => 'required|numeric|min:0|max:100',
            'target_monthly' => 'required|numeric|min:0',
            'join_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $oldValues = $customerService->toArray();
        $customerService->update($validated);

        ActivityLog::log('updated', $customerService, $oldValues, $validated, 'Customer Service updated');

        return redirect()->route('customer-services.index')
            ->with('success', 'Customer Service berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CustomerService $customerService)
    {
        // Check if CS has transactions
        $hasTransactions = Transaction::where('cs_name', $customerService->name)->exists();

        if ($hasTransactions) {
            return redirect()->route('customer-services.index')
                ->with('error', 'Tidak dapat menghapus CS yang memiliki transaksi. Nonaktifkan saja CS ini.');
        }

        $oldValues = $customerService->toArray();
        $customerService->delete();

        ActivityLog::log('deleted', $customerService, $oldValues, null, 'Customer Service deleted');

        return redirect()->route('customer-services.index')
            ->with('success', 'Customer Service berhasil dihapus.');
    }

    /**
     * Performance ranking page
     */
    public function ranking(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $selectedMonth = Carbon::parse($month . '-01');

        $rankings = Transaction::whereBetween('date_only', [
            $selectedMonth->startOfMonth()->copy(),
            $selectedMonth->endOfMonth()->copy()
        ])
        ->selectRaw('
            cs_name,
            COUNT(*) as total_bookings,
            SUM(amount) as total_revenue,
            SUM(commission) as total_commission,
            AVG(amount) as avg_amount
        ')
        ->groupBy('cs_name')
        ->orderBy('total_commission', 'desc')
        ->get();

        return view('customer-services.ranking', compact('rankings', 'selectedMonth'));
    }

    /**
     * Get performance stats for all CS
     */
    private function getPerformanceStats($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('
                cs_name,
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission
            ')
            ->groupBy('cs_name')
            ->orderBy('total_commission', 'desc')
            ->get();
    }

    /**
     * Get performance data for specific CS
     */
    private function getCsPerformance($cs, $startDate, $endDate)
    {
        $transactions = Transaction::where('cs_name', $cs->name)
            ->whereBetween('date_only', [$startDate, $endDate])
            ->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'total_cash' => $transactions->where('payment_method', 'Cash')->sum('amount'),
            'total_transfer' => $transactions->where('payment_method', 'TF')->sum('amount'),
            'avg_amount' => $transactions->avg('amount') ?? 0,
        ];
    }

    /**
     * Get monthly trend for CS
     */
    private function getMonthlyTrend($cs)
    {
        $months = collect();

        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();

            $performance = $this->getCsPerformance($cs, $start, $end);

            $months->push([
                'month' => $month->format('M Y'),
                'month_short' => $month->format('M'),
                'performance' => $performance
            ]);
        }

        return $months;
    }
}
