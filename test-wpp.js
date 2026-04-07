// test-wpp-simples.js
const wppconnect = require('@wppconnect-team/wppconnect');

console.log('🚀 Teste WhatsApp - Versão Super Simples');

wppconnect.create({
    session: 'teste-simples',
    headless: true,
    useChrome: true,
    autoClose: 0,
    catchQR: (qrCode) => {
        console.log('\n📱 QR Code gerado. Escaneie com o WhatsApp:\n');
        require('qrcode-terminal').generate(qrCode, { small: true });
    }
}).then(client => {
    console.log('✅ WhatsApp conectado!');
    
    // Mostrar informações do cliente
    console.log('📱 Informações do bot:', client.info);
    
    client.onMessage(message => {
        // Mostrar tudo que chega
        console.log('\n📨 MENSAGEM RECEBIDA:');
        console.log('Objeto completo:', JSON.stringify(message, null, 2));
        
        // Tentar responder de forma simples
        if (message.body && !message.isGroupMsg && message.from !== 'status@broadcast') {
            console.log('📝 Tentando responder...');
            
            // Usar o from exatamente como veio
            client.sendText(message.from, 'Olá! Teste simples funcionando!')
                .then(() => console.log('✅ Resposta enviada com sucesso!'))
                .catch(err => console.log('❌ Erro ao enviar:', err.message));
        }
    });
}).catch(err => {
    console.error('❌ Erro fatal:', err);
});