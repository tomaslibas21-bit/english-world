// Finds text in pictures with macOS's own text recognizer (Vision), as a first pass for the "no text" rule
// (docs/es/PICTURES.md): prints every picture where it reads letters or digits, with what it read and where.
// A clean result is not proof (look at the pictures too), and a hit can be a false alarm (a pattern read as a letter).
//
//   swiftc -O tools/es-pictures/textcheck.swift -o <work>/textcheck      (once)
//   <work>/textcheck <picture or folder> …
import AppKit
import Foundation
import Vision

func check(_ url: URL) {
    guard let image = NSImage(contentsOf: url),
          let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("? \(url.path): not a picture")
        return
    }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = ["en-US", "es-ES"]
    req.minimumTextHeight = 0.008
    do { try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req]) } catch {
        print("? \(url.path): \(error)")
        return
    }
    var hits: [String] = []
    for obs in req.results ?? [] {
        guard let top = obs.topCandidates(1).first, top.confidence >= 0.3 else { continue }
        let text = top.string.trimmingCharacters(in: .whitespaces)
        if text.rangeOfCharacter(from: .alphanumerics) == nil { continue }
        let b = obs.boundingBox
        hits.append(String(format: "\"%@\" (%.2f) at x %.0f%% y %.0f%%", text, top.confidence, b.midX * 100, (1 - b.midY) * 100))
    }
    if hits.isEmpty { print("ok \(url.lastPathComponent)") } else { print("TEXT \(url.path): " + hits.joined(separator: "; ")) }
}

let fm = FileManager.default
for arg in CommandLine.arguments.dropFirst() {
    var isDir: ObjCBool = false
    guard fm.fileExists(atPath: arg, isDirectory: &isDir) else { print("? \(arg): missing"); continue }
    if isDir.boolValue {
        let items = (fm.enumerator(atPath: arg)?.allObjects as? [String] ?? []).sorted()
        for rel in items where rel.hasSuffix(".png") && !rel.contains("~") {
            check(URL(fileURLWithPath: arg).appendingPathComponent(rel))
        }
    } else {
        check(URL(fileURLWithPath: arg))
    }
}
