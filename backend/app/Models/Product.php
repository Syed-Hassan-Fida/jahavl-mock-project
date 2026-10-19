<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['series_id', 'name', 'slug', 'image', 'description', 'list_price', 'dealer_price', 'refresh_hz', 'pitch', 'brightness', 'specs', 'is_published', 'cost', 'weight', 'shipping_amount', 'tariff', 'markup_percent', 'dealer_markup_percent', 'featured'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'list_price' => 'decimal:2',
            'dealer_price' => 'decimal:2',
            'is_published' => 'boolean',
            'specs' => 'array',
            'cost' => 'decimal:2',
            'weight' => 'decimal:2',
            'shipping_amount' => 'decimal:2',
            'tariff' => 'decimal:2',
            'markup_percent' => 'decimal:2',
            'dealer_markup_percent' => 'decimal:2',
            'featured' => 'boolean',
        ];
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(Series::class);
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ProductDocument::class);
    }

    public function quoteItems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }
}
