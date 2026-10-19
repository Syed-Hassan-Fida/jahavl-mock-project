<?php

namespace App\Domain;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Uploads
{
    public static function store(UploadedFile $file, string $directory): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'csv', 'xlsx', 'txt'];

        if (! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => 'Upload a PDF, image, CSV, XLSX, or text file.',
            ]);
        }

        if ($file->getSize() > 8 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'file' => 'Files must be 8 MB or smaller.',
            ]);
        }

        $name = Str::uuid()->toString().'.'.$extension;

        return $file->storeAs($directory, $name, 'local');
    }
}
