<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Config extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'description',
        'type',
        'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    /**
     * Get config value by key
     */
    public static function getValue($key, $default = null)
    {
        $config = static::where('key', $key)->first();
        return $config ? $config->value : $default;
    }

    /**
     * Set config value by key
     */
    public static function setValue($key, $value, $description = null)
    {
        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'description' => $description ?? "Configuration for {$key}",
                'type' => 'string',
                'is_public' => false,
            ]
        );
    }

    /**
     * Get all public configs
     */
    public static function getPublicConfigs()
    {
        return static::where('is_public', true)->pluck('value', 'key');
    }

    /**
     * Scope for public configs
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }
}
