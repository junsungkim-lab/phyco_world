// Tiny chiptune player on WebAudio. All three tunes are original, written for this prototype.
// A note is [name, eighths]; "-" is a rest. Bass is one note per quarter.

const N = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return 440 * Math.pow(2, (N[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};
const seq = (s) => s.trim().split(/\s+/).map((t) => { const [n, l] = t.split(":"); return [n, Number(l || 1)]; });

export const SONGS = [
  {
    title: "도트 산책", bpm: 132,
    lead: seq(`E5 G5 C6 G5 A5 G5 E5 C5 D5 E5 F5 D5 E5:4 E5 G5 C6 G5 A5 C6 B5 A5 G5 E5 D5 F5 C5:4
               G5 G5 E5 G5 A5:2 G5:2 F5 F5 D5 F5 G5:2 E5:2 E5 F5 G5 C6 B5 A5 G5 F5 E5 D5 C5 D5 C5:4`),
    bass: seq(`C3:2 C3:2 G2:2 G2:2 F2:2 F2:2 G2:2 G2:2 C3:2 C3:2 F2:2 F2:2 G2:2 G2:2 C3:2 C3:2
               C3:2 C3:2 F2:2 F2:2 D3:2 D3:2 G2:2 G2:2 C3:2 A2:2 F2:2 G2:2 C3:2 G2:2 C3:2 C3:2`),
    wave: "square",
  },
  {
    title: "새벽 두 시 감성", bpm: 84,
    lead: seq(`A4 C5 E5 D5 C5 B4 A4:2 F4 A4 C5 B4 A4 G4 E4:2 A4 C5 E5 G5 F5 E5 D5 C5 B4 C5 D5 B4 A4:4`),
    bass: seq(`A2:2 A2:2 F2:2 F2:2 D2:2 D2:2 E2:2 E2:2 A2:2 A2:2 F2:2 F2:2 G2:2 G2:2 A2:2 A2:2`),
    wave: "triangle",
  },
  {
    title: "난장판 행진곡", bpm: 168,
    lead: seq(`G4 G4 B4 D5 G5 - D5 - E5 D5 C5 B4 A4:4 A4 A4 C5 E5 F#5 - E5 D5 C5 B4 A4 F#4 G4 - G4 -`),
    bass: seq(`G2:2 D3:2 G2:2 D3:2 C3:2 G2:2 D3:2 D3:2 D3:2 A2:2 D3:2 A2:2 D3:2 D3:2 G2:2 G2:2`),
    wave: "square",
  },
];

export class Bgm {
  constructor() { this.ac = null; this.playing = false; this.timer = null; }
  ensure() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === "suspended") this.ac.resume();
    return true;
  }
  note(type, f, t, d, vol) {
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + d * 0.7);
    g.gain.linearRampToValueAtTime(0, t + d * 0.95);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + d);
  }
  play(i) {
    this.stop();
    if (!this.ensure()) return;
    const song = SONGS[i], eighth = 60 / song.bpm / 2;
    const tracks = [
      { notes: song.lead, i: 0, at: 0, type: song.wave, vol: song.wave === "square" ? 0.05 : 0.12 },
      { notes: song.bass, i: 0, at: 0, type: "triangle", vol: 0.14 },
    ];
    const start = this.ac.currentTime + 0.08;
    tracks.forEach((tr) => (tr.at = start));
    this.playing = true;
    const pump = () => {
      const horizon = this.ac.currentTime + 0.25;
      for (const tr of tracks) {
        while (tr.at < horizon) {
          const [n, l] = tr.notes[tr.i];
          const d = l * eighth;
          if (n !== "-") this.note(tr.type, freq(n), tr.at, d, tr.vol);
          tr.at += d;
          tr.i = (tr.i + 1) % tr.notes.length;
        }
      }
    };
    pump();
    this.timer = setInterval(pump, 60);
  }
  stop() {
    clearInterval(this.timer); this.timer = null; this.playing = false;
    if (this.ac) { this.master.disconnect(); this.master = this.ac.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ac.destination); }
  }
}
