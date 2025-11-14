<?php
namespace OCA\IntroVox\Settings;

use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\Settings\IIconSection;

class AdminSection implements IIconSection {
    private $l;
    private $url;

    public function __construct(IL10N $l, IURLGenerator $url) {
        $this->l = $l;
        $this->url = $url;
    }

    /**
     * @return string
     */
    public function getID() {
        return 'introvox';
    }

    /**
     * @return string
     */
    public function getName() {
        return $this->l->t('IntroVox');
    }

    /**
     * @return int
     */
    public function getPriority() {
        return 75;
    }

    /**
     * @return string
     */
    public function getIcon() {
        return $this->url->imagePath('introvox', 'app.svg');
    }
}
