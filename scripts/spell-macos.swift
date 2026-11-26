// Copied from voxcloud-apps/design@850d21108, l10n/tools/spell-macos.swift. Do not edit here: change it in design and run sync-to-apps.sh.
// Spell check for l10n-audit.mjs on macOS (L18). Reads a UTF-8 file, one source string per line,
// and prints "<count>\t<word>" for every word the en_US system dictionary does not know.
// Built on demand by l10n-audit.mjs: swiftc -O -o <cache>/spell-macos spell-macos.swift
import AppKit

let checker = NSSpellChecker.shared
let text = (try? String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)) ?? ""
var counts: [String: Int] = [:]
for line in text.components(separatedBy: "\n") {
    let ns = line as NSString
    var start = 0
    while start < ns.length {
        let r = checker.checkSpelling(of: line, startingAt: start, language: "en_US", wrap: false,
                                      inSpellDocumentWithTag: 0, wordCount: nil)
        if r.location == NSNotFound { break }
        counts[ns.substring(with: r), default: 0] += 1
        start = r.location + r.length
    }
}
for (word, count) in counts.sorted(by: { $0.key.lowercased() < $1.key.lowercased() }) {
    print("\(count)\t\(word)")
}
