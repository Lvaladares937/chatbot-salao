// testar-modelos-novos.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const modelosDisponiveis = [
    // ✅ Modelos 3.x (nomes ATUALIZADOS - sem preview)
    { nome: "gemini-3-flash", tipo: "Flash 3", rpm: 15 },
    { nome: "gemini-3.1-pro", tipo: "Pro 3.1", rpm: 5 },
    { nome: "gemini-3.1-flash-lite", tipo: "Flash Lite 3.1", rpm: 60 },
    
    // ✅ Modelos legado que funcionam
    { nome: "gemini-2.5-flash", tipo: "Flash 2.5", rpm: 5 },
    
    // ⚠️ Imagen requer endpoint diferente (não via generateContent)
    // { nome: "imagen-4.0-generate-001", tipo: "Imagen 4", endpoint: "imagen" }
];

async function testarModelos() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🔍 TESTANDO MODELOS GEMINI (nomes atualizados)\n');
    console.log('📌 Nota: Modelos preview foram renomeados em 09/03/2026\n');
    
    for (const modelo of modelosDisponiveis) {
        process.stdout.write(`📡 Testando ${modelo.nome} (${modelo.tipo})... `);
        
        try {
            const model = genAI.getGenerativeModel({ model: modelo.nome });
            const result = await model.generateContent("Responda apenas 'OK'");
            const response = await result.response;
            console.log(`✅ FUNCIONOU! Resposta: ${response.text()}`);
        } catch (error) {
            console.log(`❌ FALHOU: ${error.message.substring(0, 100)}...`);
            
            // Tenta versão alternativa se for preview
            if (error.message.includes('404') && modelo.nome.includes('-preview')) {
                const nomeSemPreview = modelo.nome.replace('-preview', '');
                console.log(`   🔄 Tentando versão sem preview: ${nomeSemPreview}`);
                
                try {
                    const model = genAI.getGenerativeModel({ model: nomeSemPreview });
                    const result = await model.generateContent("Responda apenas 'OK'");
                    const response = await result.response;
                    console.log(`   ✅ ${nomeSemPreview} FUNCIONOU!`);
                } catch (e) {}
            }
        }
        
        // Pausa para rate limit
        await new Promise(r => setTimeout(r, 1000));
    }
}

testarModelos();