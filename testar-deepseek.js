// testar-deepseek.js
require('dotenv').config();
const axios = require('axios');

// ============================================
// CONFIGURAÇÃO DA API DEEPSEEK
// ============================================
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
    console.error('❌ ERRO: DEEPSEEK_API_KEY não encontrada no arquivo .env');
    console.log('📝 Adicione no seu .env: DEEPSEEK_API_KEY=sua_chave_aqui');
    process.exit(1);
}

// ============================================
// CLASSE PARA TESTAR A API DEEPSEEK
// ============================================
class DeepSeekTester {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.config = {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        this.estatisticas = {
            sucessos: 0,
            falhas: 0,
            tempoTotal: 0,
            custoEstimado: 0
        };
    }

    async testarModelo(mensagem, modelo = 'deepseek-chat', options = {}) {
        const {
            temperatura = 0.7,
            maxTokens = 1000,
            systemPrompt = 'Você é um atendente do salão Vailson\'s Hair & Makeup. Responda de forma amigável e profissional em português.'
        } = options;

        console.log(`\n📡 Testando modelo: ${modelo}`);
        console.log(`💬 Mensagem: "${mensagem}"`);
        
        const inicio = Date.now();
        
        try {
            const response = await axios.post(
                DEEPSEEK_API_URL,
                {
                    model: modelo,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: mensagem }
                    ],
                    temperature: temperatura,
                    max_tokens: maxTokens,
                    stream: false
                },
                this.config
            );

            const tempo = Date.now() - inicio;
            const resposta = response.data.choices[0].message.content;
            
            // Calcular tokens estimados (aproximadamente 4 caracteres = 1 token)
            const tokensInput = Math.ceil(systemPrompt.length / 4) + Math.ceil(mensagem.length / 4);
            const tokensOutput = Math.ceil(resposta.length / 4);
            
            // Estimar custo (baseado em $0.14/1M input, $0.28/1M output)
            const custoInput = (tokensInput / 1000000) * 0.28; // em USD
            const custoOutput = (tokensOutput / 1000000) * 0.55; // em USD
            const custoTotalUSD = custoInput + custoOutput;
            const custoTotalBRL = custoTotalUSD * 5.5; // câmbio aproximado

            this.estatisticas.sucessos++;
            this.estatisticas.tempoTotal += tempo;
            this.estatisticas.custoEstimado += custoTotalBRL;

            console.log(`✅ SUCESSO! (${tempo}ms)`);
            console.log(`📊 Tokens: ~${tokensInput} input, ~${tokensOutput} output`);
            console.log(`💰 Custo: R$ ${custoTotalBRL.toFixed(6)} (US$ ${custoTotalUSD.toFixed(6)})`);
            console.log(`🤖 Resposta: "${resposta.substring(0, 150)}${resposta.length > 150 ? '...' : ''}"`);

