<?php

namespace App\Domain;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

class Spreadsheet
{
    /** @return list<array<string, string>> */
    public static function rows(string $path, string $extension): array
    {
        $extension = strtolower($extension);
        if ($extension === 'csv') {
            return self::csv($path);
        }
        if ($extension === 'xlsx') {
            return self::xlsx($path);
        }

        throw new RuntimeException('Upload a .csv or .xlsx file.');
    }

    /** @return list<array<string, string>> */
    private static function csv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException('The spreadsheet could not be read.');
        }
        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);

            return [];
        }
        $header = array_map(fn ($cell) => self::key((string) $cell), $header);
        $rows = [];
        while (($cells = fgetcsv($handle)) !== false) {
            $row = [];
            foreach ($header as $index => $name) {
                if ($name === '') {
                    continue;
                }
                $row[$name] = trim((string) ($cells[$index] ?? ''));
            }
            if (implode('', $row) !== '') {
                $rows[] = $row;
            }
        }
        fclose($handle);

        return $rows;
    }

    /** @return list<array<string, string>> */
    private static function xlsx(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('The spreadsheet could not be read.');
        }
        $shared = [];
        $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedXml !== false) {
            $xml = new SimpleXMLElement($sharedXml);
            foreach ($xml->si as $item) {
                $shared[] = trim(strip_tags($item->asXML() ?: ''));
            }
        }
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        if ($sheet === false) {
            throw new RuntimeException('The spreadsheet has no first sheet.');
        }
        $xml = new SimpleXMLElement($sheet);
        $grid = [];
        foreach ($xml->sheetData->row as $row) {
            $cells = [];
            foreach ($row->c as $cell) {
                $ref = (string) $cell['r'];
                $column = preg_replace('/\d+/', '', $ref) ?: 'A';
                $index = 0;
                foreach (str_split($column) as $letter) {
                    $index = $index * 26 + (ord($letter) - 64);
                }
                $value = (string) $cell->v;
                if ((string) $cell['t'] === 's') {
                    $value = $shared[(int) $value] ?? '';
                }
                $cells[$index - 1] = trim($value);
            }
            if ($cells !== []) {
                $grid[] = $cells;
            }
        }
        if ($grid === []) {
            return [];
        }
        $header = array_map(fn ($cell) => self::key((string) $cell), $grid[0]);
        $width = count($header);
        $rows = [];
        foreach (array_slice($grid, 1) as $cells) {
            $row = [];
            for ($i = 0; $i < $width; $i++) {
                if ($header[$i] === '') {
                    continue;
                }
                $row[$header[$i]] = trim((string) ($cells[$i] ?? ''));
            }
            if (implode('', $row) !== '') {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private static function key(string $cell): string
    {
        $key = strtolower(trim($cell));
        $key = str_replace([' ', '-'], '_', $key);

        return $key;
    }
}
