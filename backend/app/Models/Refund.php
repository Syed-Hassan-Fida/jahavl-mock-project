<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['payment_id', 'user_id', 'amount', 'reason', 'charge_id'])]
class Refund extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }
}
