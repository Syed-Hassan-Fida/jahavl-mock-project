<?php

namespace App\Domain;

class QuoteStatus
{
    /** Legacy quote status integers from the original app. */
    public const CODES = [
        'added' => 1,
        'requested' => 2,
        'approved' => 3,
        'rejected' => 4,
        'paid' => 5,
        'expired' => 8,
    ];

    public static function code(string $status): int
    {
        return self::CODES[$status] ?? 1;
    }

    public static function name(int $code): ?string
    {
        $name = array_search($code, self::CODES, true);

        return $name === false ? null : $name;
    }
}
