<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\CustomerService;
use App\Models\Apartment;
use App\Models\DailySummary;
use Illuminate\Http\Request;
use Carbon\Carbon;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ExportImportController extends Controller
{
    public function index()
    {
        return view('export-import.index');
    }

    public function exportPdf(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:daily,monthly,custom',
            'date' => 'required_if:type,daily|date',
            'month' => 'required_if:type,monthly|date_format:Y-m',
            'start_date' => 'required_if:type,custom|date',
            'end_date' => 'required_if:type,custom|date|after_or_equal:start_date',
        ]);

        $data = $this->getReportData($validated);

        $pdf = Pdf::loadView('exports.pdf-report', $data);

        $filename = "report_{$validated['type']}_" . now()->format('Y-m-d_H-i-s') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportCsv(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:transactions,cs,apartments',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $filename = "export_{$validated['type']}_" . now()->format('Y-m-d_H-i-s') . '.csv';

        switch ($validated['type']) {
            case 'transactions':
                return $this->exportTransactionsCsv($validated, $filename);
            case 'cs':
                return $this->exportCsCsv($filename);
            case 'apartments':
                return $this->exportApartmentsCsv($filename);
        }
    }

    public function backup()
    {
        $filename = 'backup_' . now()->format('Y-m-d_H-i-s') . '.json';

        $data = [
            'transactions' => Transaction::all(),
            'customer_services' => CustomerService::all(),
            'apartments' => Apartment::all(),
            'daily_summaries' => DailySummary::all(),
            'exported_at' => now()->toISOString(),
        ];

        $json = json_encode($data, JSON_PRETTY_PRINT);

        Storage::disk('local')->put('backups/' . $filename, $json);

        return response()->download(storage_path('app/backups/' . $filename));
    }

    public function restore(Request $request)
    {
        $request->validate([
            'backup_file' => 'required|file|mimes:json',
        ]);

        $file = $request->file('backup_file');
        $content = file_get_contents($file->getPathname());
        $data = json_decode($content, true);

        if (!$data || !isset($data['transactions'])) {
            return back()->with('error', 'File backup tidak valid.');
        }

        // This is a simplified restore - in production, you'd want more validation
        // and potentially a confirmation step

        return back()->with('success', 'Backup berhasil diupload. Fitur restore akan diimplementasikan dengan konfirmasi admin.');
    }

    private function getReportData($params)
    {
        switch ($params['type']) {
            case 'daily':
                $date = Carbon::parse($params['date']);
                return [
                    'type' => 'daily',
                    'title' => 'Laporan Harian - ' . $date->format('d F Y'),
                    'date' => $date,
                    'transactions' => Transaction::byDate($date)->get(),
                    'summary' => DailySummary::byDate($date)->first(),
                ];

            case 'monthly':
                $month = Carbon::parse($params['month'] . '-01');
                return [
                    'type' => 'monthly',
                    'title' => 'Laporan Bulanan - ' . $month->format('F Y'),
                    'month' => $month,
                    'transactions' => Transaction::whereBetween('date_only', [
                        $month->startOfMonth()->copy(),
                        $month->endOfMonth()->copy()
                    ])->get(),
                    'daily_summaries' => DailySummary::whereBetween('date', [
                        $month->startOfMonth()->copy(),
                        $month->endOfMonth()->copy()
                    ])->get(),
                ];

            case 'custom':
                $start = Carbon::parse($params['start_date']);
                $end = Carbon::parse($params['end_date']);
                return [
                    'type' => 'custom',
                    'title' => 'Laporan Custom - ' . $start->format('d/m/Y') . ' s/d ' . $end->format('d/m/Y'),
                    'start_date' => $start,
                    'end_date' => $end,
                    'transactions' => Transaction::whereBetween('date_only', [$start, $end])->get(),
                ];
        }
    }

    private function exportTransactionsCsv($params, $filename)
    {
        $query = Transaction::query();

        if (isset($params['start_date']) && isset($params['end_date'])) {
            $query->whereBetween('date_only', [$params['start_date'], $params['end_date']]);
        }

        $transactions = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($transactions) {
            $file = fopen('php://output', 'w');

            // Header
            fputcsv($file, [
                'ID', 'Date', 'Unit', 'Location', 'Checkout Time', 'Duration',
                'Payment Method', 'CS Name', 'Amount', 'Commission', 'Net Amount'
            ]);

            // Data
            foreach ($transactions as $transaction) {
                fputcsv($file, [
                    $transaction->id,
                    $transaction->date_only->format('Y-m-d'),
                    $transaction->unit,
                    $transaction->location,
                    $transaction->checkout_time,
                    $transaction->duration,
                    $transaction->payment_method,
                    $transaction->cs_name,
                    $transaction->amount,
                    $transaction->commission,
                    $transaction->net_amount,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportCsCsv($filename)
    {
        $cs = CustomerService::all();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($cs) {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'ID', 'Name', 'Full Name', 'Phone', 'Email', 'Commission Rate',
                'Target Monthly', 'Join Date', 'Status'
            ]);

            foreach ($cs as $item) {
                fputcsv($file, [
                    $item->id,
                    $item->name,
                    $item->full_name,
                    $item->phone,
                    $item->email,
                    $item->commission_rate,
                    $item->target_monthly,
                    $item->join_date ? $item->join_date->format('Y-m-d') : '',
                    $item->status,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportApartmentsCsv($filename)
    {
        $apartments = Apartment::all();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($apartments) {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'ID', 'Name', 'Code', 'WhatsApp Group ID', 'WhatsApp Group Name',
                'Description', 'Status'
            ]);

            foreach ($apartments as $apartment) {
                fputcsv($file, [
                    $apartment->id,
                    $apartment->name,
                    $apartment->code,
                    $apartment->whatsapp_group_id,
                    $apartment->whatsapp_group_name,
                    $apartment->description,
                    $apartment->status,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
