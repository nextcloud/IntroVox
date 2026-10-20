<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * Checks tour steps before they are stored, from the step editor and from
 * imported files, which may come from anywhere ("share configurations",
 * a translator's edited export). Whatever is stored here goes to every user
 * through GET /api/steps, so it is reduced to the known fields, each of the
 * right type and within bounds. HTML in title and text is cleaned where it is
 * shown (src/utils/stepHtml.js); this class guards shape and size.
 *
 * Plain PHP without Nextcloud dependencies, so it can be exercised directly.
 */
class StepValidator {
	public const MAX_STEPS = 100;
	public const MAX_IMPORT_BYTES = 1048576;

	private const MAX_LENGTH = [
		'id' => 100,
		'title' => 500,
		'text' => 20000,
		'attachTo' => 1000,
		'openFirst' => 1000,
		'page' => 200,
		'group' => 255,
		'alt' => 300,
	];

	// Mirrors the route requirement of media#show and src/utils/stepMedia.js
	public const MEDIA_FILE_PATTERN = '/^[a-f0-9]{32}\.(png|jpg|gif|mp4|webm)$/D';
	public const CAPTIONS_FILE_PATTERN = '/^[a-f0-9]{32}\.vtt$/D';

	/**
	 * Whether a stored step is switched on. Older exports wrote false as
	 * "false", 0 or "0".
	 */
	public static function isEnabled(mixed $step): bool {
		return is_array($step) && !in_array($step['enabled'] ?? true, [false, 'false', 0, '0'], true);
	}

	/**
	 * The steps someone in these groups sees: switched on, and for everyone
	 * or for one of their groups. It fails closed: a step with a malformed
	 * group list stays out. The group ids stay on the server.
	 *
	 * @param array $steps Stored steps
	 * @param string[] $groupIds The user's groups
	 * @return array[] Those steps, without visibleToGroups
	 */
	public static function visibleTo(array $steps, array $groupIds): array {
		$visible = [];
		foreach ($steps as $step) {
			$groups = is_array($step) ? ($step['visibleToGroups'] ?? []) : null;
			if (!self::isEnabled($step) || !is_array($groups) || ($groups !== [] && array_intersect($groups, $groupIds) === [])) {
				continue;
			}
			unset($step['visibleToGroups']);
			$visible[] = $step;
		}
		return $visible;
	}

	/**
	 * Validate and normalise a list of steps.
	 *
	 * @param mixed $steps Decoded JSON
	 * @return array{0: ?array, 1: ?string} The clean steps, or an error message
	 */
	public function validateAll(mixed $steps): array {
		if (!is_array($steps) || !array_is_list($steps)) {
			return [null, 'Steps must be a list'];
		}
		if (count($steps) > self::MAX_STEPS) {
			return [null, 'Too many steps (at most ' . self::MAX_STEPS . ')'];
		}
		$clean = [];
		$ids = [];
		foreach ($steps as $index => $step) {
			[$valid, $error] = $this->validate($step);
			if ($error !== null) {
				return [null, 'Step ' . ($index + 1) . ': ' . $error];
			}
			if (isset($ids[$valid['id']])) {
				return [null, 'Step ' . ($index + 1) . ': duplicate id ' . $valid['id']];
			}
			$ids[$valid['id']] = true;
			$clean[] = $valid;
		}
		return [$clean, null];
	}

	/**
	 * @param mixed $step One decoded step
	 * @return array{0: ?array, 1: ?string} The clean step, or an error message
	 */
	public function validate(mixed $step): array {
		if (!is_array($step) || array_is_list($step)) {
			return [null, 'not an object'];
		}

		$id = $step['id'] ?? null;
		if (!is_string($id) || !preg_match('/^[A-Za-z0-9_.-]{1,' . self::MAX_LENGTH['id'] . '}$/D', $id)) {
			return [null, 'id must be letters, digits, "_", "-" or "."'];
		}
		if (!is_string($step['title'] ?? null)) {
			return [null, 'title must be text'];
		}
		$clean = ['id' => $id];

		foreach (['title', 'text', 'attachTo', 'openFirst'] as $field) {
			if (!array_key_exists($field, $step)) {
				continue;
			}
			if (!is_string($step[$field])) {
				return [null, $field . ' must be text'];
			}
			if (mb_strlen($step[$field]) > self::MAX_LENGTH[$field]) {
				return [null, $field . ' is longer than ' . self::MAX_LENGTH[$field] . ' characters'];
			}
			$clean[$field] = $step[$field];
		}

		if (array_key_exists('page', $step)) {
			$page = $this->validatePage($step['page']);
			if ($page === null) {
				return [null, 'page must be a path on this Nextcloud, such as /apps/spreed/'];
			}
			$clean['page'] = $page;
		}

		if (array_key_exists('position', $step)) {
			// Shepherd placements; the editor offers the first four
			if (!is_string($step['position']) || !preg_match('/^(right|left|top|bottom|auto)(-start|-end)?$/D', $step['position'])) {
				return [null, 'position must be right, left, top or bottom'];
			}
			$clean['position'] = $step['position'];
		}

		if (array_key_exists('advance', $step)) {
			if (!in_array($step['advance'], ['button', 'click', 'input'], true)) {
				return [null, 'advance must be button, click or input'];
			}
			$clean['advance'] = $step['advance'];
		}

		// Older exports wrote booleans as strings or numbers
		foreach (['enabled', 'customTarget'] as $field) {
			if (array_key_exists($field, $step)) {
				$value = $step[$field];
				if (!is_bool($value) && !in_array($value, ['true', 'false', 0, 1, '0', '1'], true)) {
					return [null, $field . ' must be true or false'];
				}
				$clean[$field] = $value === true || $value === 'true' || $value === 1 || $value === '1';
			}
		}

		$groups = $step['visibleToGroups'] ?? [];
		if (!is_array($groups) || !array_is_list($groups)) {
			return [null, 'visibleToGroups must be a list of group ids'];
		}
		foreach ($groups as $group) {
			if (!is_string($group) || $group === '' || mb_strlen($group) > self::MAX_LENGTH['group']) {
				return [null, 'visibleToGroups must be a list of group ids'];
			}
		}
		$clean['visibleToGroups'] = $groups;

		if (array_key_exists('media', $step) && $step['media'] !== null) {
			[$media, $error] = $this->validateMedia($step['media']);
			if ($error !== null) {
				return [null, $error];
			}
			$clean['media'] = $media;
		}

		return [$clean, null];
	}

	/**
	 * The image or video of a step. Only the shape is checked here; whether
	 * the file exists, and its size and dimensions, come from MediaService.
	 * Anything else a client sends (width, height, animated) is dropped: the
	 * server fills those in from the file itself.
	 *
	 * @return array{0: ?array, 1: ?string}
	 */
	private function validateMedia(mixed $media): array {
		if (!is_array($media) || array_is_list($media)) {
			return [null, 'media must be an object'];
		}
		$file = $media['file'] ?? null;
		if (!is_string($file) || !preg_match(self::MEDIA_FILE_PATTERN, $file)) {
			return [null, 'media.file is not an IntroVox media file'];
		}
		$decorative = $media['decorative'] ?? false;
		if (!is_bool($decorative)) {
			return [null, 'media.decorative must be true or false'];
		}
		$alt = $media['alt'] ?? '';
		if (!is_string($alt) || mb_strlen($alt) > self::MAX_LENGTH['alt']) {
			return [null, 'media.alt must be text of at most ' . self::MAX_LENGTH['alt'] . ' characters'];
		}
		$alt = trim($alt);
		if (!$decorative && $alt === '') {
			return [null, 'media needs a description (alt text) unless it is decorative'];
		}
		$size = $media['size'] ?? 'full';
		if (!in_array($size, ['small', 'full', 'wide'], true)) {
			return [null, 'media.size must be small, full or wide'];
		}
		$clean = [
			'file' => $file,
			'alt' => $decorative ? '' : $alt,
			'decorative' => $decorative,
			'size' => $size,
		];

		if (preg_match('/\.(mp4|webm)$/D', $file)) {
			$playback = $media['playback'] ?? 'controls';
			if (!in_array($playback, ['loop', 'controls'], true)) {
				return [null, 'media.playback must be loop or controls'];
			}
			$clean['playback'] = $playback;
			$captions = $media['captions'] ?? '';
			if ($captions !== '' && $captions !== null) {
				if (!is_string($captions) || !preg_match(self::CAPTIONS_FILE_PATTERN, $captions)) {
					return [null, 'media.captions is not an IntroVox captions file'];
				}
				$clean['captions'] = $captions;
			}
		}
		return [$clean, null];
	}

	/**
	 * Mirrors normalizePage() in src/utils/pages.mjs: a plain path on this
	 * instance, never something that leads elsewhere (//host, \\host, a scheme).
	 *
	 * @return ?string The path, '' for no page, null when not allowed
	 */
	private function validatePage(mixed $page): ?string {
		if (!is_string($page)) {
			return null;
		}
		$page = trim($page);
		if ($page === '') {
			return '';
		}
		if ($page[0] !== '/') {
			$page = '/' . $page;
		}
		if (mb_strlen($page) > self::MAX_LENGTH['page'] || !preg_match('#^/(?!/)[A-Za-z0-9._~/%-]*$#D', $page)) {
			return null;
		}
		return $page;
	}
}
