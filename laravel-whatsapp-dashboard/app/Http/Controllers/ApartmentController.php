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
        return view('apartments.create');
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
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();

        $todayStats = $this->getApartmentStats($apartment, $today, $today);
        $monthlyStats = $this->getApartmentStats($apartment, $thisMonth, Carbon::now());

        $recentTransactions = Transaction::where('location', $apartment->name)
            ->orderBy('created_at', 'desc')->limit(10)->get();

        return view('apartments.show', compact('apartment', 'todayStats', 'monthlyStats', 'recentTransactions'));
    }

    public function edit(Apartment $apartment)
    {
        return view('apartments.edit', compact('apartment'));
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
}
