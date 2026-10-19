<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'key', 'request_hash', 'status_code', 'body'])]
class IdempotencyKey extends Model
{
    protected function casts(): array
    {
        return ['body' => 'array'];
    }
}
