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