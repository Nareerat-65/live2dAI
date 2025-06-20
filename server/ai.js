// server/ai.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { callGroq, callTTS } = require('./aiClient');

// Prompt templates สำหรับแต่ละเหตุการณ์ประมูล
const TEMPLATES = {
  introduce: item =>
    `กำลังจะเริ่มประมูล: สินค้า "${item.name}" รายละเอียด: ${item.desc} เปิดราคาที่ ${item.startPrice} บาท`,
  announceBid: (user, amount) =>
    `ผู้เสนอราคาท่านล่าสุด: คุณ${user} ราคา ${amount} บาท`,
  prompt: () =>
    `ใครจะเสนอราคาต่อครับ? กรุณาเพิ่มราคาถัดไปเพื่อรับสินค้า`,
  announceWinner: (winner, amount) =>
    `สิ้นสุดการประมูล! ผู้ชนะคือ คุณ${winner} ด้วยราคา ${amount} บาท ขอแสดงความยินดีกับผู้ชนะครับ`
};

// POST /api/ai
router.post('/ai', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!TEMPLATES[type]) {
      return res.status(400).json({ error: 'Unknown type' });
    }

    const prompt = TEMPLATES[type](...(data || []));
    console.log('[AI] Prompt:', prompt);

    const script = await callGroq(prompt);
    console.log('[AI] Groq script:', script);

    const audioBase64 = await callTTS(script);
    console.log('[AI] Audio length:', audioBase64.length);

    return res.json({ text: script, audioBase64 });

  } catch (err) {
    console.error('[AI] Error:', err);  // <<< สำคัญ
    return res.status(500).json({ error: 'AI service failed' });
  }
});

module.exports = router;
