# Recorded pronunciation and the latte repair

## 8 November 2026 repair

Mia's returning greeting, “Hey, welcome back! The usual? A large latte?”, was newly recorded on 7 November. Its original MP3 was still byte-identical in storage when investigated. Learner recognition aliases such as `latteh` and `lah teh` live in `src/convo/soundalike.ts`; the spoken transcript and the recording request still used `latte`. No learner alias was substituted into the recording.

The owner found the final syllable confusingly prominent. The original word-transcription check scored the words correctly, but that cannot establish correct or clear syllable stress. An initial automated pronunciation assessment also passed the take by treating its final prominence as question intonation. A subsequent comparative teaching-clarity assessment preferred the replacement and flagged the old question ending as confusing. This disagreement is a reason to retain the human report, not to use one model verdict as a certificate.

The replacement keeps the exact transcript, `g_mia`, Callirrhoe, speed 1, and Mia's bright, friendly delivery. Only its non-spoken delivery guidance adds first-syllable `/ˈlɑːteɪ/` (“LAH-tay”) and a gentler question finish. It was generated through Gemini Batch. Signal checks show no clipping and quiet boundaries; the comparison found the same established character voice, exact words, no extra speech or noise, and clearer initial stress.

The single repaired key is `f621651c0cb8`: duration 3.57 → 3.29 seconds, content revision `d476ac769b26`. The full accepted MP3 SHA-256 is `d476ac769b262a489a74b7c6c942ba19d3323cf90d3208f082ed2c18bbf368cc`. The original is backed up before replacement. Add the revision to `public/audio-v2/repair-versions.json` and to the course export so cached audio gets a new URL. All other catalogue durations and existing repair revisions must remain unchanged.

## What to check separately

1. **Words and signal:** exact speech, no added or repeated words, clipping, noise or cut boundaries. A successful ASR transcript checks wording; it does not pass pronunciation.
2. **Pronunciation:** vowel quality, syllable count and lexical stress against an established English pronunciation. For this course, use American English while allowing valid dictionary variants.
3. **Teaching clarity:** a question rise is grammatical but can still make an unstressed ending sound too prominent. Evaluate what a learner will perceive, not only whether an automatic judge can explain it as intonation.
4. **Character:** retain the existing voice and compare a retake with accepted character references. Do not rewrite other recordings or globally change a character's voice to repair one sentence.

Use pronunciation guidance in non-spoken metadata, keeping the canonical written transcript intact. Keep such guidance targeted: Google's current guidance recommends short style tweaks and warns that long persona directions can destabilize delivery. Do not feed recognition aliases back into TTS input. Recheck a candidate before upload, compare the current remote hash before replacing it, and read back the exact uploaded bytes. Reports should distinguish confirmed defects, uncertain cases, accepted variants, and words merely selected for review.

## Inventory and review priorities

All 39,218 published keys were matched to their recorded or currently composed text. There are 65 distinct recordings containing “latte” or “lattes”: 31 original clips, 15 added returning-greeting variants, 17 added price replies and two returning learner examples. Include Mia and both learner-example voices when checking them; checking one spelling in one voice does not check every take.

Other useful review candidates actually occur in the catalogue:

| Category | Examples | Reason to prioritize |
| --- | --- | --- |
| Borrowed menu words | cappuccino, americano, espresso, croissant, mocha, bruschetta, minestrone, lasagna, risotto, tiramisu, gelato, penne | English adaptations can differ from source-language vowels or stress; established English variants must be allowed. |
| Ordinary English | receipt, reservation, available, police, hotel, allergy, medicine, vegetables, interesting | Familiar spelling does not certify generated pronunciation; vowel reduction and lexical stress still matter. |
| Context and word-family changes | record, refund, address, photography | Part of speech, meaning or related word forms can change stress. Check the complete sentence and accepted variants. |

This is a risk inventory, not a claim that the listed recordings are wrong or that every context has been audited. The wider listening check samples 26 represented words, while a complete “latte” check covers all 65 takes. Do not generalize a sample pass to all 39,218 recordings.

## Research and limits

- [Cambridge's latte pronunciation](https://dictionary.cambridge.org/pronunciation/english/latte) places primary stress on the first syllable in both its American and British entries.
- [Google's Gemini TTS prompting guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/prompting-guide) separates the spoken transcript from turn-level prosody, pitch and inflection controls. These controls can improve a retake; they do not constitute a word-level pronunciation guarantee.
- [Accentor, Interspeech 2023](https://www.isca-archive.org/interspeech_2023/geneva23_interspeech.html) studies lexical-stress errors in neural TTS and an explicit stress model. It establishes a general TTS failure class, not a measured failure rate for this Gemini model or this game.
- [EmergentTTS-Eval, NeurIPS 2025](https://proceedings.neurips.cc/paper_files/paper/2025/file/04970a25af46918606ba2cf0a3d7905d-Paper-Datasets_and_Benchmarks_Track.pdf) evaluates foreign words and questions as separate challenges and discusses the limits of transcription-based evaluation. It supports reviewing delivery as well as words; it does not prove that every loanword is faulty.

Loanwords deserve targeted checking, but stress mistakes are not restricted to loanwords. The specific source of this take's confusing contour cannot be proven from a generation log. The observed facts are an overly prominent question ending, an unchanged canonical transcript, correct casting, and a prior QA gate that did not independently require teaching clarity.
