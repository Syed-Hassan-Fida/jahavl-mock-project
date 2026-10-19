<?php

namespace App\Http\Controllers\Api;

use App\Domain\ReadCache;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Those credentials do not match our records.',
            ], 422);
        }

        ReadCache::forgetRoleHash($user->api_token);
        $plain = Str::random(64);
        $user->forceFill(['api_token' => hash('sha256', $plain)])->save();

        return response()->json([
            'token' => $plain,
            'user' => $this->payload($user),
        ]);
    }

    public function logout(Request $request)
    {
        ReadCache::forgetRoleHash($request->user()->api_token);
        $request->user()->forceFill(['api_token' => null])->save();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'account_type' => ['nullable', 'in:client,company'],
        ]);
        if (($data['account_type'] ?? 'client') === 'company' && empty($data['company_name'])) {
            return response()->json(['message' => 'A company account needs a company name.'], 422);
        }
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'client',
            'company_name' => $data['company_name'] ?? null,
            'phone' => $data['phone'] ?? null,
        ]);
        $plain = Str::random(64);
        $user->forceFill(['api_token' => hash('sha256', $plain)])->save();

        return response()->json(['token' => $plain, 'user' => $this->payload($user)], 201);
    }

    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::query()->where('email', $data['email'])->first();
        $payload = ['message' => 'If that email has an account, a reset code is ready.'];
        if ($user) {
            $plain = Str::random(48);
            \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => hash('sha256', $plain), 'created_at' => now()],
            );
            if (app()->environment('local')) {
                $payload['reset_token'] = $plain;
            }
        }

        return response()->json($payload);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);
        $row = \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        if (! $row || ! hash_equals($row->token, hash('sha256', $data['token']))) {
            return response()->json(['message' => 'That reset code is not valid.'], 422);
        }
        if ($row->created_at && \Illuminate\Support\Carbon::parse($row->created_at)->lt(now()->subHour())) {
            return response()->json(['message' => 'That reset code has expired.'], 422);
        }
        $user = User::query()->where('email', $data['email'])->firstOrFail();
        $user->forceFill(['password' => $data['password'], 'api_token' => null])->save();
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Password updated. Sign in with the new password.']);
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'company_name' => $user->company_name,
            'phone' => $user->phone,
            'tax_status' => $user->tax_status,
            'sales_tax_percent' => $user->sales_tax_percent,
        ];
    }
}
