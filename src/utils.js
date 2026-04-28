// utils.js
function reconhecerComandoMenu(texto) {
    const text = texto.toLowerCase().trim();

    // Comandos com emojis e variações
    if (text.includes('agendar') ||
        text.includes('📅') ||
        text.includes('marcar horário') ||
        text.includes('marcar')) {
        return 'agendar';
    }

    if (text.includes('meus agendamentos') ||
        text.includes('consultar') ||
        text.includes('📋') ||
        text.includes('ver agendamentos')) {
        return 'meus_agendamentos';
    }

    if (text.includes('cancelar') ||
        text.includes('❌') ||
        text.includes('desmarcar')) {
        return 'cancelar';
    }

    if (text.includes('serviços') ||
        text.includes('servicos') ||
        text.includes('💇') ||
        text.includes('menu serviços')) {
        return 'servicos';
    }

    if (text.includes('informações') ||
        text.includes('info') ||
        text.includes('ℹ️')) {
        return 'informacoes';
    }

    // 🔥 ATENDENTE HUMANO
    if (text.includes('atendente') ||
        text.includes('humano') ||
        text.includes('falar com atendente') ||
        text.includes('atendimento') ||
        text.includes('👤') ||
        text.includes('falar com humano')) {
        return 'atendente';
    }

    if (text.includes('menu') || text === '#menu') {
        return 'menu';
    }

    if (text.includes('oi') ||
        text.includes('olá') ||
        text.includes('ola') ||
        text.includes('bom dia')) {
        return 'saudacao';
    }

    return null;
}

// 🔥 Formatar data para exibição (VERSÃO CORRIGIDA)
function formatarData(dataStr) {
    if (!dataStr) return 'Data não informada';
    
    // Se já estiver no formato DD/MM/YYYY
    if (dataStr.match(/\d{2}\/\d{2}\/\d{4}/)) {
        return dataStr;
    }
    
    // Se estiver no formato YYYY-MM-DD
    if (dataStr.match(/\d{4}-\d{2}-\d{2}/)) {
        const partes = dataStr.split('-');
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    
    // Tentar criar uma data
    try {
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
    } catch (e) {
        console.log('Erro ao formatar data:', e);
    }
    
    return dataStr;
}

// 🔥 Obter dia da semana (VERSÃO CORRIGIDA)
function getDiaSemana(dataStr) {
    if (!dataStr) return 'Data não informada';
    
    let data;
    let ano, mes, dia;
    
    // Se for DD/MM/YYYY
    if (dataStr.match(/\d{2}\/\d{2}\/\d{4}/)) {
        const partes = dataStr.split('/');
        dia = parseInt(partes[0]);
        mes = parseInt(partes[1]) - 1; // Mês em JS é 0-11
        ano = parseInt(partes[2]);
        data = new Date(ano, mes, dia);
    } 
    // Se for YYYY-MM-DD
    else if (dataStr.match(/\d{4}-\d{2}-\d{2}/)) {
        const partes = dataStr.split('-');
        ano = parseInt(partes[0]);
        mes = parseInt(partes[1]) - 1;
        dia = parseInt(partes[2]);
        data = new Date(ano, mes, dia);
    }
    else {
        data = new Date(dataStr);
    }
    
    if (isNaN(data.getTime())) return 'Data inválida';
    
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[data.getDay()];
}

// Comandos de navegação para menus paginados
function reconhecerNavegacao(texto) {
    const text = texto.toLowerCase().trim();

    if (text.includes('próximo') ||
        text.includes('proximo') ||
        text.includes('➡️') ||
        text === 'next') {
        return 'proximo';
    }

    if (text.includes('anterior') ||
        text.includes('◀️') ||
        text === 'prev') {
        return 'anterior';
    }

    if (text.includes('voltar') ||
        text.includes('🔙') ||
        text === 'back') {
        return 'voltar';
    }

    return null;
}

// 🔥 NOVA FUNÇÃO: Extrair data de texto como "15/04/2026 (Quarta)"
function extrairDataDeTexto(texto) {
    const match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        const dia = match[1];
        const mes = match[2];
        const ano = match[3];
        return `${ano}-${mes}-${dia}`; // Retorna no formato YYYY-MM-DD
    }
    return null;
}

// 🔥 NOVA FUNÇÃO: Gerar horários de 30 em 30 minutos
function gerarHorarios(inicio = 9, fim = 19, intervalo = 30) {
    const horarios = [];
    for (let hora = inicio; hora <= fim; hora++) {
        for (let minuto of [0, intervalo]) {
            if (hora === fim && minuto === intervalo) continue;
            const horaStr = hora.toString().padStart(2, '0');
            const minutoStr = minuto.toString().padStart(2, '0');
            horarios.push(`${horaStr}:${minutoStr}`);
        }
    }
    return horarios;
}

module.exports = { 
    reconhecerComandoMenu, 
    reconhecerNavegacao,
    formatarData,
    getDiaSemana,
    extrairDataDeTexto,
    gerarHorarios
};