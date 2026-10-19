<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sales_user_id', 'related_user_id', 'title', 'notes', 'due_on', 'completed_at'])]
class SalesTask extends Model
{
    protected function casts(): array
    {
        return [
            'due_on' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    public function related(): BelongsTo
    {
        return $this->belongsTo(User::class, 'related_user_id');
    }
}