            return {
                sucesso: true,
                modelo,
                resposta,
                tempo,
                tokensInput,
                tokensOutput,
                custo: custoTotalBRL
            };

        } catch (error) {
            const tempo = Date.now() - inicio;
            this.estatisticas.falhas++;

            console.log(`❌ FALHOU! (${tempo}ms)`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Erro: ${JSON.stringify(error.response.data)}`);
            } else {
                console.log(`   Erro: ${error.message}`);
            }

            return {
                sucesso: false,
                modelo,
                erro: error.message
            };
        }
    }

    async testarModelosDisponiveis() {
        console.log('\n🔍 TESTANDO MODELOS DEEPSEEK\n');
        console.log('=' .repeat(80));

        const modelos = [
            { 
                nome: 'deepseek-chat', 
                descricao: 'Modelo principal para chat (DeepSeek-V3)',
                ideal: 'Conversas gerais, atendimento'
            },
            { 
                nome: 'deepseek-reasoner', 
                descricao: 'Modelo com raciocínio (DeepSeek-R1)',
                ideal: 'Agendamentos, tarefas complexas'
            }
        ];

        const mensagens = [
            "Qual o horário de funcionamento do salão?",
            "Quanto custa um corte masculino?",
            "Onde fica o salão?",
            "Preciso agendar um horário",
            "Aceitam cartão de crédito?"
        ];

        for (const modelo of modelos) {
            console.log(`\n📌 TESTANDO: ${modelo.nome}`);
            console.log(`📋 Descrição: ${modelo.descricao}`);
            console.log(`🎯 Ideal para: ${modelo.ideal}`);
            console.log('-'.repeat(80));

            // Testar com 3 mensagens diferentes
            for (let i = 0; i < 3; i++) {
                await this.testarModelo(mensagens[i], modelo.nome);
                await this.delay(1000); // Pausa de 1s entre requisições
            }
            
            console.log('-'.repeat(80));
        }

        this.mostrarResumo();
    }

    async simularConversaCompleta() {
        console.log('\n🔄 SIMULANDO CONVERSA COMPLETA\n');
        console.log('=' .repeat(80));

        const conversa = [
            { role: 'user', content: 'Olá, gostaria de informações sobre corte de cabelo' },
            { role: 'assistant', content: '' },
            { role: 'user', content: 'Quanto custa o corte masculino?' },
            { role: 'assistant', content: '' },
            { role: 'user', content: 'Tem horário para amanhã às 15h?' },
            { role: 'assistant', content: '' },
            { role: 'user', content: 'Qual o endereço do salão?' },
            { role: 'assistant', content: '' }
        ];

        let historico = [
            { role: 'system', content: 'Você é um atendente do salão Vailson\'s Hair & Makeup. Seja simpático e profissional.' }
        ];

        console.log('🤖 Iniciando conversa simulada...\n');

        for (let i = 0; i < conversa.length; i += 2) {
            const pergunta = conversa[i].content;
            
            historico.push({ role: 'user', content: pergunta });
            
            console.log(`👤 Cliente: ${pergunta}`);
            
            try {
                const response = await axios.post(
                    DEEPSEEK_API_URL,
                    {
                        model: 'deepseek-chat',
                        messages: historico,
                        temperature: 0.7,
                        max_tokens: 500
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const resposta = response.data.choices[0].message.content;
                historico.push({ role: 'assistant', content: resposta });
                
                console.log(`🤖 Bot: ${resposta.substring(0, 100)}...\n`);
                
            } catch (error) {
                console.log(`❌ Erro na conversa: ${error.message}\n`);
            }

            await this.delay(1500);
        }

        console.log('✅ Conversa simulada concluída!');
        this.mostrarResumo();
    }

    async testarCache() {
        console.log('\n💾 TESTANDO SISTEMA DE CACHE\n');
        console.log('=' .repeat(80));

        const promptRepetido = "Qual o horário de funcionamento?";
        const systemPrompt = "Você é um atendente de salão.";

        console.log('📌 Primeira chamada (sem cache):');
        const resultado1 = await this.testarModelo(promptRepetido, 'deepseek-chat', { systemPrompt });
        
        console.log('\n📌 Segunda chamada (com cache provavelmente):');
        const resultado2 = await this.testarModelo(promptRepetido, 'deepseek-chat', { systemPrompt });

        if (resultado1.sucesso && resultado2.sucesso) {
            const economia = resultado1.custo - resultado2.custo;
            console.log(`\n💰 Economia estimada com cache: R$ ${economia.toFixed(6)}`);
        }

        console.log('-'.repeat(80));
    }

    async benchmark(quantidade = 5) {
        console.log(`\n⚡ EXECUTANDO BENCHMARK (${quantidade} requisições)\n`);
        console.log('=' .repeat(80));

        const mensagens = [
            "Oi, tudo bem?",
            "Qual o preço do corte?",
            "Aceitam cartão?",
            "Onde fica?",
            "Tem estacionamento?"
        ];

        const tempos = [];

        for (let i = 0; i < quantidade; i++) {
            const resultado = await this.testarModelo(mensagens[i % mensagens.length], 'deepseek-chat');
            if (resultado.sucesso) {
                tempos.push(resultado.tempo);
            }
            await this.delay(500);
        }

        if (tempos.length > 0) {
            const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
            const min = Math.min(...tempos);
            const max = Math.max(...tempos);
            
            console.log('\n📊 RESULTADOS DO BENCHMARK:');
            console.log(`   ⏱️  Tempo médio: ${media.toFixed(0)}ms`);
            console.log(`   ⏱️  Tempo mínimo: ${min}ms`);
            console.log(`   ⏱️  Tempo máximo: ${max}ms`);
        }
    }

    mostrarResumo() {
        console.log('\n📊 RESUMO DOS TESTES');
        console.log('=' .repeat(80));
        console.log(`✅ Sucessos: ${this.estatisticas.sucessos}`);
        console.log(`❌ Falhas: ${this.estatisticas.falhas}`);
        console.log(`📈 Taxa de sucesso: ${((this.estatisticas.sucessos / (this.estatisticas.sucessos + this.estatisticas.falhas)) * 100).toFixed(1)}%`);
        
        if (this.estatisticas.sucessos > 0) {
            const tempoMedio = this.estatisticas.tempoTotal / this.estatisticas.sucessos;
            console.log(`⏱️  Tempo médio: ${tempoMedio.toFixed(0)}ms`);
            console.log(`💰 Custo total estimado: R$ ${this.estatisticas.custoEstimado.toFixed(4)}`);
            console.log(`📊 Custo médio por requisição: R$ ${(this.estatisticas.custoEstimado / this.estatisticas.sucessos).toFixed(6)}`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================
// MENU INTERATIVO
// ============================================
async function main() {
    console.log('\n🚀 TESTADOR DA API DEEPSEEK');
    console.log('=' .repeat(80));

    const tester = new DeepSeekTester(DEEPSEEK_API_KEY);

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function menu() {
        console.log('\n📋 MENU DE TESTES:');
        console.log('1️⃣  - Testar modelos disponíveis');
        console.log('2️⃣  - Simular conversa completa');
        console.log('3️⃣  - Testar cache (economia)');
        console.log('4️⃣  - Executar benchmark');
        console.log('5️⃣  - Fazer uma pergunta específica');
        console.log('6️⃣  - Ver estatísticas');
        console.log('7️⃣  - Sair');
        
        readline.question('\nEscolha uma opção: ', async (opcao) => {
            switch(opcao) {
                case '1':
                    await tester.testarModelosDisponiveis();
                    menu();
                    break;
                    
                case '2':
                    await tester.simularConversaCompleta();
                    menu();
                    break;
                    
                case '3':
                    await tester.testarCache();
                    menu();
                    break;
                    
                case '4':
                    await tester.benchmark(5);
                    menu();
                    break;
                    
                case '5':
                    readline.question('Digite sua pergunta: ', async (pergunta) => {
                        await tester.testarModelo(pergunta, 'deepseek-chat');
                        menu();
                    });
                    break;
                    
                case '6':
                    tester.mostrarResumo();
                    menu();
                    break;
                    
                case '7':
                    console.log('👋 Saindo...');
                    readline.close();
                    break;
                    
                default:
                    console.log('❌ Opção inválida');
                    menu();
            }
        });
    }

    menu();
}

// ============================================
// TESTE RÁPIDO (SE EXECUTADO DIRETAMENTE)
// ============================================
if (require.main === module) {
    main();
}

module.exports = DeepSeekTester;