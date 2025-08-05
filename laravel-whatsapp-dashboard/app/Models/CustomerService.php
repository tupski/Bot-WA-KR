<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CustomerService extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'full_name',
        'phone',
        'email',
        'is_active',
        'commission_rate',
        'target_monthly',
        'join_date',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'commission_rate' => 'decimal:2',
        'target_monthly' => 'decimal:2',
        'join_date' => 'date',
    ];

    // Relationships
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'cs_name', 'name');
    }

    public function csSummaries(): HasMany
    {
        return $this->hasMany(CsSummary::class, 'cs_name', 'name');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByName($query, $name)
    {
        return $query->where('name', $name);
    }

    // Accessors
    public function getStatusAttribute()
    {
        return $this->is_active ? 'Active' : 'Inactive';
    }

    public function getFormattedCommissionRateAttribute()
    {
        return $this->commission_rate . '%';
    }

    public function getFormattedTargetMonthlyAttribute()
    {
        return number_format($this->target_monthly, 0, ',', '.');
    }

    // Methods
    public function getTodayTransactions()
    {
        return $this->transactions()->byDate(today())->get();
    }

    public function getTodayRevenue()
    {
        return $this->transactions()->byDate(today())->sum('amount');
    }

    public function getTodayCommission()
    {
        return $this->transactions()->byDate(today())->sum('commission');
    }

    public function getTodayBookingCount()
    {
        return $this->transactions()->byDate(today())->count();
    }

    public function getMonthlyPerformance($year, $month)
    {
        return $this->transactions()
            ->whereYear('date_only', $year)
            ->whereMonth('date_only', $month)
            ->selectRaw('
                COUNT(*) as total_bookings,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission
            ')
            ->first();
    }
}
