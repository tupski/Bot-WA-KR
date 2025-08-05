<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'group_id',
        'group_name',
        'group_subject',
        'group_description',
        'apartment_id',
        'is_active',
        'is_monitoring',
        'last_activity_at',
        'participant_count',
        'admin_count',
        'created_by_bot_at',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_monitoring' => 'boolean',
        'last_activity_at' => 'datetime',
        'created_by_bot_at' => 'datetime',
        'settings' => 'array',
    ];

    /**
     * Relationship with Apartment
     */
    public function apartment()
    {
        return $this->belongsTo(Apartment::class);
    }

    /**
     * Relationship with Transactions
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'chat_id', 'group_id');
    }

    /**
     * Scope for active groups
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for monitoring groups
     */
    public function scopeMonitoring($query)
    {
        return $query->where('is_monitoring', true);
    }

    /**
     * Get status badge color
     */
    public function getStatusColorAttribute()
    {
        if (!$this->is_active) return 'secondary';
        if (!$this->is_monitoring) return 'warning';

        // Check last activity
        if ($this->last_activity_at && $this->last_activity_at->diffInHours(now()) > 24) {
            return 'danger';
        }

        return 'success';
    }

    /**
     * Get status text
     */
    public function getStatusTextAttribute()
    {
        if (!$this->is_active) return 'Inactive';
        if (!$this->is_monitoring) return 'Not Monitoring';

        if ($this->last_activity_at && $this->last_activity_at->diffInHours(now()) > 24) {
            return 'No Recent Activity';
        }

        return 'Active';
    }

    /**
     * Get formatted last activity
     */
    public function getLastActivityFormattedAttribute()
    {
        if (!$this->last_activity_at) {
            return 'Never';
        }

        return $this->last_activity_at->diffForHumans();
    }

    /**
     * Update group info from WhatsApp API
     */
    public function updateFromWhatsApp($groupInfo)
    {
        $this->update([
            'group_name' => $groupInfo['name'] ?? $this->group_name,
            'group_subject' => $groupInfo['subject'] ?? $this->group_subject,
            'group_description' => $groupInfo['description'] ?? $this->group_description,
            'participant_count' => $groupInfo['participant_count'] ?? $this->participant_count,
            'admin_count' => $groupInfo['admin_count'] ?? $this->admin_count,
            'last_activity_at' => now(),
        ]);
    }

    /**
     * Mark as active with last activity
     */
    public function markActivity()
    {
        $this->update(['last_activity_at' => now()]);
    }
}
