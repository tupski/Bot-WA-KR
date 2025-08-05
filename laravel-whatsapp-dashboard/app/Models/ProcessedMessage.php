<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProcessedMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'chat_id',
        'status',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    // Scopes
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByChat($query, $chatId)
    {
        return $query->where('chat_id', $chatId);
    }

    public function scopeRecent($query, $limit = 100)
    {
        return $query->orderBy('processed_at', 'desc')->limit($limit);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('processed_at', today());
    }
}
