<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['quote_id', 'user_id', 'payment_method_id', 'amount', 'kind', 'status', 'charge_id', 'idempotency_key', 'note'])]
class Payment extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }
}
