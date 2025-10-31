# Git Remotes Configuration

IntroVox wordt gesynchroniseerd naar twee Git repositories:

## 🌐 Primary: GitHub (Nextcloud Official)
- **URL**: https://github.com/nextcloud/IntroVox
- **Remote name**: `origin`
- **Purpose**: Officiële Nextcloud app repository
- **Public**: Ja
- **Used for**: App Store submissions, community contributions

## 💾 Backup: Gitea (Personal)
- **URL**: https://gitea.rikdekker.nl/rik/IntroVox
- **Remote name**: `gitea`
- **Purpose**: Personal backup en development
- **Owner**: rik@gitea.rikdekker.nl

## 🔄 Synchronisatie

### Handmatig pushen naar beide:
```bash
git push origin main   # Push naar GitHub
git push gitea main    # Push naar Gitea
```

### Automatisch pushen naar beide:
```bash
./push-all.sh         # Pusht naar beide remotes
```

### Controle:
```bash
git remote -v         # Toon alle remotes
git log --oneline -5  # Toon laatste 5 commits
```

## 📝 Workflow

1. **Maak wijzigingen** in je code
2. **Commit lokaal**:
   ```bash
   git add .
   git commit -m "beschrijving"
   ```
3. **Push naar beide** repositories:
   ```bash
   ./push-all.sh
   ```

## ⚠️ Belangrijk

- **GitHub** is de **primary** source voor de Nextcloud App Store
- **Gitea** is alleen voor backup/development
- Bij conflicten: GitHub heeft voorrang
- Certificaten (introvox.key, introvox.crt) worden NOOIT gepusht (staan in .gitignore)

## 🔐 Security

De volgende bestanden worden NIET gesynchroniseerd:
- `introvox.key` - Private key (SECRET!)
- `introvox.crt` - Certificate
- `introvox.csr` - Certificate signing request
- `deploy.sh` - Server-specifieke deployment config
- `push-all.sh` - Local sync script
- `*.tar.gz` - Release packages
- `node_modules/` - Dependencies
- `js/` - Build outputs

Deze staan in `.gitignore` en blijven alleen lokaal.
