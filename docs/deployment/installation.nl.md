# Installatie

Deze gids beschrijft hoe je IntroVox installeert op een Nextcloud-instantie.

## Vereisten

- **Nextcloud 32 of later** (32–34 expliciet ondersteund vanaf v1.5.0)
- **PHP 8.1 of later**

Verifieer de gezaghebbende vereisten in [appinfo/info.xml](https://github.com/nextcloud/IntroVox/blob/main/appinfo/info.xml).

## Installatie-methodes

### Via de Nextcloud-App-Store (aanbevolen)

1. Log in op je Nextcloud-instantie als beheerder
2. Open **Apps** via het rechtsboven-menu
3. Zoek naar **IntroVox**
4. Klik op **Download en inschakelen**

Of ga direct naar [apps.nextcloud.com/apps/introvox](https://apps.nextcloud.com/apps/introvox).

### Handmatige installatie

1. Download de laatste release-tarball van [GitHub Releases](https://github.com/nextcloud/IntroVox/releases)
2. Pak uit in je Nextcloud-`apps/`-directory:

   ```bash
   tar -xzf introvox-X.Y.Z.tar.gz -C /var/www/nextcloud/apps/
   ```

3. Stel correct eigenaarschap in:

   ```bash
   sudo chown -R www-data:www-data /var/www/nextcloud/apps/introvox
   ```

4. Schakel de app in:

   ```bash
   sudo -u www-data php occ app:enable introvox
   ```

### Vanuit source

Voor development of testen van de laatste niet-gereleasede wijzigingen:

```bash
git clone https://github.com/nextcloud/IntroVox.git /var/www/nextcloud/apps/introvox
cd /var/www/nextcloud/apps/introvox
npm install
npm run build
sudo -u www-data php occ app:enable introvox
```

> Source-based installs vereisen een `node`- en `npm`-toolchain op de server. Voor productie, gebruik bij voorkeur de App Store of pre-built tarball.

## Initiële configuratie

Na het inschakelen van de app:

1. Ga naar **Instellingen → Beheer → IntroVox**
2. Toggle **Wizard inschakelen voor alle gebruikers**
3. Vink onder **Beschikbare talen** de talen aan die je wilt ondersteunen (default: alleen Engels)
4. Pas optioneel wizard-stappen per taal aan via de taal-dropdown

Zie [Beheerdersgids](../admin/guide.md) voor de volledige configuratie-walkthrough.

## De app beperken tot specifieke groepen

Als je alleen bepaalde Nextcloud-groepen de wizard wilt laten zien (en niet alleen specifieke stappen):

1. Ga naar **Instellingen → Apps → IntroVox**
2. Klik op **"Beperken tot groepen"**
3. Selecteer de toegestane groepen

Gebruikers buiten die groepen krijgen IntroVox' JavaScript niet geladen — de schoonste manier om de app te scopen.

Voor fijnere controle (verschillende stappen per groep), zie [Groep-gebaseerde zichtbaarheid](../admin/group-visibility.md).

## Upgraden

### Via de App-Store

Upgrades verschijnen in **Instellingen → Apps → Updates** wanneer een nieuwe versie wordt gepubliceerd. Klik op **Updaten** en Nextcloud regelt de rest.

### Handmatige upgrade

1. Download de nieuwe release-tarball
2. Schakel de oude versie uit:

   ```bash
   sudo -u www-data php occ app:disable introvox
   ```

3. Vervang de `apps/introvox`-directory met de nieuwe tarball-inhoud
4. Schakel weer in:

   ```bash
   sudo -u www-data php occ app:enable introvox
   ```

### Migratie-opmerkingen

IntroVox maakt of migreert geen custom database-tabellen — alle staat leeft in `oc_appconfig` en `oc_preferences`. Upgrades zijn niet-destructief: custom-stap-configuraties, ingeschakelde talen en gebruikers-voorkeuren blijven behouden.

De defensieve `is_array()`-guard in `ApiController::getWizardSteps()` (v1.4.3+) betekent dat zelfs als een oudere corrupte stap-blob bestaat, de wizard terugvalt op defaults in plaats van crashen.

## Deïnstallatie

```bash
sudo -u www-data php occ app:disable introvox
sudo rm -rf /var/www/nextcloud/apps/introvox
```

De app-config- en preferences-rijen kunnen blijven staan (onschadelijk) of opgeruimd worden:

```sql
DELETE FROM oc_appconfig WHERE appid = 'introvox';
DELETE FROM oc_preferences WHERE appid = 'introvox';
```

## Verificatie

Na installatie:

1. Log in als reguliere gebruiker met een ingeschakelde taal
2. De wizard zou automatisch moeten starten op het dashboard na een paar seconden
3. Check **Instellingen → Persoonlijk → IntroVox** — de **Tour nu herstarten**-knop zou zichtbaar moeten zijn

Als de wizard niet verschijnt, zie [Beheer-troubleshooting](../admin/troubleshooting.md).

## Zie ook

- [Beheerdersgids](../admin/guide.md) — dagelijks beheer
- [Beheer-troubleshooting](../admin/troubleshooting.md) — wanneer er iets misgaat
- [App-Store-publicatie](app-store-submission.md) — voor ontwikkelaars die IntroVox zelf releasen
- [Release-proces](release-process.md) — versie-sync, build, GitHub-releases
