// server.js
require('dotenv').config();

const express = require('express');
const path    = require('path');

// นำเข้า AI‐router (ไฟล์ server/ai.js)
const aiRouter = require('./server/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) parse JSON bodies
app.use(express.json());

// 2) mount AI router ที่ /api/ai
//    (– POST /api/ai/ai จะไปที่ handler ใน ai.js)
app.use('/api', aiRouter);

// 3) (ถ้าต้องการให้ Express เสิร์ฟหน้าเว็บและ assets)  
//    ปรับ path ให้ตรงกับโฟลเดอร์ที่เก็บ SampleApp1.html, SampleApp1.js, และ src/ai.js  
app.use('/', express.static(path.join(__dirname, 'webgl/Live2D/sample/sampleApp1')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'webgl/Live2D/sample/sampleApp1/SampleApp1.html'));
});

// เริ่มรัน server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
