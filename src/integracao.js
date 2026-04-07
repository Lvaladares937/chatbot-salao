const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/bot';

class IntegracaoSistema {
    constructor() {
        this.api = axios.create({
            baseURL: API_URL,
            timeout: 5000
        });
    }

    // Buscar serviços disponíveis
    async buscarServicos() {
        try {
            const response = await this.api.get('/servicos');
            console.log(`✅ ${response.data.length} serviços carregados do sistema`);
            return response.data;
        } catch (error) {
            console.log('⚠️ Erro ao buscar serviços do sistema:', error.message);
            return null;
        }
    }

    // Buscar profissionais disponíveis
    async buscarProfissionais() {
        try {
            const response = await this.api.get('/profissionais');
            console.log(`✅ ${response.data.length} profissionais carregados do sistema`);
            return response.data;
        } catch (error) {
            console.log('⚠️ Erro ao buscar profissionais:', error.message);
            return null;
        }
    }

    // Verificar disponibilidade de horário
    async verificarDisponibilidade(data, servico_id) {
        try {
            const response = await this.api.get('/disponibilidade', {
                params: { data, servico_id }
            });
            console.log(`✅ Disponibilidade verificada:`, response.data);
            return response.data;
        } catch (error) {
            console.log('⚠️ Erro ao verificar disponibilidade:', error.message);
            return null;
        }
    }

    // Criar agendamento
    async criarAgendamento(dados) {
        try {
            console.log('📝 Enviando agendamento para o sistema:', dados);
            const response = await this.api.post('/agendamentos', dados);
            console.log('✅ Agendamento criado no sistema:', response.data);
            return response.data;
        } catch (error) {
            console.log('⚠️ Erro ao criar agendamento no sistema:', error.message);
            return null;
        }
    }

    // Buscar informações do salão
    async buscarInfoSalao() {
        try {
            const response = await this.api.get('/salao');
            return response.data;
        } catch (error) {
            console.log('⚠️ Usando informações padrão do salão');
            return {
                nome: process.env.SALAO_NOME || "Vailson's Hair & Makeup",
                endereco: process.env.SALAO_ENDERECO || "Asa Sul CLS 210 Bloco B Loja 18 - Brasília",
                telefone: process.env.SALAO_TELEFONE || "(61) 3244-4181",
                horario: "Segunda a Sexta: 9h às 19h | Sábado: 9h às 17h"
            };
        }
    }

    // Testar conexão
    async testarConexao() {
        try {
            const response = await this.api.get('/test');
            console.log('✅ Conexão com o sistema OK:', response.data);
            return true;
        } catch (error) {
            console.log('❌ Erro de conexão com o sistema:', error.message);
            return false;
        }
    }
}

module.exports = new IntegracaoSistema();