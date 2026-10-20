<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCA\IntroVox\Media\MediaException;
use OCA\IntroVox\Media\MediaSniffer;
use OCA\IntroVox\Media\MetadataStripper;
use OCP\Files\AppData\IAppDataFactory;
use OCP\Files\File;
use OCP\Files\IAppData;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\Files\SimpleFS\ISimpleFile;
use OCP\Files\SimpleFS\ISimpleFolder;
use OCP\Files\Storage\ISharedStorage;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\IUser;
use Psr\Log\LoggerInterface;

/**
 * The images, GIFs, videos and captions in tour steps.
 *
 * Every file is IntroVox's own copy in its app data (media/<id>), never a
 * link into someone's Files: the type comes from the bytes, metadata such as
 * GPS and EXIF is stripped without re-encoding (src: lib/Media), and the id
 * is 128 random bits. Next to each file, media-meta/<id>.json holds its
 * dimensions and who may see it: the access list, kept up to date from the
 * stored steps (refreshAccess). Only someone who gets an enabled step with
 * the file can load it; admins always can.
 */
class MediaService {
    public const FILE_PATTERN = '/^[a-f0-9]{32}\.(png|jpg|gif|mp4|webm|vtt)$/D';

    public const MIME = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'gif' => 'image/gif',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'vtt' => 'text/vtt; charset=utf-8',
    ];

    // What a step's image or video may be, and what its captions may be
    private const KINDS = [
        'media' => ['png', 'jpg', 'gif', 'mp4', 'webm'],
        'captions' => ['vtt'],
    ];

    // Defaults; each can be changed with occ config:app:set introvox <key>
    private const LIMITS = [
        'png' => ['media_limit_image', 5 * 1024 * 1024],
        'jpg' => ['media_limit_image', 5 * 1024 * 1024],
        'gif' => ['media_limit_gif', 10 * 1024 * 1024],
        'mp4' => ['media_limit_video', 20 * 1024 * 1024],
        'webm' => ['media_limit_video', 20 * 1024 * 1024],
        'vtt' => ['media_limit_captions', 512 * 1024],
    ];
    private const MAX_PIXELS = ['media_max_pixels', 16000000];
    private const MAX_FRAMES = 1000;
    private const QUOTA = ['media_quota_bytes', 250 * 1024 * 1024];
    private const MAX_FILES = ['media_max_files', 500];

    private const IMAGE_TYPES = ['png' => IMAGETYPE_PNG, 'jpg' => IMAGETYPE_JPEG, 'gif' => IMAGETYPE_GIF];

    private IAppData $appData;

    public function __construct(
        IAppDataFactory $appDataFactory,
        private IConfig $config,
        private IGroupManager $groupManager,
        private IRootFolder $rootFolder,
        private LoggerInterface $logger,
        private TourRepository $tours,
    ) {
        $this->appData = $appDataFactory->get('introvox');
    }

    /**
     * Check, clean and keep a file. The same file twice gives the same id.
     *
     * @param string $kind 'media' for a step's image or video, 'captions'
     * @return array The file's public metadata (publicMeta)
     * @throws MediaException
     */
    public function store(string $bytes, string $originalName, string $uploadedBy, string $kind = 'media'): array {
        $type = MediaSniffer::detect(substr($bytes, 0, 4096));
        if ($type === null || !in_array($type, self::KINDS[$kind] ?? [], true)) {
            throw new MediaException('unsupported_type');
        }
        if (strlen($bytes) > $this->limit($type)) {
            throw new MediaException('too_large', (string)$this->limit($type));
        }

        $stripped = MetadataStripper::strip($type, $bytes);
        if (isset(self::IMAGE_TYPES[$type])) {
            // A second, independent look at what the stripper left
            $info = @getimagesizefromstring($stripped->bytes);
            if ($info === false || $info[2] !== self::IMAGE_TYPES[$type]) {
                throw new MediaException('corrupt');
            }
        }
        if ($stripped->width * $stripped->height > $this->setting(self::MAX_PIXELS) || $stripped->frames > self::MAX_FRAMES) {
            throw new MediaException('too_many_pixels', (string)$this->setting(self::MAX_PIXELS));
        }

        $sha256 = hash('sha256', $stripped->bytes);
        $index = $this->readIndex();
        $known = $index[$sha256] ?? null;
        if (is_string($known) && ($meta = $this->meta($known)) !== null) {
            if ($this->folder('media')->fileExists($known)) {
                return $this->publicMeta($meta);
            }
            // Its bytes are gone (app data cleaned by hand): keep it anew
            $this->folder('media-meta')->getFile($known . '.json')->delete();
        }

        if (count($index) >= $this->setting(self::MAX_FILES)) {
            throw new MediaException('too_many_files', (string)$this->setting(self::MAX_FILES));
        }
        if ($this->bytesInUse() + strlen($stripped->bytes) > $this->setting(self::QUOTA)) {
            throw new MediaException('quota', (string)$this->setting(self::QUOTA));
        }

        $file = bin2hex(random_bytes(16)) . '.' . $type;
        $meta = [
            'file' => $file,
            'type' => $type,
            'bytes' => strlen($stripped->bytes),
            'width' => $stripped->width,
            'height' => $stripped->height,
            'animated' => $stripped->animated,
            'frames' => $stripped->frames,
            'hasAudio' => $stripped->hasAudio,
            'sha256' => $sha256,
            'name' => mb_substr(basename(str_replace('\\', '/', $originalName)), 0, 255),
            'uploadedBy' => $uploadedBy,
            'uploadedAt' => time(),
            'used' => false,
            'access' => ['rules' => []],
        ];
        $this->folder('media')->newFile($file, $stripped->bytes);
        $this->writeMeta($meta);
        $index[$sha256] = $file;
        $this->writeIndex($index);

        return $this->publicMeta($meta);
    }

    /**
     * A file from the admin's own Files, copied in. Files from a share that
     * may only be viewed are refused: through IntroVox every user could
     * download them.
     *
     * @throws MediaException
     */
    public function storeFromFiles(IUser $admin, string $path, string $kind = 'media'): array {
        $node = $this->fileFromFiles($admin, $path);

        // The size Files reports can be wrong; read at most one byte more
        // than any file may have
        $handle = $node->fopen('rb');
        if ($handle === false) {
            throw new MediaException('not_found');
        }
        try {
            $bytes = stream_get_contents($handle, $this->largestLimit() + 1);
        } finally {
            fclose($handle);
        }
        if ($bytes === false) {
            throw new MediaException('not_found');
        }
        return $this->store($bytes, $node->getName(), $admin->getUID(), $kind);
    }

    /**
     * A file in the admin's own Files that IntroVox may copy: readable, and
     * not from a share that may only be viewed (TourTransfer uses it too)
     *
     * @throws MediaException
     */
    public function fileFromFiles(IUser $admin, string $path): File {
        try {
            $node = $this->rootFolder->getUserFolder($admin->getUID())->get($path);
        } catch (NotFoundException $e) {
            throw new MediaException('not_found');
        }
        if (!$node instanceof File || !$node->isReadable()) {
            throw new MediaException('not_found');
        }
        $storage = $node->getStorage();
        if ($storage->instanceOfStorage(ISharedStorage::class)) {
            /** @var ISharedStorage $storage */
            $attributes = $storage->getShare()->getAttributes();
            if ($attributes !== null && $attributes->getAttribute('permissions', 'download') === false) {
                throw new MediaException('view_only');
            }
        }
        return $node;
    }

    public function meta(string $file): ?array {
        if (!preg_match(self::FILE_PATTERN, $file)) {
            return null;
        }
        try {
            $meta = json_decode($this->folder('media-meta')->getFile($file . '.json')->getContent(), true);
        } catch (NotFoundException $e) {
            return null;
        }
        return is_array($meta) && ($meta['file'] ?? null) === $file ? $meta : null;
    }

    /**
     * @throws NotFoundException
     */
    public function content(string $file): ISimpleFile {
        if (!preg_match(self::FILE_PATTERN, $file)) {
            throw new NotFoundException();
        }
        return $this->folder('media')->getFile($file);
    }

    /**
     * Admins always; anyone else only when an enabled step with this file
     * reaches them (refreshAccess)
     */
    public function canView(array $meta, IUser $user): bool {
        if ($this->groupManager->isAdmin($user->getUID())) {
            return true;
        }
        $rules = $meta['access']['rules'] ?? null;
        if (!is_array($rules)) {
            return false;
        }
        foreach ($rules as $rule) {
            if (!is_array($rule)) {
                continue;
            }
            $meets = true;
            foreach ($rule as $groups) {
                if (!is_array($groups) || !$this->tours->inAnyGroup($user, $groups)) {
                    $meets = false;
                    break;
                }
            }
            if ($meets) {
                return true;
            }
        }
        return false;
    }

    /**
     * What the editor and the tour need to know about a file
     */
    public function publicMeta(array $meta): array {
        return [
            'file' => $meta['file'],
            'type' => $meta['type'],
            'bytes' => $meta['bytes'],
            'width' => $meta['width'],
            'height' => $meta['height'],
            'animated' => $meta['animated'],
            'hasAudio' => $meta['hasAudio'],
        ];
    }

    /**
     * Fill in each step's media from the files themselves: dimensions and
     * whether a GIF moves, never what a client said.
     *
     * @param bool $strict Refuse a step whose file does not exist (saving
     *   from the editor), or drop just that media block (importing)
     * @return array{0: array, 1: string[]} The steps, and the files that were
     *   missing (only when not strict)
     * @throws MediaException When strict and a file is missing
     */
    public function resolveStepMedia(array $steps, bool $strict): array {
        $missing = [];
        foreach ($steps as $index => $step) {
            if (!isset($step['media']) || !is_array($step['media'])) {
                continue;
            }
            $media = $step['media'];
            $meta = $this->meta($media['file']);
            if ($meta === null || !in_array($meta['type'], self::KINDS['media'], true)) {
                if ($strict) {
                    throw new MediaException('not_found', $media['file']);
                }
                $missing[] = $media['file'];
                unset($steps[$index]['media']);
                continue;
            }
            $media['width'] = $meta['width'];
            $media['height'] = $meta['height'];
            $media['animated'] = $meta['animated'];
            if (in_array($meta['type'], ['mp4', 'webm'], true)) {
                $media['hasAudio'] = $meta['hasAudio'];
                if (isset($media['captions']) && ($this->meta($media['captions'])['type'] ?? null) !== 'vtt') {
                    if ($strict) {
                        throw new MediaException('not_found', $media['captions']);
                    }
                    $missing[] = $media['captions'];
                    unset($media['captions']);
                }
            }
            $steps[$index]['media'] = $media;
        }
        return [array_values($steps), $missing];
    }

    /**
     * Work out, for every file, who gets a step with it. Run after anything
     * that changes stored steps, or switches a tour or all tours on or off.
     * A file no enabled step uses is for admins only. If this fails half-way,
     * files stay closed, never open.
     *
     * The access list is a set of rules; a user who meets one may see the
     * file. A rule is the group lists that must each have the user in at
     * least one group: the tour's groups and the step's. An empty rule is
     * everyone.
     */
    public function refreshAccess(): void {
        $toursOn = $this->tours->toursEnabled();
        $uses = [];
        foreach ($this->tours->allSteps() as ['tour' => $tour, 'steps' => $steps]) {
            $tourOn = $toursOn && ($tour['enabled'] ?? false) === true;
            $tourGroups = array_values(array_filter($tour['visibleToGroups'] ?? [], 'is_string'));
            foreach ($steps as $step) {
                $media = is_array($step) ? ($step['media'] ?? null) : null;
                if (!is_array($media)) {
                    continue;
                }
                $stepOn = StepValidator::isEnabled($step);
                $stepGroups = is_array($step['visibleToGroups'] ?? null) ? array_values(array_filter($step['visibleToGroups'], 'is_string')) : [];
                $rule = array_values(array_filter([$tourGroups, $stepGroups], fn (array $groups): bool => $groups !== []));
                foreach ([$media['file'] ?? null, $media['captions'] ?? null] as $file) {
                    if (!is_string($file)) {
                        continue;
                    }
                    $uses[$file] ??= [];
                    if ($tourOn && $stepOn && !in_array($rule, $uses[$file], true)) {
                        $uses[$file][] = $rule;
                    }
                }
            }
        }

        foreach ($this->allMeta() as $meta) {
            $used = array_key_exists($meta['file'], $uses);
            $access = ['rules' => $uses[$meta['file']] ?? []];
            if (($meta['used'] ?? null) !== $used || ($meta['access'] ?? null) !== $access) {
                $meta['used'] = $used;
                $meta['access'] = $access;
                $this->writeMeta($meta);
            }
        }
    }

    public function limit(string $type): int {
        return isset(self::LIMITS[$type]) ? $this->setting(self::LIMITS[$type]) : 0;
    }

    private function largestLimit(): int {
        return max(array_map(fn (string $type): int => $this->limit($type), array_keys(self::LIMITS)));
    }

    /**
     * Bytes in files that steps use; unused uploads do not count, so an
     * admin never gets stuck on files they threw away
     */
    private function bytesInUse(): int {
        $total = 0;
        foreach ($this->allMeta() as $meta) {
            if (($meta['used'] ?? false) === true) {
                $total += (int)($meta['bytes'] ?? 0);
            }
        }
        return $total;
    }

    private function setting(array $setting): int {
        [$key, $default] = $setting;
        $value = (int)$this->config->getAppValue('introvox', $key, (string)$default);
        return $value > 0 ? $value : $default;
    }

    /**
     * @return array[]
     */
    private function allMeta(): array {
        $all = [];
        foreach ($this->folder('media-meta')->getDirectoryListing() as $file) {
            $name = $file->getName();
            if (!str_ends_with($name, '.json') || $name === 'index.json') {
                continue;
            }
            $meta = $this->meta(substr($name, 0, -5));
            if ($meta !== null) {
                $all[] = $meta;
            }
        }
        return $all;
    }

    private function writeMeta(array $meta): void {
        $folder = $this->folder('media-meta');
        $name = $meta['file'] . '.json';
        $json = json_encode($meta);
        try {
            $folder->getFile($name)->putContent($json);
        } catch (NotFoundException $e) {
            $folder->newFile($name, $json);
        }
    }

    /**
     * @return array<string, string> sha256 => file
     */
    private function readIndex(): array {
        try {
            $index = json_decode($this->folder('media-meta')->getFile('index.json')->getContent(), true);
        } catch (NotFoundException $e) {
            return [];
        }
        return is_array($index) ? $index : [];
    }

    private function writeIndex(array $index): void {
        $folder = $this->folder('media-meta');
        try {
            $folder->getFile('index.json')->putContent(json_encode($index));
        } catch (NotFoundException $e) {
            $folder->newFile('index.json', json_encode($index));
        }
    }

    private function folder(string $name): ISimpleFolder {
        try {
            return $this->appData->getFolder($name);
        } catch (NotFoundException $e) {
            return $this->appData->newFolder($name);
        }
    }
}
