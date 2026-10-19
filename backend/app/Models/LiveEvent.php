<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'name', 'payload'])]
class LiveEvent extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }
}
