<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'contact_name', 'email', 'company_name', 'phone', 'ein', 'years_in_business', 'anticipated_sales', 'document_path', 'status', 'review_note'])]
class DealerApplication extends Model
{
    protected function casts(): array
    {
        return ['anticipated_sales' => 'decimal:2'];
    }
}
