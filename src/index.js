// src/index.js - VERSÃO COMPLETA E CORRIGIDA
require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');

// Aumentar timeout
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
                    temperature: 0.9,
                    max_tokens: 800
                },
                this.config
            );
            return { sucesso: true, resposta: response.data.choices[0].message.content };
        } catch (error) {
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

    async buscarCliente(telefone, nome = null) {
        try {
            if (telefone) {
                let telefoneLimpo = String(telefone);
                telefoneLimpo = telefoneLimpo.replace(/@c\.us/g, '').replace(/@lid/g, '');
                telefoneLimpo = telefoneLimpo.replace(/\D/g, '');
                
                if (telefoneLimpo.length === 15 && telefoneLimpo.startsWith('27')) {
                    let ddd = telefoneLimpo.substring(0, 2);
                    let numero = telefoneLimpo.substring(2, 13);
                    if (numero.length > 11) numero = numero.substring(0, 11);
                    telefoneLimpo = ddd + numero;
                }
                
                if (telefoneLimpo.length === 14 && telefoneLimpo.startsWith('53')) {
                    let numero = telefoneLimpo.substring(4);
                    while (numero.startsWith('0')) numero = numero.substring(1);
                    if (numero.length === 8) numero = '9' + numero;
                    telefoneLimpo = '61' + numero;
                }
                
                if (telefoneLimpo.startsWith('55')) telefoneLimpo = telefoneLimpo.substring(2);
                if (telefoneLimpo.length > 11) telefoneLimpo = telefoneLimpo.slice(-11);
                if (telefoneLimpo.length === 10) telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
                while (telefoneLimpo.startsWith('0')) telefoneLimpo = telefoneLimpo.substring(1);
                
                if (telefoneLimpo && telefoneLimpo.length >= 10) {
                    const response = await this.api.get(`/clientes/buscar?telefone=${telefoneLimpo}`);
                    if (response.data && response.data.length > 0) return response.data[0];
                    
                    const ultimos10 = telefoneLimpo.slice(-10);
                    const response2 = await this.api.get(`/clientes/buscar?telefone=${ultimos10}`);
                    if (response2.data && response2.data.length > 0) return response2.data[0];
                }
            }
            
            if (nome && nome.length > 3 && !nome.toLowerCase().includes('agendar') && !nome.toLowerCase().includes('marcar')) {
                const response = await this.api.get(`/clientes/buscar?nome=${encodeURIComponent(nome)}`);
                if (response.data && response.data.length > 0) {
                    const clienteExato = response.data.find(c => c.nome.toLowerCase() === nome.toLowerCase());
                    if (clienteExato) return clienteExato;
                    return response.data[0];
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro buscar cliente:', error.message);
            return null;
        }
    }

    async buscarClientePorTelefone(telefone) {
        try {
            let telefoneLimpo = String(telefone).replace(/\D/g, '');
            
            if (telefoneLimpo.length === 10) {
                telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
            }
            
            console.log('🔍 Buscando cliente por telefone informado:', telefoneLimpo);
            
            const response = await this.api.get(`/clientes/buscar?telefone=${telefoneLimpo}`);
            if (response.data && response.data.length > 0) {
                console.log('✅ Cliente encontrado:', response.data[0].nome);
                return response.data[0];
            }
            console.log('❌ Nenhum cliente encontrado para o telefone:', telefoneLimpo);
            return null;
        } catch (error) {
            console.error('❌ Erro buscar cliente por telefone:', error.message);
            return null;
        }
    }

    async buscarClientePorNome(nome) {
        try {
            console.log('🔍 Buscando cliente por nome informado:', nome);
            const response = await this.api.get(`/clientes/buscar?nome=${encodeURIComponent(nome)}`);
            if (response.data && response.data.length > 0) {
                const clienteExato = response.data.find(c => 
                    c.nome.toLowerCase() === nome.toLowerCase()
                );
                if (clienteExato) {
                    console.log('✅ Cliente encontrado pelo nome exato:', clienteExato.nome);
                    return clienteExato;
                }
                console.log('✅ Cliente encontrado (primeiro da lista):', response.data[0].nome);
                return response.data[0];
            }
            console.log('❌ Nenhum cliente encontrado para o nome:', nome);
            return null;
        } catch (error) {
            console.error('❌ Erro buscar cliente por nome:', error.message);
            return null;
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
            
            if (telefoneLimpo.length === 13) {
                telefoneLimpo = telefoneLimpo.slice(-11);
            }
            
            console.log('📞 Atualizando telefone do cliente:', cliente_id, 'para:', telefoneLimpo);
            
            const response = await this.api.put(`/clientes/${cliente_id}/telefone`, { telefone: telefoneLimpo });
            return response.data && response.data.success;
        } catch (error) {
            console.error('❌ Erro atualizar telefone:', error.message);
            return false;
        }
    }

    async criarCliente(nome, telefone, email = null) {
        try {
            let telefoneLimpo = String(telefone).replace(/\D/g, '');
            
            if (telefoneLimpo.length === 10) {
                telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
            }
            
            console.log('📞 Criando cliente com telefone:', telefoneLimpo);
            
            const response = await this.api.post('/clientes', { 
                nome: nome.trim(),
                telefone: telefoneLimpo,
                email: email
            });
            
            console.log('✅ Resposta:', response.data);
            
            if (response.data && response.data.id) {
                return response.data;
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ Erro criar cliente:', error.response?.data || error.message);
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
            console.error('Erro criar agendamento:', error.response?.data || error.message);
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

function buscarServicoPorNome(servicos, nomeBuscado) {
    const nomeLower = nomeBuscado.toLowerCase().trim();
    
    let encontrado = servicos.find(s => s.nome.toLowerCase() === nomeLower);
    if (encontrado) return encontrado;
    
    encontrado = servicos.find(s => s.nome.toLowerCase().includes(nomeLower));
    if (encontrado) return encontrado;
    
    const palavras = nomeLower.split(' ');
    for (const servico of servicos) {
        const servicoLower = servico.nome.toLowerCase();
        if (palavras.some(palavra => servicoLower.includes(palavra))) {
            return servico;
        }
    }
    return null;
}

function gerarMensagemBoasVindas(nome) {
    if (!nome || nome === 'Corte' || nome.length < 2) nome = 'você';
    const mensagens = [
        `✨ Oi ${nome}! Que bom te ver por aqui! 💕`,
        `🥰 Olá ${nome}! Como posso deixar seu dia mais lindo hoje?`,
        `💖 ${nome}! Seja bem-vindo(a) ao ${SALAO.nome}!`,
        `🌸 Oii ${nome}! Preparada(o) para se sentir ainda mais especial?`
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
}

function gerarMensagemDespedida(nome) {
    if (!nome || nome === 'Corte' || nome.length < 2) nome = 'você';
    const mensagens = [
        `💕 Te aguardo com muito carinho, ${nome}!`,
        `✨ Até mais, ${nome}! Qualquer coisa é só chamar!`,
        `🌸 Foi um prazer falar com você, ${nome}! Tenha um lindo dia!`,
        `🥰 Qualquer dúvida estou aqui, ${nome}!`
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
}

async function mostrarMaisServicos(dados, pagina = 1) {
    const servicos = dados.servicos;
    const itensPorPagina = 20;
    const totalPaginas = Math.ceil(servicos.length / itensPorPagina);
    
    if (pagina > totalPaginas) pagina = totalPaginas;
    if (pagina < 1) pagina = 1;
    
    const inicio = (pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const servicosPagina = servicos.slice(inicio, fim);
    
    const lista = servicosPagina.map(s => `💇 *${s.nome}* - R$ ${parseFloat(s.preco).toFixed(2)}`).join('\n');
    
    let mensagem = `📋 *NOSSOS SERVIÇOS* (Página ${pagina} de ${totalPaginas})\n\n${lista}`;
    
    if (pagina < totalPaginas) {
        mensagem += `\n\n➡️ Digite "próximos" para ver mais serviços`;
    }
    if (pagina > 1) {
        mensagem += `\n⬅️ Digite "voltar" para ver serviços anteriores`;
    }
    
    mensagem += `\n\n💬 Qual serviço você gostaria de fazer hoje?`;
    return { mensagem, paginaAtual: pagina };
}

async function verAgendamentos(contato, dados) {
    console.log('🔍 Verificando agendamentos...');
    console.log('📊 Dados da conversa:', { cliente_id: dados.cliente_id, nome: dados.nome });
    
    let cliente = null;
    
    if (dados.cliente_id) {
        cliente = { id: dados.cliente_id, nome: dados.nome };
    }
    
    if (!cliente && dados.nome && dados.nome !== 'Corte' && dados.nome.length > 3) {
        cliente = await sistema.buscarClientePorNome(dados.nome);
        if (cliente) {
            dados.cliente_id = cliente.id;
            dados.nome = cliente.nome;
        }
    }
    
    if (!cliente) {
        return { mensagem: `💕 Para ver seus agendamentos, poderia me informar seu nome completo?`, precisaNome: true };
    }
    
    const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
    const agora = new Date();
    
    const agendamentosFuturos = agendamentos.filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado' && a.status !== 'cancelado_cliente');
    const agendamentosPassados = agendamentos.filter(a => new Date(a.data_hora) <= agora || a.status === 'cancelado' || a.status === 'cancelado_cliente');
    
    if (agendamentosFuturos.length === 0 && agendamentosPassados.length === 0) {
        return { mensagem: `✨ ${cliente.nome.split(' ')[0]}, você ainda não tem nenhum agendamento! Que tal marcarmos algo especial? Digite "agendar" 🥰` };
    }
    
    let mensagem = `📋 *SEUS AGENDAMENTOS*\n\n`;
    
    if (agendamentosFuturos.length > 0) {
        mensagem += `✨ *PRÓXIMOS COMPROMISSOS:*\n`;
        for (const ag of agendamentosFuturos) {
            const dataHora = new Date(ag.data_hora);
            const dataStr = dataHora.toLocaleDateString('pt-BR');
            const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            mensagem += `\n📅 *${dataStr}* às *${horaStr}*\n`;
            mensagem += `👤 ${ag.profissional_nome || 'Profissional'}\n`;
            mensagem += `💇 ${ag.servico_nome || 'Serviço'}\n`;
            mensagem += `💰 R$ ${ag.preco || '--'}\n`;
            mensagem += `➖➖➖➖➖➖➖➖\n`;
        }
    }
    
    if (agendamentosPassados.length > 0) {
        mensagem += `\n📜 *HISTÓRICO:*\n`;
        const ultimos5 = agendamentosPassados.slice(-5);
        for (const ag of ultimos5) {
            const dataHora = new Date(ag.data_hora);
            const dataStr = dataHora.toLocaleDateString('pt-BR');
            const status = (ag.status === 'cancelado' || ag.status === 'cancelado_cliente') ? '❌ Cancelado' : '✅ Realizado';
            mensagem += `\n📅 ${dataStr} - ${ag.servico_nome || 'Serviço'} (${status})\n`;
        }
    }
    
    mensagem += `\n💖 Quer marcar um novo horário? Digite "agendar"!`;
    return { mensagem, cliente };
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
async function processarMensagem(contato, mensagemAtual) {
    if (!mensagemAtual) return null;
    
    let conversa = conversas.get(contato);
    if (!conversa) {
        conversa = {
            dados: {},
            ultimaAtualizacao: new Date(),
            ultimoAgendamento: null,
            interacoes: 0
        };
        conversas.set(contato, conversa);
    }
    
    conversa.ultimaAtualizacao = new Date();
    conversa.interacoes++;
    const dados = conversa.dados;
    const msg = mensagemAtual.toLowerCase().trim();

    // ============================================
    // CUMPRIMENTOS
    // ============================================
    const cumprimentos = ['oi', 'olá', 'opa', 'e ai', 'hello', 'hi', 'oie', 'bom dia', 'boa tarde', 'boa noite'];
    if (cumprimentos.some(c => msg === c || msg.startsWith(c))) {
        if (dados.nome && dados.nome !== 'Corte') {
            return { mensagem: `${gerarMensagemBoasVindas(dados.nome.split(' ')[0])} Como posso te ajudar hoje? 😊` };
        }
        return { mensagem: `✨ Oi! Seja bem-vindo(a) ao ${SALAO.nome}! 💕\n\nPosso ajudar você a agendar um horário ou tirar alguma dúvida?` };
    }

    // ============================================
    // VER AGENDAMENTOS
    // ============================================
    if (msg.includes('ver meus agendamentos') || msg.includes('meus agendamentos') || msg.includes('consultar agendamento')) {
        const resultado = await verAgendamentos(contato, dados);
        if (resultado.precisaNome) {
            dados.aguardandoNomeParaAgendamentos = true;
            return { mensagem: resultado.mensagem };
        }
        return { mensagem: resultado.mensagem };
    }

    // ============================================
    // AGUARDANDO NOME PARA VER AGENDAMENTOS
    // ============================================
    if (dados.aguardandoNomeParaAgendamentos) {
        if (mensagemAtual.length >= 3) {
            const nomeBuscado = mensagemAtual.trim();
            dados.aguardandoNomeParaAgendamentos = false;
            
            const cliente = await sistema.buscarClientePorNome(nomeBuscado);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                
                const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
                const agora = new Date();
                
                const agendamentosFuturos = agendamentos.filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado');
                
                if (agendamentosFuturos.length === 0) {
                    return { mensagem: `✨ ${cliente.nome.split(' ')[0]}, você não tem agendamentos futuros. Quer marcar um? Digite "agendar" 🥰` };
                }
                
                let mensagem = `📋 *SEUS AGENDAMENTOS*\n\n`;
                for (const ag of agendamentosFuturos) {
                    const dataHora = new Date(ag.data_hora);
                    const dataStr = dataHora.toLocaleDateString('pt-BR');
                    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    mensagem += `\n📅 *${dataStr}* às *${horaStr}*\n`;
                    mensagem += `👤 ${ag.profissional_nome || 'Profissional'}\n`;
                    mensagem += `💇 ${ag.servico_nome || 'Serviço'}\n`;
                    mensagem += `💰 R$ ${ag.preco || '--'}\n`;
                    mensagem += `➖➖➖➖➖➖➖➖\n`;
                }
                mensagem += `\n💖 Quer marcar um novo horário? Digite "agendar"!`;
                return { mensagem };
            } else {
                return { mensagem: `💕 Não encontrei nenhum cliente com o nome "${nomeBuscado}". Você já fez algum agendamento conosco?` };
            }
        }
        return { mensagem: `💕 Me informe seu nome completo para buscar seus agendamentos.` };
    }

    // ============================================
    // CANCELAMENTO
    // ============================================
    if (msg.includes('cancelar') || msg.includes('desmarcar')) {
        dados.cancelando = true;
        return { mensagem: `💕 Claro! Para cancelar, poderia me informar seu nome completo primeiro?` };
    }
    
    if (dados.cancelando && !dados.nome) {
        if (mensagemAtual.length >= 3) {
            dados.nome = mensagemAtual.trim();
            dados.cancelando = false;
            
            const cliente = await sistema.buscarClientePorNome(dados.nome);
            if (!cliente) {
                return { mensagem: `💔 Não encontrei nenhum agendamento no nome "${dados.nome}". Você já agendou algo conosco?` };
            }
            
            dados.cliente_id = cliente.id;
            dados.nome = cliente.nome;
            
            const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
            const futuros = agendamentos.filter(a => new Date(a.data_hora) > new Date() && a.status !== 'cancelado');
            
            if (futuros.length === 0) {
                return { mensagem: `✨ ${dados.nome.split(' ')[0]}, você não tem agendamentos futuros. Quer marcar um? Digite "agendar" 🥰` };
            }
            
            const lista = futuros.map((ag, i) => {
                const data = new Date(ag.data_hora).toLocaleDateString('pt-BR');
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `${i+1} - 📅 ${data} às ${hora} - ${ag.servico_nome}`;
            }).join('\n');
            
            dados.agendamentosParaCancelar = futuros;
            dados.aguardandoCancelamento = true;
            
            return { mensagem: `📋 Encontrei esses agendamentos:\n\n${lista}\n\nQual você quer cancelar? (Digite o número)` };
        }
        return { mensagem: `💕 Me informe seu nome completo para buscar seus agendamentos.` };
    }
    
    if (dados.aguardandoCancelamento && dados.agendamentosParaCancelar) {
        const num = parseInt(msg);
        if (num >= 1 && num <= dados.agendamentosParaCancelar.length) {
            const ag = dados.agendamentosParaCancelar[num - 1];
            await sistema.cancelarAgendamento(ag.id);
            dados.aguardandoCancelamento = false;
            dados.agendamentosParaCancelar = null;
            return { mensagem: `✅ Agendamento cancelado com sucesso! Se quiser remarcar, digite "agendar" 💖` };
        }
        return { mensagem: `💕 Digite o número do agendamento que deseja cancelar.` };
    }

    // ============================================
    // AJUDA E INFORMAÇÕES
    // ============================================
    if (msg.includes('ajuda') || msg === '?' || msg === 'ajuda?') {
        return { mensagem: `✨ *Posso te ajudar com:*\n\n📅 *Agendar* - Marcar um horário\n📋 *Ver meus agendamentos* - Consultar seus horários\n❌ *Cancelar* - Desmarcar um agendamento\n💇 *Serviços* - Ver lista de serviços\n📍 *Endereço* - Como chegar até nós\n📞 *Contato* - Telefone do salão\n\nComo posso te ajudar hoje? 😊` };
    }
    
    if (msg.includes('endereço') || msg.includes('localização') || msg.includes('onde fica')) {
        return { mensagem: `📍 *${SALAO.nome}*\n\n${SALAO.endereco}\n\n📞 Telefone: ${SALAO.telefone}\n\nTe esperamos por lá! 🥰` };
    }
    
    if (msg.includes('telefone') || msg.includes('contato') || msg.includes('número')) {
        return { mensagem: `📞 Nosso telefone para contato é ${SALAO.telefone}\n\nEstamos à disposição! 💕` };
    }
    
    if (msg.includes('horário') || msg.includes('funcionamento') || msg.includes('abre')) {
        return { mensagem: `🕐 *Horário de funcionamento:*\n\nSegunda a Sexta: 9h às 19h\nSábado: 9h às 17h\nDomingo: Fechado\n\nQual dia seria melhor para você? 😊` };
    }

    // ============================================
    // INICIAR AGENDAMENTO
    // ============================================
    if (msg.includes('agendar') || msg.includes('marcar') || msg.includes('quero um horário') || 
        msg.includes('fazer um agendamento') || msg.includes('realizar um agendamento') ||
        msg.includes('quero agendar') || msg.includes('gostaria de agendar')) {
        
        dados.agendando = true;
        dados.passo = 'inicio';
        
        dados.aguardandoTelefone = true;
        return { mensagem: `📞 Vamos verificar se você já tem cadastro!\n\nPor favor, me informe seu *número de telefone com DDD* (ex: 61999999999):` };
    }
    
    // ============================================
    // AGUARDANDO TELEFONE
    // ============================================
    if (dados.aguardandoTelefone) {
        let telefoneDigitado = mensagemAtual.trim();
        let telefoneLimpo = telefoneDigitado.replace(/\D/g, '');
        
        if (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11) {
            console.log('🔍 Buscando cliente pelo telefone:', telefoneLimpo);
            
            const cliente = await sistema.buscarClientePorTelefone(telefoneLimpo);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                dados.aguardandoTelefone = false;
                dados.passo = 'profissional';
                
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                
                return { mensagem: `✅ Cliente encontrado! Olá ${dados.nome.split(' ')[0]}! 👋\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.telefoneInformado = telefoneLimpo;
                dados.aguardandoTelefone = false;
                dados.aguardandoNomeVerificacao = true;
                return { mensagem: `🔍 Não encontrei nenhum cliente com o telefone ${telefoneLimpo}.\n\n📝 Qual é o seu *nome completo* para eu verificar?` };
            }
        } else {
            return { mensagem: `📞 Número inválido. Digite um telefone válido com DDD (ex: 61999999999):` };
        }
    }
    
    // ============================================
    // AGUARDANDO NOME PARA VERIFICAÇÃO
    // ============================================
    if (dados.aguardandoNomeVerificacao) {
        const nomeDigitado = mensagemAtual.trim();
        
        if (nomeDigitado.length >= 3 && !nomeDigitado.toLowerCase().includes('errado')) {
            console.log('🔍 Buscando cliente pelo nome:', nomeDigitado);
            
            const cliente = await sistema.buscarClientePorNome(nomeDigitado);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                
                const telefoneCadastrado = String(cliente.telefone).replace(/\D/g, '');
                const telefoneInformado = dados.telefoneInformado || '';
                
                if (telefoneInformado && telefoneCadastrado !== telefoneInformado) {
                    dados.aguardandoNomeVerificacao = false;
                    dados.aguardandoConfirmacaoTelefone = true;
                    return { mensagem: `✅ Encontrei você no sistema, ${cliente.nome.split(' ')[0]}! 👋\n\n⚠️ Seu telefone cadastrado é ${cliente.telefone}. Deseja atualizar para ${dados.telefoneInformado}? Digite "sim" ou "não".` };
                }
                
                dados.aguardandoNomeVerificacao = false;
                dados.passo = 'profissional';
                
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                
                return { mensagem: `✅ Cliente encontrado! Olá ${dados.nome.split(' ')[0]}! 👋\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.nome = nomeDigitado;
                dados.aguardandoNomeVerificacao = false;
                dados.cadastrando = true;
                dados.passoCadastro = 'email';
                return { mensagem: `🔍 Não encontrei nenhum cliente com o nome "${nomeDigitado}".\n\nVamos fazer um cadastro rápido!\n\n📧 Me informe seu *email* para receber suas notas fiscais:\n\n(Digite "não tenho" se não tiver email)` };
            }
        } else if (nomeDigitado.toLowerCase().includes('errado')) {
            dados.aguardandoTelefone = true;
            dados.aguardandoNomeVerificacao = false;
            return { mensagem: `💕 Desculpe! Vamos tentar de novo.\n\n📞 Me informe seu número de telefone com DDD (ex: 61999999999):` };
        } else {
            return { mensagem: `📝 Digite seu *nome completo* para eu verificar (mínimo 3 caracteres):` };
        }
    }
    
    // ============================================
    // AGUARDANDO CONFIRMAÇÃO PARA ATUALIZAR TELEFONE
    // ============================================
    if (dados.aguardandoConfirmacaoTelefone) {
        if (msg.includes('sim')) {
            console.log('📞 Atualizando telefone do cliente:', dados.cliente_id, 'para:', dados.telefoneInformado);
            
            const atualizado = await sistema.atualizarTelefoneCliente(dados.cliente_id, dados.telefoneInformado);
            
            if (atualizado) {
                dados.aguardandoConfirmacaoTelefone = false;
                dados.aguardandoNomeVerificacao = false;
                dados.passo = 'profissional';
                
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                
                return { mensagem: `✅ Telefone atualizado com sucesso! Agora está corrigido: ${dados.telefoneInformado}\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.aguardandoConfirmacaoTelefone = false;
                dados.passo = 'profissional';
                
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                
                return { mensagem: `❌ Não consegui atualizar, mas vamos continuar.\n\n${lista}\n\nQual profissional você prefere?` };
            }
        } else if (msg.includes('não') || msg.includes('nao')) {
            dados.aguardandoConfirmacaoTelefone = false;
            dados.passo = 'profissional';
            
            const profissionais = await sistema.buscarProfissionais();
            dados.profissionais = profissionais;
            const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
            
            return { mensagem: `✅ Tudo bem, vamos manter seu telefone atual.\n\n${lista}\n\nQual profissional você prefere?` };
        } else {
            return { mensagem: `💕 Por favor, digite "sim" para atualizar seu telefone ou "não" para manter o atual.` };
        }
    }
    
    // ============================================
    // CADASTRO DE EMAIL
    // ============================================
    if (dados.cadastrando) {
        if (dados.passoCadastro === 'email') {
            const email = mensagemAtual.trim();
            
            if (email.toLowerCase() === 'não tenho' || email.toLowerCase() === 'nao tenho' || email.toLowerCase() === 'não' || email.toLowerCase() === 'nao') {
                dados.email = null;
                dados.passoCadastro = 'telefone_cadastro';
                return { mensagem: `✅ Tudo bem, vamos continuar sem email.\n\n📞 Agora, me informe seu *número de telefone com DDD* (ex: 61999999999):` };
            } else if (email.includes('@') && email.includes('.')) {
                dados.email = email;
                dados.passoCadastro = 'telefone_cadastro';
                return { mensagem: `✅ Email salvo: ${email}\n\n📞 Agora, me informe seu *número de telefone com DDD* (ex: 61999999999):` };
            } else {
                return { mensagem: `📧 Email inválido. Digite um email válido (ex: nome@email.com) ou "não tenho" para pular:` };
            }
        }
        
        if (dados.passoCadastro === 'telefone_cadastro') {
            let telefone = mensagemAtual.trim();
            let telefoneLimpo = telefone.replace(/\D/g, '');
            
            if (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11) {
                if (telefoneLimpo.length === 10) {
                    telefoneLimpo = telefoneLimpo.substring(0, 2) + '9' + telefoneLimpo.substring(2);
                }
                dados.telefone = telefoneLimpo;
                dados.passoCadastro = 'data_nascimento';
                return { mensagem: `✅ Telefone salvo: ${dados.telefone}\n\n🎂 Agora, me informe sua *data de nascimento* (opcional)\n\nDigite sua data (ex: 15/05/1990) ou digite "pular" para continuar:` };
            } else {
                return { mensagem: `📞 Telefone inválido. Digite um número válido com DDD (ex: 61999999999):` };
            }
        }
        
        if (dados.passoCadastro === 'data_nascimento') {
            if (msg.includes('pular')) {
                dados.data_nascimento = null;
                dados.passoCadastro = 'finalizar';
                return { mensagem: `✅ Ok, vamos finalizar!\n\n📋 *Confirme seus dados:*\n\n👤 Nome: ${dados.nome}\n📧 Email: ${dados.email || 'Não informado'}\n📞 Telefone: ${dados.telefone}\n🎂 Data: Não informada\n\nDigite *confirmar* para finalizar, ou *corrigir* para alterar.` };
            } else {
                const dataMatch = mensagemAtual.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (dataMatch) {
                    const dia = dataMatch[1].padStart(2, '0');
                    const mes = dataMatch[2].padStart(2, '0');
                    const ano = dataMatch[3];
                    dados.data_nascimento = `${ano}-${mes}-${dia}`;
                } else {
                    dados.data_nascimento = null;
                }
                dados.passoCadastro = 'finalizar';
                const dataNascStr = dados.data_nascimento ? dados.data_nascimento.split('-').reverse().join('/') : 'Não informada';
                return { mensagem: `✅ ${dados.data_nascimento ? 'Data salva!' : 'Ok, vamos continuar!'}\n\n📋 *Confirme seus dados:*\n\n👤 Nome: ${dados.nome}\n📧 Email: ${dados.email || 'Não informado'}\n📞 Telefone: ${dados.telefone}\n🎂 Data: ${dataNascStr}\n\nDigite *confirmar* para finalizar, ou *corrigir* para alterar.` };
            }
        }
        
        if (dados.passoCadastro === 'finalizar') {
            if (msg.includes('confirmar')) {
                const cliente = await sistema.criarCliente(dados.nome, dados.telefone, dados.email);
                if (cliente && cliente.id) {
                    dados.cliente_id = cliente.id;
                    dados.cadastrando = false;
                    dados.passo = 'profissional';
                    
                    const profissionais = await sistema.buscarProfissionais();
                    dados.profissionais = profissionais;
                    const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                    
                    return { mensagem: `🎉 *Cadastro realizado com sucesso!* 🎉\n\nSeja bem-vindo(a) ao ${SALAO.nome}, ${dados.nome.split(' ')[0]}!\n\nAgora vamos continuar com seu agendamento:\n\n${lista}\n\nQual profissional você prefere?` };
                }
            } else if (msg.includes('corrigir')) {
                dados.passoCadastro = 'nome';
                return { mensagem: `🔄 Vamos corrigir. Digite seu *nome completo* novamente:` };
            } else {
                return { mensagem: `📋 Digite *confirmar* para finalizar ou *corrigir* para alterar os dados.` };
            }
        }
    }
    
    // ============================================
    // ESCOLHER PROFISSIONAL
    // ============================================
    console.log('🔍 [DEBUG] Verificando bloco profissional:');
    console.log('   dados.passo:', dados.passo);
    console.log('   dados.profissional_id:', dados.profissional_id);
    console.log('   dados.profissionais:', dados.profissionais ? dados.profissionais.length : 'null');

    if (dados.passo === 'profissional' && !dados.profissional_id && dados.profissionais) {
        const profissional = dados.profissionais.find(p => 
            p.nome.toLowerCase().includes(msg) || msg.includes(p.nome.toLowerCase())
        );
        
        if (profissional) {
            dados.profissional_id = profissional.id;
            dados.profissional_nome = profissional.nome;
            dados.passo = 'data';
            
            const agenda = await sistema.buscarAgendaProfissional(dados.profissional_id);
            
            if (agenda && agenda.dias_disponiveis && agenda.dias_disponiveis.length > 0) {
                dados.agenda_profissional = agenda.dias_disponiveis;
                
                const diasMsg = agenda.dias_disponiveis.slice(0, 10).map(d => {
                    const { dataFormatada, diaSemana } = formatarDataBrasil(d.data);
                    return `📅 *${dataFormatada}* (${diaSemana}) - ${d.horarios_disponiveis.length} horários`;
                }).join('\n');
                
                return { mensagem: `✨ Ótima escolha! ${profissional.nome} é realmente incrível! 👏\n\n📆 *Dias disponíveis:*\n${diasMsg}\n\nQual dia fica melhor? (ex: 07/04)` };
            }
            
            dados.agendando = false;
            dados.passo = null;
            return { mensagem: `💔 ${profissional.nome} está sem horários no momento. Quer tentar outro? Digite "agendar" 🥺` };
        }
        
        const lista = dados.profissionais.map(p => `✨ ${p.nome}`).join('\n');
        return { mensagem: `💭 Não encontrei esse profissional. Os que temos são:\n\n${lista}\n\nQual deles você prefere?` };
    }
    
    // ============================================
    // ESCOLHER DIA
    // ============================================
    if (dados.passo === 'data' && !dados.data && dados.agenda_profissional) {
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
            const agendaAtualizada = await sistema.buscarAgendaProfissional(dados.profissional_id, dataEncontrada);
            const diaAgenda = agendaAtualizada?.dias_disponiveis?.find(d => d.data === dataEncontrada);
            
            if (diaAgenda && diaAgenda.horarios_disponiveis.length > 0) {
                dados.data = dataEncontrada;
                dados.horarios_disponiveis = diaAgenda.horarios_disponiveis;
                dados.passo = 'horario';
                const { dataFormatada, diaSemana } = formatarDataBrasil(dataEncontrada);
                
                return { mensagem: `🎉 Perfeito! Dia *${dataFormatada}* (${diaSemana}) temos:\n\n⏰ ${diaAgenda.horarios_disponiveis.join(' • ')}\n\nQual horário? (Digite só a hora, ex: 14)` };
            }
            
            return { mensagem: `💔 Este dia não tem horários. Escolha outro:\n\n${dados.agenda_profissional.slice(0, 7).map(d => {
                const { dataFormatada } = formatarDataBrasil(d.data);
                return `📅 ${dataFormatada}`;
            }).join('\n')}` };
        }
        
        const diasMsg = dados.agenda_profissional.slice(0, 7).map(d => {
            const { dataFormatada, diaSemana } = formatarDataBrasil(d.data);
            return `📅 *${dataFormatada}* (${diaSemana})`;
        }).join('\n');
        
        return { mensagem: `📆 *Dias disponíveis:*\n\n${diasMsg}\n\nQual dia você prefere? (ex: 07/04)` };
    }
    
    // ============================================
    // ESCOLHER HORÁRIO
    // ============================================
    if (dados.passo === 'horario' && !dados.horario && dados.horarios_disponiveis) {
        const match = msg.match(/(\d{1,2})/);
        if (match) {
            const hora = parseInt(match[1]);
            const horario = `${hora.toString().padStart(2,'0')}:00`;
            
            if (dados.horarios_disponiveis.includes(horario)) {
                const disponivel = await sistema.verificarDisponibilidade(dados.profissional_id, dados.data, horario);
                
                if (disponivel) {
                    dados.horario = horario;
                    dados.passo = 'servico';
                    dados.paginaServicos = 1;
                    
                    const servicos = await sistema.buscarServicos();
                    dados.servicos = servicos;
                    
                    const resultado = await mostrarMaisServicos(dados, 1);
                    return { mensagem: `🎉 Horário *${horario}* reservado!\n\nAgora me conta: qual serviço você quer?\n\n${resultado.mensagem}` };
                } else {
                    const horariosRestantes = dados.horarios_disponiveis.filter(h => h !== horario);
                    dados.horarios_disponiveis = horariosRestantes;
                    
                    if (horariosRestantes.length === 0) {
                        dados.passo = 'data';
                        return { mensagem: `💔 O horário ${horario} foi ocupado e não temos mais horários neste dia. Escolha outra data.` };
                    }
                    
                    return { mensagem: `💔 O horário ${horario} foi ocupado. Ainda temos:\n\n⏰ ${horariosRestantes.join(' • ')}\n\nQual você prefere?` };
                }
            }
            
            return { mensagem: `⏰ Horário inválido. Disponíveis: ${dados.horarios_disponiveis.join(' • ')}\n\nDigite só a hora (ex: 14)` };
        }
        
        return { mensagem: `⏰ Me informe o horário. Ex: 14\n\nDisponíveis: ${dados.horarios_disponiveis.join(' • ')}` };
    }
    
    // ============================================
    // ESCOLHER SERVIÇO
    // ============================================
    if (dados.passo === 'servico' && !dados.servico_id && dados.servicos) {
        if (msg.includes('próximo') || msg.includes('proximos') || msg === 'proximo') {
            const paginaAtual = dados.paginaServicos || 1;
            const resultado = await mostrarMaisServicos(dados, paginaAtual + 1);
            dados.paginaServicos = resultado.paginaAtual;
            return { mensagem: resultado.mensagem };
        }
        
        if (msg.includes('voltar') || msg.includes('anterior')) {
            const paginaAtual = dados.paginaServicos || 1;
            const resultado = await mostrarMaisServicos(dados, paginaAtual - 1);
            dados.paginaServicos = resultado.paginaAtual;
            return { mensagem: resultado.mensagem };
        }
        
        const servico = buscarServicoPorNome(dados.servicos, mensagemAtual);
        
        if (servico) {
            dados.servico_id = servico.id;
            dados.servico_nome = servico.nome;
            dados.servico_preco = servico.preco;
            
            const disponivel = await sistema.verificarDisponibilidade(
                dados.profissional_id, 
                dados.data, 
                dados.horario
            );
            
            if (!disponivel) {
                return { mensagem: `💔 O horário ${dados.horario} do dia ${dados.data} foi ocupado. Digite "agendar" para recomeçar 🥺` };
            }
            
            const resultado = await sistema.criarAgendamento({
                nome_cliente: dados.nome,
                telefone_cliente: contato,
                cliente_id: dados.cliente_id,
                servico_id: dados.servico_id,
                data: dados.data,
                horario: dados.horario,
                profissional_id: dados.profissional_id
            });
            
            if (resultado && resultado.id) {
                const { dataFormatada, diaSemana } = formatarDataBrasil(dados.data);
                const nomeCliente = dados.nome.split(' ')[0];
                const mensagem = `🎉 *AGENDAMENTO CONFIRMADO!* 🎉\n\n` +
                    `✨ *Profissional:* ${dados.profissional_nome}\n` +
                    `📅 *Data:* ${dataFormatada} (${diaSemana})\n` +
                    `⏰ *Horário:* ${dados.horario}\n` +
                    `💇 *Serviço:* ${dados.servico_nome}\n` +
                    `💰 *Valor:* R$ ${parseFloat(dados.servico_preco).toFixed(2)}\n\n` +
                    `📍 *Local:* ${SALAO.endereco}\n` +
                    `📞 *Telefone:* ${SALAO.telefone}\n\n` +
                    `${gerarMensagemDespedida(nomeCliente)}\n\n` +
                    `📋 "ver meus agendamentos" | ❌ "cancelar"`;
                
                conversa.ultimoAgendamento = {
                    timestamp: Date.now(),
                    nome: dados.nome,
                    data: dataFormatada,
                    horario: dados.horario,
                    servico: dados.servico_nome,
                    profissional: dados.profissional_nome
                };
                
                Object.keys(dados).forEach(key => delete dados[key]);
                dados.agendando = false;
                dados.passo = null;
                
                return { mensagem };
            }
            
            return { mensagem: `❌ Erro ao agendar. Ligue ${SALAO.telefone} 💕` };
        }
        
        const paginaAtual = dados.paginaServicos || 1;
        const resultado = await mostrarMaisServicos(dados, paginaAtual);
        dados.paginaServicos = resultado.paginaAtual;
        return { mensagem: `💭 Não encontrei "${mensagemAtual}".\n\n${resultado.mensagem}` };
    }
    
    // ============================================
    // RESPOSTA COM IA (FALLBACK)
    // ============================================
    const respostaIA = await deepseek.gerarResposta([
        {
            role: 'system',
            content: `Você é a Amanda, atendente do salão ${SALAO.nome}. Seja simpática, acolhedora e profissional. Use emojis com moderação. Chame o cliente pelo nome se souber: ${dados.nome || 'cliente'}. Responda de forma natural e humana.`
        },
        { role: 'user', content: mensagemAtual }
    ]);
    
    if (respostaIA.sucesso) {
        return { mensagem: respostaIA.resposta };
    }
    
    const respostasFallback = [
        `✨ Como posso te ajudar? Diga "agendar", "ver meus agendamentos" ou "ajuda" 💕`,
        `🥰 Oi! Quer agendar um horário ou ver seus agendamentos?`,
        `💖 Diga "agendar" para marcar um horário, ou "ajuda" para mais opções!`
    ];
    
    return { mensagem: respostasFallback[Math.floor(Math.random() * respostasFallback.length)] };
}


// ============================================
// HANDLE MESSAGE
// ============================================
async function handleMessage(client, message) {
    try {
        if (!message.body || message.body.trim() === '') return;
        
        const contato = message.from;
        const nome = message.sender?.pushname || "Cliente";
        const texto = message.body;

        console.log('\n========== MENSAGEM COMPLETA ==========');
        console.log('📱 message.from:', message.from);
        console.log('📝 Nome do contato:', nome);
        console.log('💬 Mensagem:', texto);
        console.log('========================================\n');
        
        await client.startTyping(contato).catch(() => {});
        
        const resultado = await processarMensagem(contato, texto);
        
        if (resultado && resultado.mensagem) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await client.sendText(contato, resultado.mensagem);
            console.log(`✅ Resposta enviada`);
        }
        
        await client.stopTyping(contato).catch(() => {});
        
    } catch (error) {
        console.error('❌ Erro:', error);
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
// INICIALIZAÇÃO DO BOT
// ============================================
console.log('🚀 Iniciando Bot Inteligente...');
console.log(`🤖 DeepSeek: ${DEEPSEEK_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`💇 Salão: ${SALAO.nome}`);

sistema.testarConexao().then(ok => {
    if (ok) console.log('✅ API do sistema conectada!');
    else console.log('⚠️ API offline - algumas funções podem não funcionar');
});

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
    // 🔥 IMPORTANTE: Desabilitar stories
    disableStory: true,
    // 🔥 Não marca como lido
    disableAutoRead: true,
    // 🔥 Não fica online constante
    markOnline: false,
    // 🔥 Args para evitar comportamentos indesejados
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
    ],
    puppeteerOptions: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
        headless: true,
        protocolTimeout: 120000
    }
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
                setTimeout(() => process.exit(1), 5000);
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
        
    })
    .catch((error) => {
        console.error('❌ Erro ao iniciar bot:', error);
        console.log('🔄 Tentando novamente em 5 segundos...');
        setTimeout(() => {
            console.log('Reiniciando bot...');
            process.exit(1);
        }, 5000);
    });

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error);
    setTimeout(() => process.exit(1), 5000);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Promise rejeitada:', error);
});