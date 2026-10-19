<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;

class InquiryController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'organization' => ['nullable', 'string', 'max:160'],
            'interest' => ['nullable', 'string', 'max:80'],
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $phone = trim((string) ($data['phone'] ?? ''));
        unset($data['phone']);
        if ($phone !== '') {
            $data['message'] = "Phone: {$phone}\n".$data['message'];
        }

        Inquiry::query()->create($data);

        return response()->json(['message' => 'Message received. A specialist will follow up.'], 201);
    }
}
