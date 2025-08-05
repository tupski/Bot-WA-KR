<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Apartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'whatsapp_group_id',
        'whatsapp_group_name',
        'is_active',
        'description',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    // Relationships
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'location', 'name');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCode($query, $code)
    {
        return $query->where('code', $code);
    }

    public function scopeByWhatsappGroup($query, $groupId)
    {
        return $query->where('whatsapp_group_id', $groupId);
    }

    // Accessors
    public function getStatusAttribute()
    {
        return $this->is_active ? 'Active' : 'Inactive';
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

    public function getTodayBookingCount()
    {
        return $this->transactions()->byDate(today())->count();
    }
}
