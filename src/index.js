require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');

const api = require('./api');
const menus = require('./menus');
const fluxos = require('./fluxos');
const { reconhecerComandoMenu } = require('./utils');

const conversas = new Map();
const mensagensProcessadas = new Set();

async function processarMensagem(client, from, texto) {
    let conv = conversas.get(from);

    if (!conv) {
        conv = { passo: null, dados: {}, ultimaAtividade: Date.now() };
        conversas.set(from, conv);
    }

    conv.ultimaAtividade = Date.now();
    console.log(`📝 [${conv.passo || 'MENU'}] Texto recebido: "${texto}"`);

    // 🔥 VERIFICAR MODO ESCUTA (atendente humano)
    if (conv.modo_escuta === true && conv.passo !== 'confirmar_atendente') {
        await fluxos.processarModoEscuta(client, from, conv, texto);
        return;
    }

    // Comando universal para voltar ao menu principal
    if (texto === '#menu' || texto === 'menu' || texto === 'MENU' || texto === 'voltar') {
        conv.passo = null;
        conv.dados = {};
        conv.modo_escuta = false; // Desativa modo escuta
        await menus.mostrarMenuPrincipal(client, from);
        return;
    }

    // Se não está em fluxo, processa comando do menu principal
    if (conv.passo === null) {
        const comando = reconhecerComandoMenu(texto);
        console.log("🎯 Comando reconhecido:", comando);

        switch (comando) {
            case 'agendar':
                conv.passo = 'menu_servicos';
                const servicos = await api.buscarServicos();
                
                if (!servicos || servicos.length === 0) {
                    await client.sendText(from, "❌ Nenhum serviço disponível no momento.");
                    conv.passo = null;
                    return menus.mostrarMenuPrincipal(client, from);
                }
                
                conv.dados = { 
                    servicos: servicos, 
                    paginaAtual: 1,
                    servicosSelecionados: []
                };
                
                await menus.mostrarMenuServicos(client, from, servicos, 1, conv.dados);
                return;

            case 'servicos':
                const listaServicos = await api.buscarServicos();
                
                if (!listaServicos || listaServicos.length === 0) {
                    await client.sendText(from, "❌ Nenhum serviço disponível no momento.");
                    conv.passo = null;
                    return menus.mostrarMenuPrincipal(client, from);
                }
                
                conv.passo = 'menu_servicos';
                conv.dados = { 
                    servicos: listaServicos, 
                    paginaAtual: 1,
                    servicosSelecionados: []
                };
                
                await menus.mostrarMenuServicos(client, from, listaServicos, 1, conv.dados);
                return;

            case 'meus_agendamentos':
                conv.passo = 'consulta_nome';
                await client.sendText(from, "📋 *CONSULTAR AGENDAMENTOS*\n\nPor favor, informe seu nome completo para buscar seus agendamentos:");
                return;

            case 'cancelar':
                conv.passo = 'cancelar_nome';
                await client.sendText(from, "❌ *CANCELAR AGENDAMENTO*\n\nPor favor, informe seu nome completo para buscar seus agendamentos:");
                return;

            case 'informacoes':
                await menus.mostrarInformacoes(client, from);
                await menus.mostrarMenuPrincipal(client, from);
                return;

            case 'atendente':
            case 'humano':
            case 'falar com atendente':
            case 'atendimento':
                conv.passo = 'atendente_humano';
                await fluxos.processarAtendenteHumano(client, from, conv, texto);
                return;

            case 'menu':
                await menus.mostrarMenuPrincipal(client, from);
                return;

            case 'saudacao':
                await client.sendText(from, "✨ Olá! Bem-vindo ao *Salão Vailson*! ✨\n\nComo posso ajudar você hoje?");
                await menus.mostrarMenuPrincipal(client, from);
                return;

            default:
                await menus.mostrarMenuPrincipal(client, from);
                return;
        }
    }

    // Processa os fluxos baseado no passo atual
    try {
        switch (conv.passo) {
            // 🔥 FLUXO ATENDENTE HUMANO
            case 'atendente_humano':
                await fluxos.processarAtendenteHumano(client, from, conv, texto);
                break;
            
            case 'confirmar_atendente':
                await fluxos.processarConfirmarAtendente(client, from, conv, texto);
                break;
            
            // 🔥 FLUXOS DE IDENTIFICAÇÃO (APÓS ESCOLHER HORÁRIO)
            case 'identificar_cliente_final':
                await fluxos.processarIdentificarClienteFinal(client, from, conv, texto);
                break;
            
            case 'cadastrar_nome_final':
                await fluxos.processarCadastrarNomeFinal(client, from, conv, texto);
                break;
            
            case 'cadastrar_telefone_final':
                await fluxos.processarCadastrarTelefoneFinal(client, from, conv, texto);
                break;
            
            // FLUXOS DE AGENDAMENTO
            case 'menu_servicos':
                await fluxos.processarMenuServicos(client, from, conv, texto);
                break;

            case 'menu_profissionais':
                await fluxos.processarMenuProfissionais(client, from, conv, texto);
                break;

            case 'menu_datas':
                await fluxos.processarMenuDatas(client, from, conv, texto);
                break;

            case 'menu_horarios':
                await fluxos.processarMenuHorarios(client, from, conv, texto);
                break;

            case 'confirmacao':
                await fluxos.processarConfirmacao(client, from, conv, texto);
                break;

            // FLUXOS DE CONSULTA E CANCELAMENTO
            case 'consulta_nome':
                await fluxos.processarConsultaAgendamentos(client, from, conv, texto);
                break;

            case 'cancelar_nome':
                await fluxos.processarCancelarNome(client, from, conv, texto);
                break;

            case 'cancelar_tentar_telefone':
                await fluxos.processarCancelarTentarTelefone(client, from, conv, texto);
                break;
        
            case 'cancelar_telefone':
                await fluxos.processarCancelarTelefone(client, from, conv, texto);
                break;

            case 'cancelar_escolha':
                await fluxos.processarCancelarEscolha(client, from, conv, texto);
                break;

            default:
                console.log(`⚠️ Passo não reconhecido: ${conv.passo}`);
                conv.passo = null;
                conv.dados = {};
                conv.modo_escuta = false;
                await menus.mostrarMenuPrincipal(client, from);
        }
    } catch (error) {
        console.error(`❌ Erro no fluxo ${conv.passo}:`, error);
        await client.sendText(from, "❌ Ocorreu um erro. Vamos recomeçar!");
        conv.passo = null;
        conv.dados = {};
        conv.modo_escuta = false;
        await menus.mostrarMenuPrincipal(client, from);
    }
}

