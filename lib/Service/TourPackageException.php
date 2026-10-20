<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * A tour package that cannot be read or does not hold a tour. The reason is a
 * fixed code the admin page turns into a message; the detail says which file
 * or field, for the admin's eyes only.
 */
class TourPackageException extends \RuntimeException {
    public function __construct(
        public readonly string $reason,
        public readonly string $detail = '',
    ) {
        parent::__construct($reason . ($detail !== '' ? ': ' . $detail : ''));
    }
}
