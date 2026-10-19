<?php

namespace App\Models;

use Database\Factories\QuoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'assigned_user_id', 'sales_user_id', 'dealer_user_id', 'name', 'type', 'status', 'total', 'shipping', 'discount', 'tax', 'commission', 'checkout_allowed', 'charge_id', 'notes', 'purchased_at'])]
class Quote extends Model
{
    /** @use HasFactory<QuoteFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'shipping' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'commission' => 'decimal:2',
            'checkout_allowed' => 'boolean',
            'purchased_at' => 'datetime',
        ];
    }

    public function scopeVisibleTo($query, User $user)
    {
        \App\Domain\Access::constrainQuotes($query, $user);

        return $query;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    public function dealer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dealer_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
