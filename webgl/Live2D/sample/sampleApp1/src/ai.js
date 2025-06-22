export class AuctionAI {
  /**
   * @param {import('./path/to/LAppModel').LAppModel} model - ออบเจ็กต์ Live2D model
   */
  constructor(model) {
    this.model = model;

    // เตรียมระบบเสียง
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;

    this.dataArray = new Uint8Array(this.analyser.fftSize);
    this.lipSyncValue = 0;
  }

  /**
   * @param {'introduce'|'announceBid'|'prompt'|'announceWinner'} type
   * @param {any[]} data
   */
  async speak(type, data = []) {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });

      const { text, audioBase64 } = await res.json();
      console.log('[AI] 🗣️ Text:', text);

      // สร้าง audio object
      const audio = new Audio("data:audio/mp3;base64," + audioBase64);
      audio.play();

      // เชื่อมเสียงกับ analyzer
      const source = this.audioCtx.createMediaElementSource(audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // คำนวณ waveform → ค่า lipSyncValue
      const updateLipSync = () => {
        this.analyser.getByteTimeDomainData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          const val = (this.dataArray[i] - 128) / 128;
          sum += val * val;
        }

        this.lipSyncValue = Math.sqrt(sum / this.dataArray.length);

        if (!audio.paused && !audio.ended) {
          requestAnimationFrame(updateLipSync);
        } else {
          this.lipSyncValue = 0; // หยุดขยับปาก
        }
      };

      updateLipSync();
    } catch (err) {
      console.error('[AuctionAI] speak() failed:', err);
    }
  }
}
