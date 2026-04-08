// src/index.js - VERSÃO COMPLETA COM FLUXO INTELIGENTE (TELEFONE → NOME → DADOS ADICIONAIS)
require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');

// ============================================
// CONFIGURAÇÕES
// ============================================
const API_URL = process.env.API_URL || 'http://localhost:3000/api/bot';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ============================================
// CLIENTE DEEPSEEK COM CONTEXTO INTELIGENTE
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
        this.api = axios.create({ baseURL: API_URL, timeout: 15000 });
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
            console.error('Erro buscar serviços:', error.message);
            return [];
        }
    }

    async buscarProfissionais() {
        try {
            const response = await this.api.get('/profissionais');
            return response.data || [];
        } catch (error) {
            console.error('Erro buscar profissionais:', error.message);
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
            console.error('Erro buscar agenda:', error.message);
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
            const telefoneLimpo = telefone ? telefone.replace('@c.us', '').replace('@lid', '').replace(/\D/g, '') : null;
            
            if (telefoneLimpo) {
                let response = await this.api.get(`/clientes/buscar?telefone=${telefoneLimpo}`);
                if (response.data && response.data.length > 0) return response.data[0];
            }
            
            if (nome && nome.length > 3) {
                const response = await this.api.get(`/clientes/buscar?nome=${encodeURIComponent(nome)}`);
                if (response.data && response.data.length > 0) return response.data[0];
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async criarCliente(nome, telefone, email = null, data_nascimento = null) {
        try {
            const telefoneLimpo = telefone.replace('@c.us', '').replace('@lid', '').replace(/\D/g, '');
            const response = await this.api.post('/clientes/completo', { 
                nome: nome.trim(),
                telefone: telefoneLimpo,
                email: email,
                data_nascimento: data_nascimento
            });
            return response.data;
        } catch (error) {
            console.error('Erro criar cliente:', error.response?.data || error.message);
            return null;
        }
    }

    async atualizarTelefoneCliente(cliente_id, telefone) {
        try {
            const telefoneLimpo = telefone.replace(/\D/g, '');
            const response = await this.api.put(`/clientes/${cliente_id}/telefone`, { telefone: telefoneLimpo });
            return response.data;
        } catch (error) {
            console.error('Erro atualizar telefone:', error.message);
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
    if (!nome || nome === 'Corte') nome = 'você';
    const mensagens = [
        `✨ Oi ${nome}! Que bom te ver por aqui! 💕`,
        `🥰 Olá ${nome}! Como posso deixar seu dia mais lindo hoje?`,
        `💖 ${nome}! Seja bem-vindo(a) ao ${SALAO.nome}! Vamos te deixar ainda mais maravilhoso(a)?`,
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
    let cliente = dados.cliente_id ? { id: dados.cliente_id } : await sistema.buscarCliente(contato, dados.nome);
    
    if (!cliente && dados.nome && dados.nome !== 'Corte') {
        cliente = await sistema.buscarCliente(contato, dados.nome);
    }
    
    if (!cliente) {
        return { mensagem: `💕 Para ver seus agendamentos, poderia me informar seu nome completo? Assim consigo encontrar certinho!` };
    }
    
    dados.nome = cliente.nome;
    dados.cliente_id = cliente.id;
    
    const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
    const agora = new Date();
    
    const agendamentosFuturos = agendamentos.filter(a => new Date(a.data_hora) > agora && a.status !== 'cancelado' && a.status !== 'cancelado_cliente');
    const agendamentosPassados = agendamentos.filter(a => new Date(a.data_hora) <= agora || a.status === 'cancelado' || a.status === 'cancelado_cliente');
    
    if (agendamentosFuturos.length === 0 && agendamentosPassados.length === 0) {
        return { mensagem: `✨ ${cliente.nome.split(' ')[0]}, você ainda não tem nenhum agendamento conosco! Que tal marcarmos algo especial? Digite "agendar" para começarmos 🥰` };
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
    
    mensagem += `\n💖 Quer marcar um novo horário? É só digitar "agendar"!`;
    
    return { mensagem, cliente };
}

// ============================================
// FUNÇÃO PRINCIPAL HUMANIZADA
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
    // CUMPRIMENTOS E CONVERSA CASUAL
    // ============================================
    const cumprimentos = ['oi', 'olá', 'opa', 'e ai', 'hello', 'hi', 'oie'];
    if (cumprimentos.some(c => msg === c || msg.startsWith(c))) {
        if (dados.nome && dados.nome !== 'Corte') {
            return { mensagem: `${gerarMensagemBoasVindas(dados.nome.split(' ')[0])} Como posso te ajudar hoje? 😊` };
        }
        return { mensagem: `✨ Oi! Seja bem-vindo(a) ao ${SALAO.nome}! 💕\n\nPosso ajudar você a agendar um horário ou tirar alguma dúvida?` };
    }

    const agradecimentos = ['obrigado', 'valeu', 'gratidão', 'brigado', 'obg', 'obrigada'];
    if (agradecimentos.some(a => msg.includes(a))) {
        const respostas = [
            `💖 Por nada! Fico feliz em ajudar!`,
            `🥰 Disponha! Estou sempre aqui para você!`,
            `✨ Imagina! Foi um prazer te atender!`
        ];
        return { mensagem: respostas[Math.floor(Math.random() * respostas.length)] };
    }

    // ============================================
    // VER AGENDAMENTOS
    // ============================================
    if (msg.includes('ver meus agendamentos') || msg.includes('meus agendamentos') || msg.includes('consultar agendamento')) {
        const resultado = await verAgendamentos(contato, dados);
        return { mensagem: resultado.mensagem };
    }

    // ============================================
    // CANCELAMENTO
    // ============================================
    if (msg.includes('cancelar') || msg.includes('desmarcar')) {
        dados.cancelando = true;
        return { mensagem: `💕 Claro! Posso te ajudar com isso. Para cancelar, poderia me informar seu nome completo primeiro?` };
    }
    
    if (dados.cancelando && !dados.nome) {
        if (mensagemAtual.length >= 3) {
            dados.nome = mensagemAtual.trim();
            dados.cancelando = false;
            
            const cliente = await sistema.buscarCliente(contato, dados.nome);
            if (!cliente) {
                return { mensagem: `💔 Não encontrei nenhum agendamento no nome "${dados.nome}". Você já agendou algo conosco antes?` };
            }
            
            dados.cliente_id = cliente.id;
            dados.nome = cliente.nome;
            
            const agendamentos = await sistema.buscarAgendamentosCliente(cliente.id);
            const futuros = agendamentos.filter(a => new Date(a.data_hora) > new Date() && a.status !== 'cancelado' && a.status !== 'cancelado_cliente');
            
            if (futuros.length === 0) {
                return { mensagem: `✨ ${dados.nome.split(' ')[0]}, você não tem agendamentos futuros no momento. Quer marcar um novo? Digite "agendar" 🥰` };
            }
            
            const lista = futuros.map((ag, i) => {
                const data = new Date(ag.data_hora).toLocaleDateString('pt-BR');
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `${i+1} - 📅 ${data} às ${hora} - ${ag.servico_nome}`;
            }).join('\n');
            
            dados.agendamentosParaCancelar = futuros;
            dados.aguardandoCancelamento = true;
            
            return { mensagem: `📋 Encontrei esses agendamentos no seu nome:\n\n${lista}\n\nQual deles você gostaria de cancelar? (Digite o número)` };
        }
        return { mensagem: `💕 Poderia me informar seu nome completo para eu buscar seus agendamentos?` };
    }
    
    if (dados.aguardandoCancelamento && dados.agendamentosParaCancelar) {
        const num = parseInt(msg);
        if (num >= 1 && num <= dados.agendamentosParaCancelar.length) {
            const ag = dados.agendamentosParaCancelar[num - 1];
            await sistema.cancelarAgendamento(ag.id);
            dados.aguardandoCancelamento = false;
            dados.agendamentosParaCancelar = null;
            return { mensagem: `✅ Agendamento cancelado com sucesso! Sinto muito por não podermos te atender dessa vez. Se quiser remarcar, é só digitar "agendar" 💖` };
        }
        return { mensagem: `💕 Digite apenas o número do agendamento que deseja cancelar, por favor.` };
    }

    // ============================================
    // AJUDA
    // ============================================
    if (msg.includes('ajuda') || msg.includes('o que você faz') || msg.includes('comandos')) {
        return { mensagem: `✨ *Posso te ajudar com:*\n\n` +
            `📅 *Agendar* - Marcar um horário\n` +
            `📋 *Ver meus agendamentos* - Consultar seus horários\n` +
            `❌ *Cancelar* - Desmarcar um agendamento\n` +
            `💇 *Serviços* - Ver lista de serviços\n` +
            `📍 *Endereço* - Como chegar até nós\n` +
            `📞 *Contato* - Telefone do salão\n\n` +
            `Como posso te ajudar hoje? 😊` };
    }

    // ============================================
    // INFORMAÇÕES DO SALÃO
    // ============================================
    if (msg.includes('endereço') || msg.includes('localização') || msg.includes('onde fica')) {
        return { mensagem: `📍 *${SALAO.nome}*\n\n${SALAO.endereco}\n\n📞 Telefone: ${SALAO.telefone}\n\nTe esperamos por lá! 🥰` };
    }
    
    if (msg.includes('telefone') || msg.includes('contato') || msg.includes('número')) {
        return { mensagem: `📞 Nosso telefone para contato é ${SALAO.telefone}\n\nEstamos à disposição! 💕` };
    }
    
    if (msg.includes('horário') || msg.includes('funcionamento')) {
        return { mensagem: `🕐 *Horário de funcionamento:*\n\nSegunda a Sexta: 9h às 19h\nSábado: 9h às 17h\nDomingo: Fechado\n\nQual dia seria melhor para você? 😊` };
    }

    // ============================================
    // INICIAR AGENDAMENTO (NOVO FLUXO: TELEFONE PRIMEIRO)
    // ============================================
    if (msg.includes('agendar') || msg.includes('marcar') || msg.includes('quero um horário') || msg.includes('quero marca')) {
        dados.agendando = true;
        dados.passo = 'solicitar_telefone';
        dados.telefone_fornecido = false;
        return { mensagem: `📱 Que ótimo! Vamos agendar seu horário com carinho.\n\nPara começar, me informe seu **telefone com DDD** (apenas números):\n\nExemplo: 61999999999\n\nAssim consigo verificar se você já é cliente. 💕` };
    }

    // ============================================
    // COLETAR TELEFONE PARA AGENDAMENTO
    // ============================================
    if (dados.agendando && dados.passo === 'solicitar_telefone' && !dados.telefone_fornecido) {
        let telefoneDigitado = mensagemAtual.replace(/\D/g, '');
        
        if (telefoneDigitado.length >= 10 && telefoneDigitado.length <= 11) {
            if (telefoneDigitado.length === 10) {
                telefoneDigitado = telefoneDigitado.substring(0, 2) + '9' + telefoneDigitado.substring(2);
            }
            
            dados.telefone_cliente = telefoneDigitado;
            dados.telefone_fornecido = true;
            
            let cliente = await sistema.buscarCliente(telefoneDigitado);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                dados.passo = 'profissional';
                
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                
                return { mensagem: `${gerarMensagemBoasVindas(dados.nome.split(' ')[0])}\n\nQue bom! Já encontrei seu cadastro. Agora me diga:\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                dados.passo = 'solicitar_nome_apos_telefone';
                return { mensagem: `🔍 Não encontrei nenhum cliente com o telefone ${telefoneDigitado}.\n\nQual é o seu **nome completo** para eu verificar novamente?` };
            }
        } else {
            return { mensagem: `📱 Oops! O número deve ter DDD e 8 ou 9 dígitos. Exemplo: 61999999999\n\nPor favor, digite apenas os números.` };
        }
    }

    // ============================================
    // COLETAR NOME APÓS TELEFONE NÃO ENCONTRADO
    // ============================================
    if (dados.agendando && dados.passo === 'solicitar_nome_apos_telefone' && !dados.nome) {
        if (mensagemAtual.length >= 3) {
            const nomeDigitado = mensagemAtual.trim();
            
            let cliente = await sistema.buscarCliente(null, nomeDigitado);
            
            if (cliente) {
                dados.cliente_id = cliente.id;
                dados.nome = cliente.nome;
                dados.passo = 'confirmar_atualizacao_telefone';
                return { mensagem: `✅ Encontrei seu cadastro no nome ${cliente.nome}!\n\nMas o telefone que tenho aqui é ${cliente.telefone}. Deseja atualizar para ${dados.telefone_cliente}? (sim/não)\n\nVocê pode pular essa etapa digitando "não" e continuar.` };
            } else {
                dados.nome = nomeDigitado;
                dados.passo = 'confirmar_cadastro';
                return { mensagem: `✨ Não encontrei nenhum cliente com o nome "${nomeDigitado}".\n\nVou cadastrar você como *${nomeDigitado}* com o telefone *${dados.telefone_cliente}*. Está correto? (sim/não)` };
            }
        } else {
            return { mensagem: `💕 Por favor, digite seu nome completo (pelo menos 3 caracteres).` };
        }
    }

    // ============================================
    // CONFIRMAR ATUALIZAÇÃO DE TELEFONE
    // ============================================
    if (dados.agendando && dados.passo === 'confirmar_atualizacao_telefone') {
        if (msg.includes('sim')) {
            await sistema.atualizarTelefoneCliente(dados.cliente_id, dados.telefone_cliente);
            dados.passo = 'profissional';
            
            const profissionais = await sistema.buscarProfissionais();
            dados.profissionais = profissionais;
            const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
            
            return { mensagem: `✅ Telefone atualizado com sucesso!\n\nAgora, ${dados.nome.split(' ')[0]}, qual profissional você prefere?\n\n${lista}` };
        } else if (msg.includes('não')) {
            dados.passo = 'profissional';
            
            const profissionais = await sistema.buscarProfissionais();
            dados.profissionais = profissionais;
            const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
            
            return { mensagem: `Tudo bem! Vamos manter o telefone antigo.\n\nAgora, ${dados.nome.split(' ')[0]}, qual profissional você prefere?\n\n${lista}` };
        } else {
            return { mensagem: `Por favor, responda com "sim" para atualizar o telefone ou "não" para continuar sem atualizar.` };
        }
    }

    // ============================================
    // CONFIRMAR CADASTRO DE NOVO CLIENTE (OFERECENDO DADOS ADICIONAIS)
    // ============================================
    if (dados.agendando && dados.passo === 'confirmar_cadastro') {
        if (msg.includes('sim')) {
            dados.passo = 'perguntar_dados_adicionais';
            return { mensagem: `✨ Ótimo! Posso adicionar seu **e-mail** e **data de nascimento** ao cadastro? (sim/não)\n\nIsso ajuda a gente a te conhecer melhor e enviar lembretes especiais. 💕` };
        } else if (msg.includes('não')) {
            dados.agendando = false;
            dados.passo = null;
            return { mensagem: `💕 Sem problemas! Vamos recomeçar. Digite "agendar" quando quiser marcar um horário.` };
        } else {
            return { mensagem: `Por favor, responda com "sim" para confirmar o cadastro ou "não" para cancelar.` };
        }
    }

    // ============================================
    // PERGUNTAR SE QUER DADOS ADICIONAIS
    // ============================================
    if (dados.agendando && dados.passo === 'perguntar_dados_adicionais') {
        if (msg.includes('sim')) {
            dados.passo = 'coletar_email';
            return { mensagem: `📧 Qual o seu **e-mail**? (ex: nome@email.com)\n\nSe não quiser informar, digite "pular"` };
        } else if (msg.includes('não')) {
            // Cadastrar sem dados adicionais
            const cliente = await sistema.criarCliente(dados.nome, dados.telefone_cliente, null, null);
            if (cliente && cliente.id) {
                dados.cliente_id = cliente.id;
                dados.passo = 'profissional';
                const profissionais = await sistema.buscarProfissionais();
                dados.profissionais = profissionais;
                const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
                return { mensagem: `🎉 Cadastro realizado com sucesso!\n\nAgora me diga:\n\n${lista}\n\nQual profissional você prefere?` };
            } else {
                return { mensagem: `❌ Erro ao cadastrar. Digite "agendar" para tentar novamente.` };
            }
        } else {
            return { mensagem: `Responda com "sim" para adicionar e-mail e data de nascimento, ou "não" para continuar sem esses dados.` };
        }
    }

    // ============================================
    // COLETAR E-MAIL
    // ============================================
    if (dados.agendando && dados.passo === 'coletar_email') {
        if (msg.includes('pular')) {
            dados.email_cliente = null;
            dados.passo = 'coletar_data_nascimento';
            return { mensagem: `📅 Tudo bem! E sua **data de nascimento**? (DD/MM/AAAA)\n\nDigite "pular" se não quiser informar.` };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(msg)) {
            dados.email_cliente = msg.trim();
            dados.passo = 'coletar_data_nascimento';
            return { mensagem: `📅 Agora, qual sua **data de nascimento**? (DD/MM/AAAA)\n\nDigite "pular" se não quiser informar.` };
        } else {
            return { mensagem: `📧 E-mail inválido. Digite um e-mail válido (ex: nome@email.com) ou "pular" para ignorar.` };
        }
    }

    // ============================================
    // COLETAR DATA DE NASCIMENTO
    // ============================================
    if (dados.agendando && dados.passo === 'coletar_data_nascimento') {
        let dataNasc = null;
        
        if (!msg.includes('pular')) {
            const match = msg.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
                const dia = match[1].padStart(2, '0');
                const mes = match[2].padStart(2, '0');
                const ano = match[3];
                dataNasc = `${ano}-${mes}-${dia}`;
                
                const dataObj = new Date(dataNasc);
                if (isNaN(dataObj.getTime()) || dataObj > new Date()) {
                    return { mensagem: `📅 Data inválida. Use o formato DD/MM/AAAA (ex: 15/05/1990) ou digite "pular".` };
                }
            } else {
                return { mensagem: `📅 Formato inválido. Use DD/MM/AAAA (ex: 15/05/1990) ou digite "pular".` };
            }
        }
        
        const cliente = await sistema.criarCliente(dados.nome, dados.telefone_cliente, dados.email_cliente, dataNasc);
        
        if (cliente && cliente.id) {
            dados.cliente_id = cliente.id;
            dados.passo = 'profissional';
            const profissionais = await sistema.buscarProfissionais();
            dados.profissionais = profissionais;
            const lista = profissionais.map(p => `✨ *${p.nome}* - ${p.especialidade || 'Profissional'}`).join('\n');
            
            let msgExtra = '';
            if (dados.email_cliente) msgExtra += `\n📧 E-mail: ${dados.email_cliente}`;
            if (dataNasc) msgExtra += `\n🎂 Data de nascimento: ${msg}`;
            
            return { mensagem: `🎉 Cadastro completo! ${msgExtra}\n\nSeja bem-vindo(a), ${dados.nome.split(' ')[0]}!\n\nAgora me diga:\n\n${lista}\n\nQual profissional você prefere?` };
        } else {
            return { mensagem: `❌ Desculpe, tive um problema ao cadastrar. Digite "agendar" para recomeçar.` };
        }
    }
    
    // ============================================
    // ESCOLHER PROFISSIONAL
    // ============================================
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
                
                return { mensagem: `✨ Ótima escolha! ${profissional.nome} é realmente incrível! 👏\n\n📆 *Dias disponíveis:*\n${diasMsg}\n\nQual dia fica melhor para você? (ex: 07/04)` };
            }
            
            dados.agendando = false;
            dados.passo = null;
            return { mensagem: `💔 Que pena! ${profissional.nome} está sem horários disponíveis no momento. Quer tentar outro profissional? Digite "agendar" para recomeçar 🥺` };
        }
        
        const lista = dados.profissionais.map(p => `✨ ${p.nome}`).join('\n');
        return { mensagem: `💭 Não consegui identificar esse profissional. Os que temos são:\n\n${lista}\n\nQual deles você prefere?` };
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
                
                return { mensagem: `🎉 Perfeito! Dia *${dataFormatada}* (${diaSemana}) temos os seguintes horários:\n\n⏰ ${diaAgenda.horarios_disponiveis.join(' • ')}\n\nQual horário você prefere? (Digite apenas a hora, ex: 14)` };
            }
            
            return { mensagem: `💔 Infelizmente não temos mais horários disponíveis neste dia. Que tal escolher outro?\n\n${dados.agenda_profissional.slice(0, 7).map(d => {
                const { dataFormatada } = formatarDataBrasil(d.data);
                return `📅 ${dataFormatada}`;
            }).join('\n')}` };
        }
        
        const diasMsg = dados.agenda_profissional.slice(0, 7).map(d => {
            const { dataFormatada, diaSemana } = formatarDataBrasil(d.data);
            return `📅 *${dataFormatada}* (${diaSemana})`;
        }).join('\n');
        
        return { mensagem: `📆 *Dias disponíveis para agendamento:*\n\n${diasMsg}\n\nQual dia você prefere? (ex: 07/04)` };
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
                    return { mensagem: `🎉 Horário *${horario}* reservado com sucesso!\n\nAgora me conta: qual serviço você gostaria de fazer?\n\n${resultado.mensagem}` };
                } else {
                    const horariosRestantes = dados.horarios_disponiveis.filter(h => h !== horario);
                    dados.horarios_disponiveis = horariosRestantes;
                    
                    if (horariosRestantes.length === 0) {
                        dados.passo = 'data';
                        return { mensagem: `💔 Infelizmente o horário ${horario} acabou de ser ocupado e não temos mais horários neste dia. Que tal escolher outra data?` };
                    }
                    
                    return { mensagem: `💔 Ops! O horário ${horario} acabou de ser ocupado. Ainda temos esses horários disponíveis:\n\n⏰ ${horariosRestantes.join(' • ')}\n\nQual você prefere agora?` };
                }
            }
            
            return { mensagem: `⏰ Horário inválido. Os horários disponíveis são: ${dados.horarios_disponiveis.join(' • ')}\n\nDigite apenas a hora (ex: 14)` };
        }
        
        return { mensagem: `⏰ Me informe o horário desejado. Exemplo: 14\n\nHorários disponíveis: ${dados.horarios_disponiveis.join(' • ')}` };
    }
    
    // ============================================
    // ESCOLHER SERVIÇO
    // ============================================
    if (dados.passo === 'servico' && !dados.servico_id && dados.servicos) {
        if (msg.includes('próximo') || msg.includes('proximos') || msg.includes('mais serviços') || msg === 'proximo') {
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
                return { mensagem: `💔 Infelizmente o horário ${dados.horario} do dia ${dados.data} acabou de ser ocupado. Que tal começarmos de novo? Digite "agendar" 🥺` };
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
                    `📋 Para consultar seus agendamentos: "ver meus agendamentos"\n` +
                    `❌ Para cancelar: "cancelar"`;
                
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
            
            return { mensagem: `❌ Desculpe, tive um probleminha técnico ao agendar. Poderia tentar novamente ou nos ligar no ${SALAO.telefone}? 💕` };
        }
        
        const paginaAtual = dados.paginaServicos || 1;
        const resultado = await mostrarMaisServicos(dados, paginaAtual);
        dados.paginaServicos = resultado.paginaAtual;
        return { mensagem: `💭 Não encontrei "${mensagemAtual}" na nossa lista.\n\n${resultado.mensagem}` };
    }
    
    // ============================================
    // RESPOSTA INTELIGENTE COM IA
    // ============================================
    const respostaIA = await deepseek.gerarResposta([
        {
            role: 'system',
            content: `Você é a Amanda, atendente do salão ${SALAO.nome}. Seja simpática, acolhedora e profissional. Use emojis com moderação. Chame o cliente pelo nome se souber: ${dados.nome || 'cliente'}. Responda de forma natural e humana. Sempre em português do Brasil.`
        },
        { role: 'user', content: mensagemAtual }
    ]);
    
    if (respostaIA.sucesso) {
        return { mensagem: respostaIA.resposta };
    }
    
    // ============================================
    // FALLBACK
    // ============================================
    const respostasFallback = [
        `✨ Como posso te ajudar? Você pode agendar um horário, consultar seus agendamentos ou tirar dúvidas sobre nossos serviços! 💕`,
        `🥰 Oi! Estou aqui para ajudar! Quer marcar um horário ou ver seus agendamentos?`,
        `💖 Olá! Diga "agendar" para marcar um horário, ou "ajuda" para ver o que posso fazer por você!`
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
        
        console.log(`\n📩 ${nome}: ${texto}`);
        
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
// LIMPEZA DE CONVERSAS INATIVAS
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
// INICIALIZAÇÃO
// ============================================
console.log('🚀 Iniciando Bot Inteligente...');
console.log(`🤖 DeepSeek: ${DEEPSEEK_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`💇 Salão: ${SALAO.nome}`);

sistema.testarConexao().then(ok => {
    if (ok) console.log('✅ API do sistema conectada!');
    else console.log('⚠️ API offline - algumas funções podem não funcionar');
});

wppconnect.create({
    session: 'salao-bot',
    autoClose: false,
    puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
}).then((client) => {
    console.log('✅ Bot conectado com sucesso!');
    console.log('📱 Escaneie o QR Code acima para conectar seu WhatsApp');
    console.log('💬 Bot pronto para conversar!');
    
    client.onMessage(async (message) => {
        await handleMessage(client, message);
    });
    
    client.onStateChange((state) => {
        console.log('📱 Estado da conexão:', state);
        if (state === 'CONFLICT') client.useHere();
    });
    
}).catch((error) => {
    console.error('❌ Erro ao iniciar bot:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error);
});