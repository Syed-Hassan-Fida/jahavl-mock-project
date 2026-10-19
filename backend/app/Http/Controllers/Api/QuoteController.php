<?php

namespace App\Http\Controllers\Api;

use App\Domain\Access;
use App\Domain\PdfQuote;
use App\Domain\Quotes;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class QuoteController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type');
        $quotes = Quote::query()
            ->visibleTo($request->user())
            ->with('user:id,name,email,role')
            ->when(in_array($type, ['quote', 'wishlist'], true), fn ($query) => $query->where('type', $type))
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'quotes' => $quotes->map(fn (Quote $quote) => [
                'id' => $quote->id,
                'name' => $quote->name,
                'type' => $quote->type,
                'status' => $quote->status,
                'status_code' => \App\Domain\QuoteStatus::code($quote->status),
                'total' => $quote->total,
                'checkout_allowed' => $quote->checkout_allowed,
                'owner' => $quote->user?->name,
                'owner_role' => $quote->user?->role,
            ]),
        ]);
    }

    public function show(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);

        return response()->json(['quote' => Quotes::present($quote, $request->user())]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'type' => ['nullable', 'in:quote,wishlist'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'client_id' => ['nullable', 'integer'],
            'product_id' => ['nullable', 'integer'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
        ]);
        $quote = Quotes::create($request->user(), $data);

        return response()->json(['quote' => Quotes::present($quote, $request->user())], 201);
    }

    public function update(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'shipping' => ['sometimes', 'numeric', 'min:0'],
            'discount' => ['sometimes', 'numeric', 'min:0'],
            'commission' => ['sometimes', 'numeric', 'min:0'],
        ]);
        Quotes::updateHeader($request->user(), $quote, $data);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function addItem(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
        ]);
        Quotes::addProduct($request->user(), $quote, (int) $data['product_id'], (int) ($data['quantity'] ?? 1));

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function addExpense(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'label' => ['required', 'string', 'max:160'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);
        Quotes::addExpense($request->user(), $quote, $data['label'], (int) ($data['quantity'] ?? 1), (string) $data['amount']);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function addPackage(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer'],
            'lines.*.quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
        ]);
        Quotes::addPackage($request->user(), $quote, $data['name'], $data['lines']);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function updateItem(Request $request, Quote $quote, QuoteItem $item)
    {
        $this->guard($request, $quote);
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:999']]);
        Quotes::updateQuantity($request->user(), $quote, $item, (int) $data['quantity']);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function deleteItem(Request $request, Quote $quote, QuoteItem $item)
    {
        $this->guard($request, $quote);
        Quotes::deleteItem($request->user(), $quote, $item);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function convert(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::convertWishlist($request->user(), $quote);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function submit(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::submit($request->user(), $quote);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function revise(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::revise($request->user(), $quote);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function review(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        Quotes::review($request->user(), $quote, $data['decision'], $data['note'] ?? null);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function checkout(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate(['allowed' => ['required', 'boolean']]);
        Quotes::setCheckout($request->user(), $quote, (bool) $data['allowed']);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function assign(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'assigned_user_id' => ['nullable', 'integer'],
            'sales_user_id' => ['nullable', 'integer'],
            'dealer_user_id' => ['nullable', 'integer'],
        ]);
        Quotes::assign($request->user(), $quote, $data);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function expire(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::expire($request->user(), $quote);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function destroy(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::destroy($request->user(), $quote);

        return response()->json(['message' => 'Quote removed.']);
    }

    public function purchased(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        Quotes::markPurchased($request->user(), $quote);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function pay(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate(['payment_method_id' => ['required', 'integer']]);
        $method = PaymentMethod::query()->findOrFail($data['payment_method_id']);
        Quotes::pay($request->user(), $quote, $method, $request->header('Idempotency-Key'));

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function manualPay(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        Quotes::manualPay($request->user(), $quote, (string) $data['amount'], $data['note'] ?? null);

        return response()->json(['quote' => Quotes::present($quote->fresh(), $request->user())]);
    }

    public function refund(Request $request, Payment $payment)
    {
        $payment->load('quote');
        $this->guard($request, $payment->quote);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $refund = Quotes::refund($request->user(), $payment, (string) $data['amount'], $data['reason'] ?? null);

        return response()->json([
            'refund' => $refund,
            'quote' => Quotes::present($payment->quote->fresh(), $request->user()),
        ]);
    }

    public function pdf(Request $request, Quote $quote)
    {
        $this->guard($request, $quote);

        return response(PdfQuote::render($quote), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="quote-'.$quote->id.'.pdf"',
        ]);
    }

    private function guard(Request $request, Quote $quote): void
    {
        if (! Access::canSeeQuote($request->user(), $quote)) {
            throw ValidationException::withMessages(['quote' => 'That quote is not in your workspace.']);
        }
    }
}
