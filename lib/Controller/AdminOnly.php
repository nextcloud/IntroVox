<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;

/**
 * The check behind the admin routes: only administrators, anyone else gets
 * 403 "forbidden". For a controller with $userSession and $groupManager.
 */
trait AdminOnly {
    private function requireAdmin(): ?JSONResponse {
        $user = $this->userSession->getUser();
        if ($user === null || !$this->groupManager->isAdmin($user->getUID())) {
            return new JSONResponse(['success' => false, 'error' => 'forbidden'], Http::STATUS_FORBIDDEN);
        }
        return null;
    }
}
