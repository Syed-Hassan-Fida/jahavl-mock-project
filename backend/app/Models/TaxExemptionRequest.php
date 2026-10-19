<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'document_path', 'note', 'status', 'review_note'])]
class TaxExemptionRequest extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