async function handleMessage(client, message) {
    try {
        // 🔥 IGNORAR MENSAGENS DE STATUS
        if (message.isStatus) return;
        
        // 🔥 IGNORAR MENSAGENS DO PRÓPRIO BOT
        if (message.fromMe) return;
        
        // 🔥 IGNORAR MENSAGENS DE GRUPOS
        const isGroup = message.isGroupMsg === true || 
                       message.chat?.isGroup === true || 
                       (message.from && message.from.includes('@g.us'));
        
        if (isGroup) {
            console.log(`📢 Ignorando mensagem de grupo: ${message.from}`);
            return;
        }
        
        // 🔥 IGNORAR MENSAGENS VAZIAS
        if (!message.body || message.body.trim() === '') return;
        
        // 🔥 IGNORAR TIPOS DE MENSAGEM NÃO SUPORTADOS
        if (message.type === 'contact' || message.type === 'location') return;
        
        const msgId = message.id.toString();
        if (mensagensProcessadas.has(msgId)) return;
        
        if (mensagensProcessadas.size > 1000) {
            mensagensProcessadas.clear();
            console.log("🗑️ Cache de mensagens limpo");
        }
        
        mensagensProcessadas.add(msgId);
        
        // Log da mensagem (apenas primeiros 50 caracteres para não poluir)
        const msgPreview = message.body.length > 50 ? message.body.substring(0, 50) + '...' : message.body;
        console.log(`📩 Mensagem de ${message.from}: "${msgPreview}"`);
        
        // 🔥 NÃO MARCAR COMO LIDA (evita que a conversa suba no WhatsApp)
        // Descomente a linha abaixo se quiser marcar como lida
        // await client.sendSeen(message.from).catch(() => {});
        
        await processarMensagem(client, message.from, message.body);
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        try {
            // Só enviar erro se não for grupo
            if (!message.from?.includes('@g.us')) {
                await client.sendText(message.from, "❌ Desculpe, ocorreu um erro. Por favor, digite *MENU* para recomeçar.");
            }
        } catch (sendError) {
            console.error("❌ Erro ao enviar mensagem de erro:", sendError);
        }
    }
}
// Limpar conversas inativas a cada 5 minutos
setInterval(() => {
    const agora = Date.now();
    let removidas = 0;
    
    for (const [from, conv] of conversas.entries()) {
        if (agora - conv.ultimaAtividade > 30 * 60 * 1000) {
            conversas.delete(from);
            removidas++;
        }
    }
    
    if (removidas > 0) {
        console.log(`🗑️ ${removidas} conversas inativas removidas`);
    }
}, 5 * 60 * 1000);

