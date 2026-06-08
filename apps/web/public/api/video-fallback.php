<?php
/**
 * Local PHP ffmpeg fallback for the static DreamHost gateway.
 *
 * The preferred production path is Apache -> api/index.php -> Fastify on
 * 127.0.0.1:4000. If that process is down, this fallback still lets the admin
 * ffmpeg tool create a real ffmpeg job, poll it, download the output, and read
 * the log instead of returning a dead-end 502.
 */

declare(strict_types=1);

const VIDEO_FALLBACK_JOB_PREFIX = 'job_php_';

function video_fallback_web_root(): string
{
    return dirname(__DIR__);
}

function video_fallback_env_file(): ?string
{
    $configured = getenv('OVIDA_API_ENV_FILE');
    $candidates = [];
    if ($configured) {
        $candidates[] = $configured;
    }

    $webRoot = video_fallback_web_root();
    $candidates[] = dirname($webRoot) . '/ovida-api/apps/api/.env';
    $candidates[] = $webRoot . '/../ovida-api/apps/api/.env';
    $candidates[] = $webRoot . '/.api.env';
    $candidates[] = $webRoot . '/api.env';

    foreach ($candidates as $candidate) {
        $real = realpath($candidate);
        if ($real && is_readable($real)) {
            return $real;
        }
    }

    return null;
}

function video_fallback_env(): array
{
    static $env = null;
    if (is_array($env)) {
        return $env;
    }

    $env = [];
    $file = video_fallback_env_file();
    if (!$file) {
        return $env;
    }

    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $first = substr($value, 0, 1);
        $last = substr($value, -1);
        if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
            $value = substr($value, 1, -1);
        }
        $env[$key] = $value;
    }

    return $env;
}

function video_fallback_setting(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }
    $env = video_fallback_env();
    return $env[$key] ?? $default;
}

function video_fallback_output_root(): string
{
    $configured = video_fallback_setting('VIDEO_OUTPUT_DIR');
    return $configured ?: video_fallback_web_root() . '/videos';
}

function video_fallback_tmp_root(): string
{
    $configured = video_fallback_setting('VIDEO_TMP_DIR');
    return $configured ?: sys_get_temp_dir() . '/ovida-video-jobs';
}

function video_fallback_jobs_root(): string
{
    return video_fallback_output_root() . '/php-jobs';
}

function video_fallback_public_origin(): string
{
    $configured = video_fallback_setting('APP_ORIGIN') ?: video_fallback_setting('API_ORIGIN');
    if ($configured) {
        return rtrim($configured, '/');
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

function video_fallback_send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}

function video_fallback_authorized(): bool
{
    $expected = video_fallback_setting('VIDEO_API_KEY');
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() ?: [] as $name => $value) {
            if (strtolower((string) $name) === 'authorization') {
                $authorization = (string) $value;
                break;
            }
        }
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        return false;
    }

    $token = trim($matches[1]);
    if ($expected === null || $expected === '') {
        return $token !== '';
    }

    return hash_equals($expected, $token);
}

function video_fallback_require_auth(): bool
{
    if (video_fallback_authorized()) {
        return true;
    }

    video_fallback_send_json(401, ['message' => 'Invalid API key']);
    return false;
}

function video_fallback_job_path(string $jobId): string
{
    return video_fallback_jobs_root() . '/' . $jobId . '.json';
}

function video_fallback_read_job(string $jobId): ?array
{
    if (!preg_match('/^job_[A-Za-z0-9_-]+$/', $jobId)) {
        return null;
    }

    $path = video_fallback_job_path($jobId);
    if (!is_readable($path)) {
        return null;
    }

    $job = json_decode((string) file_get_contents($path), true);
    return is_array($job) ? $job : null;
}

