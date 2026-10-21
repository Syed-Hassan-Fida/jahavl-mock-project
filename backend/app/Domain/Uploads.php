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

        $stem = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $stem = $stem !== '' ? Str::limit($stem, 48, '') : 'file';
        $name = Str::uuid()->toString().'--'.$stem.'.'.$extension;

        return $file->storeAs($directory, $name, 'local');
    }

    public static function describe(?string $path): ?array
    {
        if (! $path) {
            return null;
        }

        $bytes = null;
        if (\Illuminate\Support\Facades\Storage::disk('local')->exists($path)) {
            $bytes = \Illuminate\Support\Facades\Storage::disk('local')->size($path);
        }

        return [
            'name' => self::label($path),
            'bytes' => $bytes,
        ];
    }

    public static function label(string $path): string
    {
        $base = basename($path);
        $extension = pathinfo($base, PATHINFO_EXTENSION);
        if (preg_match('/--(.+)\.[^.]+$/', $base, $match)) {
            return str_replace('-', ' ', $match[1]).($extension !== '' ? '.'.$extension : '');
        }

        return 'Attachment'.($extension !== '' ? '.'.$extension : '');
    }
}
