<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'title', 'body', 'read_at'])]
class Notification extends Model
{
    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
