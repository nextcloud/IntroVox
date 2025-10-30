# Certificate Submission voor Nextcloud App Store

## ✅ Stap 1: Certificaat gegenereerd

De volgende bestanden zijn aangemaakt:
- ✅ `introvox.key` - Private key (4096-bit RSA) - **GEHEIM HOUDEN!**
- ✅ `introvox.csr` - Certificate Signing Request - **Deze moet je indienen**

## 📝 Stap 2: CSR Indienen

### 2.1 Ga naar de Nextcloud App Certificate Requests repository
Open: https://github.com/nextcloud/app-certificate-requests

### 2.2 Maak een nieuwe Issue aan
1. Klik op "New issue"
2. Titel: **Certificate request for IntroVox**
3. Body:
```
I would like to request a certificate for the IntroVox app.

App information:
- App ID: introvox
- App Name: IntroVox
- Description: Interactive onboarding tour for new Nextcloud users
- Repository: https://github.com/nextcloud/IntroVox
- Author: Shalution (info@shalution.com)

CSR:
-----BEGIN CERTIFICATE REQUEST-----
MIIEezCCAmMCAQAwNjERMA8GA1UEAwwISW50cm9Wb3gxITAfBgkqhkiG9w0BCQEW
EmluZm9Ac2hhbHV0aW9uLmNvbTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoC
ggIBAIpc5GOaD8+HSTyyQuOkELfb7sOrhgFPpizVJljBR/JnJfq7CwnyyA9SOvS2
zCoBeDLdQD9LVxQMH/UJLaWTMn2TzkDjydwTngkaVJmC5FZv/o0As/l9rkdSaYXd
a8/ncUISecoN9YvM4xR81U7jKHfTfq2ZeipGaFpUgrHe6JMaZC8LQX4RmO9zmg7C
ItEG2I/p6yID/exSWRgYJ+Xl3XN7SSCv8MMbwXNnAyvsMugGMuBNruanu/zaHTC2
++DMPdCJ4XV+psGbSya1LNgOKfDrACSIGo4Vl5JNg01beAg0yXxmeNhKIxWNMpct
BXOMXBe7Fl/l8mBK7/fRGV1i/8xlMDnwfQJ02QqTlOBP1U2pPFlv26aDddgjXEOS
JH+fq/uiiB1vEegRBWZULwuKNNW0GZ1SkeJv0eZcxHeagCZSRukILilAFbxrAXmE
li8QEcaCGBE6wY/UCk91ax/fty1VAxtB7JlsFM4LT/QCCGbYTd79p6yEGPd4IHLw
2cEfjAKUqLGCoMFirKeExdlehGcF/OdeXRu3EedSRjGw8H6VyZ32Q7xiGSqRWC5X
0lA4bs9RjV5rUckYinKinsY64ceQoPVC4nxG7aX3ZAr0IhKuIv0DUElMR/5KRSLn
Hx51/ysBe5hLkrz9OaPow12jg64YtFVAgw37D5kf2GYHZZ31AgMBAAGgADANBgkq
hkiG9w0BAQsFAAOCAgEAQvqhq0xJl1PQFABq7MpacDzLcL6SIBTjCihzeV7dgdj1
/yQLlZl+F/VQMaRK0CSZvcCXORAeTrgz4cL/L3Vt7+ZIL1/cnS+W8pK56neWTo3C
NfgWlDQkUXBQdOve91k4t7TjN1VCLEkMeB9lO1jRZ2xbFI3+nFS9xmP7gYec8qzI
Enbl2PeuAxe8fbcp8xA7tKbh0Nzw/EjBKES/bX6JPO0VV1umozHz0Qsk7RhCEzHK
v8o64jaMgtMJkHhO0/th7YwAu+AemMBnK0j/9LMC0rpg9w5gWNXkJNsmRYOqn8S6
ZW4wUioLekUPqVmrzdqov4lCrjkFcFKyJyHy7aGhA7rc9zlEUwDtwxUuC+mQnKYb
YME9W6edx5Wa4xuV8x8f5MQmatlE4Mf8WkRXec1A8LHzy1C0UQB1hY70XUnwo6qK
t8mynG/2IdwQdHKBIl5C1P53YBdGI+UclB1B1uSrjmt2kwfsXpvNNghH3uu9TTFV
3zvexzJ81RfiWuR6/wFfYIrXW1bHMnBj4lvEyXkNciTtVfrPGL14w3ZHWKGrwcRj
JRmnHpe31ofekmhBXSPSTnKkNB7hyNEzLlLMhnX8gOokNHHmnRgujEIe/z59AxiK
RCGWyhHyGPSeoLEjet4Z35q7K7mzqdvWjPF3wrGymv4NiaJ0FMCKE/t/gZQKrb8=
-----END CERTIFICATE REQUEST-----
```

4. Klik "Submit issue"

### 2.3 Wacht op goedkeuring
- Het Nextcloud team zal je CSR reviewen
- Dit kan 1-7 dagen duren
- Je ontvangt een signed certificate (`introvox.crt`) als reactie op je issue

## 🔐 Belangrijke Beveiligingsinformatie

### Private Key (`introvox.key`)
- **NOOIT delen of committen naar git**
- Bewaar veilig op een beveiligde locatie
- Maak een backup op een veilige plek
- Dit bestand is al toegevoegd aan `.gitignore`

### Locatie van bestanden
```
introvox.key - /Users/rikdekker/Documents/Shalution-PowerShell/SURF/nextcloud-introvox/introvox.key
introvox.csr - /Users/rikdekker/Documents/Shalution-PowerShell/SURF/nextcloud-introvox/introvox.csr
```

## 📋 Volgende Stappen (na ontvangst certificaat)

Zodra je `introvox.crt` hebt ontvangen:

1. **Plaats het certificaat** in de introvox directory
2. **Registreer je app** op https://apps.nextcloud.com/developer/register
3. **Maak een GitHub release** (v1.0.0)
4. **Sign de release package**:
   ```bash
   openssl dgst -sha512 -sign introvox.key introvox-1.0.0.tar.gz | openssl base64 > introvox-1.0.0.tar.gz.sig
   ```
5. **Upload naar App Store** met de signature

Zie [docs/APP_STORE_SUBMISSION.md](docs/APP_STORE_SUBMISSION.md) voor gedetailleerde instructies.

## ✅ Status Checklist

- [x] Private key gegenereerd (introvox.key)
- [x] CSR gegenereerd (introvox.csr)
- [ ] CSR ingediend op GitHub
- [ ] Certificaat ontvangen (introvox.crt)
- [ ] App geregistreerd op App Store
- [ ] Release gemaakt op GitHub
- [ ] Release package gesigned
- [ ] App ingediend bij App Store

## 🆘 Hulp nodig?

- Nextcloud App Store documentatie: https://nextcloudappstore.readthedocs.io/
- Certificate requests: https://github.com/nextcloud/app-certificate-requests
- Developer forum: https://help.nextcloud.com/c/dev/
