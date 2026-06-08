<?php
require_once __DIR__ . '/video-fallback.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    echo 'Not found';
    exit;
}

$jobId = $argv[1] ?? '';
if ($jobId === '') {
    fwrite(STDERR, "Usage: php ffmpeg-worker.php <job-id>\n");
    exit(1);
}

exit(video_fallback_run_worker($jobId));
