<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'type', 'brand', 'last4', 'exp_month', 'exp_year', 'bank_name', 'account_type', 'holder_name', 'provider_id', 'is_default'])]
#[Hidden(['provider_id'])]
class PaymentMethod extends Model
{
    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
