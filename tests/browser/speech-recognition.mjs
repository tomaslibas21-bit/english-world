// Installed before the app loads. Native capture remains occupied until the asynchronous end event.
export function installSpeechRecognition() {
  const events = [];
  let active = null, id = 0;
  const record = (rec, event) => events.push({ id: rec.id, event, time: Date.now() });

  class Recognition {
    id = ++id;
    listening = false;
    ending = false;

    start() {
      record(this, "start");
      if (active) {
        record(this, "overlap");
        setTimeout(() => {
          this.onerror?.({ error: "audio-capture" });
          this.end(70);
        }, 10);
        return;
      }
      active = this;
      setTimeout(() => {
        if (this.ending) return;
        this.onstart?.();
        this.listening = true;
        this.onaudiostart?.();
        record(this, "listening");
      }, 120);
    }

    end(delay) {
      if (this.ending) return;
      this.ending = true;
      this.listening = false;
      setTimeout(() => {
        if (active === this) {
          active = null;
          this.onaudioend?.();
        }
        record(this, "end");
        this.onend?.();
      }, delay);
    }

    abort() { record(this, "abort"); this.end(650); }
    stop() { record(this, "stop"); this.end(650); }
  }

  window.SpeechRecognition = Recognition;
  window.__speechEvents = events;
  window.__listening = () => active?.listening ? active.id : null;
  window.__speak = (text) => {
    const rec = active;
    if (!rec?.listening || !rec.onresult) return false;
    const result = (transcript, isFinal) => ({
      resultIndex: 0, results: [Object.assign([{ transcript }], { isFinal })],
    });
    rec.onspeechstart?.();
    rec.onresult(result(text.slice(0, Math.max(1, Math.floor(text.length / 2))), false));
    record(rec, "interim");
    setTimeout(() => {
      if (!rec.listening) return;
      rec.onspeechend?.();
      rec.onresult?.(result(text, true));
      record(rec, "final");
      rec.end(80);
    }, 170);
    return true;
  };
}