// Função para testar conexão com a API
async function testarConexaoAPI() {
    console.log("\n🧪 Testando conexão com a API...");
    console.log(`🌐 API URL: ${process.env.API_URL || 'http://localhost:3000/api/bot'}`);
    
    try {
        const servicos = await api.buscarServicos();
        if (servicos && servicos.length > 0) {
            console.log(`✅ API CONECTADA!`);
            console.log(`📦 ${servicos.length} serviços encontrados:`);
            servicos.slice(0, 10).forEach(s => console.log(`   - ${s.nome} (R$ ${s.preco})`));
            if (servicos.length > 10) console.log(`   ... e mais ${servicos.length - 10} serviços`);
        } else {
            console.log(`⚠️ API respondeu mas não retornou serviços`);
        }
        
        const profissionais = await api.buscarProfissionais();
        if (profissionais && profissionais.length > 0) {
            console.log(`👤 ${profissionais.length} profissionais encontrados:`);
            profissionais.forEach(p => console.log(`   - ${p.nome}`));
        } else {
            console.log(`⚠️ Nenhum profissional encontrado`);
        }
        
        console.log("\n✅ Bot iniciado com sucesso! Aguardando mensagens...\n");
        
    } catch (error) {
        console.error(`❌ ERRO DE CONEXÃO COM API:`, error.message);
        console.log(`\n⚠️ O bot está rodando mas NÃO está conectado ao backend!`);
        console.log(`   Verifique se o backend está rodando em: ${process.env.API_URL || 'http://localhost:3000'}`);
    }
}



// Inicializar o bot
console.log("🚀 Iniciando bot do Salão Vailson...\n");

wppconnect.create({
    session: 'salao-bot',
    autoClose: false,
    headless: true,
    devtools: false,
    qrcode: true,
    logQR: true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    // 🔥 CONFIGURAÇÕES PARA EVITAR STORIES AUTOMÁTICOS
    disableSpins: true,           
    disableAutoRead: true,        
    disableAutoReceiveStatus: true, // 🔥 NÃO RECEBE STATUS/STORIES
    disableAutoDownload: true,    
    disableAutoDelete: true,      
    disableAutoUpdate: true       
}).then(async client => {
    console.log('✅ WhatsApp conectado com sucesso!');
    
    // 🔥 NÃO TENTE REMOVER LISTENERS - apenas ignore no handleMessage
    
    await testarConexaoAPI();
    
    client.onMessage(msg => handleMessage(client, msg));
    
    client.onStateChange((state) => {
        console.log(`📡 Status da conexão: ${state}`);
        if (state === 'CONFLICT') {
            console.log('⚠️ Conflito detectado, reiniciando...');
            client.restart();
        }
    });
    
}).catch(err => {
    console.error('❌ Erro ao iniciar bot:', err);
    process.exit(1);
});