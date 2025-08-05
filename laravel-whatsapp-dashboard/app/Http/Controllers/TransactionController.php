<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Apartment;
use App\Models\CustomerService;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\TransactionsExport;

class TransactionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Transaction::query();

        // Apply filters
        if ($request->filled('date_from')) {
            $query->where('date_only', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('date_only', '<=', $request->date_to);
        }

        if ($request->filled('location')) {
            $query->where('location', $request->location);
        }

        if ($request->filled('customer_name')) {
            $query->where('customer_name', $request->customer_name);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('unit', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('cs_name', 'like', "%{$search}%")
                  ->orWhere('message_id', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $transactions = $query->paginate(20)->withQueryString();

        // Get filter options
        $apartments = Apartment::active()->pluck('name', 'name');
        $customerServices = CustomerService::active()->pluck('name', 'name');
        $paymentMethods = ['Cash', 'TF'];

        // Statistics for current filter
        $stats = $this->getFilteredStats($request);

        return view('transactions.index', compact(
            'transactions',
            'apartments',
            'customerServices',
            'paymentMethods',
            'stats'
        ));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $apartments = Apartment::active()->get();
        $customerServices = CustomerService::active()->get();
        $paymentMethods = ['Cash', 'TF'];

        return view('transactions.create', compact(
            'apartments',
            'customerServices',
            'paymentMethods'
        ));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'location' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'checkout_time' => 'required|string|max:100',
            'duration' => 'required|string|max:50',
            'payment_method' => 'required|in:Cash,TF',
            'customer_name' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0',
            'commission' => 'required|numeric|min:0',
            'date_only' => 'required|date',
            'skip_financial' => 'boolean',
        ]);

        $validated['net_amount'] = $validated['amount'] - $validated['commission'];
        $validated['message_id'] = 'manual_' . time() . '_' . rand(1000, 9999);

        $transaction = Transaction::create($validated);

        ActivityLog::log('created', $transaction, null, $validated, 'Manual transaction created');

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Transaction $transaction)
    {
        return view('transactions.show', compact('transaction'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Transaction $transaction)
    {
        $apartments = Apartment::active()->get();
        $customerServices = CustomerService::active()->get();
        $paymentMethods = ['Cash', 'TF'];

        return view('transactions.edit', compact(
            'transaction',
            'apartments',
            'customerServices',
            'paymentMethods'
        ));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'location' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'checkout_time' => 'required|string|max:100',
            'duration' => 'required|string|max:50',
            'payment_method' => 'required|in:Cash,TF',
            'customer_name' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0',
            'commission' => 'required|numeric|min:0',
            'date_only' => 'required|date',
            'skip_financial' => 'boolean',
        ]);

        $validated['net_amount'] = $validated['amount'] - $validated['commission'];

        $oldValues = $transaction->toArray();
        $transaction->update($validated);

        ActivityLog::log('updated', $transaction, $oldValues, $validated, 'Transaction updated');

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Transaction $transaction)
    {
        $oldValues = $transaction->toArray();
        $transaction->delete();

        ActivityLog::log('deleted', $transaction, $oldValues, null, 'Transaction deleted');

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil dihapus.');
    }

    /**
     * Export transactions to Excel
     */
    public function export(Request $request)
    {
        $query = Transaction::query();

        // Apply same filters as index
        if ($request->filled('date_from')) {
            $query->where('date_only', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('date_only', '<=', $request->date_to);
        }

        if ($request->filled('location')) {
            $query->where('location', $request->location);
        }

        if ($request->filled('cs_name')) {
            $query->where('cs_name', $request->cs_name);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        $transactions = $query->orderBy('date_only', 'desc')->get();

        $filename = 'transactions_' . now()->format('Y-m-d_H-i-s') . '.xlsx';

        return Excel::download(new TransactionsExport($transactions), $filename);
    }

    /**
     * Get filtered statistics
     */
    private function getFilteredStats(Request $request)
    {
        $query = Transaction::query();

        // Apply same filters
        if ($request->filled('date_from')) {
            $query->where('date_only', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('date_only', '<=', $request->date_to);
        }

        if ($request->filled('location')) {
            $query->where('location', $request->location);
        }

        if ($request->filled('cs_name')) {
            $query->where('cs_name', $request->cs_name);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        $transactions = $query->get();

        return [
            'total_transactions' => $transactions->count(),
            'total_revenue' => $transactions->sum('amount'),
            'total_commission' => $transactions->sum('commission'),
            'total_net' => $transactions->sum('net_amount'),
            'total_cash' => $transactions->where('payment_method', 'Cash')->sum('amount'),
            'total_transfer' => $transactions->where('payment_method', 'TF')->sum('amount'),
        ];
    }
}
