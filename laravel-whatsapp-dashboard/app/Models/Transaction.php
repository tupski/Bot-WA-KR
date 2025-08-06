<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'location',
        'unit',
        'checkout_time',
        'duration',
        'payment_method',
        'marketing_name', // Changed from cs_name to marketing_name
        'customer_phone',
        'commission',
        'amount',
        'net_amount',
        'skip_financial',
        'date_only',
        'chat_id',
        'whatsapp_group_id',
        'processed_by', // User who processed this transaction
        'notes',
    ];

    protected $casts = [
        'commission' => 'decimal:2',
        'amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'skip_financial' => 'boolean',
        'date_only' => 'date',
    ];

    // Relationships
    public function apartment(): BelongsTo
    {
        return $this->belongsTo(Apartment::class, 'location', 'name');
    }

    public function customerService(): BelongsTo
    {
        return $this->belongsTo(CustomerService::class, 'customer_name', 'name');
    }

    // Scopes
    public function scopeByDate($query, $date)
    {
        return $query->where('date_only', $date);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date_only', [$startDate, $endDate]);
    }

    public function scopeByLocation($query, $location)
    {
        return $query->where('location', $location);
    }

    public function scopeByCs($query, $csName)
    {
        return $query->where('customer_name', $csName);
    }

    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    // Accessors
    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 0, ',', '.');
    }

    public function getFormattedCommissionAttribute()
    {
        return number_format($this->commission, 0, ',', '.');
    }

    public function getFormattedNetAmountAttribute()
    {
        return number_format($this->net_amount, 0, ',', '.');
    }
}
