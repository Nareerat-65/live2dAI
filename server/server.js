// server.js
require('dotenv').config();

const express = require('express');
const path    = require('path');
const aiRouter = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) parse JSON bodies
app.use(express.json());

// 2) mount AI router ที่ /api/ai
//    (– POST /api/ai/ai จะไปที่ handler ใน ai.js)
app.use('/api', aiRouter);

// 3) (ถ้าต้องการให้ Express เสิร์ฟหน้าเว็บและ assets)  
//    ปรับ path ให้ตรงกับโฟลเดอร์ที่เก็บ SampleApp1.html, SampleApp1.js, และ src/ai.js  
// server.js (ตรงส่วน static)
const sampleApp = path.join(__dirname, '..', 'webgl', 'Live2D', 'sample', 'sampleApp1');

// บอก static ให้ index เป็นไฟล์ SampleApp1.html
app.use(
  '/',
  express.static(sampleApp, { index: 'SampleApp1.html' })
);

// เอา catch-all ออกไปก็ได้ เพราะ static จัดการ index ให้แล้ว


// เริ่มรัน server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
