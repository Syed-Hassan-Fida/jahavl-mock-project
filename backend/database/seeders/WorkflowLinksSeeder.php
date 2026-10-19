<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkflowLinksSeeder extends Seeder
{
    public function run(): void
    {
        $sales = User::query()->where('email', 'sales@example.com')->first();
        $dealer = User::query()->where('email', 'dealer@example.com')->first();
        $client = User::query()->where('email', 'client@example.com')->first();

        if ($sales && $client) {
            DB::table('sales_clients')->updateOrInsert(
                ['sales_user_id' => $sales->id, 'client_user_id' => $client->id],
                ['sales_user_id' => $sales->id, 'client_user_id' => $client->id],
            );
        }
        if ($dealer && $client) {
            DB::table('dealer_clients')->updateOrInsert(
                ['dealer_user_id' => $dealer->id, 'client_user_id' => $client->id],
                ['dealer_user_id' => $dealer->id, 'client_user_id' => $client->id],
            );
        }
        if ($sales && $dealer) {
            DB::table('sales_dealers')->updateOrInsert(
                ['sales_user_id' => $sales->id, 'dealer_user_id' => $dealer->id],
                ['sales_user_id' => $sales->id, 'dealer_user_id' => $dealer->id],
            );
        }
        if ($client && (float) $client->sales_tax_percent === 0.0) {
            $client->update(['sales_tax_percent' => 7]);
        }
    }
}
