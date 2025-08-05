<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BotConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'key_name',
        'value',
        'description',
        'type',
    ];

    // Scopes
    public function scopeByKey($query, $key)
    {
        return $query->where('key_name', $key);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Accessors
    public function getTypedValueAttribute()
    {
        return match ($this->type) {
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($this->value) ? (float) $this->value : 0,
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }

    // Static methods for easy config access
    public static function get($key, $default = null)
    {
        $config = static::where('key_name', $key)->first();
        return $config ? $config->typed_value : $default;
    }

    public static function set($key, $value, $description = null, $type = 'string')
    {
        return static::updateOrCreate(
            ['key_name' => $key],
            [
                'value' => is_array($value) ? json_encode($value) : $value,
                'description' => $description,
                'type' => $type,
            ]
        );
    }
}
