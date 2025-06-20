
export class AuctionAI {
    /**
     * @param {import('./path/to/LAppModel').LAppModel} model - ออบเจ็กต์ Live2D model
     */
    constructor(model) {
        // เก็บ reference ของ Live2D model
        this.model = model;

        // สร้าง AudioContext + AnalyserNode สำหรับอ่าน waveform
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 1024;

        // buffer สำหรับเก็บข้อมูล time-domain
        this.dataArray = new Uint8Array(this.analyser.fftSize);

        // lipSyncValue จะถูกอัปเดตในแต่ละเฟรม
        this.lipSyncValue = 0;
    }

    /**
     * เรียก API ฝั่งเซิร์ฟเวอร์เพื่อให้ Gemini+TTS ทำงาน
     * @param {string} type - หนึ่งใน 'introduce', 'announceBid', 'prompt', 'announceWinner'
     * @param {any[]} data - อาร์กิวเมนต์สำหรับ template แต่ละ type
     */
    async speak(type, data) {
        const resp = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
        if (!resp.ok) {
            console.error('AI API error', await resp.text());
            return;
        }
        const { audioBase64 } = await resp.json();
        await this._playAndLipSync(audioBase64);
    }

    /**
     * เล่นเสียงแล้วอัปเดต lipSyncValue ตลอดจนเสียงจบ
     * @param {string} audioBase64 - data URI ของไฟล์เสียง (MP3/PCM)
     */
    async _playAndLipSync(audioBase64) {
        const dataUri = "data:audio/mp3;base64," + audioBase64;
        await this.audioCtx.resume();

        const audio = new Audio(dataUri);
        audio.volume = 1;

        const src = this.audioCtx.createMediaElementSource(audio);
        src.connect(this.audioCtx.destination);
        src.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        if (this.model._motionManager) {
            this.model._motionManager.stopAllMotions();
        }

        try {
            await audio.play();
            console.log("✅ Audio is playing!");
        } catch (err) {
            console.error("❌ Audio play error:", err);
        }

        return new Promise(resolve => {
            const scale = 2.0;

            const update = () => {
                this.analyser.getByteTimeDomainData(this.dataArray);
                let sum = 0;
                for (let v of this.dataArray) {
                    const x = (v - 128) / 128;
                    sum += x * x;
                }

                this.lipSyncValue = Math.sqrt(sum / this.dataArray.length) * scale;

                this.model.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", this.lipSyncValue);
                this.model.live2DModel.update(); // ✅ สำคัญ
                this.model.live2DModel.draw();   // ✅ สำคัญ

                if (!audio.paused) {
                    requestAnimationFrame(update);
                }
            };

            audio.addEventListener("ended", () => {
                this.model.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0);
                this.model.live2DModel.update();
                this.model.live2DModel.draw(); // ✅ reset หน้าจอ
                resolve();
            });


            update();
        });
    }
}
