import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../env';

export type OverlayInstruction = LogoOverlayInstruction | TextOverlayInstruction;

export interface LogoOverlayInstruction {
  type: 'logo';
  asset_url: string;
  x: string;
  y: string;
  start: number;
  end: number;
  fade_in?: number;
  fade_out?: number;
  scale?: string;
}

export interface TextOverlayInstruction {
  type: 'text';
  text: string;
  fontfile: string;
  fontsize: number;
  fontcolor: string;
  x: string;
  y: string;
  start: number;
  end: number;
  shadow?: boolean;
}

export interface CreateVideoJobPayload {
  sourceUrl: string;
  overlays: OverlayInstruction[];
  outputFormat: string;
  callbackUrl?: string | null;
  audioUrl?: string | null;
}

export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoJobSummary {
  job_id: string;
  status: VideoJobStatus;
  progress: number;
  download_url?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

interface VideoJobInternal extends Omit<VideoJobSummary, 'job_id' | 'created_at' | 'updated_at'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  request: CreateVideoJobPayload;
  outputPath?: string;
  logPath?: string;
  tmpDir?: string;
  durationSeconds?: number;
}

interface LogoInputResource {
  inputIndex: number;
  path: string;
}

interface VideoJobManagerOptions {
  env: Env;
  logger: FastifyBaseLogger;
}

export class VideoJobManager {
  private readonly env: Env;
  private readonly logger: FastifyBaseLogger;
  private readonly tmpRoot: string;
  private readonly outputRoot: string;
  private readonly maxInputBytes: number;
  private readonly maxOverlayBytes: number;
  private readonly maxAudioBytes: number;
  private readonly callbackTimeoutMs: number;
  private readonly jobs = new Map<string, VideoJobInternal>();
  private queue: Promise<void> = Promise.resolve();

  constructor(options: VideoJobManagerOptions) {
    this.env = options.env;
    this.logger = options.logger;
    this.tmpRoot = options.env.VIDEO_TMP_DIR;
    this.outputRoot = options.env.VIDEO_OUTPUT_DIR;
    this.maxInputBytes = options.env.VIDEO_MAX_INPUT_BYTES;
    this.maxOverlayBytes = options.env.VIDEO_MAX_OVERLAY_BYTES;
    this.maxAudioBytes = options.env.VIDEO_MAX_AUDIO_BYTES;
    this.callbackTimeoutMs = options.env.VIDEO_CALLBACK_TIMEOUT_MS;
  }

  async ensureDirectories() {
    await fs.mkdir(this.tmpRoot, { recursive: true });
    await fs.mkdir(this.outputRoot, { recursive: true });
  }

  async prepareEnvironment() {
    await this.ensureDirectories();
    await Promise.all([
      this.verifyExecutable('ffmpeg', ['-version']),
      this.verifyExecutable('ffprobe', ['-version']),
    ]);
  }

