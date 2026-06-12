#!/usr/bin/env python3
"""Convert translationfiles/<lang>/introvox.po into l10n/<lang>.js + l10n/<lang>.json.

This reproduces exactly what the Nextcloud Transifex bot emits, so the app can
load translations via OC.L10N.register (.js) and the build (.json). Run it after
`tx pull`. No third-party deps — a minimal gettext PO parser is included.

Usage:
    python3 scripts/po2l10n.py            # convert every translationfiles/*/introvox.po
    python3 scripts/po2l10n.py de nl      # only these languages
"""
import glob
import json
import os
import re
import sys

APP_ID = "introvox"

# Plural rules for languages where Transifex's header differs from NC's default.
# Anything not listed falls back to the PO header's own Plural-Forms, else DEFAULT.
DEFAULT_PLURAL = "nplurals=2; plural=(n != 1);"


def unescape(s: str) -> str:
    return (s.replace('\\n', '\n').replace('\\t', '\t')
             .replace('\\"', '"').replace('\\\\', '\\'))


def parse_po(path):
    """Return (entries, plural_form). entries: list of (msgid, msgstr, [plurals])."""
    entries = []
    plural_form = None
    msgid = msgid_plural = None
    msgstrs = {}
    cur = None  # which field we're appending continuation lines to

    def flush():
        nonlocal msgid, msgid_plural, msgstrs
        if msgid is None:
            return
        if msgid == "" and msgid_plural is None:
            # header entry — extract Plural-Forms
            hdr = msgstrs.get(0, "")
            m = re.search(r"Plural-Forms:\s*(.+?)\\n", hdr)
            if m:
                pf.append(m.group(1).strip())
        else:
            if msgid_plural is not None:
                plurals = [unescape(msgstrs.get(i, "")) for i in sorted(msgstrs)]
                if any(plurals):
                    entries.append((unescape(msgid), None, plurals))
            else:
                val = unescape(msgstrs.get(0, ""))
                if val:  # only emit translated strings
                    entries.append((unescape(msgid), val, None))
        msgid = msgid_plural = None
        msgstrs = {}

    pf = []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if line.startswith("#") or line.strip() == "":
                if line.strip() == "":
                    flush()
                    cur = None
                continue
            m = re.match(r'msgid "(.*)"$', line)
            if m:
                flush()
                msgid = m.group(1)
                cur = ("msgid",)
                continue
            m = re.match(r'msgid_plural "(.*)"$', line)
            if m:
                msgid_plural = m.group(1)
                cur = ("msgid_plural",)
                continue
            m = re.match(r'msgstr "(.*)"$', line)
            if m:
                msgstrs[0] = m.group(1)
                cur = ("msgstr", 0)
                continue
            m = re.match(r'msgstr\[(\d+)\] "(.*)"$', line)
            if m:
                idx = int(m.group(1))
                msgstrs[idx] = m.group(2)
                cur = ("msgstr", idx)
                continue
            m = re.match(r'"(.*)"$', line)
            if m and cur:  # continuation line
                if cur[0] == "msgid":
                    msgid += m.group(1)
                elif cur[0] == "msgid_plural":
                    msgid_plural += m.group(1)
                elif cur[0] == "msgstr":
                    msgstrs[cur[1]] = msgstrs.get(cur[1], "") + m.group(1)
    flush()
    plural_form = pf[0] if pf else DEFAULT_PLURAL
    return entries, plural_form


def to_value(entry):
    """JSON value for an entry: a string, or [sing, plur, ...] for plurals."""
    msgid, msgstr, plurals = entry
    return plurals if plurals is not None else msgstr


def build_translations(entries):
    out = {}
    for e in entries:
        out[e[0]] = to_value(e)
    return out


def write_lang(lang, entries, plural_form):
    translations = build_translations(entries)
    if not translations:
        return False
    # .json
    json_body = "{ \"translations\": {\n"
    items = []
    for k, v in translations.items():
        items.append("    %s : %s" % (json.dumps(k, ensure_ascii=False),
                                       json.dumps(v, ensure_ascii=False)))
    json_body += ",\n".join(items)
    json_body += "\n},\"pluralForm\" :%s\n}" % json.dumps(plural_form, ensure_ascii=False)
    with open(f"l10n/{lang}.json", "w", encoding="utf-8") as f:
        f.write(json_body)
    # .js
    js_body = 'OC.L10N.register(\n    "%s",\n    {\n' % APP_ID
    js_body += ",\n".join(items)
    js_body += "\n},\n%s);\n" % json.dumps(plural_form, ensure_ascii=False)
    with open(f"l10n/{lang}.js", "w", encoding="utf-8") as f:
        f.write(js_body)
    return True


def main():
    wanted = set(sys.argv[1:])
    os.makedirs("l10n", exist_ok=True)
    written = 0
    skipped = 0
    for po in sorted(glob.glob("translationfiles/*/introvox.po")):
        lang = po.split("/")[1]
        if wanted and lang not in wanted:
            continue
        entries, plural_form = parse_po(po)
        if write_lang(lang, entries, plural_form):
            written += 1
            print(f"  ✓ {lang:<8} {len(entries):>3} strings")
        else:
            skipped += 1
    print(f"\nGeschreven: {written} talen, overgeslagen (leeg): {skipped}")


if __name__ == "__main__":
    main()
