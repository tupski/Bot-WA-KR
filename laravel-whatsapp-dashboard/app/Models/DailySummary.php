<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DailySummary extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'total_bookings',
        'total_cash',
        'total_transfer',
        'total_gross',
        'total_commission',
    ];

    protected $casts = [
        'date' => 'date',
        'total_bookings' => 'integer',
        'total_cash' => 'decimal:2',
        'total_transfer' => 'decimal:2',
        'total_gross' => 'decimal:2',
        'total_commission' => 'decimal:2',
    ];

    // Scopes
    public function scopeByDate($query, $date)
    {
        return $query->where('date', $date);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeLatest($query, $limit = 30)
    {
        return $query->orderBy('date', 'desc')->limit($limit);
    }

    // Accessors
    public function getNetRevenueAttribute()
    {
        return $this->total_gross - $this->total_commission;
    }

    public function getFormattedTotalCashAttribute()
    {
        return number_format($this->total_cash, 0, ',', '.');
    }

    public function getFormattedTotalTransferAttribute()
    {
        return number_format($this->total_transfer, 0, ',', '.');
    }

    public function getFormattedTotalGrossAttribute()
    {
        return number_format($this->total_gross, 0, ',', '.');
    }

    public function getFormattedTotalCommissionAttribute()
    {
        return number_format($this->total_commission, 0, ',', '.');
    }

    public function getFormattedNetRevenueAttribute()
    {
        return number_format($this->net_revenue, 0, ',', '.');
    }
}
