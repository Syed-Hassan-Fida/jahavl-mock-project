<?php

namespace App\Http\Controllers\Api;

use App\Domain\Notifier;
use App\Domain\Uploads;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Notification;
use App\Models\PaymentMethod;
use App\Models\TaxExemptionRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->user($user),
            'addresses' => $user->addresses()->latest()->get(),
            'payment_methods' => $user->paymentMethods()->latest()->get(),
            'tax_requests' => $user->taxRequests()->latest()->get(['id', 'note', 'status', 'review_note', 'created_at']),
            'unread_notifications' => Notification::query()->where('user_id', $user->id)->whereNull('read_at')->count(),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'current_password' => ['required_with:password', 'string'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);
        if (! empty($data['password'])) {
            if (! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages(['current_password' => 'The current password does not match.']);
            }
            $user->password = $data['password'];
        }
        $user->fill(array_intersect_key($data, array_flip(['name', 'phone', 'company_name'])));
        $user->save();

        return response()->json(['user' => $this->user($user)]);
    }

    public function storeAvatar(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp']]);
        $path = Uploads::store($request->file('file'), 'avatars');
        $request->user()->update(['avatar_path' => $path]);

        return response()->json(['user' => $this->user($request->user())]);
    }

    public function avatar(User $user)
    {
        if (! $user->avatar_path || ! Storage::disk('local')->exists($user->avatar_path)) {
            abort(404);
        }

        return Storage::disk('local')->response($user->avatar_path);
    }

    public function storeAddress(Request $request)
    {
        $data = $this->addressData($request);
        $address = $request->user()->addresses()->create($data);
        $this->singleDefault($request, $address);

        return response()->json(['address' => $address], 201);
    }

    public function updateAddress(Request $request, Address $address)
    {
        $this->owns($request, $address->user_id);
        $address->update($this->addressData($request));
        $this->singleDefault($request, $address);

        return response()->json(['address' => $address->fresh()]);
    }

    public function deleteAddress(Request $request, Address $address)
    {
        $this->owns($request, $address->user_id);
        $address->delete();

        return response()->json(['message' => 'Address removed.']);
    }

    public function storePaymentMethod(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'in:card,ach'],
            'brand' => ['nullable', 'string', 'max:40'],
            'last4' => ['required', 'digits:4'],
            'exp_month' => ['required_if:type,card', 'nullable', 'integer', 'between:1,12'],
            'exp_year' => ['required_if:type,card', 'nullable', 'integer', 'between:2024,2100'],
            'bank_name' => ['required_if:type,ach', 'nullable', 'string', 'max:80'],
            'account_type' => ['nullable', 'in:checking,savings'],
            'holder_name' => ['required', 'string', 'max:120'],
            'provider_id' => ['nullable', 'string', 'max:80'],
            'card_number' => ['prohibited'],
            'account_number' => ['prohibited'],
            'routing_number' => ['prohibited'],
        ]);
        unset($data['card_number'], $data['account_number'], $data['routing_number']);
        if (! empty($data['provider_id']) && ! preg_match('/^(pm|ba)_/', $data['provider_id'])) {
            throw ValidationException::withMessages(['provider_id' => 'Use a Stripe payment method id, or leave it blank.']);
        }
        $method = $request->user()->paymentMethods()->create($data);
        if ($request->user()->paymentMethods()->count() === 1) {
            $method->update(['is_default' => true]);
        }

        return response()->json(['payment_method' => $method->fresh()], 201);
    }

    public function deletePaymentMethod(Request $request, PaymentMethod $paymentMethod)
    {
        $this->owns($request, $paymentMethod->user_id);
        $paymentMethod->delete();

        return response()->json(['message' => 'Payment method removed.']);
    }

    public function requestTaxExemption(Request $request)
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
            'file' => ['nullable', 'file'],
        ]);
        $path = $request->file('file') ? Uploads::store($request->file('file'), 'tax') : null;
        $record = TaxExemptionRequest::query()->create([
            'user_id' => $request->user()->id,
            'note' => $data['note'] ?? null,
            'document_path' => $path,
            'status' => 'pending',
        ]);
        $request->user()->update(['tax_status' => 'pending']);
        Notifier::toAdmins('Tax exemption requested', $request->user()->name.' asked for a tax exemption.');

        return response()->json(['tax_request' => $record], 201);
    }

    public function notifications(Request $request)
    {
        $rows = Notification::query()->where('user_id', $request->user()->id)->latest()->limit(50)->get();

        return response()->json(['notifications' => $rows]);
    }

    public function readNotification(Request $request, Notification $notification)
    {
        $this->owns($request, $notification->user_id);
        $notification->update(['read_at' => now()]);

        return response()->json(['notification' => $notification]);
    }

    public function readNotifications(Request $request)
    {
        Notification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Alerts marked read.']);
    }

    public function destroyNotification(Request $request, Notification $notification)
    {
        $this->owns($request, $notification->user_id);
        $notification->delete();

        return response()->json(['message' => 'Alert removed.']);
    }

    private function addressData(Request $request): array
    {
        return $request->validate([
            'label' => ['nullable', 'string', 'max:40'],
            'line1' => ['required', 'string', 'max:160'],
            'line2' => ['nullable', 'string', 'max:160'],
            'city' => ['required', 'string', 'max:80'],
            'region' => ['required', 'string', 'max:80'],
            'postal_code' => ['required', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'size:2'],
            'is_default' => ['nullable', 'boolean'],
        ]);
    }

    private function singleDefault(Request $request, Address $address): void
    {
        if ($address->is_default) {
            Address::query()->where('user_id', $request->user()->id)->where('id', '!=', $address->id)->update(['is_default' => false]);
        }
    }

    private function owns(Request $request, int $userId): void
    {
        if ($request->user()->id !== $userId && $request->user()->role !== 'admin') {
            abort(403, 'That record belongs to another account.');
        }
    }

    private function user($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'company_name' => $user->company_name,
            'phone' => $user->phone,
            'sales_tax_percent' => $user->sales_tax_percent,
            'tax_status' => $user->tax_status,
            'bio' => $user->bio,
            'monthly_target' => $user->monthly_target,
            'yearly_target' => $user->yearly_target,
            'avatar_url' => $user->avatar_path ? url('/api/v1/avatars/'.$user->id) : null,
        ];
    }
}
