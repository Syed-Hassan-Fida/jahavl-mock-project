<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogAdminController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\InquiryController;
use App\Http\Controllers\Api\LiveController;
use App\Http\Controllers\Api\OpsController;
use App\Http\Controllers\Api\PeopleController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\ServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/catalog', [CatalogController::class, 'index']);
    Route::get('/catalog/search', [CatalogController::class, 'search']);
    Route::get('/series/{slug}', [CatalogController::class, 'series']);
    Route::get('/products/{slug}', [CatalogController::class, 'product']);
    Route::post('/inquiries', [InquiryController::class, 'store']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/forgot', [AuthController::class, 'forgot']);
    Route::post('/auth/reset', [AuthController::class, 'reset']);
    Route::post('/dealer-applications', [PeopleController::class, 'applyDealer']);
    Route::get('/avatars/{user}', [AccountController::class, 'avatar']);
    Route::get('/resources', [CatalogController::class, 'resources']);
    Route::get('/resources/documents/{document}', [CatalogAdminController::class, 'publicDocument']);

    Route::middleware('api.token')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/account', [AccountController::class, 'show']);
        Route::patch('/account', [AccountController::class, 'update']);
        Route::post('/account/avatar', [AccountController::class, 'storeAvatar']);
        Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
        Route::patch('/account/addresses/{address}', [AccountController::class, 'updateAddress']);
        Route::delete('/account/addresses/{address}', [AccountController::class, 'deleteAddress']);
        Route::post('/account/payment-methods', [AccountController::class, 'storePaymentMethod']);
        Route::delete('/account/payment-methods/{paymentMethod}', [AccountController::class, 'deletePaymentMethod']);
        Route::post('/account/tax-exemption', [AccountController::class, 'requestTaxExemption']);
        Route::get('/live', [LiveController::class, 'stream']);
        Route::get('/live/events', [LiveController::class, 'events']);
        Route::get('/notifications', [AccountController::class, 'notifications']);
        Route::post('/notifications/read-all', [AccountController::class, 'readNotifications']);
        Route::post('/notifications/{notification}/read', [AccountController::class, 'readNotification']);
        Route::delete('/notifications/{notification}', [AccountController::class, 'destroyNotification']);
        Route::get('/search', [CatalogController::class, 'workspace']);

        Route::get('/quotes', [QuoteController::class, 'index']);
        Route::post('/quotes', [QuoteController::class, 'store']);
        Route::get('/quotes/{quote}', [QuoteController::class, 'show']);
        Route::patch('/quotes/{quote}', [QuoteController::class, 'update']);
        Route::post('/quotes/{quote}/items', [QuoteController::class, 'addItem']);
        Route::post('/quotes/{quote}/expenses', [QuoteController::class, 'addExpense']);
        Route::post('/quotes/{quote}/packages', [QuoteController::class, 'addPackage']);
        Route::patch('/quotes/{quote}/items/{item}', [QuoteController::class, 'updateItem']);
        Route::delete('/quotes/{quote}/items/{item}', [QuoteController::class, 'deleteItem']);
        Route::post('/quotes/{quote}/convert', [QuoteController::class, 'convert']);
        Route::post('/quotes/{quote}/submit', [QuoteController::class, 'submit']);
        Route::post('/quotes/{quote}/revise', [QuoteController::class, 'revise']);
        Route::post('/quotes/{quote}/review', [QuoteController::class, 'review']);
        Route::post('/quotes/{quote}/checkout', [QuoteController::class, 'checkout']);
        Route::post('/quotes/{quote}/assign', [QuoteController::class, 'assign']);
        Route::post('/quotes/{quote}/expire', [QuoteController::class, 'expire']);
        Route::delete('/quotes/{quote}', [QuoteController::class, 'destroy']);
        Route::post('/quotes/{quote}/purchased', [QuoteController::class, 'purchased']);
        Route::post('/quotes/{quote}/pay', [QuoteController::class, 'pay']);
        Route::post('/quotes/{quote}/manual-payment', [QuoteController::class, 'manualPay']);
        Route::post('/payments/{payment}/refund', [QuoteController::class, 'refund']);
        Route::get('/quotes/{quote}/pdf', [QuoteController::class, 'pdf']);

        Route::get('/people', [PeopleController::class, 'index']);
        Route::post('/people', [PeopleController::class, 'store']);
        Route::delete('/people/{user}', [PeopleController::class, 'destroy']);
        Route::patch('/people/{user}/target', [PeopleController::class, 'updateTarget']);
        Route::patch('/people/{user}/tax', [PeopleController::class, 'updateTax']);
        Route::get('/assignments', [PeopleController::class, 'assignments']);
        Route::post('/assignments', [PeopleController::class, 'assign']);
        Route::delete('/assignments', [PeopleController::class, 'unassign']);
        Route::get('/dealer-applications', [PeopleController::class, 'dealerApplications']);
        Route::post('/dealer-applications/{application}/review', [PeopleController::class, 'reviewDealer']);
        Route::get('/tax-requests', [PeopleController::class, 'taxRequests']);
        Route::post('/tax-requests/{taxRequest}/review', [PeopleController::class, 'reviewTax']);
        Route::get('/private-files/{kind}/{id}', [PeopleController::class, 'document']);

        Route::get('/tickets', [ServiceController::class, 'tickets']);
        Route::post('/tickets', [ServiceController::class, 'storeTicket'])->middleware('idempotent');
        Route::get('/tickets/{ticket}', [ServiceController::class, 'showTicket']);
        Route::post('/tickets/{ticket}/events', [ServiceController::class, 'ticketEvent'])->middleware('idempotent');
        Route::post('/tickets/{ticket}/events/{event}/notes', [ServiceController::class, 'storeEventNote']);
        Route::get('/tickets/{ticket}/events/{event}/file', [ServiceController::class, 'eventFile']);
        Route::get('/messages/contacts', [ServiceController::class, 'contacts']);
        Route::get('/messages', [ServiceController::class, 'messages']);
        Route::post('/messages', [ServiceController::class, 'sendMessage'])->middleware('idempotent');
        Route::get('/messages/{message}/file', [ServiceController::class, 'messageFile']);
        Route::get('/notes', [ServiceController::class, 'notes']);
        Route::post('/notes', [ServiceController::class, 'storeNote']);
        Route::delete('/notes/{note}', [ServiceController::class, 'destroyNote']);
        Route::get('/tasks', [ServiceController::class, 'tasks']);
        Route::post('/tasks', [ServiceController::class, 'storeTask']);
        Route::patch('/tasks/{task}', [ServiceController::class, 'updateTask']);

        Route::get('/admin/products', [CatalogAdminController::class, 'index']);
        Route::patch('/admin/products/{product}', [CatalogAdminController::class, 'update']);
        Route::delete('/admin/products/{product}', [CatalogAdminController::class, 'destroy']);
        Route::delete('/admin/products/{product}/image', [CatalogAdminController::class, 'destroyImage']);
        Route::post('/admin/products/import', [CatalogAdminController::class, 'import']);
        Route::post('/admin/products/{product}/documents', [CatalogAdminController::class, 'storeDocument']);
        Route::get('/documents/{document}', [CatalogAdminController::class, 'downloadDocument']);
        Route::get('/admin/analytics', [AnalyticsController::class, 'index']);
        Route::get('/admin/cache', [OpsController::class, 'cache']);
    });
});
