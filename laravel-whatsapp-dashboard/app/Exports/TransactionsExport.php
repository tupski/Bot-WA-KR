<?php

namespace App\Exports;

use App\Models\Transaction;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TransactionsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $transactions;

    public function __construct($transactions)
    {
        $this->transactions = $transactions;
    }

    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return $this->transactions;
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'ID',
            'Tanggal',
            'Waktu',
            'Apartemen',
            'Unit',
            'Checkout Time',
            'Durasi',
            'Payment Method',
            'CS Name',
            'Amount',
            'Commission',
            'Net Amount',
            'Skip Financial',
            'Message ID',
        ];
    }

    /**
     * @param Transaction $transaction
     */
    public function map($transaction): array
    {
        return [
            $transaction->id,
            $transaction->date_only->format('Y-m-d'),
            $transaction->created_at->format('H:i:s'),
            $transaction->location,
            $transaction->unit,
            $transaction->checkout_time,
            $transaction->duration,
            $transaction->payment_method,
            $transaction->cs_name,
            $transaction->amount,
            $transaction->commission,
            $transaction->net_amount,
            $transaction->skip_financial ? 'Yes' : 'No',
            $transaction->message_id,
        ];
    }

    /**
     * @param Worksheet $sheet
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as bold text.
            1 => ['font' => ['bold' => true]],
        ];
    }
}
