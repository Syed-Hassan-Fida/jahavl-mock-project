<?php

namespace App\Http\Controllers\Api;

use App\Domain\Access;
use App\Domain\Live;
use App\Domain\Notifier;
use App\Domain\Uploads;
use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\SalesNote;
use App\Models\SalesTask;
use App\Models\Ticket;
use App\Models\TicketEvent;
use App\Models\TicketEventNote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ServiceController extends Controller
{
    public function tickets(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query()->with(['user:id,name,role', 'assignee:id,name'])->latest();
        if ($user->role === 'admin') {
            // full queue
        } elseif ($user->role === 'sales') {
            $clients = DB::table('sales_clients')->where('sales_user_id', $user->id)->pluck('client_user_id');
            $dealers = DB::table('sales_dealers')->where('sales_user_id', $user->id)->pluck('dealer_user_id');
            $query->where(function ($inner) use ($user, $clients, $dealers) {
                $inner->where('assignee_id', $user->id)->orWhereIn('user_id', $clients)->orWhereIn('user_id', $dealers)->orWhere('user_id', $user->id);
            });
        } elseif ($user->role === 'dealer') {
            $clients = DB::table('dealer_clients')->where('dealer_user_id', $user->id)->pluck('client_user_id');
            $query->where(function ($inner) use ($user, $clients) {
                $inner->where('user_id', $user->id)->orWhereIn('user_id', $clients);
            });
        } else {
            $query->where('user_id', $user->id);
        }

        return response()->json(['tickets' => $query->limit(100)->get()]);
    }

    public function storeTicket(Request $request)
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:5000'],
            'file' => ['nullable', 'file'],
        ]);
        $ticket = Ticket::query()->create([
            'user_id' => $request->user()->id,
            'subject' => $data['subject'],
            'status' => 'open',
        ]);
        $event = $ticket->events()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'status' => 'open',
            'attachment_path' => $request->file('file') ? Uploads::store($request->file('file'), 'tickets') : null,
        ]);
        Notifier::toAdmins('New ticket', $ticket->subject);
        $this->publishTicket($ticket, $event, $request->user()->name);

        return response()->json(['ticket' => $this->ticketPayload($ticket)], 201);
    }

    public function showTicket(Request $request, Ticket $ticket)
    {
        $this->guardTicket($request, $ticket);

        return response()->json(['ticket' => $this->ticketPayload($ticket)]);
    }

    public function ticketEvent(Request $request, Ticket $ticket)
    {
        $this->guardTicket($request, $ticket);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'in:open,pending,closed'],
            'assignee_id' => ['nullable', 'integer'],
            'file' => ['nullable', 'file'],
        ]);
        $body = trim((string) ($data['body'] ?? ''));
        if ($body === '' && empty($data['status']) && empty($data['assignee_id'])) {
            abort(422, 'Write a reply, or set a status or assignee.');
        }
        $notes = [];
        $staff = in_array($request->user()->role, ['admin', 'sales'], true);
        if (! empty($data['status']) && $staff) {
            $ticket->status = $data['status'];
            $notes[] = 'Status set to '.$data['status'].'.';
        }
        if (! empty($data['assignee_id']) && $staff) {
            $assignee = User::query()->findOrFail($data['assignee_id']);
            if (! in_array($assignee->role, ['admin', 'sales'], true)) {
                abort(422, 'Assign the ticket to sales or admin.');
            }
            $ticket->assignee_id = $assignee->id;
            $notes[] = 'Assigned to '.$assignee->name.'.';
        }
        if ($body === '') {
            $body = implode(' ', $notes);
        }
        if ($body === '') {
            abort(422, 'Write a reply.');
        }
        $ticket->save();
        $event = $ticket->events()->create([
            'user_id' => $request->user()->id,
            'body' => $body,
            'status' => $ticket->status,
            'attachment_path' => $request->file('file') ? Uploads::store($request->file('file'), 'tickets') : null,
        ]);
        $this->notifyTicket($request, $ticket);
        $this->publishTicket($ticket, $event, $request->user()->name);

        return response()->json(['ticket' => $this->ticketPayload($ticket)]);
    }

    public function contacts(Request $request)
    {
        $ids = Access::messageContactIds($request->user());
        $people = User::query()->whereIn('id', $ids)->orderBy('name')->get(['id', 'name', 'email', 'role']);
        $unread = Message::query()
            ->where('recipient_id', $request->user()->id)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as unread')
            ->groupBy('sender_id')
            ->pluck('unread', 'sender_id');

        return response()->json([
            'contacts' => $people->map(fn (User $person) => [
                'id' => $person->id,
                'name' => $person->name,
                'email' => $person->email,
                'role' => $person->role,
                'unread' => (int) ($unread[$person->id] ?? 0),
            ])->values(),
        ]);
    }

    public function messages(Request $request)
    {
        $data = $request->validate(['with' => ['required', 'integer']]);
        $other = (int) $data['with'];
        if (! in_array($other, Access::messageContactIds($request->user()), true)) {
            abort(403, 'You cannot message that account.');
        }
        $me = $request->user()->id;
        Message::query()
            ->where('sender_id', $other)
            ->where('recipient_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        $rows = Message::query()
            ->where(function ($query) use ($me, $other) {
                $query->where('sender_id', $me)->where('recipient_id', $other);
            })
            ->orWhere(function ($query) use ($me, $other) {
                $query->where('sender_id', $other)->where('recipient_id', $me);
            })
            ->orderBy('id')
            ->limit(200)
            ->get();

        return response()->json([
            'messages' => $rows->map(fn (Message $message) => [
                'id' => $message->id,
                'body' => $message->body,
                'sender_id' => $message->sender_id,
                'recipient_id' => $message->recipient_id,
                'created_at' => $message->created_at,
                'has_attachment' => (bool) $message->attachment_path,
                'attachment' => Uploads::describe($message->attachment_path),
            ]),
        ]);
    }

    public function sendMessage(Request $request)
    {
        $data = $request->validate([
            'recipient_id' => ['required', 'integer'],
            'body' => ['nullable', 'string', 'max:5000', 'required_without:file'],
            'file' => ['nullable', 'file'],
        ]);
        if (! in_array((int) $data['recipient_id'], Access::messageContactIds($request->user()), true)) {
            abort(403, 'You cannot message that account.');
        }
        $message = Message::query()->create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $data['recipient_id'],
            'body' => trim((string) ($data['body'] ?? '')) !== '' ? $data['body'] : 'Attachment',
            'attachment_path' => $request->file('file') ? Uploads::store($request->file('file'), 'chat') : null,
        ]);
        Notifier::toUser((int) $data['recipient_id'], 'New message', $request->user()->name.' sent a message.');
        $payload = [
            'id' => $message->id,
            'body' => $message->body,
            'sender_id' => $message->sender_id,
            'recipient_id' => $message->recipient_id,
            'created_at' => $message->created_at,
            'has_attachment' => (bool) $message->attachment_path,
            'attachment' => Uploads::describe($message->attachment_path),
        ];
        Live::toUsers([$message->sender_id, $message->recipient_id], 'message', [
            'message' => $payload,
        ]);

        return response()->json(['message' => $payload], 201);
    }

    public function messageFile(Request $request, Message $message)
    {
        $me = $request->user()->id;
        if (! in_array($me, [$message->sender_id, $message->recipient_id], true) || ! $message->attachment_path) {
            abort(404);
        }
        if (! Storage::disk('local')->exists($message->attachment_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($message->attachment_path);
    }

    public function eventFile(Request $request, Ticket $ticket, TicketEvent $event)
    {
        $this->guardTicket($request, $ticket);
        if ($event->ticket_id !== $ticket->id || ! $event->attachment_path || ! Storage::disk('local')->exists($event->attachment_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($event->attachment_path);
    }

    public function storeEventNote(Request $request, Ticket $ticket, TicketEvent $event)
    {
        $this->guardTicket($request, $ticket);
        if ($event->ticket_id !== $ticket->id) {
            abort(404);
        }
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $note = $event->notes()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);
        $note->load('user:id,name');

        return response()->json([
            'note' => [
                'id' => $note->id,
                'body' => $note->body,
                'author' => $note->user?->name,
                'created_at' => $note->created_at,
            ],
        ], 201);
    }

    public function notes(Request $request)
    {
        $this->staff($request);
        $query = SalesNote::query()->with(['author:id,name', 'client:id,name'])->latest();
        if ($request->user()->role === 'sales') {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json(['notes' => $query->limit(100)->get()]);
    }

    public function storeNote(Request $request)
    {
        $this->staff($request);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:5000'],
            'client_user_id' => ['nullable', 'integer'],
            'quote_id' => ['nullable', 'integer'],
            'due_on' => ['nullable', 'date'],
        ]);
        if (! empty($data['client_user_id'])) {
            $client = User::query()->findOrFail($data['client_user_id']);
            if ($request->user()->role === 'sales' && ! Access::canSeeUser($request->user(), $client)) {
                abort(403, 'That account is outside your book of business.');
            }
        }
        $note = SalesNote::query()->create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['note' => $note->load(['author:id,name', 'client:id,name'])], 201);
    }

    public function destroyNote(Request $request, SalesNote $note)
    {
        $this->staff($request);
        if ($request->user()->role === 'sales' && $note->user_id !== $request->user()->id) {
            abort(403, 'That note belongs to another specialist.');
        }
        $note->delete();

        return response()->json(['message' => 'Note removed.']);
    }

    public function tasks(Request $request)
    {
        $this->staff($request);
        $query = SalesTask::query()->with(['sales:id,name', 'related:id,name'])->latest();
        if ($request->user()->role === 'sales') {
            $query->where('sales_user_id', $request->user()->id);
        }

        return response()->json(['tasks' => $query->limit(100)->get()]);
    }

    public function storeTask(Request $request)
    {
        $this->staff($request);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'due_on' => ['nullable', 'date'],
            'related_user_id' => ['nullable', 'integer'],
            'sales_user_id' => ['nullable', 'integer'],
        ]);
        $salesId = $request->user()->role === 'sales' ? $request->user()->id : ($data['sales_user_id'] ?? $request->user()->id);
        if ($request->user()->role === 'sales' && ! empty($data['related_user_id'])) {
            $related = User::query()->findOrFail($data['related_user_id']);
            if (! Access::canSeeUser($request->user(), $related)) {
                abort(403, 'That account is outside your book of business.');
            }
        }
        $task = SalesTask::query()->create([
            'sales_user_id' => $salesId,
            'related_user_id' => $data['related_user_id'] ?? null,
            'title' => $data['title'],
            'notes' => $data['notes'] ?? null,
            'due_on' => $data['due_on'] ?? null,
        ]);

        return response()->json(['task' => $task], 201);
    }

    public function updateTask(Request $request, SalesTask $task)
    {
        $this->staff($request);
        if ($request->user()->role === 'sales' && $task->sales_user_id !== $request->user()->id) {
            abort(403, 'That task belongs to another specialist.');
        }
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'due_on' => ['nullable', 'date'],
            'completed' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('completed', $data)) {
            $task->completed_at = $data['completed'] ? now() : null;
        }
        $task->fill(array_intersect_key($data, array_flip(['title', 'notes', 'due_on'])));
        $task->save();

        return response()->json(['task' => $task->fresh()]);
    }

    private function guardTicket(Request $request, Ticket $ticket): void
    {
        $visible = Ticket::query()->whereKey($ticket->id);
        $user = $request->user();
        if ($user->role === 'admin') {
            return;
        }
        if ($user->role === 'sales') {
            $clients = DB::table('sales_clients')->where('sales_user_id', $user->id)->pluck('client_user_id');
            $dealers = DB::table('sales_dealers')->where('sales_user_id', $user->id)->pluck('dealer_user_id');
            $ok = $visible->where(function ($inner) use ($user, $clients, $dealers) {
                $inner->where('assignee_id', $user->id)->orWhereIn('user_id', $clients)->orWhereIn('user_id', $dealers)->orWhere('user_id', $user->id);
            })->exists();
        } elseif ($user->role === 'dealer') {
            $clients = DB::table('dealer_clients')->where('dealer_user_id', $user->id)->pluck('client_user_id');
            $ok = $visible->where(function ($inner) use ($user, $clients) {
                $inner->where('user_id', $user->id)->orWhereIn('user_id', $clients);
            })->exists();
        } else {
            $ok = $ticket->user_id === $user->id;
        }
        if (! $ok) {
            abort(403, 'That ticket is outside your workspace.');
        }
    }

    private function ticketPayload(Ticket $ticket): array
    {
        $ticket->load(['user:id,name,email,role', 'assignee:id,name,role', 'events.user:id,name,role', 'events.notes.user:id,name']);

        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'owner' => $ticket->user,
            'assignee' => $ticket->assignee,
            'events' => $ticket->events->map(fn ($event) => [
                'id' => $event->id,
                'body' => $event->body,
                'status' => $event->status,
                'has_attachment' => (bool) $event->attachment_path,
                'attachment' => Uploads::describe($event->attachment_path),
                'author' => $event->user?->name,
                'created_at' => $event->created_at,
                'notes' => $event->notes->map(fn ($note) => [
                    'id' => $note->id,
                    'body' => $note->body,
                    'author' => $note->user?->name,
                    'created_at' => $note->created_at,
                ]),
            ]),
        ];
    }

    private function notifyTicket(Request $request, Ticket $ticket): void
    {
        $actor = $request->user()->id;
        if ($ticket->user_id === $actor) {
            if ($ticket->assignee_id && (int) $ticket->assignee_id !== $actor) {
                Notifier::toUser((int) $ticket->assignee_id, 'Ticket reply', $ticket->subject);
            } else {
                Notifier::toAdmins('Ticket reply', $ticket->subject);
            }

            return;
        }

        Notifier::toUser($ticket->user_id, 'Ticket updated', $ticket->subject);
        if ($ticket->assignee_id && (int) $ticket->assignee_id !== $actor) {
            Notifier::toUser((int) $ticket->assignee_id, 'Ticket updated', $ticket->subject);
        }
    }

    private function publishTicket(Ticket $ticket, $event, string $author): void
    {
        $audience = array_merge(
            [$ticket->user_id, (int) $ticket->assignee_id, (int) $event->user_id],
            User::query()->where('role', 'admin')->pluck('id')->all(),
        );
        Live::toUsers($audience, 'ticket', [
            'ticket' => [
                'id' => $ticket->id,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
            ],
            'event' => [
                'id' => $event->id,
                'body' => $event->body,
                'author' => $author,
                'status' => $event->status,
                'created_at' => $event->created_at,
                'has_attachment' => (bool) $event->attachment_path,
                'attachment' => Uploads::describe($event->attachment_path),
            ],
        ]);
    }

    private function staff(Request $request): void
    {
        if (! in_array($request->user()->role, ['admin', 'sales'], true)) {
            abort(403, 'Sales tasks stay with the sales team.');
        }
    }
}
