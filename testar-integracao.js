const integracao = require('./src/integracao');

async function testar() {
    console.log('🧪 TESTANDO INTEGRAÇÃO COM O SISTEMA\n');
    
    // 1. Testar conexão
    console.log('1️⃣ Testando conexão...');
    const conectado = await integracao.testarConexao();
    
    if (!conectado) {
        console.log('\n❌ ERRO: Não foi possível conectar ao sistema!');
        console.log('   Verifique se:');
        console.log('   • O backend está rodando (http://localhost:3000)');
        console.log('   • As rotas do bot estão configuradas');
        return;
    }
    
    // 2. Buscar serviços
    console.log('\n2️⃣ Buscando serviços...');
    const servicos = await integracao.buscarServicos();
    if (servicos) {
        console.log('   Serviços disponíveis:');
        servicos.slice(0, 5).forEach(s => {
            console.log(`   • ${s.nome}: R$ ${s.preco}`);
        });
    }
    
    // 3. Buscar profissionais
    console.log('\n3️⃣ Buscando profissionais...');
    const profissionais = await integracao.buscarProfissionais();
    if (profissionais) {
        console.log('   Profissionais:');
        profissionais.slice(0, 5).forEach(p => {
            console.log(`   • ${p.nome} - ${p.especialidade}`);
        });
    }
    
    // 4. Verificar disponibilidade (exemplo)
    console.log('\n4️⃣ Testando disponibilidade...');
    if (servicos && servicos.length > 0) {
        const data = '2026-03-20';
        const disponibilidade = await integracao.verificarDisponibilidade(data, servicos[0].id);
        if (disponibilidade) {
            console.log(`   Data: ${disponibilidade.data}`);
            console.log(`   Horários disponíveis:`, disponibilidade.horarios_disponiveis);
        }
    }
    
    // 5. Informações do salão
    console.log('\n5️⃣ Informações do salão:');
    const salao = await integracao.buscarInfoSalao();
    console.log(`   Nome: ${salao.nome}`);
    console.log(`   Endereço: ${salao.endereco}`);
    console.log(`   Telefone: ${salao.telefone}`);
    
    console.log('\n🎯 Teste concluído!');
}

testar();