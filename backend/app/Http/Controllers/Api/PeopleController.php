<?php

namespace App\Http\Controllers\Api;

use App\Domain\Access;
use App\Domain\Notifier;
use App\Domain\Uploads;
use App\Http\Controllers\Controller;
use App\Models\DealerApplication;
use App\Models\TaxExemptionRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PeopleController extends Controller
{
    public function index(Request $request)
    {
        $actor = $request->user();
        $query = User::query()->orderBy('name');
        if ($actor->role === 'sales') {
            $ids = array_merge(
                DB::table('sales_clients')->where('sales_user_id', $actor->id)->pluck('client_user_id')->all(),
                DB::table('sales_dealers')->where('sales_user_id', $actor->id)->pluck('dealer_user_id')->all(),
                [$actor->id],
            );
            $query->whereIn('id', $ids);
        } elseif ($actor->role === 'dealer') {
            $ids = DB::table('dealer_clients')->where('dealer_user_id', $actor->id)->pluck('client_user_id');
            $query->whereIn('id', $ids);
        } elseif ($actor->role !== 'admin') {
            abort(403, 'You do not manage accounts.');
        }

        return response()->json([
            'users' => $query->get(['id', 'name', 'email', 'role', 'company_name', 'phone', 'sales_tax_percent', 'tax_status', 'monthly_target', 'yearly_target', 'bio']),
        ]);
    }

    public function store(Request $request)
    {
        $this->admin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:client,dealer,sales'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'sales_tax_percent' => ['nullable', 'numeric', 'min:0', 'max:30'],
        ]);
        $user = User::query()->create($data);

        return response()->json(['user' => $user->only(['id', 'name', 'email', 'role', 'company_name'])], 201);
    }

    public function destroy(Request $request, User $user)
    {
        $this->admin($request);
        if ($user->id === $request->user()->id) {
            abort(422, 'You cannot remove the account you are signed in with.');
        }
        if ($user->role === 'admin') {
            abort(422, 'Admin accounts stay in place.');
        }
        if (\App\Models\Quote::query()->where('user_id', $user->id)->where('status', 'paid')->exists()) {
            abort(422, 'This account has a paid quote, so it stays on file.');
        }
        $user->delete();

        return response()->json(['message' => 'Account removed.']);
    }

    public function updateTarget(Request $request, User $user)
    {
        $this->admin($request);
        if ($user->role !== 'sales') {
            abort(422, 'Targets belong on a sales account.');
        }
        $data = $request->validate([
            'monthly_target' => ['nullable', 'integer', 'min:0'],
            'yearly_target' => ['nullable', 'integer', 'min:0'],
            'bio' => ['nullable', 'string', 'max:2000'],
        ]);
        $user->update($data);

        return response()->json(['user' => $user->only(['id', 'monthly_target', 'yearly_target', 'bio'])]);
    }

    public function updateTax(Request $request, User $user)
    {
        $this->admin($request);
        $data = $request->validate(['sales_tax_percent' => ['required', 'numeric', 'min:0', 'max:30']]);
        $user->update($data);

        return response()->json(['user' => $user->only(['id', 'sales_tax_percent', 'tax_status'])]);
    }

    public function assignments(Request $request)
    {
        if (! in_array($request->user()->role, ['admin', 'sales', 'dealer'], true)) {
            abort(403, 'You do not manage assignments.');
        }

        return response()->json([
            'sales_clients' => DB::table('sales_clients')->get(),
            'dealer_clients' => DB::table('dealer_clients')->get(),
            'sales_dealers' => DB::table('sales_dealers')->get(),
        ]);
    }

    public function assign(Request $request)
    {
        $data = $request->validate([
            'kind' => ['required', 'in:sales_client,dealer_client,sales_dealer'],
            'from_id' => ['required', 'integer'],
            'to_id' => ['required', 'integer'],
        ]);
        $actor = $request->user();
        [$table, $fromColumn, $toColumn, $fromRole, $toRole] = match ($data['kind']) {
            'sales_client' => ['sales_clients', 'sales_user_id', 'client_user_id', 'sales', 'client'],
            'dealer_client' => ['dealer_clients', 'dealer_user_id', 'client_user_id', 'dealer', 'client'],
            'sales_dealer' => ['sales_dealers', 'sales_user_id', 'dealer_user_id', 'sales', 'dealer'],
        };
        if ($actor->role !== 'admin' && (int) $data['from_id'] !== $actor->id) {
            abort(403, 'You can only assign accounts to yourself.');
        }
        if ($actor->role === 'dealer' && $data['kind'] !== 'dealer_client') {
            abort(403, 'Dealers assign their own clients.');
        }
        if ($actor->role === 'sales' && $data['kind'] === 'dealer_client') {
            abort(403, 'Sales assigns clients and dealers to their own book.');
        }
        $from = User::query()->findOrFail($data['from_id']);
        $to = User::query()->findOrFail($data['to_id']);
        if ($from->role !== $fromRole || $to->role !== $toRole) {
            throw ValidationException::withMessages(['kind' => 'Those accounts do not match this assignment.']);
        }
        DB::table($table)->updateOrInsert(
            [$fromColumn => $from->id, $toColumn => $to->id],
            [$fromColumn => $from->id, $toColumn => $to->id],
        );

        return response()->json(['message' => 'Assignment saved.']);
    }

    public function unassign(Request $request)
    {
        $this->admin($request);
        $data = $request->validate([
            'kind' => ['required', 'in:sales_client,dealer_client,sales_dealer'],
            'from_id' => ['required', 'integer'],
            'to_id' => ['required', 'integer'],
        ]);
        [$table, $fromColumn, $toColumn] = match ($data['kind']) {
            'sales_client' => ['sales_clients', 'sales_user_id', 'client_user_id'],
            'dealer_client' => ['dealer_clients', 'dealer_user_id', 'client_user_id'],
            'sales_dealer' => ['sales_dealers', 'sales_user_id', 'dealer_user_id'],
        };
        DB::table($table)->where($fromColumn, $data['from_id'])->where($toColumn, $data['to_id'])->delete();

        return response()->json(['message' => 'Assignment removed.']);
    }

    public function applyDealer(Request $request)
    {
        $data = $request->validate([
            'contact_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'company_name' => ['required', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'ein' => ['nullable', 'string', 'max:40'],
            'years_in_business' => ['nullable', 'integer', 'min:0', 'max:150'],
            'anticipated_sales' => ['nullable', 'numeric', 'min:0'],
            'file' => ['nullable', 'file'],
        ]);
        $application = DealerApplication::query()->create([
            ...collect($data)->except('file')->all(),
            'document_path' => $request->file('file') ? Uploads::store($request->file('file'), 'dealers') : null,
            'status' => 'pending',
        ]);
        Notifier::toAdmins('Dealer application', $application->company_name.' applied for a dealer account.');

        return response()->json(['application' => $application->only(['id', 'status', 'company_name'])], 201);
    }

    public function dealerApplications(Request $request)
    {
        $this->admin($request);

        return response()->json(['applications' => DealerApplication::query()->latest()->limit(100)->get()]);
    }

    public function reviewDealer(Request $request, DealerApplication $application)
    {
        $this->admin($request);
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($application->status !== 'pending') {
            throw ValidationException::withMessages(['decision' => 'This application was already reviewed.']);
        }
        $temporary = null;
        $userId = null;
        if ($data['decision'] === 'approved') {
            if (User::query()->where('email', $application->email)->exists()) {
                throw ValidationException::withMessages(['email' => 'An account with that email already exists.']);
            }
            $temporary = Str::password(16);
            $user = User::query()->create([
                'name' => $application->contact_name,
                'email' => $application->email,
                'password' => $temporary,
                'role' => 'dealer',
                'company_name' => $application->company_name,
                'phone' => $application->phone,
            ]);
            $userId = $user->id;
        }
        $application->update([
            'status' => $data['decision'],
            'review_note' => $data['review_note'] ?? null,
            'user_id' => $userId,
        ]);

        return response()->json([
            'application' => $application->fresh(),
            'temporary_password' => $temporary,
        ]);
    }

    public function taxRequests(Request $request)
    {
        $this->admin($request);

        return response()->json([
            'requests' => TaxExemptionRequest::query()->with('user:id,name,email')->latest()->limit(100)->get(),
        ]);
    }

    public function reviewTax(Request $request, TaxExemptionRequest $taxRequest)
    {
        $this->admin($request);
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);
        $taxRequest->update([
            'status' => $data['decision'],
            'review_note' => $data['review_note'] ?? null,
        ]);
        $taxRequest->user->update(['tax_status' => $data['decision'] === 'approved' ? 'exempt' : 'taxable']);
        Notifier::toUser($taxRequest->user_id, 'Tax exemption '.$data['decision'], 'Your tax exemption request was '.$data['decision'].'.');

        return response()->json(['request' => $taxRequest->fresh()]);
    }

    public function document(Request $request, string $kind, int $id)
    {
        $this->admin($request);
        $record = $kind === 'dealer'
            ? DealerApplication::query()->findOrFail($id)
            : TaxExemptionRequest::query()->findOrFail($id);
        if (! $record->document_path || ! \Illuminate\Support\Facades\Storage::disk('local')->exists($record->document_path)) {
            abort(404);
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($record->document_path);
    }

    private function admin(Request $request): void
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'An admin has to do that.');
        }
    }
}