  private async verifyExecutable(command: string, args: string[]) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'ignore' });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${command} exited with code ${code}`));
          }
        });
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Required executable "${command}" is not available. Install it on the host and ensure it is in PATH. (${reason})`,
      );
    }
  }

  createJob(payload: CreateVideoJobPayload): VideoJobSummary {
    const jobId = `job_${randomUUID().replace(/-/g, '')}`;
    const job: VideoJobInternal = {
      id: jobId,
      status: 'queued',
      progress: 0,
      download_url: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      request: payload,
    };
    this.jobs.set(jobId, job);

    const startProcessing = async () => {
      try {
        await this.runJob(jobId);
      } catch (error) {
        this.logger.error(error, 'Unhandled error while processing job %s', jobId);
        this.failJob(jobId, error instanceof Error ? error : new Error('Unknown error'));
        const failed = this.jobs.get(jobId);
        if (failed) {
          await this.notifyCallback(failed);
        }
      }
    };

    this.queue = this.queue.then(startProcessing, startProcessing);

    return this.toSummary(job);
  }

  getJob(jobId: string): VideoJobSummary | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }
    return this.toSummary(job);
  }

  async getJobLog(jobId: string): Promise<string | undefined> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }

    const candidatePaths = [
      job.logPath,
      path.join(this.outputRoot, `${job.id}.log`),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidatePaths) {
      try {
        return await fs.readFile(candidate, 'utf8');
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return undefined;
  }

  private toSummary(job: VideoJobInternal): VideoJobSummary {
    return {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      download_url: job.download_url ?? undefined,
      error: job.error ?? undefined,
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
    };
  }

  private updateJob(jobId: string, patch: Partial<VideoJobInternal>) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    Object.assign(job, patch);
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);
  }

  private failJob(jobId: string, error: Error) {
    this.updateJob(jobId, {
      status: 'failed',
      progress: 100,
      error: error.message,
    });
  }

  private async runJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    await this.ensureDirectories();

    const jobTmpDir = path.join(this.tmpRoot, job.id);
    await fs.rm(jobTmpDir, { recursive: true, force: true });
    await fs.mkdir(jobTmpDir, { recursive: true });

    const logPath = path.join(jobTmpDir, 'ffmpeg.log');
    job.logPath = logPath;
    job.tmpDir = jobTmpDir;

    try {
      this.updateJob(job.id, { status: 'processing', progress: 5, error: null });

      const inputFile = await this.downloadSource(job);
      const overlays = await this.prepareOverlays(job);
      const audio = await this.prepareAudio(job);

      this.updateJob(job.id, { progress: 15 });

      const duration = await this.getVideoDuration(inputFile.path);
      if (duration !== null && duration > 0) {
        this.updateJob(job.id, { durationSeconds: duration });
      }

      const ffmpegArgs = this.buildFfmpegArgs(job, inputFile.path, overlays, audio ?? undefined);
      const outputFilename = `${job.id}.${job.request.outputFormat}`;
      const outputPath = path.join(this.outputRoot, outputFilename);

      await this.executeFfmpeg(job, ffmpegArgs, outputPath, logPath, duration);

      const publicUrl = this.buildPublicUrl(outputFilename);
      this.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        download_url: publicUrl ?? null,
        outputPath,
      });
      await this.archiveLog(job.id, logPath);
      const updated = this.jobs.get(job.id);
      if (updated) {
        await this.notifyCallback(updated);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Video processing failed');
      this.logger.error(err, 'Video job %s failed', job.id);
      await this.archiveLog(job.id, logPath);
      this.failJob(job.id, err);
      const updated = this.jobs.get(job.id);
      if (updated) {
        await this.notifyCallback(updated);
      }
    } finally {
      await this.cleanup(jobTmpDir);
    }
  }

  private async downloadSource(job: VideoJobInternal) {
    const fileName = 'input';
    const result = await this.downloadToFile(job.request.sourceUrl, job.tmpDir!, fileName, {
      fallbackExtension: '.mp4',
      maxBytes: this.maxInputBytes,
      purpose: 'source video',
    });
    return result;
  }

  private async prepareOverlays(job: VideoJobInternal) {
    const overlays = job.request.overlays;
    const resources: (LogoInputResource | null)[] = [];
    let nextInputIndex = 1;
    for (let i = 0; i < overlays.length; i += 1) {
      const overlay = overlays[i];
      if (overlay.type === 'logo') {
        const fileName = `logo_${i}`;
        const resource = await this.downloadToFile(overlay.asset_url, job.tmpDir!, fileName, {
          fallbackExtension: '.png',
          maxBytes: this.maxOverlayBytes,
          purpose: 'logo asset',
          allowedMime: /^image\//,
        });
        resources.push({
          inputIndex: nextInputIndex,
          path: resource.path,
        });
        nextInputIndex += 1;
      } else {
        resources.push(null);
      }
    }
    return resources;
  }

  private buildFfmpegArgs(
    job: VideoJobInternal,
    inputPath: string,
    overlayInputs: (LogoInputResource | null)[],
    audioInput?: { path: string },
  ): string[] {
    const args: string[] = ['-y', '-i', inputPath];
    let nextInputIndex = 1;
    for (const resource of overlayInputs) {
      if (resource) {
        args.push('-i', resource.path);
        nextInputIndex += 1;
      }
    }

    let audioInputIndex: number | null = null;
    if (audioInput) {
      args.push('-i', audioInput.path);
      audioInputIndex = nextInputIndex;
      nextInputIndex += 1;
    }

    const { filterGraph, outputLabel } = this.buildFilterGraph(job, overlayInputs);

    if (filterGraph) {
      args.push('-filter_complex', filterGraph);
      if (outputLabel) {
        args.push('-map', outputLabel);
      }
    } else {
      args.push('-map', '0:v');
    }

    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20');
    if (audioInput && audioInputIndex !== null) {
      args.push('-map', `${audioInputIndex}:a:0`);
      args.push('-c:a', 'aac', '-b:a', '192k');
    } else {
      args.push('-map', '0:a?');
      args.push('-c:a', 'copy');
    }
    args.push('-movflags', '+faststart');
    return args;
  }

  private async prepareAudio(job: VideoJobInternal) {
    const audioUrl = job.request.audioUrl;
    if (!audioUrl) {
      return null;
    }

    const resource = await this.downloadToFile(audioUrl, job.tmpDir!, 'audio', {
      fallbackExtension: '.mp3',
      maxBytes: this.maxAudioBytes,
      purpose: 'audio track',
      allowedMime: /^audio\/(mpeg|wav|x-wav|wave)$/,
    });

    return { path: resource.path };
  }

  private buildFilterGraph(
    job: VideoJobInternal,
    overlayInputs: (LogoInputResource | null)[],
  ): { filterGraph?: string; outputLabel?: string } {
    if (job.request.overlays.length === 0) {
      return { filterGraph: undefined, outputLabel: undefined };
    }

    const filterParts: string[] = [];
    let currentLabel = '0:v';
    let logoCount = 0;

    job.request.overlays.forEach((overlay, index) => {
      const isLast = index === job.request.overlays.length - 1;
      const nextLabel = isLast ? 'vout' : `v${index + 1}`;

      if (overlay.type === 'logo') {
        const resource = overlayInputs[index];
        if (!resource) {
          throw new Error(`Missing prepared resource for logo overlay at index ${index}`);
        }

        const overlayLabel = `logo${logoCount}`;
        logoCount += 1;

        const overlayFilters: string[] = ['format=rgba'];
        if (overlay.scale) {
          overlayFilters.push(this.buildScaleFilter(overlay.scale));
        }

        const duration = Math.max(overlay.end - overlay.start, 0);
        if (overlay.fade_in && overlay.fade_in > 0) {
          overlayFilters.push(`fade=t=in:st=0:d=${overlay.fade_in}:alpha=1`);
        }
        if (overlay.fade_out && overlay.fade_out > 0 && duration > 0) {
          const fadeStart = Math.max(duration - overlay.fade_out, 0);
          overlayFilters.push(`fade=t=out:st=${fadeStart}:d=${overlay.fade_out}:alpha=1`);
        }

        filterParts.push(
          `[${resource.inputIndex}:v]${overlayFilters.join(',')}[${overlayLabel}]`,
        );

        filterParts.push(
          `[${currentLabel}][${overlayLabel}]overlay=${overlay.x}:${overlay.y}:enable='between(t,${overlay.start},${overlay.end})'[${nextLabel}]`,
        );
        currentLabel = nextLabel;
      } else {
        const drawtextParts: string[] = [
          `fontfile=${this.escapeFilterValue(overlay.fontfile)}`,
          `text=${this.escapeDrawtextText(overlay.text)}`,
          `fontcolor=${overlay.fontcolor}`,
          `fontsize=${overlay.fontsize}`,
          `x=${overlay.x}`,
          `y=${overlay.y}`,
          `enable='between(t,${overlay.start},${overlay.end})'`,
        ];

        if (overlay.shadow) {
          drawtextParts.push('shadowcolor=000000@0.7', 'shadowx=2', 'shadowy=2');
        }

        filterParts.push(
          `[${currentLabel}]drawtext=${drawtextParts.join(':')}[${nextLabel}]`,
        );
        currentLabel = nextLabel;
      }
    });

    return {
      filterGraph: filterParts.join('; '),
      outputLabel: `[${currentLabel}]`,
    };
  }

  private buildScaleFilter(scale: string) {
    const expression = scale.includes(':') ? scale : `${scale}:-1`;
    return `scale=${expression}`;
  }

  private escapeDrawtextText(text: string) {
    return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');
  }

  private escapeFilterValue(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  }

  private buildPublicUrl(filename: string) {
    const base = this.env.VIDEO_PUBLIC_BASE_URL ?? this.deriveDefaultPublicBase();
    if (!base) {
      return `/videos/${filename}`;
    }
    const normalized = base.endsWith('/') ? base : `${base}/`;
    try {
      return new URL(filename, normalized).toString();
    } catch {
      return `${normalized}${filename}`;
    }
  }

  private deriveDefaultPublicBase() {
    const origin = this.env.API_ORIGIN ?? this.env.APP_ORIGIN;
    if (!origin) {
      return undefined;
    }
    return origin.endsWith('/videos/') ? origin : `${origin.replace(/\/?$/, '')}/videos/`;
  }

  private async executeFfmpeg(
    job: VideoJobInternal,
    args: string[],
    outputPath: string,
    logPath: string,
    duration: number | null,
  ) {
    await fs.rm(outputPath, { force: true });

    const ffmpeg = spawn('ffmpeg', [...args, outputPath], { stdio: ['ignore', 'pipe', 'pipe'] });

    const logStream = createWriteStream(logPath, { flags: 'a' });

    const updateProgressFromLine = (line: string) => {
      if (!duration || duration <= 0) return;
      const timeMatch = /time=([0-9:.]+)/.exec(line);
      if (timeMatch) {
        const seconds = this.parseTimestamp(timeMatch[1]);
        if (Number.isFinite(seconds) && seconds >= 0) {
          const fraction = Math.min(seconds / duration, 1);
          const progress = Math.min(99, Math.max(15, Math.round(15 + fraction * 80)));
          this.updateJob(job.id, { progress });
        }
      }
    };

    ffmpeg.stdout.setEncoding('utf8');
    ffmpeg.stderr.setEncoding('utf8');

    ffmpeg.stdout.on('data', (data: string) => {
      logStream.write(data);
      updateProgressFromLine(data);
    });

    ffmpeg.stderr.on('data', (data: string) => {
      logStream.write(data);
      updateProgressFromLine(data);
    });

    const exitCode: number = await new Promise((resolve, reject) => {
      ffmpeg.on('error', reject);
      ffmpeg.on('close', resolve);
    });

    logStream.end();

    if (exitCode !== 0) {
      throw new Error(`ffmpeg exited with status ${exitCode}`);
    }
  }

  private parseTimestamp(timestamp: string) {
    const [hours, minutes, seconds] = timestamp.split(':');
    if (seconds === undefined || minutes === undefined || hours === undefined) {
      return Number.NaN;
    }
    return (
      Number(hours) * 3600 +
      Number(minutes) * 60 +
      Number(seconds)
    );
  }

  private async getVideoDuration(inputPath: string) {
    try {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        inputPath,
      ]);

      let output = '';
      ffprobe.stdout?.setEncoding('utf8');
      ffprobe.stdout?.on('data', (data: string) => {
        output += data;
      });

      const exitCode: number = await new Promise((resolve, reject) => {
        ffprobe.on('error', reject);
        ffprobe.on('close', resolve);
      });

      if (exitCode !== 0) {
        return null;
      }

      const duration = parseFloat(output.trim());
      return Number.isFinite(duration) ? duration : null;
    } catch (error) {
      this.logger.warn({ err: error }, 'Unable to determine video duration');
      return null;
    }
  }

  private async downloadToFile(
    url: string,
    directory: string,
    baseName: string,
    options: {
      fallbackExtension: string;
      maxBytes: number;
      purpose: string;
      allowedMime?: RegExp;
    },
  ) {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${options.purpose} (${response.status} ${response.statusText})`);
    }

    const contentType = response.headers.get('content-type') ?? undefined;
    if (options.allowedMime && contentType && !options.allowedMime.test(contentType)) {
      throw new Error(`Unexpected content type for ${options.purpose}: ${contentType}`);
    }

    const extension =
      this.extensionFromUrl(url) ??
      (contentType ? this.extensionFromMime(contentType) : undefined) ??
      options.fallbackExtension;

    const filePath = path.join(directory, `${baseName}${extension}`);
    const tempPath = `${filePath}.${randomUUID()}.partial`;
    const fileStream = createWriteStream(tempPath);

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const total = Number(contentLengthHeader);
      if (Number.isFinite(total) && total > options.maxBytes) {
        fileStream.destroy();
        await fs.rm(tempPath, { force: true });
        throw new Error(`${options.purpose} exceeds maximum size (${total} bytes)`);
      }
    }

    let downloaded = 0;
    const webBody = response.body;
    const bodyStream =
      webBody && typeof (webBody as any).getReader === 'function'
        ? Readable.fromWeb(webBody as unknown as NodeReadableStream)
        : (webBody as unknown as Readable);

    bodyStream.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (downloaded > options.maxBytes) {
        bodyStream.destroy(new Error(`${options.purpose} exceeds maximum size`));
      }
    });

    try {
      await pipeline(bodyStream, fileStream);
    } catch (error) {
      await fs.rm(tempPath, { force: true });
      throw error instanceof Error ? error : new Error(`Failed to download ${options.purpose}`);
    }

    await fs.rename(tempPath, filePath);

    return {
      path: filePath,
      contentType,
      size: downloaded,
    };
  }

  private extensionFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const ext = path.extname(parsed.pathname);
      return ext || undefined;
    } catch {
      const ext = path.extname(url.split('?')[0]);
      return ext || undefined;
    }
  }

  private extensionFromMime(mime: string) {
    const mapping: Record<string, string> = {
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-matroska': '.mkv',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/wave': '.wav',
    };
    return mapping[mime] ?? undefined;
  }

  private async cleanup(directory: string | undefined) {
    if (!directory) return;
    try {
      await fs.rm(directory, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to cleanup temp directory %s', directory);
    }
  }

  private async archiveLog(jobId: string, logPath: string) {
    try {
      await fs.access(logPath);
    } catch {
      return;
    }

    const target = path.join(this.outputRoot, `${jobId}.log`);
    try {
      await fs.rm(target, { force: true });
      await fs.rename(logPath, target);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to archive log for job %s', jobId);
    }
  }

  private async notifyCallback(job: VideoJobInternal) {
    const callbackUrl = job.request.callbackUrl;
    if (!callbackUrl) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.callbackTimeoutMs);
    if (typeof (timeout as NodeJS.Timeout).unref === 'function') {
      (timeout as NodeJS.Timeout).unref();
    }

    try {
      const summary = this.toSummary(job);
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(summary),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Callback endpoint for job %s responded with %d',
          job.id,
          response.status,
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown callback error');
      this.logger.warn({ err }, 'Failed to notify callback for job %s', job.id);
    } finally {
      clearTimeout(timeout);
    }
  }
}

let singleton: VideoJobManager | null = null;

export const getVideoJobManager = (options: VideoJobManagerOptions) => {
  if (!singleton) {
    singleton = new VideoJobManager(options);
  }
  return singleton;
};
