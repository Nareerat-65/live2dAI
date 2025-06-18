// aiClient.js
require('dotenv').config();
const axios = require('axios');
const AWS   = require('aws-sdk');

// Gemini (เหมือนเดิม)
async function callGemini(prompt) {
  const res = await axios.post(
    'https://api.palm.googleapis.com/v1/models/gemini:generateText',
    { prompt },
    { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` } }
  );
  return res.data.candidates[0].content;
}

// AWS Polly
AWS.config.update({ region: process.env.AWS_REGION });
const polly = new AWS.Polly();
async function callTTS(text) {
  const params = {
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: 'Cholada',      // หรือ 'Chulabhorn'
    LanguageCode: 'th-TH'
  };
  const { AudioStream } = await polly.synthesizeSpeech(params).promise();
  // แปลง Buffer เป็น base64 string
  return AudioStream.toString('base64');
}

module.exports = { callGemini, callTTS };



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
        const audio = new Audio(audioBase64);
        const src = this.audioCtx.createMediaElementSource(audio);
        src.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
        audio.play();

        return new Promise(resolve => {
            audio.addEventListener('ended', resolve);

            const update = () => {
                this.analyser.getByteTimeDomainData(this.dataArray);
                // คำนวณ RMS ของ waveform
                let sum = 0;
                for (let v of this.dataArray) {
                    const x = (v - 128) / 128;
                    sum += x * x;
                }
                this.lipSyncValue = Math.sqrt(sum / this.dataArray.length) * 2;
                // เขียนค่า lipSync เข้า parameter ปาก
                this.model.live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", this.lipSyncValue);
                if (!audio.paused) requestAnimationFrame(update);
            };

            update();
        });
    }
}
