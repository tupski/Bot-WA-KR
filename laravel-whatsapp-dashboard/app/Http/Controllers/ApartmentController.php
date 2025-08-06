<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use App\Models\Transaction;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ApartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Apartment::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $apartments = $query->orderBy('name')->paginate(12)->withQueryString();

        // Get performance stats
        $currentMonth = Carbon::now()->startOfMonth();
        $performanceStats = $this->getPerformanceStats($currentMonth);

        return view('apartments.index', compact('apartments', 'performanceStats'));
    }

    public function create()
    {
        $whatsappGroups = WhatsAppGroup::orderBy('group_name')->get();
        return view('apartments.create', compact('whatsappGroups'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:apartments,name',
            'code' => 'required|string|max:20|unique:apartments,code',
            'whatsapp_group_id' => 'nullable|string|max:255',
            'whatsapp_group_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $apartment = Apartment::create($validated);
        ActivityLog::log('created', $apartment, null, $validated, 'Apartment created');

        return redirect()->route('apartments.index')->with('success', 'Apartemen berhasil ditambahkan.');
    }

    public function show(Apartment $apartment)
    {
        // Get statistics
        $stats = [
            'total_transactions' => Transaction::where('location', $apartment->name)->count(),
            'total_revenue' => Transaction::where('location', $apartment->name)->sum('amount'),
            'this_month_transactions' => Transaction::where('location', $apartment->name)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
            'avg_transaction' => Transaction::where('location', $apartment->name)->avg('amount') ?? 0,
        ];

        // Get recent transactions
        $recentTransactions = Transaction::where('location', $apartment->name)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get WhatsApp groups for this apartment
        $whatsappGroups = \App\Models\WhatsAppGroup::where('apartment_id', $apartment->id)->get();

        // Get chart data for last 30 days
        $chartData = $this->getChartData($apartment);

        return view('apartments.show', compact(
            'apartment',
            'stats',
            'recentTransactions',
            'whatsappGroups',
            'chartData'
        ));
    }

    public function edit(Apartment $apartment)
    {
        $whatsappGroups = WhatsAppGroup::orderBy('group_name')->get();
        return view('apartments.edit', compact('apartment', 'whatsappGroups'));
    }

    public function update(Request $request, Apartment $apartment)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:apartments,name,' . $apartment->id,
            'code' => 'required|string|max:20|unique:apartments,code,' . $apartment->id,
            'whatsapp_group_id' => 'nullable|string|max:255',
            'whatsapp_group_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $oldValues = $apartment->toArray();
        $apartment->update($validated);
        ActivityLog::log('updated', $apartment, $oldValues, $validated, 'Apartment updated');

        return redirect()->route('apartments.index')->with('success', 'Apartemen berhasil diperbarui.');
    }

    public function destroy(Apartment $apartment)
    {
        $hasTransactions = Transaction::where('location', $apartment->name)->exists();

        if ($hasTransactions) {
            return redirect()->route('apartments.index')
                ->with('error', 'Tidak dapat menghapus apartemen yang memiliki transaksi.');
        }

        $oldValues = $apartment->toArray();
        $apartment->delete();
        ActivityLog::log('deleted', $apartment, $oldValues, null, 'Apartment deleted');

        return redirect()->route('apartments.index')->with('success', 'Apartemen berhasil dihapus.');
    }

    private function getPerformanceStats($month)
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        return Transaction::whereBetween('date_only', [$start, $end])
            ->selectRaw('location, COUNT(*) as total_bookings, SUM(amount) as total_revenue')
            ->groupBy('location')->orderBy('total_revenue', 'desc')->get();
    }

    private function getApartmentStats($apartment, $startDate, $endDate)
    {
        $transactions = Transaction::where('location', $apartment->name)
            ->whereBetween('date_only', [$startDate, $endDate])->get();

        return [
            'total_bookings' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'avg_amount' => $transactions->avg('amount') ?? 0,
        ];
    }

    /**
     * Get chart data for apartment performance
     */
    private function getChartData($apartment)
    {
        $labels = [];
        $transactions = [];
        $revenue = [];

        // Get data for last 30 days
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $labels[] = $date->format('M d');

            $dayTransactions = Transaction::where('location', $apartment->name)
                ->whereDate('created_at', $date)
                ->get();

            $transactions[] = $dayTransactions->count();
            $revenue[] = round($dayTransactions->sum('amount') / 1000, 1); // In thousands
        }

        return [
            'labels' => $labels,
            'transactions' => $transactions,
            'revenue' => $revenue,
        ];
    }
}
