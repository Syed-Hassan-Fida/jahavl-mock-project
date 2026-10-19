<?php

namespace App\Domain;

use App\Models\Quote;

class PdfQuote
{
    public static function render(Quote $quote): string
    {
        $quote->loadMissing(['items.product', 'user']);
        $lines = [
            'JAH AUDIO',
            'Quote '.$quote->id.'  '.$quote->name,
            'Status '.ucfirst($quote->status).' ('.QuoteStatus::code($quote->status).')',
            'Prepared for '.($quote->user?->name ?? 'Customer'),
            '',
        ];

        foreach ($quote->items as $item) {
            if ($item->parent_id) {
                continue;
            }
            $label = $item->label ?: ($item->product?->name ?? ucfirst($item->kind));
            $amount = number_format((float) $item->quantity * (float) $item->unit_price, 2, '.', '');
            $lines[] = $item->quantity.'  '.$label.'  $'.$amount;
            foreach ($quote->items->where('parent_id', $item->id) as $child) {
                $childLabel = $child->label ?: ($child->product?->name ?? 'Item');
                $lines[] = '    '.$child->quantity.'  '.$childLabel;
            }
        }

        $lines[] = '';
        $lines[] = 'Shipping $'.number_format((float) $quote->shipping, 2, '.', '');
        $lines[] = 'Discount $'.number_format((float) $quote->discount, 2, '.', '');
        $lines[] = 'Tax $'.number_format((float) $quote->tax, 2, '.', '');
        $lines[] = 'Total $'.number_format((float) $quote->total, 2, '.', '');
        if ($quote->charge_id) {
            $lines[] = 'Charge '.$quote->charge_id;
        }

        return self::document($lines);
    }

    /** @param list<string> $lines */
    private static function document(array $lines): string
    {
        $commands = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
        $first = true;
        foreach ($lines as $line) {
            $safe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            if ($first) {
                $commands[] = '('.$safe.') Tj';
                $first = false;
            } else {
                $commands[] = 'T* ('.$safe.') Tj';
            }
        }
        $commands[] = 'ET';
        $stream = implode("\n", $commands);
        $objects = [
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
            "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
            "4 0 obj << /Length ".strlen($stream)." >> stream\n".$stream."\nendstream endobj\n",
            "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object;
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer << /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";

        return $pdf;
    }
}
