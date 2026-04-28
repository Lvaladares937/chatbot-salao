// src/api.js
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/bot';

async function buscarServicos() {
    try {
        const response = await axios.get(`${API_URL}/servicos`);
        return response.data || [];
    } catch (error) {
        console.log('Erro buscar serviços:', error.message);
        return [];
    }
}

async function buscarProfissionais() {
    try {
        const response = await axios.get(`${API_URL}/profissionais`);
        return response.data || [];
    } catch (error) {
        console.log('Erro buscar profissionais:', error.message);
        return [];
    }
}

async function buscarAgenda(profissional_id, data) {
    try {
        const response = await axios.get(`${API_URL}/profissional/${profissional_id}/agenda?data=${data}`);
        return response.data || { dias_disponiveis: [] };
    } catch (error) {
        console.log('Erro buscar agenda:', error.message);
        return { dias_disponiveis: [] };
    }
}

// api.js - CORRIGIR função criarAgendamento
async function criarAgendamento(dados) {
    try {
        console.log('📤 Enviando para API:', JSON.stringify(dados, null, 2));
        
        const response = await axios.post(`${API_URL}/agendamentos`, dados);
        
        console.log('✅ Resposta da API:', response.data);
        return response.data;
    } catch (error) {
        console.log('❌ Erro detalhado ao criar agendamento:');
        console.log('   Status:', error.response?.status);
        console.log('   Mensagem:', error.response?.data?.error || error.message);
        
        // Retorna o erro para ser exibido ao usuário
        return { 
            success: false, 
            error: error.response?.data?.error || error.message 
        };
    }
}

async function buscarClientePorTelefone(telefone) {
    try {
        const telefoneLimpo = telefone.replace(/\D/g, '');
        const response = await axios.get(`${API_URL}/clientes/buscar?telefone=${telefoneLimpo}`);
        if (response.data && response.data.length > 0) return response.data[0];
        return null;
    } catch (error) {
        return null;
    }
}

// api.js - CORRIGIR buscarClientePorNome (busca exata)
async function buscarClientePorNome(nome) {
    try {
        const response = await axios.get(`${API_URL}/clientes/buscar?nome=${encodeURIComponent(nome)}`);
        console.log(`🔍 Buscando cliente por nome: "${nome}"`);
        if (response.data && response.data.length > 0) {
            console.log(`✅ Cliente encontrado: ${response.data[0].nome}`);
            return response.data[0];
        }
        console.log(`❌ Cliente não encontrado para nome: "${nome}"`);
        return null;
    } catch (error) {
        console.log('Erro buscar cliente por nome:', error.message);
        return null;
    }
}

// api.js - CORRIGIR buscarAgendamentosCliente
async function buscarAgendamentosCliente(cliente_id) {
    try {
        const response = await axios.get(`${API_URL}/clientes/${cliente_id}/agendamentos`);
        console.log(`📋 Agendamentos encontrados para cliente ${cliente_id}: ${response.data?.length || 0}`);
        return response.data || [];
    } catch (error) {
        console.log('Erro buscar agendamentos do cliente:', error.message);
        return [];
    }
}

// api.js - CORRIGIR cancelarAgendamento
async function cancelarAgendamento(agendamento_id) {
    try {
        console.log(`📝 Cancelando agendamento ID: ${agendamento_id}`);
        
        const response = await axios.put(`${API_URL}/agendamentos/${agendamento_id}/cancelar`);
        
        console.log(`✅ Resposta do cancelamento:`, response.data);
        return response.data;
    } catch (error) {
        console.log('❌ Erro ao cancelar agendamento:', error.message);
        console.log('   Status:', error.response?.status);
        console.log('   Detalhes:', error.response?.data);
        return { success: false, error: error.response?.data?.error || error.message };
    }
}

async function criarCliente(nome, telefone) {
    try {
        const telefoneLimpo = telefone.replace(/\D/g, '');
        const response = await axios.post(`${API_URL}/clientes/completo`, {
            nome: nome,
            telefone: telefoneLimpo
        });
        return response.data;
    } catch (error) {
        console.log('Erro criar cliente:', error.message);
        return null;
    }
}

module.exports = {
    buscarServicos,
    buscarProfissionais,
    buscarAgenda,
    criarAgendamento,
    buscarClientePorTelefone,
    buscarClientePorNome,
    buscarAgendamentosCliente,
    cancelarAgendamento,
    criarCliente
};