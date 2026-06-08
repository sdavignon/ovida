<?php
/**
 * Same-origin gateway for the statically exported Ovida console.
 *
 * DreamHost serves apps/web/out as static Apache content, while the real API
 * runs as the Fastify service on localhost:4000. Browser calls to /api/v1/jobs
 * otherwise hit Apache directly and return 404. This tiny gateway forwards the
 * original request to the API service so the admin ffmpeg test tool can create,
 * poll, download, and inspect video jobs from the deployed site.
 */

declare(strict_types=1);

const DEFAULT_API_ORIGIN = 'http://127.0.0.1:4000';

function gateway_header_value(string $value): bool
{
    return !preg_match('/[\r\n]/', $value);
}

function gateway_request_headers(): array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];

    if (!$headers) {
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) !== 'HTTP_') {
                continue;
            }

            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$name] = $value;
        }
    }


    $hasAuthorization = false;
    foreach ($headers as $name => $_value) {
        if (strtolower((string) $name) === 'authorization') {
            $hasAuthorization = true;
            break;
        }
    }

    if (!$hasAuthorization && isset($_SERVER['HTTP_AUTHORIZATION']) && gateway_header_value($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
    }

    $forwarded = [];
    $skip = [
        'host' => true,
        'content-length' => true,
        'connection' => true,
        'accept-encoding' => true,
    ];

    foreach ($headers as $name => $value) {
        $lower = strtolower((string) $name);
        if (isset($skip[$lower]) || !gateway_header_value((string) $value)) {
            continue;
        }

        $forwarded[] = $name . ': ' . $value;
    }

    if (isset($_SERVER['CONTENT_TYPE']) && gateway_header_value($_SERVER['CONTENT_TYPE'])) {
        $forwarded[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
    }

    return $forwarded;
}

function gateway_path(): string
{
    $path = isset($_GET['path']) ? trim((string) $_GET['path'], '/') : '';

    if ($path === '' || strpos($path, '..') !== false || strpos($path, '\\') !== false || preg_match('/[\x00-\x1F\x7F]/', $path)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Invalid API gateway path.';
        exit;
    }

    return $path;
}

function gateway_query_string(): string
{
    $params = [];
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    unset($params['path']);

    $query = http_build_query($params);
    return $query === '' ? '' : '?' . $query;
}

function gateway_api_origin(): string
{
    $configured = getenv('OVIDA_API_PROXY_TARGET') ?: DEFAULT_API_ORIGIN;
    return rtrim($configured, '/');
}

$path = gateway_path();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

// Video job calls are what the admin ffmpeg tool exercises. Handle those
// directly in PHP so production does not depend on a separate localhost Node
// process being up before ffmpeg processing can start. Non-video API calls still
// proxy to Fastify below.
require_once __DIR__ . '/video-fallback.php';
if (video_fallback_handle($path, $method, $body === false ? '' : $body)) {
    exit;
}

$target = gateway_api_origin() . '/' . $path . gateway_query_string();

$context = stream_context_create([
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", gateway_request_headers()),
        'content' => $body === false ? '' : $body,
        'ignore_errors' => true,
        'timeout' => 300,
    ],
]);

$response = @file_get_contents($target, false, $context);

if ($response === false && empty($http_response_header)) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Ovida API gateway could not reach ' . gateway_api_origin() . '.';
    exit;
}

$statusCode = 502;
foreach ($http_response_header ?? [] as $headerLine) {
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', $headerLine, $matches)) {
        $statusCode = (int) $matches[1];
        continue;
    }

    $separator = strpos($headerLine, ':');
    if ($separator === false) {
        continue;
    }

    $name = substr($headerLine, 0, $separator);
    $lower = strtolower($name);
    if (in_array($lower, ['connection', 'content-length', 'transfer-encoding', 'content-encoding'], true)) {
        continue;
    }

    header($headerLine, false);
}

http_response_code($statusCode);
echo $response === false ? '' : $response;
