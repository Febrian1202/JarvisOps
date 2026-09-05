<?php

namespace App\Services\Export;

use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvExporter
{
    /**
     * Stream rows to a CSV response with UTF-8 BOM.
     *
     * @param  array<string>  $headers
     * @param  iterable<array<mixed>>  $rows
     */
    public function stream(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        $responseHeaders = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Microsoft Excel Indonesia & multilingual compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            // Write CSV headers
            fputcsv($handle, $headers);

            // Stream CSV rows
            foreach ($rows as $row) {
                fputcsv($handle, array_map(function ($val) {
                    if ($val === null) {
                        return '';
                    }
                    if (is_bool($val)) {
                        return $val ? 'true' : 'false';
                    }

                    return (string) $val;
                }, $row));

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            }

            fclose($handle);
        }, 200, $responseHeaders);
    }
}
