# Nextcloud App Store Submission Guide

This guide walks you through submitting IntroVox to the Nextcloud App Store.

## Prerequisites

Before you can submit the app, you need:

1. ✅ A working IntroVox app (done!)
2. ✅ GitHub repository with the code (done!)
3. ✅ Valid `info.xml` file (done!)
4. ✅ `CHANGELOG.md` file (done!)
5. 📸 Screenshots (needed)
6. 🔑 App Store certificate (needed)

## Step 1: Generate App Certificate

The Nextcloud App Store requires a certificate to verify your identity and sign releases.

### 1.1 Generate Private Key and CSR

```bash
# Generate private key (keep this SECRET!)
openssl genrsa -out introvox.key 4096

# Generate Certificate Signing Request (CSR)
openssl req -new -key introvox.key -out introvox.csr -subj "/CN=IntroVox/emailAddress=info@shalution.com"

# Display the CSR (you'll need this for the next step)
cat introvox.csr
```

**⚠️ IMPORTANT**: Store `introvox.key` in a secure location. Never commit it to git!

### 1.2 Submit CSR for Approval

1. Go to https://github.com/nextcloud/app-certificate-requests
2. Create a new issue
3. Paste your CSR
4. Wait for approval (usually 1-2 days)
5. You'll receive a signed certificate (`introvox.crt`)

## Step 2: Register Your App

After receiving your certificate:

1. Go to https://apps.nextcloud.com/developer/register
2. Login with your GitHub account
3. Upload your certificate (`introvox.crt`)
4. Prove you own the private key by signing a challenge

## Step 3: Create Release Package

### 3.1 Build the App

```bash
# Clean previous builds
rm -rf js/
rm -f introvox.tar.gz

# Install dependencies
npm install

# Build production version
npm run build

# Verify build
ls -lh js/
```

### 3.2 Create Release Archive

```bash
# Create archive with proper structure
tar -czf introvox.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.tar.gz' \
  --exclude='deploy.sh' \
  --exclude='.DS_Store' \
  --transform 's,^,introvox/,' \
  *
```

### 3.3 Sign the Release

```bash
# Generate signature
openssl dgst -sha512 -sign introvox.key introvox.tar.gz | openssl base64 > introvox.tar.gz.sig

# Display signature (you'll need this)
cat introvox.tar.gz.sig
```

## Step 4: Create GitHub Release

1. Go to https://github.com/nextcloud/IntroVox/releases
2. Click "Create a new release"
3. Tag: `v1.0.0`
4. Release title: `IntroVox 1.0.0`
5. Description: Copy from CHANGELOG.md
6. Upload `introvox.tar.gz`
7. Publish release

## Step 5: Submit to App Store

1. Go to https://apps.nextcloud.com/developer/apps
2. Click "Upload new release"
3. Fill in:
   - **Download URL**: `https://github.com/nextcloud/IntroVox/releases/download/v1.0.0/introvox.tar.gz`
   - **Signature**: Paste content of `introvox.tar.gz.sig`
   - **Nextcloud versions**: 30, 31, 32
4. Submit

## Step 6: Wait for Approval

The Nextcloud team will review your app. This can take a few days to weeks.

They will check:
- Code quality
- Security
- Compliance with Nextcloud guidelines
- Proper use of APIs

## Automated Releases (Future)

For future releases, you can automate this with GitHub Actions. Create `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  release:
    types: [created]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Create archive
        run: |
          tar -czf introvox.tar.gz \
            --exclude='node_modules' \
            --exclude='.git' \
            --transform 's,^,introvox/,' \
            *

      - name: Upload to release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./introvox.tar.gz
          asset_name: introvox.tar.gz
          asset_content_type: application/gzip
```

## Troubleshooting

### Certificate Issues
- Make sure your CSR matches the format required
- Don't include BEGIN/END lines when submitting CSR
- Private key must be 4096 bits

### Build Issues
- Ensure all dependencies are installed
- Check webpack build completes without errors
- Verify js/main.js is at least 100KB

### Signature Issues
- Signature must be base64 encoded
- Use the exact same .tar.gz file you uploaded to GitHub
- Don't add newlines to the signature

## Useful Links

- [App Store Documentation](https://nextcloudappstore.readthedocs.io/)
- [Developer Manual](https://docs.nextcloud.com/server/latest/developer_manual/)
- [App Certificate Requests](https://github.com/nextcloud/app-certificate-requests)
- [App Store](https://apps.nextcloud.com/)

## Questions?

If you have questions about the submission process:
- Check the [App Store Documentation](https://nextcloudappstore.readthedocs.io/)
- Ask in the [Nextcloud Developer Forum](https://help.nextcloud.com/c/dev/)
- Open an issue on [GitHub](https://github.com/nextcloud/IntroVox/issues)
