# Import & Export

*Introduced in v1.1.0.*

Import/Export lets you download wizard steps as JSON and upload them back later. This enables:

- **Collaboration** with content writers, translators, and other admins
- **Version control** (commit JSON to git, track changes over time)
- **Multi-instance deployment** (configure once, deploy everywhere)
- **Backups** before making major changes

## Exporting Wizard Steps

### How to Export

1. Select the language to export from the language dropdown
2. Click the **📥 Export** button at the top of the steps list
3. A JSON file downloads automatically

**Filename format:** `introvox-steps-{language}-{timestamp}.json`

**Example:** Exporting English on Jan 15, 2025 produces `introvox-steps-en-2025-01-15-143022.json`.

### What's Included

- All wizard steps for the selected language
- Step IDs, titles, HTML text content
- CSS selectors (`attachTo`) and positions
- Enabled/disabled status
- Step order
- Group visibility (`visibleToGroups`)

## Importing Wizard Steps

### How to Import

1. Select the **target language** from the language dropdown
2. Click the **📤 Import** button
3. Pick a JSON file from your computer
4. You'll see a success message: *"Successfully imported X steps for language Y"*

### Important Notes

- ⚠️ **Import replaces all existing steps** for that language
- ✅ Only the selected language is affected — safe for multi-language setups
- ✅ The JSON is validated before applying
- 💾 Auto-saves — changes are immediately active after a successful import

### Validation

The import validates:

- JSON syntax is correct
- Required fields are present (`id`, `title`, `text`)
- Data types match
- No duplicate step IDs within the file

### Error Messages

If import fails you'll see a specific error:

- `Error importing steps: Invalid JSON format`
- `Error importing steps: Missing required field 'id' in step 3`
- `Error importing steps: {specific error}`

## JSON File Structure

```json
[
  {
    "id": "welcome",
    "title": "👋 Welcome to Nextcloud",
    "text": "<p>Nice to have you here!</p>",
    "attachTo": "",
    "position": "right",
    "enabled": true,
    "visibleToGroups": []
  },
  {
    "id": "files",
    "title": "📁 Files",
    "text": "<p>Manage your files here.</p>",
    "attachTo": "[data-id=\"files\"]",
    "position": "right",
    "enabled": true,
    "visibleToGroups": []
  },
  {
    "id": "admin-panel",
    "title": "⚙️ Admin Panel",
    "text": "<p>Configure your Nextcloud instance here.</p>",
    "attachTo": "[data-id=\"settings\"]",
    "position": "right",
    "enabled": true,
    "visibleToGroups": ["admin", "Administrators"]
  }
]
```

**Field notes:**

- `attachTo: ""` — centered step (no element highlight)
- `visibleToGroups: []` — visible to all users
- `visibleToGroups: ["group1", "group2"]` — visible only to users in at least one of these groups

## Workflows

### Content Creator Collaboration

1. **Admin** exports current English steps
2. **Admin** sends `introvox-steps-en-2025-01-15.json` to the content writer
3. **Content writer** opens the JSON in a text editor, edits titles and descriptions, saves as `introvox-steps-en-updated.json`
4. **Admin** imports the updated file
5. **Admin** tests, then exports again for version control

### Translator Collaboration

1. **Admin** exports English steps as the source
2. **Admin** sends the JSON to a translator
3. **Translator** edits only the `title` and `text` fields, returns the file
4. **Admin** selects the target language, imports the file
5. **Admin** enables the language in **Available languages**

### Multi-Instance Deployment

1. **Admin** configures wizard on a development/staging instance
2. **Admin** exports all languages (one file per language)
3. **Admin** imports them on the production instance
4. Consistent user experience across all environments

### Version Control

- Commit exported JSON to a git repository
- Track changes over time
- Roll back if a configuration breaks
- Share configurations as pull requests

## See Also

- [Managing Wizard Steps](managing-steps.md) — Step CRUD
- [Group-Based Visibility](group-visibility.md) — `visibleToGroups` field
- [Best Practices](best-practices.md) — Back up before major changes
