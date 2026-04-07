// test-gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testarGemini() {
    console.log('🔍 Testando conexão com Gemini...');
    
    if (!process.env.GEMINI_API_KEY) {
        console.log('❌ Chave não encontrada no .env');
        return;
    }
    
    console.log('✅ Chave encontrada:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = "Responda apenas com 'OK' se você estiver funcionando";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        console.log('✅ Gemini respondeu:', response.text());
        console.log('🎉 Conexão com Gemini funcionando perfeitamente!');
        
    } catch (error) {
        console.log('❌ Erro ao conectar com Gemini:', error.message);
        console.log('\nPossíveis causas:');
        console.log('1. Chave inválida ou expirada');
        console.log('2. API do Gemini não ativada');
        console.log('3. Limite de uso excedido');
    }
}

testarGemini();