// src/index.js - VERSÃO CORRIGIDA PARA HOSTINGER
require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');
const express = require('express');

// Aumentar timeout
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ============================================
// SERVIDOR EXPRESS (para manter o bot vivo)
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'Vailson\'s Hair Bot',
        versao: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server rodando na porta ${PORT}`);
});

// ============================================
// CONFIGURAÇÕES
// ============================================
const API_URL = process.env.API_URL || 'http://localhost:3000/api/bot';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ============================================
// CLIENTE DEEPSEEK
// ============================================
class DeepSeekClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.config = {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
    }

    async gerarResposta(mensagens) {
        if (!this.apiKey) return { sucesso: false };
        try {
            const response = await axios.post(
                'https://api.deepseek.com/v1/chat/completions',
                {
                    model: 'deepseek-chat',
                    messages: mensagens,
                    temperature: 0.7,
                    max_tokens: 2000
                },
                this.config
            );
            return { sucesso: true, resposta: response.data.choices[0].message.content };
        } catch (error) {
            console.error('❌ Erro na API DeepSeek:', error.message);
            return { sucesso: false };
        }
    }
}

const deepseek = new DeepSeekClient(DEEPSEEK_API_KEY);

// ============================================
// INTEGRAÇÃO COM API
// ============================================
class IntegracaoAPI {
    constructor() {
        this.api = axios.create({ baseURL: API_URL, timeout: 30000 });
    }

    async testarConexao() {
        try {
            await this.api.get('/test');
            console.log('✅ API conectada!');
            return true;
        } catch (error) {
            console.log('⚠️ API offline');
            return false;
        }
    }

    async buscarServicos() {
        try {
            const response = await this.api.get('/servicos');
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async buscarProfissionais() {
        try {
            const response = await this.api.get('/profissionais');
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async buscarAgendaProfissional(profissional_id, data = null) {
        try {
            let url = `/profissional/${profissional_id}/agenda`;
            if (data) url += `?data=${data}`;
            const response = await this.api.get(url);
            return response.data || { dias_disponiveis: [] };
        } catch (error) {
            return { dias_disponiveis: [] };
        }
    }

    async verificarDisponibilidade(profissional_id, data, horario) {
        try {
            const response = await this.api.get(`/profissional/${profissional_id}/disponibilidade`, {
                params: { data, horario }
            });
            return response.data.disponivel === true;
        } catch (error) {
            return false;
        }
    }

    async buscarClientePorTelefone(telefone) {
        try {
            let telefoneLimpo = String(telefone).replace(/\D/g, '');
            
            if (telefoneLimpo.length === 10) {
                telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
            }
            
            if (telefoneLimpo.startsWith('55')) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }
            
            if (telefoneLimpo.length > 11) {
                telefoneLimpo = telefoneLimpo.slice(-11);
            }
            
            const response = await this.api.get(`/clientes/buscar?telefone=${telefoneLimpo}`);
            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async buscarClientePorNome(nome) {
        try {
            const response = await this.api.get(`/clientes/buscar?nome=${encodeURIComponent(nome)}`);
            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async criarCliente(nome, telefone, email = null) {
        try {
            let telefoneLimpo = String(telefone).replace(/\D/g, '');
            
            if (telefoneLimpo.length === 10) {
                telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
            }
            
            const response = await this.api.post('/clientes/completo', { 
                nome: nome.trim(),
                telefone: telefoneLimpo,
                email: email
            });
            
            return response.data;
        } catch (error) {
            console.error('❌ Erro criar cliente:', error.message);
            return null;
        }
    }

    async buscarAgendamentosCliente(cliente_id) {
        try {
            const response = await this.api.get(`/clientes/${cliente_id}/agendamentos`);
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async cancelarAgendamento(agendamento_id) {
        try {
            const response = await this.api.put(`/agendamentos/${agendamento_id}/cancelar`);
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async criarAgendamento(dados) {
        try {
            const response = await this.api.post('/agendamentos', dados);
            return response.data;
        } catch (error) {
            console.error('Erro criar agendamento:', error.message);
            return null;
        }
    }

    async buscarInfoSalao() {
        try {
            const response = await this.api.get('/salao');
            return response.data;
        } catch (error) {
            return {
                nome: "Vailson's Hair & Makeup",
                endereco: "Asa Sul CLS 210 Bloco B Loja 18 - Brasília",
                telefone: "(61) 3244-4181"
            };
        }
    }

    async atualizarTelefoneCliente(cliente_id, novoTelefone) {
        try {
            let telefoneLimpo = String(novoTelefone).replace(/\D/g, '');
            
            if (telefoneLimpo.length === 10) {
                telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
            }
            
            if (telefoneLimpo.startsWith('55')) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }
            
            if (telefoneLimpo.length > 11) {
                telefoneLimpo = telefoneLimpo.slice(-11);
            }
            
            console.log('📞 Atualizando telefone do cliente:', cliente_id, 'para:', telefoneLimpo);
            
            const response = await this.api.put(`/clientes/${cliente_id}/telefone`, { telefone: telefoneLimpo });
            return response.data && response.data.success;
        } catch (error) {
            console.error('❌ Erro ao atualizar telefone:', error.message);
            return false;
        }
    }
}

const sistema = new IntegracaoAPI();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let SALAO = { nome: "Vailson's Hair & Makeup", endereco: "Asa Sul CLS 210 Bloco B Loja 18 - Brasília", telefone: "(61) 3244-4181" };
sistema.buscarInfoSalao().then(info => { if (info) SALAO = info; });

const conversas = new Map();

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function formatarDataBrasil(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    return { dataFormatada: `${dia}/${mes}/${ano}`, diaSemana: diasSemana[dataObj.getDay()] };
}

// ============================================
// FUNÇÕES DE AÇÃO (executadas pela IA)
// ============================================

async function executarAgendamento(contato, dados, profissional_nome, data_str, horario_str, servico_nome) {
    try {
        const profissionais = await sistema.buscarProfissionais();
        const profissional = profissionais.find(p => 
            p.nome.toLowerCase().includes(profissional_nome.toLowerCase())
        );
        
        if (!profissional) {
            return { sucesso: false, mensagem: `Não encontrei o profissional ${profissional_nome}.` };
        }
        
        const servicos = await sistema.buscarServicos();
        const servico = servicos.find(s => 
            s.nome.toLowerCase().includes(servico_nome.toLowerCase())
        );
        
        if (!servico) {
            return { sucesso: false, mensagem: `Não encontrei o serviço ${servico_nome}.` };
        }
        
        const disponivel = await sistema.verificarDisponibilidade(profissional.id, data_str, horario_str);
        
        if (!disponivel) {
            return { sucesso: false, mensagem: `O horário ${horario_str} do dia ${data_str} não está mais disponível.` };
        }
        
        const resultado = await sistema.criarAgendamento({
            nome_cliente: dados.nome || 'Cliente',
            telefone_cliente: contato,
            cliente_id: dados.cliente_id,
            servico_id: servico.id,
            data: data_str,
            horario: horario_str,
            profissional_id: profissional.id
        });
        
        if (resultado && resultado.id) {
            const { dataFormatada, diaSemana } = formatarDataBrasil(data_str);
            return { 
                sucesso: true, 
                mensagem: `🎉 *AGENDAMENTO CONFIRMADO!* 🎉\n\n` +
                    `✨ *Profissional:* ${profissional.nome}\n` +
                    `📅 *Data:* ${dataFormatada} (${diaSemana})\n` +
                    `⏰ *Horário:* ${horario_str}\n` +
                    `💇 *Serviço:* ${servico.nome}\n` +
                    `💰 *Valor:* R$ ${parseFloat(servico.preco).toFixed(2)}\n\n` +
                    `📍 *Local:* ${SALAO.endereco}\n` +
                    `📞 *Telefone:* ${SALAO.telefone}\n\n` +
                    `💕 Qualquer dúvida é só chamar!` 
            };
        }
        
        return { sucesso: false, mensagem: `Erro ao criar agendamento. Por favor, ligue para ${SALAO.telefone}.` };
        
    } catch (error) {
        console.error('Erro no agendamento:', error);
        return { sucesso: false, mensagem: `Erro ao processar agendamento. Tente novamente.` };
    }
}

// ============================================
// FUNÇÃO PARA LISTAR SERVIÇOS (SEM IA)
// ============================================
async function listarServicosPorCategoria(contato, pagina = 1) {
    const servicos = await sistema.buscarServicos();
    
    if (!servicos || servicos.length === 0) {
        return { mensagem: `💕 Desculpe, não consegui carregar a lista de serviços no momento.` };
    }
    
    const categorias = {
        'Cabelo': [],
        'Barbearia': [],
        'Manicure e Pedicure': [],
        'Estética Facial': [],
        'Estética Corporal': [],
        'Depilação': [],
        'Maquiagem': [],
        'Sobrancelha': [],
        'Outros': []
    };
    
    for (const s of servicos) {
        const categoria = s.categoria || 'Outros';
        if (categorias[categoria]) {
            categorias[categoria].push(s);
        } else {
            categorias['Outros'].push(s);
        }
    }
    
    const categoriasExistentes = Object.entries(categorias).filter(([_, servs]) => servs.length > 0);
    const itensPorPagina = 3;
    const totalPaginas = Math.ceil(categoriasExistentes.length / itensPorPagina);
    if (pagina > totalPaginas) pagina = totalPaginas;
    if (pagina < 1) pagina = 1;
    
    const inicio = (pagina - 1) * itensPorPagina;
    const categoriasPagina = categoriasExistentes.slice(inicio, inicio + itensPorPagina);
    
    let mensagem = `📋 *SERVIÇOS DO SALÃO* (Página ${pagina} de ${totalPaginas})\n\n`;
    
    for (const [categoria, servs] of categoriasPagina) {
        mensagem += `✨ *${categoria.toUpperCase()}*\n`;
        const servicosLista = servs.slice(0, 10).map(s => `   • ${s.nome}: R$ ${parseFloat(s.preco).toFixed(2)}`).join('\n');
        mensagem += servicosLista;
        if (servs.length > 10) {
            mensagem += `\n   ... e mais ${servs.length - 10} serviços\n`;
        }
        mensagem += `\n`;
    }
    
    if (totalPaginas > 1) {
        mensagem += `\n➡️ Digite "próximos serviços" para ver mais categorias`;
        if (pagina > 1) {
            mensagem += `\n⬅️ Digite "voltar serviços" para ver anteriores`;
        }
    }
    
    mensagem += `\n\n💬 Digite o nome do serviço que você quer para mais detalhes!`;
    
    return { mensagem, paginaAtual: pagina, totalPaginas };
}

// ============================================
// FUNÇÃO PARA BUSCAR SERVIÇO ESPECÍFICO
// ============================================
async function buscarServicoDetalhado(nomeBuscado) {
    const servicos = await sistema.buscarServicos();
    const servico = servicos.find(s => 
        s.nome.toLowerCase().includes(nomeBuscado.toLowerCase())
    );
    
    if (!servico) return null;
    
    return `💇 *${servico.nome}*\n` +
           `📝 ${servico.descricao || 'Sem descrição'}\n` +
           `💰 *Preço:* R$ ${parseFloat(servico.preco).toFixed(2)}\n` +
           `⏱️ *Duração:* ${servico.duracao || 30} minutos\n` +
           `👤 *Comissão:* ${servico.comissao_profissional || 30}%`;
}

// ============================================
// PROCESSAR MENSAGEM
// ============================================
async function processarMensagem(contato, mensagemAtual) {
    if (!mensagemAtual) return null;
    
    let conversa = conversas.get(contato);
    if (!conversa) {
        conversa = {
            dados: { 
                historico: [],
                nome: null,
                cliente_id: null,
                telefone: null,
                paginaServicos: 1,
                passo: null
            },
            ultimaAtualizacao: new Date(),
            interacoes: 0
        };
        conversas.set(contato, conversa);
    }
    
    conversa.ultimaAtualizacao = new Date();
    conversa.interacoes++;
    const dados = conversa.dados;
    const msg = mensagemAtual.toLowerCase().trim();
    
    dados.historico.push({ role: 'user', content: mensagemAtual });
    if (dados.historico.length > 10) dados.historico.shift();
    
    // ============================================
    // FLUXO MANUAL DE AGENDAMENTO
    // ============================================

    if (dados.passo === 'telefone') {
        const telefoneMatch = mensagemAtual.match(/(\d{10,11})/);
        if (telefoneMatch) {
            dados.telefone = telefoneMatch[1];
            console.log(`🔍 Buscando cliente pelo telefone: ${dados.telefone}`);
            let cliente = await sistema.buscarClientePorTelefone(dados.telefone);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                dados.passo = 'profissional';
                const profissionais = await sistema.buscarProfissionais();
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                return { mensagem: `✅ Cliente encontrado! Olá ${dados.nome.split(' ')[0]}! 👋\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.passo = 'nome';
                return { mensagem: `🔍 Nenhum cliente encontrado com o telefone ${dados.telefone}.\n\n📝 Por favor, me informe seu *nome completo* para verificar se você já está cadastrado:` };
            }
        }
        return { mensagem: `📞 Número inválido. Digite com DDD (ex: 61999999999):` };
    }

    if (dados.passo === 'nome') {
        if (mensagemAtual.length >= 5) {
            const nomeBuscado = mensagemAtual.trim();
            console.log(`🔍 Buscando cliente pelo nome: ${nomeBuscado}`);
            let cliente = await sistema.buscarClientePorNome(nomeBuscado);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                
                const telefoneCadastrado = String(cliente.telefone).replace(/\D/g, '');
                if (telefoneCadastrado !== dados.telefone) {
                    await sistema.atualizarTelefoneCliente(cliente.id, dados.telefone);
                    console.log(`📞 Telefone atualizado: ${telefoneCadastrado} -> ${dados.telefone}`);
                    return { mensagem: `✅ Encontrei você no sistema, ${dados.nome.split(' ')[0]}! Seu telefone foi atualizado para ${dados.telefone}. Vamos continuar!` };
                }
                
                dados.passo = 'profissional';
                const profissionais = await sistema.buscarProfissionais();
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                return { mensagem: `✅ Cliente encontrado! Olá ${dados.nome.split(' ')[0]}! 👋\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.nome = nomeBuscado;
                dados.passo = 'cadastro_email';
                return { mensagem: `🔍 Não encontrei nenhum cliente com o nome "${nomeBuscado}" nem com o telefone ${dados.telefone}.\n\n📝 Vamos fazer seu cadastro rapidinho!\n\n📧 Me informe seu *email* (ou digite "pular"):` };
            }
        }
        return { mensagem: `📝 Digite seu nome completo (mínimo 5 caracteres):` };
    }

    if (dados.passo === 'cadastro_email') {
        const email = mensagemAtual.trim();
        if (email.toLowerCase() === 'pular' || email.toLowerCase() === 'nao tenho') {
            dados.email = null;
        } else if (email.includes('@')) {
            dados.email = email;
        }
        dados.passo = 'cadastro_confirmar';
        return { mensagem: `📋 *Confirme seus dados para cadastro:*\n\n👤 Nome: ${dados.nome}\n📞 Telefone: ${dados.telefone}\n📧 Email: ${dados.email || 'Não informado'}\n\nDigite *CONFIRMAR* para finalizar o cadastro, ou *CANCELAR* para voltar.` };
    }

    if (dados.passo === 'cadastro_confirmar') {
        if (msg.includes('confirmar')) {
            const cliente = await sistema.criarCliente(dados.nome, dados.telefone, dados.email);
            if (cliente && cliente.id) {
                dados.cliente_id = cliente.id;
                dados.passo = 'profissional';
                const profissionais = await sistema.buscarProfissionais();
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                return { mensagem: `🎉 *Cadastro realizado com sucesso!* 🎉\n\nSeja bem-vindo(a) ao ${SALAO.nome}, ${dados.nome.split(' ')[0]}!\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                return { mensagem: `❌ Erro ao cadastrar. Por favor, tente novamente ou ligue para ${SALAO.telefone}.` };
            }
        } else if (msg.includes('cancelar')) {
            dados.passo = 'telefone';
            return { mensagem: `💕 Tudo bem, vamos recomeçar. Me informe seu telefone com DDD:` };
        } else {
            return { mensagem: `📋 Digite *CONFIRMAR* para finalizar o cadastro ou *CANCELAR* para recomeçar.` };
        }
    }
    
    if (dados.passo === 'profissional') {
        const profissionais = await sistema.buscarProfissionais();
        const profissional = profissionais.find(p => 
            p.nome.toLowerCase().includes(msg) || msg.includes(p.nome.toLowerCase())
        );
        
        if (profissional) {
            dados.profissional_id = profissional.id;
            dados.profissional_nome = profissional.nome;
            dados.passo = 'data';
            return { mensagem: `✨ Ótimo! Agora me informe a *data* (ex: 10/04 ou "hoje"/"amanhã"):` };
        }
        const lista = profissionais.map(p => `✨ ${p.nome}`).join('\n');
        return { mensagem: `Profissionais disponíveis:\n${lista}\n\nQual você prefere?` };
    }
    
    if (dados.passo === 'data') {
        let dataEncontrada = null;
        
        if (msg.includes('hoje')) {
            const hoje = new Date();
            dataEncontrada = `${hoje.getFullYear()}-${(hoje.getMonth()+1).toString().padStart(2,'0')}-${hoje.getDate().toString().padStart(2,'0')}`;
        } else if (msg.includes('amanhã')) {
            const amanha = new Date();
            amanha.setDate(amanha.getDate() + 1);
            dataEncontrada = `${amanha.getFullYear()}-${(amanha.getMonth()+1).toString().padStart(2,'0')}-${amanha.getDate().toString().padStart(2,'0')}`;
        } else {
            const match = msg.match(/(\d{1,2})[\/\-\s](\d{1,2})/);
            if (match) {
                const dia = match[1].padStart(2, '0');
                const mes = match[2].padStart(2, '0');
                const ano = new Date().getFullYear();
                dataEncontrada = `${ano}-${mes}-${dia}`;
            }
        }
        
        if (dataEncontrada) {
            dados.data = dataEncontrada;
            dados.passo = 'horario';
            return { mensagem: `📅 Perfeito! Agora me informe o *horário* (ex: 14:00 ou 14):` };
        }
        return { mensagem: `📅 Data inválida. Digite (ex: 10/04) ou "hoje"/"amanhã":` };
    }
    
    if (dados.passo === 'horario') {
        const match = msg.match(/(\d{1,2})/);
        if (match) {
            const hora = match[1].padStart(2, '0');
            const horario = `${hora}:00`;
            dados.horario = horario;
            dados.passo = 'servico';
            
            const servicos = await sistema.buscarServicos();
            const lista = servicos.slice(0, 30).map(s => `💇 ${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}`).join('\n');
            return { mensagem: `⏰ Horário ${horario} anotado!\n\n📋 *SERVIÇOS DISPONÍVEIS:*\n${lista}\n\nQual serviço você quer?` };
        }
        return { mensagem: `⏰ Horário inválido. Digite (ex: 14 ou 14:00):` };
    }
    
    if (dados.passo === 'servico') {
        const servicos = await sistema.buscarServicos();
        const servico = servicos.find(s => 
            s.nome.toLowerCase().includes(msg) || msg.includes(s.nome.toLowerCase())
        );
        
        if (servico) {
            const disponivel = await sistema.verificarDisponibilidade(
                dados.profissional_id, dados.data, dados.horario
            );
            
            if (!disponivel) {
                dados.passo = 'horario';
                return { mensagem: `💔 Horário ${dados.horario} não está mais disponível. Que tal outro horário?` };
            }
            
            const resultado = await sistema.criarAgendamento({
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                cliente_id: dados.cliente_id,
                servico_id: servico.id,
                data: dados.data,
                horario: dados.horario,
                profissional_id: dados.profissional_id
            });
            
            if (resultado && resultado.id) {
                const { dataFormatada, diaSemana } = formatarDataBrasil(dados.data);
                const mensagemConfirmacao = `🎉 *AGENDAMENTO CONFIRMADO!* 🎉\n\n` +
                    `✨ *Profissional:* ${dados.profissional_nome}\n` +
                    `📅 *Data:* ${dataFormatada} (${diaSemana})\n` +
                    `⏰ *Horário:* ${dados.horario}\n` +
                    `💇 *Serviço:* ${servico.nome}\n` +
                    `💰 *Valor:* R$ ${parseFloat(servico.preco).toFixed(2)}\n\n` +
                    `📍 *Local:* ${SALAO.endereco}\n` +
                    `📞 *Telefone:* ${SALAO.telefone}\n\n` +
                    `💕 Qualquer dúvida é só chamar!`;
                
                Object.keys(dados).forEach(key => {
                    if (!['historico', 'nome', 'cliente_id', 'telefone'].includes(key)) {
                        delete dados[key];
                    }
                });
                dados.passo = null;
                
                return { mensagem: mensagemConfirmacao };
            }
            
            return { mensagem: `❌ Erro ao criar agendamento. Ligue para ${SALAO.telefone}` };
        }
        
        const servicosLista = servicos.slice(0, 20).map(s => `💇 ${s.nome}`).join('\n');
        return { mensagem: `💭 Não encontrei "${mensagemAtual}".\n\nServiços disponíveis:\n${servicosLista}\n\nDigite o nome do serviço:` };
    }
    
    // ============================================
    // COMANDOS RÁPIDOS
    // ============================================
    
    if (msg === 'ajuda' || msg === 'help' || msg === '?') {
        return { mensagem: `📋 *Comandos disponíveis:*\n\n• "agendar" - Marcar um horário\n• "ver meus agendamentos" - Consultar seus horários\n• "cancelar" - Desmarcar um agendamento\n• "serviços" - Ver lista de serviços\n• "endereço" - Onde ficamos\n• "horário" - Horário de funcionamento\n\nComo posso ajudar? 💕` };
    }
    
    if (msg.includes('endereço') || msg.includes('localização') || msg.includes('onde fica')) {
        return { mensagem: `📍 *${SALAO.nome}*\n\n${SALAO.endereco}\n\n📞 ${SALAO.telefone}\n\nTe esperamos por lá! 🥰` };
    }
    
    if (msg.includes('horário') || msg.includes('funcionamento') || msg.includes('abre')) {
        return { mensagem: `🕐 *Horário de funcionamento:*\n\nSegunda a Sexta: 9h às 19h\nSábado: 9h às 17h\nDomingo: Fechado` };
    }
    
    // LISTAR SERVIÇOS
    if (msg.includes('próximos serviços') || msg.includes('proximos servicos') || msg === 'proximos') {
        const paginaAtual = dados.paginaServicos || 1;
        const resultado = await listarServicosPorCategoria(contato, paginaAtual + 1);
        dados.paginaServicos = resultado.paginaAtual;
        return { mensagem: resultado.mensagem };
    }
    
    if (msg.includes('voltar serviços') || msg.includes('voltar servicos') || msg === 'voltar') {
        const paginaAtual = dados.paginaServicos || 1;
        const resultado = await listarServicosPorCategoria(contato, paginaAtual - 1);
        dados.paginaServicos = resultado.paginaAtual;
        return { mensagem: resultado.mensagem };
    }
    
    if (msg === 'serviços' || msg === 'servicos' || msg.includes('lista de serviços') || msg.includes('quais serviços')) {
        const resultado = await listarServicosPorCategoria(contato, 1);
        dados.paginaServicos = 1;
        return { mensagem: resultado.mensagem };
    }
    
    const palavrasComando = ['agendar', 'marcar', 'cancelar', 'ver', 'ajuda', 'endereço', 'horário', 'serviços', 'servicos'];
    const isComando = palavrasComando.some(c => msg.includes(c));
    
    if (!isComando && mensagemAtual.length > 3 && !dados.passo) {
        const servicoDetalhado = await buscarServicoDetalhado(mensagemAtual);
        if (servicoDetalhado) {
            return { mensagem: `${servicoDetalhado}\n\n💕 Gostaria de agendar esse serviço? Digite "agendar"` };
        }
    }
    
    // VER AGENDAMENTOS
    if (msg.includes('ver meus agendamentos') || msg.includes('meus agendamentos')) {
        if (!dados.cliente_id && !dados.telefone) {
            return { mensagem: `💕 Para ver seus agendamentos, me informe seu telefone:` };
        }
        
        let cliente = null;
        if (dados.cliente_id) {
            cliente = { id: dados.cliente_id };
        } else if (dados.telefone) {
            cliente = await sistema.buscarClientePorTelefone(dados.telefone);
        }
        
        if (!cliente) {
            return { mensagem: `💕 Não encontrei seus agendamentos. Digite "agendar" para marcar um horário.` };
        }
        
        const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
        const agora = new Date();
        const futuros = agendamentos.filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado');
        
        if (futuros.length === 0) {
            return { mensagem: `✨ Você não tem agendamentos futuros. Quer marcar um? Digite "agendar" 🥰` };
        }
        
        let mensagem = `📋 *SEUS AGENDAMENTOS*\n\n`;
        for (const ag of futuros) {
            const dataHora = new Date(ag.data_hora);
            mensagem += `📅 ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
            mensagem += `👤 ${ag.profissional_nome}\n💇 ${ag.servico_nome}\n➖➖➖➖➖\n`;
        }
        return { mensagem };
    }
    
    // CANCELAR AGENDAMENTO
    if (msg.includes('cancelar')) {
        if (!dados.cliente_id && !dados.telefone) {
            dados.aguardandoNomeCancelamento = true;
            return { mensagem: `💕 Para cancelar, me informe seu nome completo primeiro.` };
        }
        
        let cliente = null;
        if (dados.cliente_id) {
            cliente = { id: dados.cliente_id };
        } else if (dados.telefone) {
            cliente = await sistema.buscarClientePorTelefone(dados.telefone);
        }
        
        if (!cliente) {
            return { mensagem: `💕 Não encontrei seus agendamentos. Poderia me informar seu nome completo?` };
        }
        
        const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
        const agora = new Date();
        const futuros = agendamentos.filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado');
        
        if (futuros.length === 0) {
            return { mensagem: `✨ Você não tem agendamentos futuros para cancelar.` };
        }
        
        if (futuros.length === 1) {
            await sistema.cancelarAgendamento(futuros[0].id);
            return { mensagem: `✅ Agendamento cancelado com sucesso! Se quiser remarcar, digite "agendar" 💖` };
        }
        
        const lista = futuros.map((ag, i) => {
            const data = new Date(ag.data_hora).toLocaleDateString('pt-BR');
            const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `${i+1} - ${data} às ${hora} - ${ag.servico_nome}`;
        }).join('\n');
        
        dados.aguardandoCancelamento = true;
        dados.agendamentosParaCancelar = futuros;
        return { mensagem: `📋 Seus agendamentos:\n\n${lista}\n\nQual deseja cancelar? (Digite o número)` };
    }
    
    if (dados.aguardandoCancelamento && dados.agendamentosParaCancelar) {
        const num = parseInt(msg);
        if (!isNaN(num) && num >= 1 && num <= dados.agendamentosParaCancelar.length) {
            const ag = dados.agendamentosParaCancelar[num - 1];
            await sistema.cancelarAgendamento(ag.id);
            delete dados.aguardandoCancelamento;
            delete dados.agendamentosParaCancelar;
            return { mensagem: `✅ Agendamento cancelado com sucesso!` };
        }
        return { mensagem: `💕 Digite o número do agendamento que deseja cancelar.` };
    }
    
    if (dados.aguardandoNomeCancelamento) {
        if (mensagemAtual.length >= 3) {
            dados.nome = mensagemAtual.trim();
            delete dados.aguardandoNomeCancelamento;
            const cliente = await sistema.buscarClientePorNome(dados.nome);
            if (cliente) dados.cliente_id = cliente.id;
            return { mensagem: `✅ Vou verificar seus agendamentos... Agora diga "cancelar" novamente.` };
        }
        return { mensagem: `💕 Me informe seu nome completo.` };
    }
    
    // INICIAR AGENDAMENTO
    if (msg.includes('agendar') || msg.includes('marcar') || msg.includes('quero um horário')) {
        dados.passo = 'telefone';
        return { mensagem: `📞 Vamos agendar! Me informe seu telefone com DDD (ex: 61999999999):` };
    }
    
    // IA PARA RESPOSTAS INTELIGENTES
    const [profissionais, servicos] = await Promise.all([
        sistema.buscarProfissionais(),
        sistema.buscarServicos()
    ]);
    
    const servicosLista = servicos.slice(0, 30).map(s => `- ${s.nome}: R$ ${parseFloat(s.preco).toFixed(2)}`).join('\n');
    const profissionaisLista = profissionais.map(p => `- ${p.nome} (${p.especialidade || 'Profissional'})`).join('\n');
    
    const systemPrompt = `Você é a Amanda, atendente virtual do salão "${SALAO.nome}".

SERVIÇOS DISPONÍVEIS:
${servicosLista || 'Nenhum serviço cadastrado'}

PROFISSIONAIS:
${profissionaisLista || 'Nenhum profissional cadastrado'}

Cliente: ${dados.nome || 'visitante'}

REGRAS:
1. Seja simpática, acolhedora e profissional
2. Se perguntarem sobre agendamento, diga: "Claro! Digite AGENDAR para começarmos"
3. Se perguntarem sobre preços, consulte a lista de serviços acima
4. Se perguntarem sobre profissionais, mostre a lista
5. NUNCA invente informações que não estão nas listas
6. Responda de forma natural e humana

Pergunta do cliente: ${mensagemAtual}`;

    try {
        const respostaIA = await deepseek.gerarResposta([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: mensagemAtual }
        ]);
        
        if (respostaIA.sucesso && respostaIA.resposta) {
            dados.historico.push({ role: 'assistant', content: respostaIA.resposta });
            return { mensagem: respostaIA.resposta };
        }
        
        return { mensagem: `✨ Posso ajudar com:\n• "agendar" - marcar horário\n• "serviços" - ver lista\n• "endereço" - onde ficamos\n\nComo posso te ajudar? 💕` };
        
    } catch (error) {
        console.error('❌ Erro na IA:', error.message);
        return { mensagem: `✨ Digite "agendar" para marcar um horário, ou "serviços" para ver a lista!` };
    }
}

// ============================================
// HANDLE MESSAGE
// ============================================
async function handleMessage(client, message) {
    try {
        if (message.from === 'status@broadcast') {
            console.log('📸 Ignorando story/status');
            return;
        }
        
        if (message.fromMe) return;
        
        if (!message.body || message.body.trim() === '') return;
        
        const contato = message.from;
        const texto = message.body;
        
        const telefoneLimpo = contato.replace(/@c\.us/g, '').replace(/@lid/g, '').replace(/\D/g, '');
        
        let conversa = conversas.get(contato);
        if (!conversa || !conversa.dados.cliente_id) {
            const cliente = await sistema.buscarClientePorTelefone(telefoneLimpo);
            if (cliente && conversa) {
                conversa.dados.cliente_id = cliente.id;
                conversa.dados.nome = cliente.nome;
            }
        }
        
        console.log(`\n📨 [${contato}] ${texto}`);
        
        await client.startTyping(contato).catch(() => {});
        
        const resultado = await processarMensagem(contato, texto);
        
        if (resultado && resultado.mensagem) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await client.sendText(contato, resultado.mensagem);
            console.log(`✅ Resposta enviada para ${contato}`);
        }
        
        await client.stopTyping(contato).catch(() => {});
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

// ============================================
// LIMPEZA DE CONVERSAS
// ============================================
setInterval(() => {
    const agora = new Date();
    for (const [contato, conversa] of conversas.entries()) {
        if (agora - conversa.ultimaAtualizacao > 30 * 60 * 1000) {
            conversas.delete(contato);
        }
    }
}, 10 * 60 * 1000);

// ============================================
// INICIALIZAÇÃO DO BOT (VERSÃO RAILWAY)
// ============================================
async function iniciarBot() {
    console.log('🚀 Iniciando Bot Inteligente...');
    console.log(`🤖 DeepSeek: ${DEEPSEEK_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`💇 Salão: ${SALAO.nome}`);

    await sistema.testarConexao().then(ok => {
        if (ok) console.log('✅ API do sistema conectada!');
        else console.log('⚠️ API offline - algumas funções podem não funcionar');
    });

    // 🔥 CONFIGURAÇÃO OTIMIZADA PARA RAILWAY
    const wppconnectOptions = {
        session: 'salao-bot',
        autoClose: false,
        headless: true,
        qrTimeout: 0,
        devtools: false,
        disableSpins: true,
        disableWelcome: true,
        updatesLog: false,
        autoRefresh: true,
        disableStory: true,
        disableAutoRead: true,
        markOnline: false,
        browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI'
        ]
    };

    wppconnect.create(wppconnectOptions)
        .then((client) => {
            console.log('✅ Bot conectado com sucesso!');
            console.log('💬 Bot pronto para conversar!');
            
            client.onMessage(async (message) => {
                await handleMessage(client, message);
            });
            
            client.onStateChange((state) => {
                console.log('📱 Estado da conexão:', state);
                if (state === 'CONFLICT') client.useHere();
                if (state === 'UNPAIRED' || state === 'UNLAUNCHED') {
                    console.log('⚠️ Sessão desconectada, reiniciando em 5 segundos...');
                    setTimeout(() => iniciarBot(), 5000);
                }
            });
            
            if (client.onLoadingScreen) {
                client.onLoadingScreen((percent, message) => {
                    console.log(`🔄 Carregando WhatsApp: ${percent}% - ${message}`);
                });
            }
            
            if (client.onReady) {
                client.onReady(() => {
                    console.log('✅ Cliente do WhatsApp pronto e conectado!');
                });
            }
            
            console.log('📱 Aguardando QR Code... Escaneie com seu WhatsApp quando aparecer');
            console.log('🔗 Acesse: https://railway.app para ver o QR Code nos logs');
        })
        .catch((error) => {
            console.error('❌ Erro ao iniciar bot:', error);
            console.log('🔄 Tentando novamente em 5 segundos...');
            setTimeout(() => iniciarBot(), 5000);
        });
}

// Iniciar o bot
iniciarBot();

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error);
    setTimeout(() => iniciarBot(), 5000);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Promise rejeitada:', error);
});