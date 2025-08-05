<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CsSummary extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'cs_name',
        'total_bookings',
        'total_cash',
        'total_transfer',
        'total_commission',
    ];

    protected $casts = [
        'date' => 'date',
        'total_bookings' => 'integer',
        'total_cash' => 'decimal:2',
        'total_transfer' => 'decimal:2',
        'total_commission' => 'decimal:2',
    ];

    // Relationships
    public function customerService(): BelongsTo
    {
        return $this->belongsTo(CustomerService::class, 'cs_name', 'name');
    }

    // Scopes
    public function scopeByDate($query, $date)
    {
        return $query->where('date', $date);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeByCs($query, $csName)
    {
        return $query->where('cs_name', $csName);
    }

    // Accessors
    public function getTotalRevenueAttribute()
    {
        return $this->total_cash + $this->total_transfer;
    }

    public function getFormattedTotalCashAttribute()
    {
        return number_format($this->total_cash, 0, ',', '.');
    }

    public function getFormattedTotalTransferAttribute()
    {
        return number_format($this->total_transfer, 0, ',', '.');
    }

    public function getFormattedTotalCommissionAttribute()
    {
        return number_format($this->total_commission, 0, ',', '.');
    }

    public function getFormattedTotalRevenueAttribute()
    {
        return number_format($this->total_revenue, 0, ',', '.');
    }
}
