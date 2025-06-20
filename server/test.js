const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Hello');
    const response = await result.response;
    console.log('✅ ใช้ได้:', response.text());
  } catch (err) {
    console.error('❌ ใช้ไม่ได้:', err.message);
  }
}

testModel();