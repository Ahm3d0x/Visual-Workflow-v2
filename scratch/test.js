const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const geminiKey = "AIzaSyDCPS0ZOGbnF6EMWVncEp3K83kSKGm1R_U";
  const genAI = new GoogleGenerativeAI(geminiKey);
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
    const result = await model.generateContent('Say hello');
    console.log('gemini-2.5-flash Succeeded:', result.response.text());
  } catch (err) {
    console.error('gemini-2.5-flash Failed:', err);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    const result = await model.generateContent('Say hello');
    console.log('gemini-2.0-flash Succeeded:', result.response.text());
  } catch (err) {
    console.error('gemini-2.0-flash Failed:', err);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
    const result = await model.generateContent('Say hello');
    console.log('gemini-1.5-flash Succeeded:', result.response.text());
  } catch (err) {
    console.error('gemini-1.5-flash Failed:', err);
  }
}

test();
