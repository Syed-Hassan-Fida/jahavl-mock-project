<?php

namespace Tests\Feature;

use App\Models\LiveEvent;
use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LiveDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_retried_message_returns_the_original_and_publishes_once(): void
    {
        [$sender, $senderToken] = $this->account('client');
        [$recipient, $recipientToken] = $this->account('admin');
        $payload = ['recipient_id' => $recipient->id, 'body' => 'Ship date?'];

        $first = $this->withToken($senderToken)
            ->withHeader('Idempotency-Key', 'message-key-1')
            ->postJson('/api/v1/messages', $payload)
            ->assertCreated();

        $second = $this->withToken($senderToken)
            ->withHeader('Idempotency-Key', 'message-key-1')
            ->postJson('/api/v1/messages', $payload)
            ->assertCreated();

        $this->assertSame($first->json('message.id'), $second->json('message.id'));
        $this->assertSame(1, Message::query()->count());
        $this->assertSame(1, LiveEvent::query()->where('user_id', $recipient->id)->where('name', 'message')->count());
        $this->assertSame(1, LiveEvent::query()->where('user_id', $recipient->id)->where('name', 'notification')->count());

        $this->withToken($recipientToken)
            ->getJson('/api/v1/live/events?after=0')
            ->assertOk()
            ->assertJsonFragment(['name' => 'message'])
            ->assertJsonFragment(['body' => 'Ship date?']);
    }

    public function test_the_same_key_cannot_be_reused_for_a_different_message(): void
    {
        [$sender, $token] = $this->account('client');
        [$recipient] = $this->account('admin');

        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'message-key-2')
            ->postJson('/api/v1/messages', ['recipient_id' => $recipient->id, 'body' => 'First'])
            ->assertCreated();

        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'message-key-2')
            ->postJson('/api/v1/messages', ['recipient_id' => $recipient->id, 'body' => 'Second'])
            ->assertStatus(409);

        $this->assertSame(1, Message::query()->count());
    }

    public function test_a_message_without_an_idempotency_key_is_rejected(): void
    {
        [, $token] = $this->account('client');
        [$recipient] = $this->account('admin');

        $this->withToken($token)
            ->postJson('/api/v1/messages', ['recipient_id' => $recipient->id, 'body' => 'Hello'])
            ->assertStatus(422);

        $this->assertSame(0, Message::query()->count());
    }

    public function test_a_retried_ticket_reply_does_not_add_a_second_event(): void
    {
        [$owner, $token] = $this->account('client');
        $ticket = Ticket::query()->create([
            'user_id' => $owner->id,
            'subject' => 'Panel gap',
            'status' => 'open',
        ]);

        $first = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'ticket-reply-1')
            ->postJson('/api/v1/tickets/'.$ticket->id.'/events', ['body' => 'Still open'])
            ->assertOk();

        $second = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'ticket-reply-1')
            ->postJson('/api/v1/tickets/'.$ticket->id.'/events', ['body' => 'Still open'])
            ->assertOk();

        $this->assertCount(1, $first->json('ticket.events'));
        $this->assertSame($first->json('ticket.events.0.id'), $second->json('ticket.events.0.id'));
        $this->assertSame(1, LiveEvent::query()->where('user_id', $owner->id)->where('name', 'ticket')->count());
    }

    public function test_staff_can_close_a_ticket_without_a_second_reply_body(): void
    {
        [$owner] = $this->account('client');
        [$staff, $token] = $this->account('admin');
        $ticket = Ticket::query()->create([
            'user_id' => $owner->id,
            'subject' => 'Panel gap',
            'status' => 'open',
        ]);

        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'close-ticket-1')
            ->postJson('/api/v1/tickets/'.$ticket->id.'/events', ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('ticket.status', 'closed');

        $this->assertSame(1, LiveEvent::query()->where('user_id', $owner->id)->where('name', 'notification')->count());
        $this->assertNotSame($staff->id, $owner->id);
    }

    public function test_unread_messages_are_counted_on_the_contact(): void
    {
        [$sender, $senderToken] = $this->account('admin');
        [$recipient, $recipientToken] = $this->account('client');

        $this->withToken($senderToken)
            ->withHeader('Idempotency-Key', 'unread-message-1')
            ->postJson('/api/v1/messages', ['recipient_id' => $recipient->id, 'body' => 'Hello'])
            ->assertCreated();

        $this->withToken($recipientToken)
            ->getJson('/api/v1/messages/contacts')
            ->assertOk()
            ->assertJsonFragment(['id' => $sender->id, 'unread' => 1]);
    }

    /**
     * @return array{0: User, 1: string}
     */
    private function account(string $role): array
    {
        $user = User::factory()->role($role)->create();
        $plain = Str::random(64);
        $user->forceFill(['api_token' => hash('sha256', $plain)])->save();

        return [$user, $plain];
    }
}
