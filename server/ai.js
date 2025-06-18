// server/ai.js
require('dotenv').config();            // โหลด .env
const { callGemini, callTTS } = require('./aiClient');

const express = require('express');
const router = express.Router();

// นำเข้า wrapper สำหรับเรียก Gemini และ TTS
// ปรับ path ให้ตรงกับตำแหน่งไฟล์ของคุณ
const { callGemini, callTTS } = require('./aiClient');

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
  const { type, data } = req.body;

  // เช็คว่า type ถูกต้อง
  if (!TEMPLATES[type]) {
    return res.status(400).json({ error: 'Unknown AI type' });
  }

  // สร้าง prompt จาก template และ data
  const prompt = TEMPLATES[type](...(data || []));

  try {
    // เรียก Gemini เพื่อ generate text script
    const script = await callGemini(prompt);
    // เรียก TTS เพื่อสังเคราะห์เสียงเป็น base64
    const audioBase64 = await callTTS(script);
    // ส่งกลับไปให้ไคลเอ็นต์
    res.json({ text: script, audioBase64 });
  } catch (err) {
    console.error('AI service error:', err);
    res.status(500).json({ error: 'AI service failed' });
  }
});

module.exports = router;
