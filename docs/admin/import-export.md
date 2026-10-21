# Import & Export

*Introduced in v1.1.0.*

Import/Export lets you download a tour's steps as JSON and upload them back later. **Export** and **Import** are in each tour's step editor: open **Tours** and click **Edit steps** on the tour. They work on that tour and the selected language only. This enables:

- **Collaboration** with content writers, translators, and other admins
- **Version control** (commit JSON to git, track changes over time)
- **Multi-instance deployment** (configure once, deploy everywhere)
- **Backups** before making major changes

## Exporting Wizard Steps

### How to Export

1. Select the language to export from the language dropdown
2. Click **Export** in the row of buttons above the steps list
3. A JSON file downloads automatically

**Filename format:** `introvox_steps_{language}.json` for the welcome tour, `introvox_{tour}_steps_{language}.json` for a tour for an app or page

**Example:** Exporting the welcome tour in English produces `introvox_steps_en.json`.

### What's Included

- All steps of the tour for the selected language
- Step IDs, titles, HTML text content
- CSS selectors (`attachTo`) and positions
- The page a step belongs to (`page`) and the button the tour clicks first to open a menu (`openFirst`)
- How the step goes on (`advance`): the Next button, a click on the element, or filling in the field
- The step's image or video (`media`): a reference to the file, not the file itself
- Enabled/disabled status
- Step order
- Group visibility (`visibleToGroups`)

The JSON file does not carry the image and video files. Imported on the same Nextcloud, the steps keep them; on another Nextcloud they are left out, with the message "An image or video in the file is not on this server and was left out." To move a tour with its images and videos, use **Export tour** in the tour's ⋯ menu, see below.

## A Whole Tour

This page is about the steps of one language. To move a whole tour to another Nextcloud, with its settings, every language and its images and videos, use **Export tour** and **Import tour** in the Tours list; see [Move a tour to another Nextcloud](tours.md#move-a-tour-to-another-nextcloud).

## Importing Wizard Steps

### How to Import

1. Open the tour the steps are for: **Tours** → **Edit steps**
2. Click **Import** in the row of buttons above the steps list
3. Pick a JSON file from your computer
4. You'll see a success message: *"Imported X steps (language)"*, and the editor switches to that language

The language comes from the file (its `"language"` field), not from the language selector. To import steps into another language, change that field before you import.

### Important Notes

- ⚠️ **Import replaces all existing steps** for that language
- ✅ Only the file's language is affected — safe for multi-language setups
- ✅ The JSON is validated before applying
- 💾 Auto-saves — changes are immediately active after a successful import

### Validation

The import validates, and refuses the whole file on the first problem:

- The file is at most 1 MB and the JSON syntax is correct
- At most 100 steps, each with an `id` (letters, digits, `_`, `-`, `.`) and a `title`
- Every field has the right type and length (text up to 20,000 characters)
- `page` is a path on this Nextcloud, such as `/apps/spreed/` — never another site
- `advance` is `button`, `click` or `input`
- No duplicate step IDs within the file

Fields IntroVox does not know are dropped. Saving from the step editor goes through the same checks.

### Error Messages

If import fails you'll see a specific error:

- `Error importing steps: Invalid JSON format: Syntax error`
- `Error importing steps: Invalid step data: Step 3: id must be letters, digits, "_", "-" or "."`
- `Error importing steps: Import file is too large (at most 1 MB)`

## JSON File Structure

```json
{
  "version": "1.0",
  "language": "en",
  "exportDate": "2026-10-01 12:00:00",
  "steps": [
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
}
```

**Field notes:**

- `attachTo: ""` — centered step (no element highlight)
- `page: "/apps/spreed/"` — the app the step belongs to; the tour opens it first. Absent or empty = any page
- `openFirst` — selector of the button the tour clicks first, to open the menu the element is in
- `advance` — `button` (or absent): a Next button; `click`: the user clicks the element to go on; `input`: Next works once the field has text
- `media` — the step's image or video: `file` (an IntroVox media id, such as `<32 hex>.png`), `alt`, `decorative`, `size` (`small`, `full`, `wide`); for a video also `playback` (`loop`, `controls`) and `captions`. Only a reference to the file: see [What's Included](#whats-included)
- `visibleToGroups: []` — visible to all users
- `visibleToGroups: ["group1", "group2"]` — visible only to users in at least one of these groups

## Workflows

### Content Creator Collaboration

1. **Admin** exports current English steps
2. **Admin** sends `introvox_steps_en.json` to the content writer
3. **Content writer** opens the JSON in a text editor, edits titles and texts, and saves it
4. **Admin** imports the updated file
5. **Admin** tests, then exports again for version control

### Translator Collaboration

This pattern only applies when an admin wants a *custom override* for a specific language. The auto-translated default tour comes from Transifex — for that, the better path is to contribute on [Transifex](https://www.transifex.com/nextcloud/nextcloud/) directly so all installs benefit.

For per-install custom copy:

1. **Admin** exports English steps as the source
2. **Admin** sends the JSON to a translator
3. **Translator** edits only the `title` and `text` fields, sets `"language"` to the target language (such as `"de"`), returns the file
4. **Admin** imports the file in the tour's step editor (**Tours** → **Edit steps**); it becomes the override for that language straight away

### Multi-Instance Deployment

1. **Admin** configures the tours on a development/staging instance
2. **Admin** uses **Export tour** in each tour's ⋯ menu: one `.zip` per tour, with its settings, its steps in every language, and its images and videos
3. **Admin** uses **Import tour** on the production instance; each tour arrives switched off, and the welcome tour replaces the steps of the languages in the file. See [Move a tour to another Nextcloud](tours.md#move-a-tour-to-another-nextcloud)
4. **Admin** switches the tours on there

The JSON files of **Export** also work for this, one file per tour and language, but they carry no settings and no images or videos, and an app tour has to exist on the other side first (**New tour**).

### Version Control

- Commit exported JSON to a git repository
- Track changes over time
- Roll back if a configuration breaks
- Share configurations as pull requests

## See Also

- [Managing Tour Steps](managing-steps.md) — Step CRUD
- [Tours](tours.md) — The welcome tour and tours for apps
- [Group-Based Visibility](group-visibility.md) — `visibleToGroups` field
- [Best Practices](best-practices.md) — Back up before major changes
