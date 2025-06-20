const axios = require("axios");
const AWS = require("aws-sdk");
require("dotenv").config();

// ✅ LOG
console.log('GROQ Key:', process.env.GROQ_API_KEY);

// ✅ เช็ค Key
if (!process.env.GROQ_API_KEY) {
  throw new Error('❌ GROQ_API_KEY not found in environment variables');
}

// 🔹 ใช้ Groq API (แทน Gemini)
async function callGroq(prompt) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-8b-8192", // ✅ หรือใช้ mixtral ก็ได้
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content;
}

// 🔸 AWS Polly (Thai TTS)
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const polly = new AWS.Polly();

async function callTTS(text) {
  console.log("📏 TTS: Character count =", text.length); 
  console.log("🔊 TTS: Content preview =", text.slice(0, 100));

  const params = {
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: 'Salli', // ✅ ใช้เสียงหญิง English
  LanguageCode: 'en-US'
  };
  const { AudioStream } = await polly.synthesizeSpeech(params).promise();
  return AudioStream.toString('base64');
}

// ✅ ส่งออกฟังก์ชัน
module.exports = { callGroq, callTTS };
