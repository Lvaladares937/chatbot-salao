// src/menus.js - VERSÃO COM SENDLISTMESSAGE (SUPORTADA)
const { formatarData, getDiaSemana } = require('./utils');

// Menu Principal
async function mostrarMenuPrincipal(client, to) {
    const sections = [{
        title: "🏠 MENU PRINCIPAL",
        rows: [
            { id: "menu_agendar", title: "📅 AGENDAR", description: "Marcar um novo horário" },
            { id: "menu_agendamentos", title: "📋 MEUS AGENDAMENTOS", description: "Consultar seus horários" },
            { id: "menu_cancelar", title: "❌ CANCELAR", description: "Cancelar um agendamento" },
            { id: "menu_servicos", title: "💇 SERVIÇOS", description: "Ver lista de serviços" },
            { id: "menu_info", title: "ℹ️ INFORMAÇÕES", description: "Endereço, telefone e horário" },
            { id: "menu_humano", title: "👤 FALAR COM ATENDENTE", description: "Problemas ou dúvidas? Fale com um humano" }
        ]
    }];
    
    await client.sendListMessage(to, {
        title: "SALÃO VAILSON",
        sections: sections,
        buttonText: "MENU",
        description: "Escolha uma opção abaixo:"
    });
}

// menus.js - Verifique se a função mostrarMenuServicos está assim:

async function mostrarMenuServicos(client, to, servicos, pagina = 1, dados) {
    const itensPorPagina = 10;
    const totalPaginas = Math.ceil(servicos.length / itensPorPagina);
    const inicio = (pagina - 1) * itensPorPagina;
    const lista = servicos.slice(inicio, inicio + itensPorPagina);

    const rows = lista.map(s => ({
        id: `servico_${s.id}`,  // ← ID correto
        title: s.nome.length > 24 ? s.nome.substring(0, 21) + '...' : s.nome,
        description: `R$ ${parseFloat(s.preco).toFixed(2)}`
    }));

    // Adicionar botões de navegação com os IDs CORRETOS
    if (pagina > 1) {
        rows.unshift({ 
            id: "pagina_anterior",  // ← ID correto
            title: "◀️ PÁGINA ANTERIOR", 
            description: `Ir para página ${pagina - 1}` 
        });
    }
    if (pagina < totalPaginas) {
        rows.push({ 
            id: "proxima_pagina",  // ← ID correto
            title: "PRÓXIMA PÁGINA ▶️", 
            description: `Ir para página ${pagina + 1}` 
        });
    }
    rows.push({ 
        id: "voltar_menu",  // ← ID correto
        title: "🔙 VOLTAR AO MENU", 
        description: "Voltar para o início" 
    });

    await client.sendListMessage(to, {
        title: `💇 SERVIÇOS (Pág ${pagina}/${totalPaginas})`,
        buttonText: "VER SERVIÇOS",
        sections: [{ title: "Escolha um serviço:", rows }]
    });
}

// Menu de Profissionais
async function mostrarMenuProfissionais(client, to, profissionais, servicoNome) {
    const rows = profissionais.map(p => ({
        id: `profissional_${p.id}`,
        title: p.nome,
        description: p.especialidade || "Profissional"
    }));
    rows.push({ id: "voltar_servicos", title: "🔙 VOLTAR", description: "Voltar para serviços" });
    
    const sections = [{ title: `👤 ESCOLHA O PROFISSIONAL`, rows: rows }];
    
    await client.sendListMessage(to, {
        title: "👤 PROFISSIONAIS",
        sections: sections,
        buttonText: "VER PROFISSIONAIS",
        description: `Serviço: ${servicoNome}`
    });
}

// menus.js - CORRIGIR função mostrarMenuDatas
async function mostrarMenuDatas(client, to, datas) {
    // Verificar se datas existe e é um array
    if (!datas || !Array.isArray(datas) || datas.length === 0) {
        console.log('⚠️ Nenhuma data disponível');
        await client.sendText(to, "📅 *DATAS DISPONÍVEIS*\n\nNenhuma data disponível no momento.\n\n🔙 Digite *VOLTAR* para tentar novamente.");
        return;
    }

    const rows = datas.map(d => ({
        id: `data_${d.data}`,
        title: `${formatarData(d.data)} (${getDiaSemana(d.data)})`
    }));

    rows.push({ id: "voltar_profissionais", title: "🔙 VOLTAR", description: "Voltar para profissionais" });

    await client.sendListMessage(to, {
        title: "📅 DATAS DISPONÍVEIS",
        buttonText: "VER DATAS",
        sections: [{ title: "Selecione uma data:", rows }]
    });
}

