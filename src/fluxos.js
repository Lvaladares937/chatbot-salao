const api = require('./api');
const menus = require('./menus');

// Função auxiliar para formatar data (CORRIGIDA)
function formatarDataBr(dataStr) {
    if (!dataStr) return 'Data não informada';
    
    try {
        // Se for string ISO (2026-04-17T16:30:00.000Z)
        if (dataStr.includes('T') && dataStr.includes('Z')) {
            const data = new Date(dataStr);
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
        
        // Formato YYYY-MM-DD
        if (dataStr.match(/\d{4}-\d{2}-\d{2}/)) {
            const partes = dataStr.split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        
        // Formato DD/MM/YYYY
        if (dataStr.match(/\d{2}\/\d{2}\/\d{4}/)) {
            return dataStr;
        }
        
        return dataStr;
    } catch (e) {
        console.log('Erro ao formatar data:', e);
        return dataStr;
    }
}

// Função para formatar horário (CORRIGIDA)
function formatarHorario(horarioStr) {
    if (!horarioStr) return 'Horário não informado';
    
    try {
        // Se for string ISO (2026-04-17T16:30:00.000Z)
        if (horarioStr.includes('T') && horarioStr.includes('Z')) {
            const data = new Date(horarioStr);
            const hora = data.getHours().toString().padStart(2, '0');
            const minuto = data.getMinutes().toString().padStart(2, '0');
            return `${hora}:${minuto}`;
        }
        
        // Se já está no formato HH:MM
        if (horarioStr.match(/\d{2}:\d{2}/)) {
            return horarioStr;
        }
        
        // Se veio só a hora
        if (horarioStr.match(/\d{1,2}/) && !horarioStr.includes(':')) {
            return `${horarioStr.padStart(2, '0')}:00`;
        }
        
        return horarioStr;
    } catch (e) {
        console.log('Erro ao formatar horário:', e);
        return horarioStr;
    }
}

// ATENDENTE HUMANO
async function processarAtendenteHumano(client, from, conv, texto) {
    console.log(`[processarAtendenteHumano] Iniciando atendimento humano`);
    
    await client.sendText(from, 
        `👤 *ATENDIMENTO HUMANO*\n\n` +
        `⚠️ *ATENÇÃO:* Este canal é exclusivo para problemas sérios ou questões que não podem ser resolvidas pelo nosso bot.\n\n` +
        `✅ O bot já pode resolver:\n` +
        `   • Agendamentos\n` +
        `   • Consulta de horários\n` +
        `   • Cancelamentos\n` +
        `   • Informações sobre serviços\n` +
        `   • Endereço e horário de funcionamento\n\n` +
        `❗ *Motivos para falar com um humano:*\n` +
        `   • Reclamações\n` +
        `   • Problemas com agendamentos existentes\n` +
        `   • Sugestões\n` +
        `   • Assuntos não tratados pelo bot\n\n` +
        `Digite *CONFIRMAR* para falar com um atendente.\n` +
        `Digite *MENU* para voltar ao menu principal.`
    );
    
    conv.passo = 'confirmar_atendente';
}

async function processarConfirmarAtendente(client, from, conv, texto) {
    const resposta = texto.toLowerCase().trim();
    
    if (resposta === 'confirmar' || resposta === 'sim' || resposta === 's') {
        console.log(`👤 Cliente solicitou atendente humano: ${from}`);
        
        // 🔥 ATIVAR MODO DE ESCUTA (chat livre por 1 hora)
        conv.modo_escuta = true;
        conv.modo_escuta_inicio = Date.now();
        conv.modo_escuta_duracao = 60 * 60 * 1000; // 1 hora
        conv.passo = null; // 🔥 IMPORTANTE: Resetar o passo para null
        
        // Registrar no console
        console.log(`\n🔔 === CLIENTE EM MODO ESCUTA ===`);
        console.log(`   Cliente: ${from.split('@')[0]}`);
        console.log(`   Nome: ${conv.dados?.cliente_nome || 'Não identificado'}`);
        console.log(`   Início: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`   Duração: 1 hora`);
        console.log(`   Para responder, abra o WhatsApp e envie uma mensagem para este número.\n`);
        
        await client.sendText(from, 
            `👤 *ATENDENTE HUMANO ATIVADO*\n\n` +
            `✅ Seu chat está agora em *MODO DE ESCUTA* por 1 hora.\n\n` +
            `📝 Você pode digitar sua mensagem livremente e um atendente irá responder em breve.\n\n` +
            `📌 *Importante:*\n` +
            `   • Após 1 hora, o chat voltará ao modo normal\n` +
            `   • Para voltar ao menu antes do tempo, digite *MENU*\n` +
            `   • Um atendente foi notificado sobre sua solicitação\n\n` +
            `✍️ *Digite sua mensagem abaixo:*`
        );
        
    } else if (resposta === 'menu') {
        conv.passo = null;
        conv.dados = {};
        conv.modo_escuta = false;
        await menus.mostrarMenuPrincipal(client, from);
    } else {
        await client.sendText(from, 
            `❌ *OPÇÃO INVÁLIDA*\n\n` +
            `Digite *CONFIRMAR* para falar com um atendente.\n` +
            `Digite *MENU* para voltar ao menu principal.`
        );
    }
}

// 🔥 NOTIFICAR ATENDENTE (versão simplificada - sem envio)
async function notificarAtendente(client, from, conv) {
    console.log(`👤 NOVA SOLICITAÇÃO DE ATENDENTE!`);
    console.log(`   Cliente: ${from}`);
    console.log(`   Nome: ${conv.dados?.cliente_nome || 'Não informado'}`);
    console.log(`   Hora: ${new Date().toLocaleString('pt-BR')}`);
    
    // Mostrar no terminal que precisa de atenção
    console.log(`\n🔔 === ATENÇÃO: CLIENTE SOLICITOU ATENDENTE === 🔔`);
    console.log(`   Responda manualmente no WhatsApp para: ${from.split('@')[0]}`);
    console.log(`   O chat está em modo escuta por 1 hora.\n`);
    
    // Salvar em arquivo para não perder
    const fs = require('fs');
    const logLine = `[${new Date().toISOString()}] Cliente: ${from} - Nome: ${conv.dados?.cliente_nome || 'N/I'}\n`;
    fs.appendFileSync('atendentes_pendentes.log', logLine);
}

// fluxos.js - Versão simplificada (apenas reconhece quando o atendente responde)
async function processarModoEscuta(client, from, conv, texto) {
    console.log(`[processarModoEscuta] Mensagem: "${texto}"`);
    
    // Verificar expiração
    if (Date.now() - conv.modo_escuta_inicio > conv.modo_escuta_duracao) {
        conv.modo_escuta = false;
        conv.passo = null;
        await client.sendText(from, `⏰ Tempo esgotado. Digite *MENU* para voltar.`);
        await menus.mostrarMenuPrincipal(client, from);
        return;
    }
    
    const tempoRestante = Math.round((conv.modo_escuta_duracao - (Date.now() - conv.modo_escuta_inicio)) / 60000);
    
    // 🔥 SE O ATENDENTE JÁ RESPONDEU, APENAS MOSTRA O TEMPO (SEM MENSAGEM GRANDE)
    if (conv.atendente_respondeu === true) {
        await client.sendText(from, `⏰ ${tempoRestante} minutos restantes.`);
        return;
    }
    
    // Primeira mensagem do cliente (atendente ainda não respondeu)
    await client.sendText(from, 
        `✅ *MENSAGEM RECEBIDA!*\n\n` +
        `⏰ Tempo restante: ${tempoRestante} minutos.\n\n` +
        `Digite *MENU* para sair.`
    );
    
    // Marcar que o cliente já enviou mensagem
    conv.cliente_enviou = true;
    
    // Salvar log
    const fs = require('fs');
    fs.appendFileSync('atendente_mensagens.log', `[${new Date().toISOString()}] ${from}: ${texto}\n`);
}

// 🔥 FUNÇÃO PARA QUANDO O ATENDENTE RESPONDE (chamada pelo handleMessage)
async function processarRespostaDoAtendente(client, from, texto) {
    // from aqui é o número do atendente
    // Precisamos saber para qual cliente ele está respondendo
    
    // Opção: usar o último cliente que solicitou atendente
    // Para simplificar, você pode manter um registro do último cliente
    
    console.log(`📨 Atendente ${from} respondeu: "${texto}"`);
    
    // Aqui você precisaria saber qual cliente está em atendimento
    // Uma solução simples: o atendente digita: #cliente 53000399753223
}

// ==================== IDENTIFICAÇÃO DE CLIENTE (APÓS ESCOLHER HORÁRIO) ====================

async function processarIdentificarClienteFinal(client, from, conv, texto) {
    console.log(`[processarIdentificarClienteFinal] Recebido: "${texto}"`);
    
    const textoLimpo = texto.trim();
    
    // Verificar se é telefone (apenas números ou com DDD)
    const isTelefone = /^\d{10,11}$/.test(textoLimpo.replace(/\D/g, ''));
    
    let cliente = null;
    
    if (isTelefone) {
        // Buscar por telefone
        const telefoneLimpo = textoLimpo.replace(/\D/g, '');
        console.log(`📞 Buscando cliente por telefone: ${telefoneLimpo}`);
        cliente = await api.buscarClientePorTelefone(telefoneLimpo);
    } else {
        // Buscar por nome
        console.log(`📝 Buscando cliente por nome: ${textoLimpo}`);
        cliente = await api.buscarClientePorNome(textoLimpo);
    }
    
    if (cliente) {
        // Cliente encontrado
        console.log(`✅ Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);
        conv.dados.cliente_id = cliente.id;
        conv.dados.cliente_nome = cliente.nome;
        conv.dados.telefone = cliente.telefone;
        
        await client.sendText(from, 
            `✅ *Bem-vindo de volta, ${cliente.nome}!*\n\n` +
            `📞 Telefone: ${cliente.telefone}\n\n` +
            `Vamos finalizar seu agendamento.`
        );
        
        // Avançar para confirmação
        conv.passo = 'confirmacao';
        await menus.mostrarConfirmacaoAgendamento(client, from, conv.dados);
        
    } else {
        // Cliente não encontrado - criar novo
        console.log(`📝 Cliente não encontrado. Criando novo registro...`);
        
        if (isTelefone) {
            const telefone = textoLimpo.replace(/\D/g, '');
            conv.dados.telefone_temp = telefone;
            conv.passo = 'cadastrar_nome_final';
            await client.sendText(from, 
                `📝 *NOVO CLIENTE*\n\n` +
                `Você ainda não está cadastrado.\n` +
                `Por favor, digite seu *nome completo*:`
            );
            return;
        } else {
            const nome = textoLimpo;
            conv.dados.nome_temp = nome;
            conv.passo = 'cadastrar_telefone_final';
            await client.sendText(from, 
                `📝 *NOVO CLIENTE*\n\n` +
                `Olá ${nome}! Para completar seu cadastro,\n` +
                `digite seu *telefone com DDD*:\n` +
                `Ex: 61999999999`
            );
            return;
        }
    }
}

async function processarCadastrarNomeFinal(client, from, conv, texto) {
    console.log(`[processarCadastrarNomeFinal] Recebido: "${texto}"`);
    
    const nome = texto.trim();
    const telefone = conv.dados.telefone_temp;
    
    // Criar cliente
    const novoCliente = await api.criarCliente(nome, telefone);
    
    if (novoCliente) {
        console.log(`✅ Cliente criado: ${novoCliente.nome} (ID: ${novoCliente.id})`);
        conv.dados.cliente_id = novoCliente.id;
        conv.dados.cliente_nome = novoCliente.nome;
        conv.dados.telefone = novoCliente.telefone;
        
        await client.sendText(from, 
            `✅ *Cadastro realizado com sucesso!*\n\n` +
            `Bem-vindo(a), ${novoCliente.nome}!\n` +
            `📞 Telefone: ${novoCliente.telefone}`
        );
        
        // Avançar para confirmação
        conv.passo = 'confirmacao';
        await menus.mostrarConfirmacaoAgendamento(client, from, conv.dados);
        
    } else {
        await client.sendText(from, 
            `❌ *Erro ao criar cadastro*\n\n` +
            `Por favor, tente novamente ou entre em contato pelo telefone (61) 3244-4181.\n\n` +
            `Digite *MENU* para recomeçar.`
        );
        conv.passo = null;
    }
}

async function processarCadastrarTelefoneFinal(client, from, conv, texto) {
    console.log(`[processarCadastrarTelefoneFinal] Recebido: "${texto}"`);
    
    const telefone = texto.trim().replace(/\D/g, '');
    const nome = conv.dados.nome_temp;
    
    if (telefone.length < 10 || telefone.length > 11) {
        await client.sendText(from, 
            `❌ *Telefone inválido*\n\n` +
            `Digite um telefone válido com DDD:\n` +
            `Ex: 61999999999`
        );
        return;
    }
    
    // Criar cliente
    const novoCliente = await api.criarCliente(nome, telefone);
    
    if (novoCliente) {
        console.log(`✅ Cliente criado: ${novoCliente.nome} (ID: ${novoCliente.id})`);
        conv.dados.cliente_id = novoCliente.id;
        conv.dados.cliente_nome = novoCliente.nome;
        conv.dados.telefone = novoCliente.telefone;
        
        await client.sendText(from, 
            `✅ *Cadastro realizado com sucesso!*\n\n` +
            `Bem-vindo(a), ${novoCliente.nome}!\n` +
            `📞 Telefone: ${novoCliente.telefone}`
        );
        
        // Avançar para confirmação
        conv.passo = 'confirmacao';
        await menus.mostrarConfirmacaoAgendamento(client, from, conv.dados);
        
    } else {
        await client.sendText(from, 
            `❌ *Erro ao criar cadastro*\n\n` +
            `Por favor, tente novamente.\n\n` +
            `Digite *MENU* para recomeçar.`
        );
        conv.passo = null;
    }
}

// fluxos.js - Substitua a função processarMenuServicos por esta versão COMPLETA:
async function processarMenuServicos(client, from, conv, texto) {
    console.log(`[processarMenuServicos] Recebido: "${texto}"`);

    // Comando de voltar
    if (texto === 'voltar_menu' || texto === 'voltar' || texto.includes('VOLTAR') || texto.includes('voltar')) {
        conv.passo = null;
        conv.dados = {};
        return menus.mostrarMenuPrincipal(client, from);
    }

    // Navegação - PRÓXIMA PÁGINA
    if (texto.includes('PRÓXIMA PÁGINA') || texto.includes('PROXIMA PAGINA') || 
        texto.includes('próxima') || texto.includes('proxima')) {
        
        const totalPaginas = Math.ceil(conv.dados.servicos.length / 10);
        const paginaAtual = conv.dados.paginaAtual || 1;
        
        if (paginaAtual < totalPaginas) {
            conv.dados.paginaAtual = paginaAtual + 1;
            return menus.mostrarMenuServicos(client, from, conv.dados.servicos, conv.dados.paginaAtual, conv.dados);
        } else {
            await client.sendText(from, "📄 Você já está na última página!");
            return;
        }
    }

    // Navegação - PÁGINA ANTERIOR
    if (texto.includes('PÁGINA ANTERIOR') || texto.includes('PAGINA ANTERIOR') || 
        texto.includes('anterior')) {
        
        const paginaAtual = conv.dados.paginaAtual || 1;
        
        if (paginaAtual > 1) {
            conv.dados.paginaAtual = paginaAtual - 1;
            return menus.mostrarMenuServicos(client, from, conv.dados.servicos, conv.dados.paginaAtual, conv.dados);
        } else {
            await client.sendText(from, "📄 Você já está na primeira página!");
            return;
        }
    }

    // 🔥 CORREÇÃO MELHORADA: Reconhecer serviço mesmo com nome truncado
    const nomeDigitado = texto.split('\n')[0].trim(); // Pega só a primeira linha
    
    console.log(`🔍 Buscando serviço por: "${nomeDigitado}"`);
    
    // Estratégia 1: Busca exata
    let servicoEncontrado = conv.dados.servicos.find(s => 
        s.nome.toLowerCase() === nomeDigitado.toLowerCase()
    );
    
    // Estratégia 2: Busca por início do nome (para nomes truncados)
    if (!servicoEncontrado) {
        servicoEncontrado = conv.dados.servicos.find(s => 
            s.nome.toLowerCase().startsWith(nomeDigitado.toLowerCase()) ||
            nomeDigitado.toLowerCase().startsWith(s.nome.toLowerCase().substring(0, nomeDigitado.length))
        );
    }
    
    // Estratégia 3: Busca por inclusão (contém)
    if (!servicoEncontrado) {
        servicoEncontrado = conv.dados.servicos.find(s => 
            s.nome.toLowerCase().includes(nomeDigitado.toLowerCase()) ||
            nomeDigitado.toLowerCase().includes(s.nome.toLowerCase())
        );
    }
    
    // Estratégia 4: Busca ignorando caracteres especiais e espaços extras
    if (!servicoEncontrado) {
        const nomeLimpo = nomeDigitado.toLowerCase().replace(/[^a-z]/g, '');
        servicoEncontrado = conv.dados.servicos.find(s => {
            const nomeServicoLimpo = s.nome.toLowerCase().replace(/[^a-z]/g, '');
            return nomeServicoLimpo.includes(nomeLimpo) || nomeLimpo.includes(nomeServicoLimpo);
        });
    }
    
    if (servicoEncontrado) {
        console.log(`✅ Serviço reconhecido: "${servicoEncontrado.nome}" (digitado: "${nomeDigitado}")`);
        conv.dados.servico = servicoEncontrado;
        conv.passo = 'menu_profissionais';
        
        const profissionais = await api.buscarProfissionais();
        if (!profissionais || profissionais.length === 0) {
            await client.sendText(from, "❌ Nenhum profissional disponível no momento.");
            conv.passo = null;
            return menus.mostrarMenuPrincipal(client, from);
        }
        
        conv.dados.profissionais = profissionais;
        await menus.mostrarMenuProfissionais(client, from, profissionais, servicoEncontrado.nome);
        return;
    }

    // Reconhecer por número digitado
    const numero = parseInt(texto);
    if (!isNaN(numero) && numero >= 1 && numero <= conv.dados.servicos.length) {
        const servicoSelecionado = conv.dados.servicos[numero - 1];
        if (servicoSelecionado) {
            console.log(`✅ Serviço reconhecido por número: ${servicoSelecionado.nome}`);
            conv.dados.servico = servicoSelecionado;
            conv.passo = 'menu_profissionais';
            
            const profissionais = await api.buscarProfissionais();
            if (!profissionais || profissionais.length === 0) {
                await client.sendText(from, "❌ Nenhum profissional disponível no momento.");
                conv.passo = null;
                return menus.mostrarMenuPrincipal(client, from);
            }
            
            conv.dados.profissionais = profissionais;
            await menus.mostrarMenuProfissionais(client, from, profissionais, servicoSelecionado.nome);
            return;
        }
    }

    console.log(`❌ Serviço NÃO encontrado para: "${nomeDigitado}"`);
    await client.sendText(from, "❌ Opção inválida. Digite o NÚMERO do serviço ou clique no serviço desejado.");
}

async function processarMenuProfissionais(client, from, conv, texto) {
    console.log(`[processarMenuProfissionais] Recebido: "${texto}"`);

    // Comando de voltar (ID do menu)
    if (texto === 'voltar_servicos' || texto === 'voltar_servicos' || texto === 'voltar' || texto.includes('VOLTAR')) {
        conv.passo = 'menu_servicos';
        return menus.mostrarMenuServicos(client, from, conv.dados.servicos, conv.dados.paginaAtual || 1, conv.dados);
    }

    let profissionalSelecionado = null;

    // Seleção por ID (formato profissional_123) - VEM DO CLICK NO PROFISSIONAL
    if (texto.startsWith('profissional_')) {
        const id = parseInt(texto.split('_')[1]);
        profissionalSelecionado = conv.dados.profissionais.find(p => p.id === id);
    }

    // Reconhecer por número digitado
    if (!profissionalSelecionado) {
        const numero = parseInt(texto);
        if (!isNaN(numero) && numero >= 1 && numero <= conv.dados.profissionais.length) {
            profissionalSelecionado = conv.dados.profissionais[numero - 1];
        }
    }

    // Reconhecer por nome
    if (!profissionalSelecionado) {
        profissionalSelecionado = conv.dados.profissionais.find(p =>
            texto.toLowerCase().includes(p.nome.toLowerCase()) ||
            p.nome.toLowerCase().includes(texto.toLowerCase())
        );
    }

    if (profissionalSelecionado) {
        console.log(`✅ Profissional selecionado: ${profissionalSelecionado.nome}`);
        conv.dados.profissional = profissionalSelecionado;
        conv.passo = 'menu_datas';

        // 🔥 GERAR DATAS INCLUINDO HOJE
        const datas = [];
        const hoje = new Date();

        // i começa em 0 para incluir o dia atual
        for (let i = 0; i <= 14; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + i);

            const diaSemana = data.getDay();
            if (diaSemana !== 0) { // Pular domingo (opcional)
                const dataStr = data.toISOString().split('T')[0];
                datas.push({ data: dataStr });
            }
        }

        console.log(`📅 Geradas ${datas.length} datas (hoje: ${hoje.toISOString().split('T')[0]})`);
        conv.dados.datas = datas;
        await menus.mostrarMenuDatas(client, from, datas);
        return;
    }

    await client.sendText(from, "❌ Opção inválida. Digite o NÚMERO do profissional ou clique no nome.");
}


// DATAS - VERSÃO CORRIGIDA
async function processarMenuDatas(client, from, conv, texto) {
    console.log(`[processarMenuDatas] Recebido: "${texto}"`);

    if (texto === 'voltar_profissionais' || texto === 'voltar' || texto.includes('VOLTAR') || texto.includes('voltar')) {
        conv.passo = 'menu_profissionais';
        return menus.mostrarMenuProfissionais(client, from, conv.dados.profissionais, conv.dados.servico?.nome);
    }

    let dataSelecionada = null;

    // Extrair data do texto "15/04/2026 (Terça)"
    const dataMatch = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dataMatch) {
        const dia = dataMatch[1];
        const mes = dataMatch[2];
        const ano = dataMatch[3];
        const dataFormatada = `${ano}-${mes}-${dia}`;
        
        console.log(`📅 Data extraída: ${dataFormatada}`);
        
        dataSelecionada = conv.dados.datas.find(d => d.data === dataFormatada);
        
        if (dataSelecionada) {
            console.log(`✅ Data encontrada: ${dataSelecionada.data}`);
        } else {
            dataSelecionada = { data: dataFormatada };
        }
    }

    // Seleção por ID (formato data_2026-04-15)
    if (!dataSelecionada && texto.startsWith('data_')) {
        const data = texto.split('_')[1];
        dataSelecionada = conv.dados.datas.find(d => d.data === data);
    }

    // Reconhecer por número digitado
    if (!dataSelecionada) {
        const numero = parseInt(texto);
        if (!isNaN(numero) && numero >= 1 && numero <= conv.dados.datas.length) {
            dataSelecionada = conv.dados.datas[numero - 1];
        }
    }

    if (dataSelecionada) {
        conv.dados.data = dataSelecionada.data;
        // Limpar horários disponíveis ao mudar de data
        delete conv.dados.horarios_disponiveis;
        delete conv.dados.horarios_ocupados;
        conv.passo = 'menu_horarios';

        const dataFormatadaExibicao = formatarDataBr(dataSelecionada.data);
        
        // 🔥 Buscar horários disponíveis para esta data
        console.log(`🔍 Buscando horários para ${conv.dados.profissional?.nome} na data ${dataSelecionada.data}`);
        
        let horariosDisponiveis = [];
        let horariosOcupados = [];
        
        try {
            const agenda = await api.buscarAgenda(conv.dados.profissional.id, dataSelecionada.data);
            console.log(`📦 Resposta da API:`, JSON.stringify(agenda, null, 2));
            
            if (agenda && agenda.dias_disponiveis && agenda.dias_disponiveis.length > 0) {
                const diaEncontrado = agenda.dias_disponiveis.find(d => d.data === dataSelecionada.data);
                if (diaEncontrado && diaEncontrado.horarios_disponiveis) {
                    horariosDisponiveis = diaEncontrado.horarios_disponiveis;
                    console.log(`✅ Encontrados ${horariosDisponiveis.length} horários disponíveis via API`);
                    
                    // Gerar lista de TODOS os horários possíveis para saber quais estão ocupados
                    const todosHorarios = [];
                    for (let hora = 9; hora <= 19; hora++) {
                        for (let minuto of [0, 30]) {
                            if (hora === 19 && minuto === 30) continue;
                            const horaStr = hora.toString().padStart(2, '0');
                            const minutoStr = minuto.toString().padStart(2, '0');
                            todosHorarios.push(`${horaStr}:${minutoStr}`);
                        }
                    }
                    
                    // Horários ocupados = todos - disponíveis
                    horariosOcupados = todosHorarios.filter(h => !horariosDisponiveis.includes(h));
                    console.log(`❌ ${horariosOcupados.length} horários ocupados`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro ao buscar agenda da API:`, error.message);
        }
        
        // Fallback: se não conseguiu buscar da API
        if (horariosDisponiveis.length === 0) {
            console.log(`📅 Gerando lista completa de horários (fallback)`);
            for (let hora = 9; hora <= 19; hora++) {
                for (let minuto of [0, 30]) {
                    if (hora === 19 && minuto === 30) continue;
                    const horaStr = hora.toString().padStart(2, '0');
                    const minutoStr = minuto.toString().padStart(2, '0');
                    horariosDisponiveis.push(`${horaStr}:${minutoStr}`);
                }
            }
            horariosOcupados = [];
        }
        
        // Salvar no conv para uso posterior
        conv.dados.horarios_disponiveis = horariosDisponiveis;
        conv.dados.horarios_ocupados = horariosOcupados;
        
        // Mostrar menu de horários com indicadores visuais
        await menus.mostrarMenuHorarios(client, from, horariosDisponiveis, horariosOcupados, dataFormatadaExibicao);
        return;
    }

    await client.sendText(from, "❌ Opção inválida. Digite o NÚMERO da data (1, 2, 3...) ou clique na data desejada.");
}

// fluxos.js - Substitua a função processarMenuHorarios por esta versão
async function processarMenuHorarios(client, from, conv, texto) {
    console.log(`[processarMenuHorarios] Recebido: "${texto}"`);

    // 🔥 NOVO: Verificar se clicou em horário ocupado (ID do botão)
    if (texto.startsWith('horario_ocupado_')) {
        const horarioOcupado = texto.replace('horario_ocupado_', '');
        console.log(`❌ Cliente clicou em horário ocupado: ${horarioOcupado}`);
        
        const dataFormatada = formatarDataBr(conv.dados.data);
        
        await client.sendText(from, 
            `❌ *HORÁRIO INDISPONÍVEL*\n\n` +
            `O horário *${horarioOcupado}* do dia ${dataFormatada} já está reservado.\n\n` +
            `Por favor, escolha um horário disponível (✅) na lista abaixo.`
        );
        return;
    }

    if (texto === 'voltar_datas' || texto === 'voltar_datas' || texto === 'voltar' || texto.includes('VOLTAR')) {
        conv.passo = 'menu_datas';
        return menus.mostrarMenuDatas(client, from, conv.dados.datas);
    }

    let horarioSelecionado = null;

    // Buscar horários disponíveis e ocupados da API
    if (!conv.dados.horarios_disponiveis || !conv.dados.horarios_ocupados) {
        console.log(`🔍 Buscando horários para ${conv.dados.profissional?.nome} na data ${conv.dados.data}`);
        
        try {
            const agenda = await api.buscarAgenda(conv.dados.profissional.id, conv.dados.data);
            console.log(`📦 Resposta da API:`, JSON.stringify(agenda, null, 2));
            
            if (agenda && agenda.dias_disponiveis && agenda.dias_disponiveis.length > 0) {
                const diaEncontrado = agenda.dias_disponiveis.find(d => d.data === conv.dados.data);
                if (diaEncontrado) {
                    // Horários disponíveis (vindos da API)
                    conv.dados.horarios_disponiveis = diaEncontrado.horarios_disponiveis;
                    
                    // 🔥 Gerar lista de TODOS os horários possíveis para saber quais estão ocupados
                    const todosHorarios = [];
                    for (let hora = 9; hora <= 19; hora++) {
                        for (let minuto of [0, 30]) {
                            if (hora === 19 && minuto === 30) continue;
                            const horaStr = hora.toString().padStart(2, '0');
                            const minutoStr = minuto.toString().padStart(2, '0');
                            todosHorarios.push(`${horaStr}:${minutoStr}`);
                        }
                    }
                    
                    // Horários ocupados = todos - disponíveis
                    conv.dados.horarios_ocupados = todosHorarios.filter(h => !conv.dados.horarios_disponiveis.includes(h));
                    
                    console.log(`✅ ${conv.dados.horarios_disponiveis.length} horários disponíveis`);
                    console.log(`❌ ${conv.dados.horarios_ocupados.length} horários ocupados`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro ao buscar agenda da API:`, error.message);
        }
        
        // Fallback: se não conseguiu buscar da API
        if (!conv.dados.horarios_disponiveis) {
            console.log(`📅 Gerando lista completa de horários (fallback)`);
            const todosHorarios = [];
            for (let hora = 9; hora <= 19; hora++) {
                for (let minuto of [0, 30]) {
                    if (hora === 19 && minuto === 30) continue;
                    const horaStr = hora.toString().padStart(2, '0');
                    const minutoStr = minuto.toString().padStart(2, '0');
                    todosHorarios.push(`${horaStr}:${minutoStr}`);
                }
            }
            conv.dados.horarios_disponiveis = todosHorarios;
            conv.dados.horarios_ocupados = [];
        }
    }
    
    const horariosDisponiveis = conv.dados.horarios_disponiveis;
    const horariosOcupados = conv.dados.horarios_ocupados || [];
    
    console.log(`📅 Disponíveis: ${horariosDisponiveis.length} | Ocupados: ${horariosOcupados.length}`);

    // 🔥 Extrair o horário do texto (ex: "13:00\nClique para selecionar")
    const horarioExtraido = texto.split('\n')[0].trim();
    console.log(`🔍 Horário clicado: "${horarioExtraido}"`);

    // Verificar se o horário está disponível
    if (horariosDisponiveis.includes(horarioExtraido)) {
        horarioSelecionado = horarioExtraido;
        console.log(`✅ Horário ${horarioSelecionado} está disponível!`);
    } else if (horariosOcupados.includes(horarioExtraido)) {
        // Horário ocupado - mostrar mensagem e reexibir lista
        console.log(`❌ Horário ${horarioExtraido} está OCUPADO!`);
        
        // Mostrar lista atualizada de horários
        await menus.mostrarMenuHorarios(client, from, horariosDisponiveis, horariosOcupados, formatarDataBr(conv.dados.data));
        
        await client.sendText(from, 
            `❌ *HORÁRIO INDISPONÍVEL*\n\n` +
            `O horário *${horarioExtraido}* já foi reservado.\n\n` +
            `Por favor, escolha um horário disponível (✅) na lista acima.`
        );
        return;
    }

    // Seleção por ID (formato horario_09:00)
    if (!horarioSelecionado && texto.startsWith('horario_')) {
        const possivelHorario = texto.split('_')[1];
        if (horariosDisponiveis.includes(possivelHorario)) {
            horarioSelecionado = possivelHorario;
        }
    }

    // Reconhecer por número digitado
    if (!horarioSelecionado) {
        const numero = parseInt(texto);
        if (!isNaN(numero) && numero >= 1 && numero <= horariosDisponiveis.length) {
            horarioSelecionado = horariosDisponiveis[numero - 1];
        }
    }

    // Reconhecer por regex de horário
    if (!horarioSelecionado) {
        const match = texto.match(/(\d{1,2}):?(\d{2})/);
        if (match) {
            const horaCandidata = `${match[1].padStart(2, '0')}:${match[2] || '00'}`;
            if (horariosDisponiveis.includes(horaCandidata)) {
                horarioSelecionado = horaCandidata;
            } else if (horariosOcupados.includes(horaCandidata)) {
                await client.sendText(from, 
                    `❌ *HORÁRIO INDISPONÍVEL*\n\n` +
                    `O horário *${horaCandidata}* já está ocupado.\n\n` +
                    `📋 *Horários disponíveis:*\n${horariosDisponiveis.join(', ')}`
                );
                return;
            }
        }
    }

    if (horarioSelecionado) {
    console.log(`✅ Horário selecionado: ${horarioSelecionado}`);
    conv.dados.horario = horarioSelecionado;
    // 🔥 VAI PARA IDENTIFICAÇÃO DO CLIENTE PRIMEIRO
    conv.passo = 'identificar_cliente_final';
    await client.sendText(from, 
        "📝 *IDENTIFICAÇÃO*\n\n" +
        "Para finalizar o agendamento, preciso identificar você.\n\n" +
        "Digite seu *nome completo* ou *telefone com DDD*:\n" +
        "Ex: Nome Sobrenome ou 61999999999"
    );
    return;
}

    // Se chegou aqui, mostrar a lista de horários novamente
    await menus.mostrarMenuHorarios(client, from, horariosDisponiveis, horariosOcupados, formatarDataBr(conv.dados.data));
}

// fluxos.js - processarConfirmacao (já salva/cria o cliente)
async function processarConfirmacao(client, from, conv, texto) {
    const t = texto.toLowerCase().trim();

    if (t === 'sim' || t === 's' || t === 'confirmar' || t === 'yes') {
        
        const dataFormatada = formatarDataBr(conv.dados.data);
        const horarioFormatado = formatarHorario(conv.dados.horario);
        
        // 🔥 GARANTIR QUE O CLIENTE ESTÁ SALVO
        let clienteId = conv.dados.cliente_id;
        let clienteNome = conv.dados.cliente_nome;
        let clienteTelefone = conv.dados.telefone;
        
        // Se não tem cliente_id, cadastrar agora
        if (!clienteId) {
            console.log(`📝 Cadastrando novo cliente...`);
            
            // Se não tem nome, pedir
            if (!clienteNome) {
                clienteNome = conv.dados.nome_temp || 'Cliente WhatsApp';
            }
            
            // Se não tem telefone, usar padrão
            if (!clienteTelefone) {
                clienteTelefone = conv.dados.telefone_temp || '61999999999';
            }
            
            const novoCliente = await api.criarCliente(clienteNome, clienteTelefone);
            if (novoCliente) {
                clienteId = novoCliente.id;
                clienteNome = novoCliente.nome;
                clienteTelefone = novoCliente.telefone;
                console.log(`✅ Cliente cadastrado: ${clienteNome} (ID: ${clienteId})`);
            }
        }
        
        const dadosAgendamento = {
            servico_id: conv.dados.servico.id,
            profissional_id: conv.dados.profissional.id,
            data: conv.dados.data,
            horario: conv.dados.horario,
            nome_cliente: clienteNome || 'Cliente WhatsApp',
            telefone_cliente: clienteTelefone || '61999999999',
            cliente_id: clienteId
        };
        
        console.log('📤 Enviando para o sistema:', dadosAgendamento);
        
        const resultado = await api.criarAgendamento(dadosAgendamento);
        
        if (resultado && resultado.success !== false) {
            await client.sendText(from, 
                `✅ *AGENDAMENTO CONFIRMADO!* ✅\n\n` +
                `👤 *Cliente:* ${clienteNome}\n` +
                `💇 *Serviço:* ${conv.dados.servico?.nome || 'Não informado'}\n` +
                `👤 *Profissional:* ${conv.dados.profissional?.nome || 'Não informado'}\n` +
                `📅 *Data:* ${dataFormatada}\n` +
                `⏰ *Horário:* ${horarioFormatado}\n\n` +
                `✨ Agendamento realizado com sucesso!\n` +
                `📌 *Código:* #${resultado.id || 'gerado'}\n\n` +
                `Qualquer dúvida, entre em contato pelo (61) 3244-4181.\n\n` +
                `Digite *MENU* para voltar ao início.`
            );
        } else {
            const erroMsg = resultado?.error || 'Erro desconhecido';
            console.log('❌ Erro do backend:', erroMsg);
            
            await client.sendText(from, 
                `❌ *ERRO AO CONFIRMAR AGENDAMENTO* ❌\n\n` +
                `Infelizmente não foi possível concluir seu agendamento.\n` +
                `Motivo: ${erroMsg}\n\n` +
                `Por favor, tente novamente mais tarde ou entre em contato pelo telefone (61) 3244-4181.\n\n` +
                `Digite *MENU* para voltar ao início.`
            );
        }
    } else {
        await client.sendText(from, 
            `❌ *AGENDAMENTO CANCELADO* ❌\n\n` +
            `Que pena! 😕\n` +
            `Esperamos você em outra oportunidade!\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
    }

    conv.passo = null;
    conv.dados = {};
    await menus.mostrarMenuPrincipal(client, from);
}

// fluxos.js - CORRIGIR processarConsultaAgendamentos (formatação correta)
async function processarConsultaAgendamentos(client, from, conv, texto) {
    console.log(`[processarConsultaAgendamentos] Buscando agendamentos para: "${texto}"`);
    
    const nomeCliente = texto.trim();
    
    // Buscar cliente pelo nome no backend
    const cliente = await api.buscarClientePorNome(nomeCliente);
    
    if (!cliente) {
        await client.sendText(from, 
            `❌ *CLIENTE NÃO ENCONTRADO*\n\n` +
            `Não encontrei nenhum cliente com o nome "${nomeCliente}".\n\n` +
            `Verifique se o nome está correto ou faça um agendamento primeiro.\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
        conv.passo = null;
        await menus.mostrarMenuPrincipal(client, from);
        return;
    }
    
    // Buscar agendamentos do cliente no backend
    const agendamentos = await api.buscarAgendamentosCliente(cliente.id);
    
    if (!agendamentos || agendamentos.length === 0) {
        await client.sendText(from, 
            `📋 *NENHUM AGENDAMENTO ENCONTRADO*\n\n` +
            `Olá ${cliente.nome}, você não possui agendamentos.\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
    } else {
        let msg = `📋 *SEUS AGENDAMENTOS* 📋\n\n`;
        msg += `👤 Cliente: ${cliente.nome}\n`;
        msg += `📞 Telefone: ${cliente.telefone}\n\n`;
        
        agendamentos.forEach((a, i) => {
            // 🔥 EXTRAIR DATA E HORÁRIO CORRETAMENTE
            let dataRaw = a.data_hora || a.data;
            let horarioRaw = a.horario || a.data_hora;
            
            // Se data_hora for ISO string completa
            if (dataRaw && dataRaw.includes('T')) {
                const dataObj = new Date(dataRaw);
                const dia = dataObj.getDate().toString().padStart(2, '0');
                const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
                const ano = dataObj.getFullYear();
                const hora = dataObj.getHours().toString().padStart(2, '0');
                const minuto = dataObj.getMinutes().toString().padStart(2, '0');
                
                const dataFormatada = `${dia}/${mes}/${ano}`;
                const horarioFormatado = `${hora}:${minuto}`;
                
                msg += `${i+1}. 📅 ${dataFormatada} às ${horarioFormatado}\n`;
                msg += `   💇 ${a.servico_nome || 'Serviço'} com ${a.profissional_nome || 'Profissional'}\n`;
                msg += `   📌 Status: ${a.status || 'Agendado'}\n\n`;
            } else {
                // Formato já separado
                const dataFormatada = formatarDataBr(dataRaw);
                const horarioFormatado = formatarHorario(horarioRaw);
                msg += `${i+1}. 📅 ${dataFormatada} às ${horarioFormatado}\n`;
                msg += `   💇 ${a.servico_nome || 'Serviço'} com ${a.profissional_nome || 'Profissional'}\n`;
                msg += `   📌 Status: ${a.status || 'Agendado'}\n\n`;
            }
        });
        
        msg += "Digite *MENU* para voltar ao início.";
        await client.sendText(from, msg);
    }
    
    conv.passo = null;
    conv.dados = {};
}

// CANCELAR AGENDAMENTO - CORRIGIDO (tenta nome, depois telefone)
async function processarCancelarNome(client, from, conv, texto) {
    console.log(`[processarCancelarNome] Buscando agendamentos para cancelar: "${texto}"`);
    
    const textoLimpo = texto.trim();
    
    // Verificar se é telefone (apenas números ou com DDD)
    const isTelefone = /^\d{10,11}$/.test(textoLimpo.replace(/\D/g, ''));
    
    let cliente = null;
    
    if (isTelefone) {
        // Buscar por telefone
        const telefoneLimpo = textoLimpo.replace(/\D/g, '');
        console.log(`📞 Buscando cliente por telefone: ${telefoneLimpo}`);
        cliente = await api.buscarClientePorTelefone(telefoneLimpo);
    } else {
        // Buscar por nome
        console.log(`📝 Buscando cliente por nome: ${textoLimpo}`);
        cliente = await api.buscarClientePorNome(textoLimpo);
    }
    
    if (cliente) {
        console.log(`✅ Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);
        
        // Buscar agendamentos do cliente
        const todosAgendamentos = await api.buscarAgendamentosCliente(cliente.id);
        
        // Filtrar apenas agendamentos futuros e não cancelados
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const agendamentosAtivos = todosAgendamentos.filter(a => {
            let dataAgenda;
            if (a.data_hora) {
                dataAgenda = new Date(a.data_hora);
            } else if (a.data) {
                dataAgenda = new Date(a.data);
            } else {
                return false;
            }
            return dataAgenda >= hoje && a.status !== 'cancelado' && a.status !== 'cancelada';
        });
        
        if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            await client.sendText(from, 
                `📋 *NENHUM AGENDAMENTO PARA CANCELAR*\n\n` +
                `Olá ${cliente.nome}, você não possui agendamentos futuros para cancelar.\n\n` +
                `Digite *MENU* para voltar ao início.`
            );
            conv.passo = null;
            await menus.mostrarMenuPrincipal(client, from);
            return;
        }
        
        // Salvar dados para a próxima etapa
        conv.dados.cliente_id = cliente.id;
        conv.dados.cliente_nome = cliente.nome;
        conv.dados.agendamentos = agendamentosAtivos;
        conv.passo = 'cancelar_escolha';
        
        let msg = `❌ *CANCELAR AGENDAMENTO* ❌\n\n`;
        msg += `👤 Cliente: ${cliente.nome}\n`;
        msg += `📞 Telefone: ${cliente.telefone}\n\n`;
        msg += `Selecione o agendamento que deseja cancelar:\n\n`;
        
        agendamentosAtivos.forEach((a, i) => {
            let dataFormatada = '';
            let horarioFormatado = '';
            
            if (a.data_hora) {
                const dataObj = new Date(a.data_hora);
                const dia = dataObj.getDate().toString().padStart(2, '0');
                const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
                const ano = dataObj.getFullYear();
                const hora = dataObj.getHours().toString().padStart(2, '0');
                const minuto = dataObj.getMinutes().toString().padStart(2, '0');
                dataFormatada = `${dia}/${mes}/${ano}`;
                horarioFormatado = `${hora}:${minuto}`;
            } else if (a.data) {
                dataFormatada = formatarDataBr(a.data);
                horarioFormatado = a.horario || 'Horário não informado';
            }
            
            msg += `${i+1}. 📅 ${dataFormatada} às ${horarioFormatado}\n`;
            msg += `   💇 ${a.servico_nome || 'Serviço'} com ${a.profissional_nome || 'Profissional'}\n`;
            msg += `   📌 Status: ${a.status || 'Agendado'}\n\n`;
        });
        
        msg += "Digite o *NÚMERO* do agendamento que deseja cancelar:";
        
        await client.sendText(from, msg);
        
    } else {
        // 🔥 CLIENTE NÃO ENCONTRADO - PERGUNTAR SE QUER TENTAR POR TELEFONE
        console.log(`📝 Cliente não encontrado: "${textoLimpo}"`);
        
        // Salvar o nome que o cliente tentou
        conv.dados.nome_tentativa = textoLimpo;
        conv.passo = 'cancelar_tentar_telefone';
        
        await client.sendText(from, 
            `❌ *CLIENTE NÃO ENCONTRADO*\n\n` +
            `Não encontrei nenhum cliente com o nome "${textoLimpo}".\n\n` +
            `Deseja tentar buscar por *telefone*?\n\n` +
            `Digite *SIM* para tentar com telefone\n` +
            `Digite *NAO* para voltar ao menu principal`
        );
    }
}

// CANCELAR AGENDAMENTO - TENTAR POR TELEFONE
async function processarCancelarTentarTelefone(client, from, conv, texto) {
    console.log(`[processarCancelarTentarTelefone] Recebido: "${texto}"`);
    
    const resposta = texto.toLowerCase().trim();
    
    if (resposta === 'sim' || resposta === 's' || resposta === 'yes') {
        // Pedir o telefone
        conv.passo = 'cancelar_telefone';
        await client.sendText(from, 
            `📞 *BUSCAR POR TELEFONE*\n\n` +
            `Digite o telefone com DDD do cliente:\n` +
            `Ex: 61999999999`
        );
    } else {
        // Voltar ao menu principal
        conv.passo = null;
        conv.dados = {};
        await menus.mostrarMenuPrincipal(client, from);
    }
}

// CANCELAR AGENDAMENTO - BUSCAR POR TELEFONE
async function processarCancelarTelefone(client, from, conv, texto) {
    console.log(`[processarCancelarTelefone] Buscando por telefone: "${texto}"`);
    
    const telefoneLimpo = texto.trim().replace(/\D/g, '');
    
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        await client.sendText(from, 
            `❌ *TELEFONE INVÁLIDO*\n\n` +
            `Digite um telefone válido com DDD (10 ou 11 dígitos).\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
        conv.passo = null;
        return;
    }
    
    const cliente = await api.buscarClientePorTelefone(telefoneLimpo);
    
    if (!cliente) {
        await client.sendText(from, 
            `❌ *CLIENTE NÃO ENCONTRADO*\n\n` +
            `Não encontrei nenhum cliente com o telefone ${telefoneLimpo}.\n\n` +
            `Verifique o número ou cadastre-se fazendo um agendamento.\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
        conv.passo = null;
        await menus.mostrarMenuPrincipal(client, from);
        return;
    }
    
    console.log(`✅ Cliente encontrado por telefone: ${cliente.nome} (ID: ${cliente.id})`);
    
    // Buscar agendamentos do cliente
    const todosAgendamentos = await api.buscarAgendamentosCliente(cliente.id);
    
    // Filtrar apenas agendamentos futuros e não cancelados
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const agendamentosAtivos = todosAgendamentos.filter(a => {
        let dataAgenda;
        if (a.data_hora) {
            dataAgenda = new Date(a.data_hora);
        } else if (a.data) {
            dataAgenda = new Date(a.data);
        } else {
            return false;
        }
        return dataAgenda >= hoje && a.status !== 'cancelado' && a.status !== 'cancelada';
    });
    
    if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
        await client.sendText(from, 
            `📋 *NENHUM AGENDAMENTO PARA CANCELAR*\n\n` +
            `Olá ${cliente.nome}, você não possui agendamentos futuros para cancelar.\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
        conv.passo = null;
        await menus.mostrarMenuPrincipal(client, from);
        return;
    }
    
    // Salvar dados para a próxima etapa
    conv.dados.cliente_id = cliente.id;
    conv.dados.cliente_nome = cliente.nome;
    conv.dados.agendamentos = agendamentosAtivos;
    conv.passo = 'cancelar_escolha';
    
    let msg = `❌ *CANCELAR AGENDAMENTO* ❌\n\n`;
    msg += `👤 Cliente: ${cliente.nome}\n`;
    msg += `📞 Telefone: ${cliente.telefone}\n\n`;
    msg += `Selecione o agendamento que deseja cancelar:\n\n`;
    
    agendamentosAtivos.forEach((a, i) => {
        let dataFormatada = '';
        let horarioFormatado = '';
        
        if (a.data_hora) {
            const dataObj = new Date(a.data_hora);
            const dia = dataObj.getDate().toString().padStart(2, '0');
            const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
            const ano = dataObj.getFullYear();
            const hora = dataObj.getHours().toString().padStart(2, '0');
            const minuto = dataObj.getMinutes().toString().padStart(2, '0');
            dataFormatada = `${dia}/${mes}/${ano}`;
            horarioFormatado = `${hora}:${minuto}`;
        } else if (a.data) {
            dataFormatada = formatarDataBr(a.data);
            horarioFormatado = a.horario || 'Horário não informado';
        }
        
        msg += `${i+1}. 📅 ${dataFormatada} às ${horarioFormatado}\n`;
        msg += `   💇 ${a.servico_nome || 'Serviço'} com ${a.profissional_nome || 'Profissional'}\n`;
        msg += `   📌 Status: ${a.status || 'Agendado'}\n\n`;
    });
    
    msg += "Digite o *NÚMERO* do agendamento que deseja cancelar:";
    
    await client.sendText(from, msg);
}

async function processarCancelarEscolha(client, from, conv, texto) {
    console.log(`[processarCancelarEscolha] Recebido: "${texto}"`);
    
    const numero = parseInt(texto);
    
    if (isNaN(numero) || numero < 1 || numero > conv.dados.agendamentos.length) {
        await client.sendText(from, 
            `❌ *NÚMERO INVÁLIDO*\n\n` +
            `Digite o número correto do agendamento que deseja cancelar (1 a ${conv.dados.agendamentos.length}).`
        );
        return;
    }
    
    const agendamento = conv.dados.agendamentos[numero - 1];
    const agendamentoId = agendamento.id;
    
    // 🔥 EXTRAIR DADOS CORRETAMENTE PARA EXIBIÇÃO
    let dataFormatada = '';
    let horarioFormatado = '';
    let servicoNome = agendamento.servico_nome || 'Serviço';
    
    if (agendamento.data_hora) {
        const dataObj = new Date(agendamento.data_hora);
        const dia = dataObj.getDate().toString().padStart(2, '0');
        const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
        const ano = dataObj.getFullYear();
        const hora = dataObj.getHours().toString().padStart(2, '0');
        const minuto = dataObj.getMinutes().toString().padStart(2, '0');
        dataFormatada = `${dia}/${mes}/${ano}`;
        horarioFormatado = `${hora}:${minuto}`;
    } else if (agendamento.data) {
        dataFormatada = formatarDataBr(agendamento.data);
        horarioFormatado = agendamento.horario || 'Horário não informado';
    }
    
    console.log(`📝 Cancelando agendamento ID: ${agendamentoId} - ${dataFormatada} às ${horarioFormatado}`);
    
    // Chamar API para cancelar
    const resultado = await api.cancelarAgendamento(agendamentoId);
    
    if (resultado && resultado.success !== false) {
        await client.sendText(from, 
            `✅ *AGENDAMENTO CANCELADO* ✅\n\n` +
            `👤 Cliente: ${conv.dados.cliente_nome}\n` +
            `📅 Data: ${dataFormatada}\n` +
            `⏰ Horário: ${horarioFormatado}\n` +
            `💇 Serviço: ${servicoNome}\n\n` +
            `Cancelamento realizado com sucesso!\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
    } else {
        const erroMsg = resultado?.error || 'Erro desconhecido';
        console.log(`❌ Erro ao cancelar: ${erroMsg}`);
        await client.sendText(from, 
            `❌ *ERRO AO CANCELAR* ❌\n\n` +
            `Não foi possível cancelar o agendamento.\n` +
            `Motivo: ${erroMsg}\n\n` +
            `Tente novamente ou entre em contato pelo telefone (61) 3244-4181.\n\n` +
            `Digite *MENU* para voltar ao início.`
        );
    }
    
    conv.passo = null;
    conv.dados = {};
    await menus.mostrarMenuPrincipal(client, from);
}

module.exports = {
    processarMenuServicos,
    processarMenuProfissionais,
    processarMenuDatas,
    processarMenuHorarios,
    processarConfirmacao,
    processarConsultaAgendamentos,
    processarCancelarNome,
    processarCancelarEscolha,
    processarCancelarTentarTelefone,
    processarCancelarTelefone,
    processarIdentificarClienteFinal,
    processarCadastrarNomeFinal,
    processarCadastrarTelefoneFinal,
    processarAtendenteHumano,    
    processarConfirmarAtendente,     
    processarModoEscuta
};