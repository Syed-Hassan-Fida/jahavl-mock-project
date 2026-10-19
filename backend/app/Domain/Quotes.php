<?php

namespace App\Domain;

use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Quotes
{
    public static function present(Quote $quote, User $viewer): array
    {
        $quote->loadMissing(['items.product', 'user:id,name,email,role', 'assignee:id,name,email,role', 'sales:id,name,email,role', 'dealer:id,name,email,role', 'payments']);

        return [
            'id' => $quote->id,
            'name' => $quote->name,
            'type' => $quote->type,
            'status' => $quote->status,
            'status_code' => QuoteStatus::code($quote->status),
            'shipping' => $quote->shipping,
            'discount' => $quote->discount,
            'tax' => $quote->tax,
            'total' => $quote->total,
            'commission' => $viewer->role === 'client' ? null : $quote->commission,
            'checkout_allowed' => $quote->checkout_allowed,
            'purchased_at' => $quote->purchased_at,
            'charge_id' => $quote->charge_id,
            'notes' => $quote->notes,
            'owner' => self::person($quote->user),
            'assigned_to' => self::person($quote->assignee),
            'sales' => self::person($quote->sales),
            'dealer' => self::person($quote->dealer),
            'items' => $quote->items->map(fn (QuoteItem $item) => [
                'id' => $item->id,
                'parent_id' => $item->parent_id,
                'kind' => $item->kind,
                'label' => $item->label ?: $item->product?->name,
                'product_id' => $item->product_id,
                'product_slug' => $item->product?->slug,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => number_format((float) $item->quantity * (float) $item->unit_price, 2, '.', ''),
            ])->values(),
            'payments' => $quote->payments->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'kind' => $payment->kind,
                'status' => $payment->status,
                'charge_id' => $payment->charge_id,
                'note' => $payment->note,
            ])->values(),
            'permissions' => Access::abilities($viewer, $quote),
        ];
    }

    public static function create(User $actor, array $input): Quote
    {
        $owner = $actor;
        if (! empty($input['client_id']) && (int) $input['client_id'] !== $actor->id) {
            $owner = User::query()->findOrFail($input['client_id']);
            if (! Access::canSeeUser($actor, $owner) || ! in_array($actor->role, ['admin', 'sales', 'dealer'], true)) {
                throw ValidationException::withMessages(['client_id' => 'That account is outside your book of business.']);
            }
        }

        $quote = Quote::query()->create([
            'user_id' => $owner->id,
            'dealer_user_id' => $actor->role === 'dealer' ? $actor->id : ($owner->role === 'dealer' ? $owner->id : null),
            'sales_user_id' => $actor->role === 'sales' ? $actor->id : null,
            'name' => $input['name'],
            'type' => $input['type'] ?? 'quote',
            'status' => 'added',
            'notes' => $input['notes'] ?? null,
        ]);

        if (! empty($input['product_id'])) {
            self::addProduct($actor, $quote, (int) $input['product_id'], (int) ($input['quantity'] ?? 1));
        }

        return $quote->fresh();
    }

    public static function addProduct(User $actor, Quote $quote, int $productId, int $quantity, ?int $parentId = null): QuoteItem
    {
        self::assertEditable($actor, $quote);
        $product = Product::query()->where('is_published', true)->findOrFail($productId);
        $owner = $quote->user ?? User::query()->findOrFail($quote->user_id);
        $item = $quote->items()->create([
            'product_id' => $product->id,
            'parent_id' => $parentId,
            'kind' => 'product',
            'label' => $product->name,
            'quantity' => max(1, $quantity),
            'unit_price' => $owner->role === 'dealer' ? $product->dealer_price : $product->list_price,
        ]);
        self::recalculate($quote);

        return $item;
    }

    public static function addExpense(User $actor, Quote $quote, string $label, int $quantity, string $amount): QuoteItem
    {
        self::assertEditable($actor, $quote);
        $item = $quote->items()->create([
            'kind' => 'expense',
            'label' => $label,
            'quantity' => max(1, $quantity),
            'unit_price' => $amount,
        ]);
        self::recalculate($quote);

        return $item;
    }

    public static function addPackage(User $actor, Quote $quote, string $name, array $lines): QuoteItem
    {
        self::assertEditable($actor, $quote);
        $package = $quote->items()->create([
            'kind' => 'package',
            'label' => $name,
            'quantity' => 1,
            'unit_price' => 0,
        ]);
        foreach ($lines as $line) {
            self::addProduct($actor, $quote->fresh(), (int) $line['product_id'], (int) ($line['quantity'] ?? 1), $package->id);
        }
        self::syncPackagePrice($package->fresh());
        self::recalculate($quote);

        return $package;
    }

    public static function updateQuantity(User $actor, Quote $quote, QuoteItem $item, int $quantity): void
    {
        self::assertEditable($actor, $quote);
        if ($item->quote_id !== $quote->id) {
            abort(404);
        }
        $item->update(['quantity' => max(1, $quantity)]);
        if ($item->parent_id) {
            self::syncPackagePrice(QuoteItem::query()->findOrFail($item->parent_id));
        }
        self::recalculate($quote);
    }

    public static function deleteItem(User $actor, Quote $quote, QuoteItem $item): void
    {
        self::assertEditable($actor, $quote);
        if ($item->quote_id !== $quote->id) {
            abort(404);
        }
        $parent = $item->parent_id;
        $item->delete();
        if ($parent) {
            self::syncPackagePrice(QuoteItem::query()->find($parent));
        }
        self::recalculate($quote);
    }

    public static function updateHeader(User $actor, Quote $quote, array $input): void
    {
        self::assertEditable($actor, $quote);
        $quote->fill(array_intersect_key($input, array_flip(['name', 'notes', 'shipping', 'discount'])));
        if (array_key_exists('commission', $input) && in_array($actor->role, ['admin', 'sales'], true)) {
            $quote->commission = $input['commission'];
        }
        if ((float) $quote->discount < 0 || (float) $quote->shipping < 0) {
            throw ValidationException::withMessages(['discount' => 'Shipping and discount cannot be negative.']);
        }
        $quote->save();
        self::recalculate($quote);
    }

    public static function convertWishlist(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['convert']) {
            throw ValidationException::withMessages(['type' => 'This wishlist cannot be converted.']);
        }
        $quote->update(['type' => 'quote', 'status' => 'added']);
        Notifier::toQuoteStaff($quote, 'Wishlist converted', $quote->name.' is now a quote.');
    }

    public static function submit(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['submit']) {
            throw ValidationException::withMessages(['status' => 'This quote cannot be submitted.']);
        }
        if ($quote->items()->whereNull('parent_id')->doesntExist()) {
            throw ValidationException::withMessages(['items' => 'Add a line before submitting the quote.']);
        }
        $quote->update(['status' => 'requested', 'checkout_allowed' => false]);
        Notifier::toQuoteStaff($quote, 'Quote submitted', $quote->name.' is waiting for review.');
    }

    public static function expire(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['expire']) {
            throw ValidationException::withMessages(['status' => 'A paid or already expired quote cannot be expired.']);
        }
        $quote->update(['status' => 'expired', 'checkout_allowed' => false]);
        Notifier::toUser($quote->user_id, 'Quote expired', $quote->name.' was marked expired.');
    }

    public static function destroy(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['delete']) {
            throw ValidationException::withMessages(['quote' => 'A paid quote stays on the account.']);
        }
        $quote->items()->delete();
        $quote->delete();
    }

    public static function revise(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['revise']) {
            throw ValidationException::withMessages(['status' => 'This quote is not waiting on a revision.']);
        }
        $quote->update(['status' => 'added']);
    }

    public static function review(User $actor, Quote $quote, string $decision, ?string $note): void
    {
        if (! Access::abilities($actor, $quote)['review'] || ! in_array($decision, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages(['status' => 'This quote is not waiting for review.']);
        }
        $quote->update([
            'status' => $decision,
            'checkout_allowed' => false,
            'notes' => $note !== null && $note !== '' ? trim(($quote->notes ? $quote->notes."\n" : '').$note) : $quote->notes,
        ]);
        Notifier::toUser($quote->user_id, 'Quote '.$decision, $quote->name.' was '.$decision.'.');
    }

    public static function setCheckout(User $actor, Quote $quote, bool $allowed): void
    {
        if (! Access::abilities($actor, $quote)['checkout_toggle']) {
            throw ValidationException::withMessages(['checkout_allowed' => 'Checkout can be opened only on an approved quote.']);
        }
        $quote->update(['checkout_allowed' => $allowed]);
        if ($allowed) {
            Notifier::toUser($quote->user_id, 'Checkout opened', 'You can pay '.$quote->name.'.');
        }
    }

    public static function assign(User $actor, Quote $quote, array $input): void
    {
        if (! Access::abilities($actor, $quote)['assign']) {
            throw ValidationException::withMessages(['assign' => 'You cannot assign this quote.']);
        }
        foreach (['assigned_user_id' => 'client', 'sales_user_id' => 'sales', 'dealer_user_id' => 'dealer'] as $field => $role) {
            if (! array_key_exists($field, $input)) {
                continue;
            }
            $id = $input[$field];
            if ($id === null) {
                $quote->{$field} = null;
                continue;
            }
            $person = User::query()->findOrFail($id);
            if ($role !== 'client' && $person->role !== $role) {
                throw ValidationException::withMessages([$field => 'Choose a '.$role.' account.']);
            }
            if ($role === 'client' && ! in_array($person->role, ['client', 'dealer'], true)) {
                throw ValidationException::withMessages([$field => 'Assign the quote to a client or dealer.']);
            }
            if ($actor->role === 'sales' && ! Access::canSeeUser($actor, $person) && $person->id !== $actor->id) {
                throw ValidationException::withMessages([$field => 'That account is outside your book of business.']);
            }
            $quote->{$field} = $person->id;
        }
        $quote->save();
        if ($quote->assigned_user_id) {
            Notifier::toUser($quote->assigned_user_id, 'Quote assigned', $quote->name.' was assigned to you.');
        }
    }

    public static function markPurchased(User $actor, Quote $quote): void
    {
        if (! Access::abilities($actor, $quote)['purchased']) {
            throw ValidationException::withMessages(['purchased' => 'This quote is not ready to mark purchased.']);
        }
        $quote->update(['purchased_at' => now()]);
        Notifier::toQuoteStaff($quote, 'Dealer marked purchased', $quote->name.' was marked purchased.');
    }

    public static function pay(User $actor, Quote $quote, PaymentMethod $method, ?string $idempotency): Payment
    {
        if (! Access::abilities($actor, $quote)['pay']) {
            throw ValidationException::withMessages(['checkout' => 'Checkout is closed for this quote.']);
        }
        if ($method->user_id !== $actor->id && $actor->role !== 'admin') {
            throw ValidationException::withMessages(['payment_method_id' => 'Use a payment method on your account.']);
        }
        if ($idempotency) {
            $existing = Payment::query()->where('idempotency_key', $idempotency)->first();
            if ($existing) {
                return $existing;
            }
        }

        self::recalculate($quote);
        $quote->refresh();
        $amount = (float) $quote->total;
        if ($amount <= 0) {
            throw ValidationException::withMessages(['total' => 'This quote has nothing to pay.']);
        }

        $charge = self::capture($method, $amount, 'quote-'.$quote->id);
        $payment = Payment::query()->create([
            'quote_id' => $quote->id,
            'user_id' => $actor->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'kind' => $method->type,
            'status' => 'succeeded',
            'charge_id' => $charge['id'],
            'idempotency_key' => $idempotency,
            'note' => $charge['note'],
        ]);
        $quote->update(['status' => 'paid', 'charge_id' => $charge['id'], 'checkout_allowed' => false]);
        Notifier::toQuoteStaff($quote, 'Quote paid', $quote->name.' was paid.');
        Notifier::toUser($quote->user_id, 'Payment received', $quote->name.' is paid.');

        return $payment;
    }

    public static function manualPay(User $actor, Quote $quote, string $amount, ?string $note): Payment
    {
        if (! Access::abilities($actor, $quote)['manual_pay']) {
            throw ValidationException::withMessages(['payment' => 'A manual payment cannot be recorded on this quote.']);
        }
        $payment = Payment::query()->create([
            'quote_id' => $quote->id,
            'user_id' => $actor->id,
            'amount' => $amount,
            'kind' => 'manual',
            'status' => 'succeeded',
            'charge_id' => 'manual_'.Str::lower(Str::random(12)),
            'note' => $note,
        ]);
        self::recalculate($quote);
        if ((float) $amount + 0.001 >= (float) $quote->fresh()->total) {
            $quote->update(['status' => 'paid', 'charge_id' => $payment->charge_id, 'checkout_allowed' => false]);
        }
        Notifier::toUser($quote->user_id, 'Payment recorded', 'A manual payment was applied to '.$quote->name.'.');

        return $payment;
    }

    public static function refund(User $actor, Payment $payment, string $amount, ?string $reason): Refund
    {
        if ($actor->role !== 'admin') {
            throw ValidationException::withMessages(['refund' => 'Only an admin can refund a payment.']);
        }
        $already = (float) $payment->refunds()->sum('amount');
        $remaining = (float) $payment->amount - $already;
        if ((float) $amount <= 0 || (float) $amount - $remaining > 0.001) {
            throw ValidationException::withMessages(['amount' => 'Refund the remaining balance or less.']);
        }

        $chargeId = 're_'.Str::lower(Str::random(14));
        $secret = config('services.stripe.secret');
        if ($secret && str_starts_with((string) $payment->charge_id, 'pi_')) {
            $response = Http::withToken($secret)->asForm()->post('https://api.stripe.com/v1/refunds', [
                'payment_intent' => $payment->charge_id,
                'amount' => (int) round(((float) $amount) * 100),
            ]);
            if ($response->failed()) {
                throw ValidationException::withMessages(['amount' => $response->json('error.message') ?? 'Stripe refused the refund.']);
            }
            $chargeId = $response->json('id') ?? $chargeId;
        }

        $refund = $payment->refunds()->create([
            'user_id' => $actor->id,
            'amount' => $amount,
            'reason' => $reason,
            'charge_id' => $chargeId,
        ]);
        $fully = ((float) $amount + $already + 0.001) >= (float) $payment->amount;
        $payment->update(['status' => $fully ? 'refunded' : 'partial_refund']);
        Notifier::toUser($payment->quote->user_id, 'Refund issued', 'A refund was issued on '.$payment->quote->name.'.');

        return $refund;
    }

    public static function recalculate(Quote $quote): void
    {
        $quote->load(['items', 'user']);
        $subtotal = 0.0;
        foreach ($quote->items as $item) {
            if ($item->parent_id) {
                continue;
            }
            $subtotal += (float) $item->quantity * (float) $item->unit_price;
        }
        $discount = min((float) $quote->discount, $subtotal);
        $shipping = (float) $quote->shipping;
        $taxable = max(0, $subtotal - $discount + $shipping);
        $owner = $quote->user;
        $tax = 0.0;
        if ($owner && $owner->tax_status !== 'exempt') {
            $tax = round($taxable * ((float) $owner->sales_tax_percent / 100), 2);
        }
        $quote->forceFill([
            'discount' => $discount,
            'tax' => $tax,
            'total' => round($subtotal - $discount + $shipping + $tax, 2),
        ])->save();
    }

    private static function syncPackagePrice(?QuoteItem $package): void
    {
        if (! $package) {
            return;
        }
        $sum = (float) QuoteItem::query()->where('parent_id', $package->id)
            ->selectRaw('coalesce(sum(quantity * unit_price), 0) as amount')
            ->value('amount');
        $package->update(['unit_price' => $sum, 'quantity' => 1]);
    }

    private static function assertEditable(User $actor, Quote $quote): void
    {
        if (! Access::canSeeQuote($actor, $quote) || ! Access::abilities($actor, $quote)['edit']) {
            throw ValidationException::withMessages(['quote' => 'This quote cannot be edited.']);
        }
    }

    /** @return array{id: string, note: ?string} */
    private static function capture(PaymentMethod $method, float $amount, string $key): array
    {
        $secret = config('services.stripe.secret');
        if ($secret && $method->provider_id) {
            $type = $method->type === 'ach' ? 'us_bank_account' : 'card';
            $response = Http::withToken($secret)
                ->withHeaders(['Idempotency-Key' => $key])
                ->asForm()
                ->post('https://api.stripe.com/v1/payment_intents', [
                    'amount' => (int) round($amount * 100),
                    'currency' => 'usd',
                    'payment_method' => $method->provider_id,
                    'confirm' => 'true',
                    'payment_method_types' => [$type],
                ]);
            if ($response->failed() || $response->json('status') !== 'succeeded') {
                throw ValidationException::withMessages([
                    'payment_method_id' => $response->json('error.message') ?? 'The payment was not completed.',
                ]);
            }

            return ['id' => $response->json('id'), 'note' => 'Stripe PaymentIntent'];
        }

        return [
            'id' => 'test_'.Str::lower(Str::random(16)),
            'note' => 'Recorded in the workspace. Stripe is not configured, so no card or bank account was charged.',
        ];
    }

    private static function person(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
