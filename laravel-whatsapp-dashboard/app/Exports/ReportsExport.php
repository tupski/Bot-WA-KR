<?php

namespace App\Exports;

use App\Models\Transaction;
use App\Models\CsSummary;
use App\Models\DailySummary;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Carbon\Carbon;

class ReportsExport implements WithMultipleSheets
{
    protected $type;
    protected $period;

    public function __construct($type, $period)
    {
        $this->type = $type;
        $this->period = $period;
    }

    /**
     * @return array
     */
    public function sheets(): array
    {
        $sheets = [];

        if ($this->type === 'monthly') {
            $month = Carbon::parse($this->period . '-01');
            $sheets[] = new MonthlyTransactionsSheet($month);
            $sheets[] = new MonthlyCsPerformanceSheet($month);
            $sheets[] = new MonthlyApartmentPerformanceSheet($month);
            $sheets[] = new MonthlyDailySummarySheet($month);
        }

        return $sheets;
    }
}

// Individual sheet classes
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MonthlyTransactionsSheet implements FromCollection, WithHeadings, WithTitle, WithStyles
{
    protected $month;

    public function __construct($month)
    {
        $this->month = $month;
    }

    public function collection()
    {
        return Transaction::whereBetween('date_only', [
            $this->month->startOfMonth()->copy(),
            $this->month->endOfMonth()->copy()
        ])
        ->orderBy('date_only', 'desc')
        ->get()
        ->map(function ($transaction) {
            return [
                'date' => $transaction->date_only->format('Y-m-d'),
                'unit' => $transaction->unit,
                'location' => $transaction->location,
                'checkout_time' => $transaction->checkout_time,
                'duration' => $transaction->duration,
                'payment_method' => $transaction->payment_method,
                'cs_name' => $transaction->cs_name,
                'amount' => $transaction->amount,
                'commission' => $transaction->commission,
                'net_amount' => $transaction->net_amount,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Unit',
            'Apartemen',
            'Checkout Time',
            'Durasi',
            'Payment Method',
            'CS Name',
            'Amount',
            'Commission',
            'Net Amount',
        ];
    }

    public function title(): string
    {
        return 'Transactions ' . $this->month->format('M Y');
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

class MonthlyCsPerformanceSheet implements FromCollection, WithHeadings, WithTitle, WithStyles
{
    protected $month;

    public function __construct($month)
    {
        $this->month = $month;
    }

    public function collection()
    {
        return Transaction::whereBetween('date_only', [
            $this->month->startOfMonth()->copy(),
            $this->month->endOfMonth()->copy()
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
        ->get()
        ->map(function ($cs) {
            return [
                'cs_name' => $cs->cs_name,
                'total_bookings' => $cs->total_bookings,
                'total_revenue' => $cs->total_revenue,
                'total_commission' => $cs->total_commission,
                'avg_amount' => round($cs->avg_amount, 0),
            ];
        });
    }

    public function headings(): array
    {
        return [
            'CS Name',
            'Total Bookings',
            'Total Revenue',
            'Total Commission',
            'Avg Amount',
        ];
    }

    public function title(): string
    {
        return 'CS Performance ' . $this->month->format('M Y');
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

class MonthlyApartmentPerformanceSheet implements FromCollection, WithHeadings, WithTitle, WithStyles
{
    protected $month;

    public function __construct($month)
    {
        $this->month = $month;
    }

    public function collection()
    {
        return Transaction::whereBetween('date_only', [
            $this->month->startOfMonth()->copy(),
            $this->month->endOfMonth()->copy()
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
        ->get()
        ->map(function ($apartment) {
            return [
                'location' => $apartment->location,
                'total_bookings' => $apartment->total_bookings,
                'total_revenue' => $apartment->total_revenue,
                'total_commission' => $apartment->total_commission,
                'avg_amount' => round($apartment->avg_amount, 0),
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Apartemen',
            'Total Bookings',
            'Total Revenue',
            'Total Commission',
            'Avg Amount',
        ];
    }

    public function title(): string
    {
        return 'Apartment Performance ' . $this->month->format('M Y');
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

class MonthlyDailySummarySheet implements FromCollection, WithHeadings, WithTitle, WithStyles
{
    protected $month;

    public function __construct($month)
    {
        $this->month = $month;
    }

    public function collection()
    {
        return DailySummary::whereBetween('date', [
            $this->month->startOfMonth()->copy(),
            $this->month->endOfMonth()->copy()
        ])
        ->orderBy('date')
        ->get()
        ->map(function ($summary) {
            return [
                'date' => $summary->date->format('Y-m-d'),
                'total_bookings' => $summary->total_bookings,
                'total_cash' => $summary->total_cash,
                'total_transfer' => $summary->total_transfer,
                'total_gross' => $summary->total_gross,
                'total_commission' => $summary->total_commission,
                'net_revenue' => $summary->total_gross - $summary->total_commission,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Tanggal',
            'Total Bookings',
            'Total Cash',
            'Total Transfer',
            'Total Gross',
            'Total Commission',
            'Net Revenue',
        ];
    }

    public function title(): string
    {
        return 'Daily Summary ' . $this->month->format('M Y');
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