// menus.js - Versão com indicadores no título do botão
async function mostrarMenuHorarios(client, to, horariosDisponiveis, horariosOcupados, dataFormatada) {
    // Verificar se horários existe e tem itens
    if (!horariosDisponiveis || horariosDisponiveis.length === 0) {
        await client.sendText(to, "⏰ *HORÁRIOS*\n\nNenhum horário disponível para esta data.\n\n🔙 Digite *VOLTAR* para escolher outra data.");
        return;
    }

    // Gerar lista de horários com indicadores
    const todosHorarios = [];
    for (let hora = 9; hora <= 19; hora++) {
        for (let minuto of [0, 30]) {
            if (hora === 19 && minuto === 30) continue;
            const horaStr = hora.toString().padStart(2, '0');
            const minutoStr = minuto.toString().padStart(2, '0');
            todosHorarios.push(`${horaStr}:${minutoStr}`);
        }
    }
    
    // Criar rows para o ListMessage
    const rows = [];
    let numero = 1;
    
    for (const horario of todosHorarios) {
        const isDisponivel = horariosDisponiveis.includes(horario);
        const isOcupado = horariosOcupados && horariosOcupados.includes(horario);
        
        if (isDisponivel) {
            // Botão para horário disponível
            rows.push({
                id: `horario_${horario}`,
                title: `✅ ${horario} - Disponível`,
                description: `Clique para selecionar horário ${horario}`
            });
        } else if (isOcupado) {
            // 🔥 Botão para horário ocupado (mas não clicável? Infelizmente não dá para desabilitar)
            // Vamos colocar uma mensagem informando que está ocupado
            rows.push({
                id: `horario_ocupado_${horario}`,
                title: `❌ ${horario} - OCUPADO`,
                description: `Este horário já está reservado`
            });
        }
    }
    
    // Adicionar botão de voltar
    rows.push({ id: "voltar_datas", title: "🔙 VOLTAR", description: "Voltar para datas" });
    
    await client.sendListMessage(to, {
        title: `⏰ HORÁRIOS PARA ${dataFormatada}`,
        buttonText: "VER HORÁRIOS",
        sections: [{ 
            title: `✅ Disponíveis | ❌ Ocupados`, 
            rows: rows 
        }]
    });
}

// Confirmação via texto (já que sendButtons não funciona)
async function mostrarConfirmacaoAgendamento(client, to, dados) {
    const dataFormatada = formatarData(dados.data);
    const diaSemana = getDiaSemana(dados.data);
    
    const mensagem = `✅ *CONFIRMAR AGENDAMENTO*\n\n` +
        `💇 Serviço: ${dados.servico.nome}\n` +
        `👤 Profissional: ${dados.profissional.nome}\n` +
        `📅 Data: ${dataFormatada} (${diaSemana})\n` +
        `⏰ Horário: ${dados.horario}\n` +
        `💰 Valor: R$ ${parseFloat(dados.servico.preco).toFixed(2)}\n\n` +
        `Deseja confirmar? Responda com *SIM* ou *NAO*`;
    
    await client.sendText(to, mensagem);
}

// Informações
async function mostrarInformacoes(client, to) {
    const info = `ℹ️ *INFORMAÇÕES DO SALÃO*\n\n` +
        `📍 *Endereço:* Asa Sul CLS 210 Bloco B Loja 18 - Brasília\n\n` +
        `📞 *Telefone:* (61) 3244-4181\n\n` +
        `⏰ *Horário de Funcionamento:*\n` +
        `Segunda a Sábado: 9h às 19h\n` +
        `Domingo: Fechado`;
    
    await client.sendText(to, info);
}

module.exports = {
    mostrarMenuPrincipal,
    mostrarMenuServicos,
    mostrarMenuProfissionais,
    mostrarMenuDatas,
    mostrarMenuHorarios,
    mostrarConfirmacaoAgendamento,
    mostrarInformacoes
};