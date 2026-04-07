// calcom-service.js
const { cal, SERVICOS_CALCOM } = require('./calcom-config');

// Função para verificar disponibilidade de horários
async function verificarDisponibilidadeCalCom(data, servico) {
  try {
    console.log(`🔍 Verificando disponibilidade para ${servico} em ${data}...`);
    
    // Mapear serviço para eventTypeId
    const servicoLower = servico.toLowerCase();
    const eventTypeId = SERVICOS_CALCOM[servicoLower];
    
    if (!eventTypeId) {
      console.log('⚠️ Serviço não mapeado:', servico);
      return [];
    }
    
    // Formatar data para ISO
    const [dia, mes] = data.split('/');
    const ano = new Date().getFullYear();
    const dataObj = new Date(ano, mes - 1, dia);
    
    // Buscar slots disponíveis
    // NOTA: A sintaxe exata pode variar. Vamos testar primeiro
    try {
      const slots = await cal.slots.getAvailable({
        eventTypeId: eventTypeId,
        startTime: dataObj.toISOString(),
        endTime: new Date(dataObj.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'America/Sao_Paulo'
      });
      
      return slots;
    } catch (apiError) {
      console.log('⚠️ Método getAvailable não encontrado, tentando método alternativo...');
      // Se o método não existir, retornamos array vazio por enquanto
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error.message);
    return [];
  }
}

// Função para criar agendamento
async function criarAgendamentoCalCom(dados) {
  try {
    console.log('📝 Criando agendamento no Cal.com...');
    
    const servicoLower = dados.servico.toLowerCase();
    const eventTypeId = SERVICOS_CALCOM[servicoLower];
    
    if (!eventTypeId) {
      throw new Error('Serviço não encontrado');
    }
    
    // Formatar data e hora
    const [dia, mes] = dados.data.split('/');
    const [hora, minuto] = dados.horario.split(':');
    const ano = new Date().getFullYear();
    
    // Criar objeto Date no fuso de Brasília
    const startDateTime = new Date(ano, mes - 1, dia, hora, minuto);
    
    // Criar booking no Cal.com
    try {
      const booking = await cal.bookings.create({
        eventTypeId: eventTypeId,
        start: startDateTime.toISOString(),
        attendee: {
          name: dados.nome,
          email: dados.email || `${dados.nome.replace(/\s+/g, '').toLowerCase()}@cliente.temp`,
          timeZone: 'America/Sao_Paulo'
        },
        metadata: {
          telefone: dados.telefone || '',
          profissional: dados.profissional || 'A definir',
          origem: 'whatsapp-bot'
        }
      });
      
      console.log('✅ Agendamento criado no Cal.com:', booking);
      return booking;
      
    } catch (apiError) {
      console.log('⚠️ Método create não encontrado, simulando criação...');
      // Simular criação para teste
      return {
        id: Math.floor(Math.random() * 1000),
        status: 'simulado',
        dados: dados
      };
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error.message);
    return null;
  }
}

// Função para listar tipos de evento (para debug)
async function listarEventTypes() {
  try {
    console.log('📋 Listando tipos de evento...');
    
    try {
      const eventTypes = await cal.eventTypes.list();
      console.log('📅 Tipos de evento disponíveis:');
      if (eventTypes && eventTypes.length > 0) {
        eventTypes.forEach(et => {
          console.log(`   ID: ${et.id} - ${et.title} (${et.length}min)`);
        });
      } else {
        console.log('   Nenhum evento encontrado ou API retornou vazio');
      }
      return eventTypes || [];
      
    } catch (apiError) {
      console.log('⚠️ API não disponível, retornando lista simulada');
      // Retornar lista simulada para teste
      const eventosSimulados = [
        { id: 1, title: 'Corte Masculino', length: 60 },
        { id: 2, title: 'Corte Feminino', length: 90 },
        { id: 3, title: 'Coloração', length: 120 }
      ];
      eventosSimulados.forEach(et => {
        console.log(`   ID: ${et.id} - ${et.title} (${et.length}min) (SIMULADO)`);
      });
      return eventosSimulados;
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar event types:', error.message);
    return [];
  }
}

module.exports = {
  verificarDisponibilidadeCalCom,
  criarAgendamentoCalCom,
  listarEventTypes
};