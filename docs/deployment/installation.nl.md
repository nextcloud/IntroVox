# Installatie

Deze gids beschrijft hoe je IntroVox installeert op een Nextcloud-instantie.

## Vereisten

- **Nextcloud 32 tot en met 35** (35 sinds v1.7.7)
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
2. Zet **Tours for everyone** aan — de tour werkt nu automatisch in elke taal die Nextcloud ondersteunt (vertaald via Transifex; Engels voor talen zonder vertaling)
3. Open eventueel **Tours**, klik bij de **Welcome tour** op **Edit steps** en klik op **Add language override** om voor een bepaalde taal eigen tekst te schrijven
4. Beperk eventueel stappen tot bepaalde gebruikersgroepen voor rol-gebaseerde onboarding
5. Voeg eventueel een tour voor een app toe met **Tours** → **New tour** ([Tours](../admin/tours.nl.md))

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

IntroVox maakt of migreert geen eigen database-tabellen. Instellingen, tours en hun stappen staan in `oc_appconfig`, gebruikers-voorkeuren in `oc_preferences`. De afbeeldingen en video's van stappen, en de back-ups van de laatste tien verwijderde tours, staan in de app-datamap van IntroVox (`appdata_<instanceid>/introvox` in de datamap van Nextcloud). Upgrades zijn niet-destructief: tours, stappen, overrides per taal, media en gebruikers-voorkeuren blijven behouden.

De defensieve `is_array()`-guard in `ApiController::getWizardSteps()` (v1.4.3+) betekent dat zelfs als een oudere corrupte stap-blob bestaat, de wizard terugvalt op defaults in plaats van crashen.

## Deïnstallatie

Staat **Put it on every Dashboard** aan voor de checklist, zet het dan eerst uit: tot dan noemt de standaardindeling van het Dashboard (app-config `dashboard` / `layout`) `introvox-checklist`.

```bash
sudo -u www-data php occ app:disable introvox
sudo rm -rf /var/www/nextcloud/apps/introvox
```

De app-config- en preferences-rijen kunnen blijven staan (onschadelijk) of opgeruimd worden:

```sql
DELETE FROM oc_appconfig WHERE appid = 'introvox';
DELETE FROM oc_preferences WHERE appid = 'introvox';
```

De afbeeldingen en video's van stappen en de back-ups van verwijderde tours blijven in de app-datamap staan. Wil je die ook kwijt, verwijder hem dan en laat Nextcloud de bestanden vergeten:

```bash
sudo rm -rf /var/www/nextcloud/data/appdata_<instanceid>/introvox
sudo -u www-data php occ files:scan-app-data
```

`<instanceid>` is de `instanceid` in `config/config.php`; de datamap kan ergens anders staan dan `/var/www/nextcloud/data`.

De app uitgeschakeld terwijl **Put it on every Dashboard** nog aan stond? Haal `introvox-checklist` dan met de hand uit de indeling:

```bash
sudo -u www-data php occ config:app:get dashboard layout
sudo -u www-data php occ config:app:set dashboard layout --value="<dezelfde lijst zonder introvox-checklist>"
```

## Verificatie

Na installatie:

1. Log in als reguliere gebruiker die de welkomsttour nog niet had
2. De welkomsttour zou vanzelf moeten starten op de eerste pagina die je opent, in je eigen taal, zodra de pagina geladen is
3. Check **Instellingen → Persoonlijk → IntroVox** — de knop **Restart tour now** zou zichtbaar moeten zijn

Als de wizard niet verschijnt, zie [Beheer-troubleshooting](../admin/troubleshooting.md).

## Zie ook

- [Beheerdersgids](../admin/guide.md) — dagelijks beheer
- [Beheer-troubleshooting](../admin/troubleshooting.md) — wanneer er iets misgaat
- [App-Store-publicatie](app-store-submission.md) — voor ontwikkelaars die IntroVox zelf releasen
- [Release-proces](release-process.md) — versie-sync, build, GitHub-releases