function video_fallback_write_job(array $job): void
{
    $root = video_fallback_jobs_root();
    if (!is_dir($root)) {
        mkdir($root, 0775, true);
    }

    file_put_contents(video_fallback_job_path((string) $job['job_id']), json_encode($job, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
}

function video_fallback_decode_asset(string $dataUrl, string $destination, array $allowedMimes): void
{
    if (!preg_match('#^data:([^;,]+)(;base64)?,(.*)$#s', $dataUrl, $matches)) {
        throw new RuntimeException('Only data URL uploads are supported by the PHP fallback.');
    }

    $mime = strtolower($matches[1]);
    if ($allowedMimes && !in_array($mime, $allowedMimes, true)) {
        throw new RuntimeException('Unsupported upload type: ' . $mime);
    }

    $raw = $matches[2] === ';base64' ? base64_decode($matches[3], true) : rawurldecode($matches[3]);
    if ($raw === false || $raw === '') {
        throw new RuntimeException('Unable to decode uploaded data URL.');
    }

    file_put_contents($destination, $raw, LOCK_EX);
}

function video_fallback_find_logo_overlay(array $payload): ?array
{
    foreach (($payload['overlays'] ?? []) as $overlay) {
        if (($overlay['type'] ?? '') === 'logo' && !empty($overlay['asset_url'])) {
            return $overlay;
        }
    }
    return null;
}

function video_fallback_text_overlay(array $payload): ?array
{
    foreach (($payload['overlays'] ?? []) as $overlay) {
        if (($overlay['type'] ?? '') === 'text' && !empty($overlay['text'])) {
            return $overlay;
        }
    }
    return null;
}

function video_fallback_create_job(string $body): void
{
    if (!video_fallback_require_auth()) {
        return;
    }

    $payload = json_decode($body, true);
    if (!is_array($payload) || empty($payload['source_url'])) {
        video_fallback_send_json(400, ['message' => 'source_url is required']);
        return;
    }

    $format = strtolower((string) ($payload['output_format'] ?? 'mp4'));
    if (!in_array($format, ['mp4', 'mov', 'mkv'], true)) {
        video_fallback_send_json(400, ['message' => 'Unsupported output_format']);
        return;
    }

    $jobId = VIDEO_FALLBACK_JOB_PREFIX . bin2hex(random_bytes(8));
    $jobDir = video_fallback_tmp_root() . '/' . $jobId;
    $outputRoot = video_fallback_output_root();
    if (!is_dir($jobDir)) {
        mkdir($jobDir, 0775, true);
    }
    if (!is_dir($outputRoot)) {
        mkdir($outputRoot, 0775, true);
    }

    $sourcePath = $jobDir . '/source.upload';
    $logoPath = null;
    $audioPath = null;
    try {
        video_fallback_decode_asset((string) $payload['source_url'], $sourcePath, ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm']);
        $logo = video_fallback_find_logo_overlay($payload);
        if ($logo) {
            $logoPath = $jobDir . '/logo.upload';
            video_fallback_decode_asset((string) $logo['asset_url'], $logoPath, ['image/png', 'image/jpeg', 'image/webp']);
        }
        if (!empty($payload['audio_url'])) {
            $audioPath = $jobDir . '/audio.upload';
            video_fallback_decode_asset((string) $payload['audio_url'], $audioPath, ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac']);
        }
    } catch (Throwable $error) {
        video_fallback_send_json(400, ['message' => $error->getMessage()]);
        return;
    }

    $outputPath = $outputRoot . '/' . $jobId . '.' . $format;
    $logPath = $outputRoot . '/' . $jobId . '.log';
    $job = [
        'job_id' => $jobId,
        'status' => 'queued',
        'progress' => 0,
        'created_at' => gmdate('c'),
        'updated_at' => gmdate('c'),
        'source_path' => $sourcePath,
        'logo_path' => $logoPath,
        'audio_path' => $audioPath,
        'output_path' => $outputPath,
        'log_path' => $logPath,
        'output_format' => $format,
        'payload' => [
            'text_overlay' => video_fallback_text_overlay($payload),
            'logo_overlay' => $logo ?? null,
        ],
    ];
    video_fallback_write_job($job);

    $php = defined('PHP_BINDIR') && is_executable(PHP_BINDIR . '/php') ? PHP_BINDIR . '/php' : 'php';
    $command = escapeshellcmd($php) . ' ' . escapeshellarg(__DIR__ . '/ffmpeg-worker.php') . ' ' . escapeshellarg($jobId) . ' > /dev/null 2>&1 &';
    exec($command);

    video_fallback_send_json(202, [
        'job_id' => $jobId,
        'status' => 'queued',
        'status_url' => video_fallback_public_origin() . '/api/v1/jobs/' . rawurlencode($jobId),
        'fallback' => 'php-ffmpeg',
    ]);
}

function video_fallback_status(string $jobId): void
{
    if (!video_fallback_require_auth()) {
        return;
    }

    $job = video_fallback_read_job($jobId);
    if (!$job) {
        video_fallback_send_json(404, ['message' => 'Job not found']);
        return;
    }

    video_fallback_send_json(200, [
        'job_id' => $job['job_id'],
        'status' => $job['status'],
        'progress' => $job['progress'] ?? 0,
        'download_url' => (($job['status'] ?? '') === 'completed') ? video_fallback_public_origin() . '/api/v1/jobs/' . rawurlencode($jobId) . '/download' : null,
        'error' => $job['error'] ?? null,
        'fallback' => 'php-ffmpeg',
    ]);
}

function video_fallback_log(string $jobId): void
{
    if (!video_fallback_require_auth()) {
        return;
    }

    $job = video_fallback_read_job($jobId);
    if (!$job || empty($job['log_path']) || !is_readable((string) $job['log_path'])) {
        video_fallback_send_json(404, ['message' => 'Job log not found']);
        return;
    }

    http_response_code(200);
    header('Content-Type: text/plain; charset=utf-8');
    readfile((string) $job['log_path']);
}

function video_fallback_download(string $jobId): void
{
    if (!video_fallback_require_auth()) {
        return;
    }

    $job = video_fallback_read_job($jobId);
    if (!$job || ($job['status'] ?? '') !== 'completed' || empty($job['output_path']) || !is_readable((string) $job['output_path'])) {
        video_fallback_send_json(404, ['message' => 'Job output not available']);
        return;
    }

    $path = (string) $job['output_path'];
    header('Content-Type: video/' . (($job['output_format'] ?? 'mp4') === 'mp4' ? 'mp4' : 'x-matroska'));
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: attachment; filename="' . basename($path) . '"');
    readfile($path);
}

function video_fallback_handle(string $path, string $method, string $body): bool
{
    $path = trim($path, '/');
    if ($path === 'api/v1/jobs' && strtoupper($method) === 'POST') {
        video_fallback_create_job($body);
        return true;
    }

    if (preg_match('#^api/v1/jobs/([^/]+)(?:/(log|download))?$#', $path, $matches)) {
        $jobId = rawurldecode($matches[1]);
        $action = $matches[2] ?? 'status';
        if ($action === 'log') {
            video_fallback_log($jobId);
        } elseif ($action === 'download') {
            video_fallback_download($jobId);
        } else {
            video_fallback_status($jobId);
        }
        return true;
    }

    return false;
}

function video_fallback_ffmpeg_filter(array $job, array &$args): ?string
{
    $filters = [];
    $label = '0:v';
    $next = 0;
    $payload = $job['payload'] ?? [];
    $text = $payload['text_overlay'] ?? null;
    if (is_array($text) && !empty($text['text'])) {
        $next += 1;
        $out = 'v' . $next;
        $font = !empty($text['fontfile']) ? ':fontfile=' . str_replace(['\\', ':', "'"], ['\\\\', '\:', "\\'"], (string) $text['fontfile']) : '';
        $content = str_replace(['\\', ':', "'"], ['\\\\', '\:', "\\'"], (string) $text['text']);
        $start = is_numeric($text['start'] ?? null) ? (float) $text['start'] : 0;
        $end = is_numeric($text['end'] ?? null) ? (float) $text['end'] : 4;
        $x = $text['x'] ?? '(w-text_w)/2';
        $y = $text['y'] ?? 'h-96';
        $filters[] = '[' . $label . ']drawtext' . $font . ":text='" . $content . "':fontcolor=white:fontsize=48:x=" . $x . ':y=' . $y . ":enable='between(t," . $start . ',' . $end . ")'[" . $out . ']';
        $label = $out;
    }

    if (!empty($job['logo_path'])) {
        $args[] = '-i';
        $args[] = (string) $job['logo_path'];
        $next += 1;
        $scaled = 'logo' . $next;
        $out = 'v' . $next;
        $logo = $payload['logo_overlay'] ?? [];
        $scale = is_array($logo) && isset($logo['scale']) ? (string) $logo['scale'] : '0.25';
        $x = is_array($logo) && isset($logo['x']) ? (string) $logo['x'] : 'main_w-overlay_w-32';
        $y = is_array($logo) && isset($logo['y']) ? (string) $logo['y'] : 'main_h-overlay_h-32';
        $start = is_array($logo) && is_numeric($logo['start'] ?? null) ? (float) $logo['start'] : 0;
        $end = is_array($logo) && is_numeric($logo['end'] ?? null) ? (float) $logo['end'] : 6;
        $filters[] = '[1:v]scale=iw*' . $scale . ':-1[' . $scaled . ']';
        $filters[] = '[' . $label . '][' . $scaled . ']overlay=' . $x . ':' . $y . ":enable='between(t," . $start . ',' . $end . ")'[" . $out . ']';
        $label = $out;
    }

    if (!$filters) {
        return null;
    }

    $args[] = '-filter_complex';
    $args[] = implode(';', $filters);
    return '[' . $label . ']';
}

function video_fallback_run_worker(string $jobId): int
{
    $job = video_fallback_read_job($jobId);
    if (!$job) {
        fwrite(STDERR, "Unknown job {$jobId}\n");
        return 1;
    }

    $job['status'] = 'running';
    $job['progress'] = 10;
    $job['updated_at'] = gmdate('c');
    video_fallback_write_job($job);

    $args = ['ffmpeg', '-y', '-i', (string) $job['source_path']];
    $audioInputIndex = null;
    $mapVideo = video_fallback_ffmpeg_filter($job, $args);
    if (!empty($job['audio_path'])) {
        $audioInputIndex = count(array_filter($args, static function ($arg) {
            return $arg === '-i';
        }));
        $args[] = '-i';
        $args[] = (string) $job['audio_path'];
    }

    if ($mapVideo) {
        $args[] = '-map';
        $args[] = $mapVideo;
    } else {
        $args[] = '-map';
        $args[] = '0:v';
    }
    $args[] = '-map';
    $args[] = $audioInputIndex === null ? '0:a?' : $audioInputIndex . ':a';
    $args = array_merge($args, ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', (string) $job['output_path']]);

    $command = implode(' ', array_map('escapeshellarg', $args));
    $logPath = (string) $job['log_path'];
    file_put_contents($logPath, "PHP fallback ffmpeg command:\n" . $command . "\n\n", LOCK_EX);
    $exitCode = 0;
    system($command . ' >> ' . escapeshellarg($logPath) . ' 2>&1', $exitCode);

    $job = video_fallback_read_job($jobId) ?: $job;
    $job['updated_at'] = gmdate('c');
    if ($exitCode === 0 && is_readable((string) $job['output_path'])) {
        $job['status'] = 'completed';
        $job['progress'] = 100;
    } else {
        $job['status'] = 'failed';
        $job['progress'] = 100;
        $job['error'] = 'ffmpeg exited with code ' . $exitCode;
    }
    video_fallback_write_job($job);
    return $exitCode;
}
