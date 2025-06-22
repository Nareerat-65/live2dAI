
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
        const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer;

        const audioBuffer = await this.audioCtx.decodeAudioData(audioData);
        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = this.analyser;
        const dataArray = this.dataArray;

        const gainNode = this.audioCtx.createGain();
        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        if (this.model._motionManager) {
            this.model._motionManager.stopAllMotions();
        }

        source.start();

        const scale = 2.0;

        return new Promise(resolve => {
            const update = () => {
                analyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let v of dataArray) {
                    const x = (v - 128) / 128;
                    sum += x * x;
                }

                const volume = Math.sqrt(sum / dataArray.length) * scale;

                this.model.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", volume);
                this.model.live2DModel.update();
                this.model.live2DModel.draw();

                if (this.audioCtx.currentTime < source.buffer.duration + source.startTime) {
                    requestAnimationFrame(update);
                } else {
                    this.model.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0);
                    this.model.live2DModel.update();
                    this.model.live2DModel.draw();
                    resolve();
                }
            };

            update();
        });
    }
}
