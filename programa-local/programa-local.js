const WebSocket = require('ws');
const readline = require('readline-sync');
const sql = require('mssql');
require('dotenv').config();

class LojaClient {
  constructor() {
    this.ws = null;
    this.cnpj = process.env.CNPJ || '12345678000123';
    this.connected = false;
    this.sqlPool = null;
    this.sqlConnected = false;
    
    console.clear();
    console.log('='.repeat(60));
    console.log('🏪 SISTEMA CONTROLE DE ESTOQUE - CLIENTE LOCAL v2.0');
    console.log('='.repeat(60));
    console.log(`📋 Loja: ${process.env.LOJA_NOME || 'Loja Teste'}`);
    console.log(`📋 CNPJ: ${this.cnpj}`);
    console.log(`🌐 VPS: ${process.env.VPS_WS_URL || 'ws://31.97.24.246:8080'}`);
    console.log(`🗄️  SQL Server: ${process.env.DB_SERVER || 'localhost'}`);
    console.log('='.repeat(60));
  }

  async connectToSQLServer() {
    const config = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'EstoqueDB',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true' || false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    };

    try {
      console.log('🔌 Conectando no SQL Server...');
      this.sqlPool = await sql.connect(config);
      this.sqlConnected = true;
      console.log('✅ Conectado no SQL Server com sucesso!');
      return true;
    } catch (error) {
      console.error('🚨 Erro ao conectar SQL Server:', error.message);
      this.sqlConnected = false;
      return false;
    }
  }

  async connectToVPS() {
    const vpsUrl = process.env.VPS_WS_URL || 'ws://31.97.24.246:8080';
    console.log(`🔌 Conectando na VPS...`);
    
    try {
      this.ws = new WebSocket(vpsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ Conectado na VPS com sucesso!');
        this.registerLoja();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });
      
      this.ws.on('close', () => {
        console.log('❌ Conexão VPS perdida. Tentando reconectar...');
        this.connected = false;
        setTimeout(() => this.connectToVPS(), 5000);
      });
      
      this.ws.on('error', (error) => {
        console.error('🚨 Erro na conexão VPS:', error.message);
        setTimeout(() => this.connectToVPS(), 5000);
      });
      
    } catch (error) {
      console.error('🚨 Erro ao conectar VPS:', error.message);
      setTimeout(() => this.connectToVPS(), 5000);
    }
  }

  registerLoja() {
    const registerMsg = {
      type: 'register',
      cnpj: this.cnpj,
      loja: process.env.LOJA_NOME || 'Loja Teste',
      timestamp: new Date().toISOString()
    };
    
    this.ws.send(JSON.stringify(registerMsg));
    console.log(`📝 Loja registrada na VPS`);
    this.connected = true;
  }

  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'registered':
          console.log('✅ Registrado com sucesso na VPS');
          break;
          
        case 'query':
          console.log(`📨 Query recebida do app mobile`);
          await this.executeQuery(message);
          break;
          
        case 'ping':
          this.ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          console.log('📡 Pong enviado');
          break;
          
        default:
          console.log('❓ Comando desconhecido:', message.type);
      }
    } catch (error) {
      console.error('🚨 Erro ao processar comando:', error.message);
    }
  }

  async executeQuery(message) {
    try {
      console.log('🔍 Executando consulta no SQL Server...');
      
      // Sua query customizada
      const querySQL = `
        select 
          codigo, 
          nome, 
          pco_remar, 
          est_atual, 
          est_minim, 
          (select a.nome from sub_grupos a where a.codigo = vprodutos.subg) subg 
        from vprodutos
      `;
      
      let dadosProdutos = [];
      
      if (this.sqlConnected && this.sqlPool) {
        // Executar query real
        const result = await this.sqlPool.request().query(querySQL);
        
        // Mapear resultados para formato esperado pelo app
        dadosProdutos = result.recordset.map(row => ({
          codigo: row.codigo,
          nome: row.nome,
          precoAtual: parseFloat(row.pco_remar) || 0,
          estoqueAtual: parseInt(row.est_atual) || 0,
          estoqueMinimo: parseInt(row.est_minim) || 0,
          subgrupo: row.subg || 'Sem categoria'
        }));
        
        console.log(`✅ Consultados ${dadosProdutos.length} produtos do SQL Server`);
      } else {
        console.log('⚠️  SQL Server desconectado, usando dados simulados');
        dadosProdutos = this.gerarDadosSimulados();
      }
      
      const response = {
        type: 'response',
        requestId: message.requestId,
        data: dadosProdutos,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(response));
      console.log(`📤 Resposta enviada: ${dadosProdutos.length} produtos`);
      
    } catch (error) {
      console.error('🚨 Erro na consulta SQL:', error.message);
      
      // Em caso de erro, enviar dados simulados
      const dadosSimulados = this.gerarDadosSimulados();
      
      const errorResponse = {
        type: 'response',
        requestId: message.requestId,
        data: dadosSimulados,
        error: `Erro SQL: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(errorResponse));
    }
  }

  // Manter dados simulados como fallback
  gerarDadosSimulados() {
    return [
      {
        codigo: '7891234567890',
        nome: 'Produto Simulado - SQL Server Offline',
        precoAtual: 99.99,
        estoqueAtual: 5,
        estoqueMinimo: 3,
        subgrupo: 'Simulado'
      }
    ];
  }

  showMenu() {
    console.log('\n' + '='.repeat(50));
    console.log('📱 MENU DO SISTEMA');
    console.log('='.repeat(50));
    console.log('1. 📊 Status das conexões');
    console.log('2. 📡 Testar comunicação VPS');
    console.log('3. 🗄️  Testar consulta SQL Server');
    console.log('4. 📦 Visualizar produtos (SQL)');
    console.log('5. ⚙️  Mostrar configurações');
    console.log('6. 🔄 Reconectar sistemas');
    console.log('7. 🚪 Sair do sistema');
    console.log('='.repeat(50));
  }

  async startInteractiveMode() {
    while (true) {
      this.showMenu();
      const opcao = readline.question('Escolha uma opção (1-7): ');
      
      switch (opcao) {
        case '1':
          console.log('\n📊 STATUS DAS CONEXÕES:');
          console.log(`VPS: ${this.connected ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
          console.log(`SQL Server: ${this.sqlConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
          console.log(`CNPJ: ${this.cnpj}`);
          console.log(`Banco: ${process.env.DB_DATABASE}`);
          break;
          
        case '2':
          if (this.connected) {
            this.ws.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
            console.log('📡 Ping enviado para VPS...');
          } else {
            console.log('❌ VPS não conectada');
          }
          break;
          
        case '3':
          await this.testeSQLConnection();
          break;
          
        case '4':
          await this.mostrarProdutosSQL();
          break;
          
        case '5':
          console.log('\n⚙️ CONFIGURAÇÕES:');
          console.log(`CNPJ: ${this.cnpj}`);
          console.log(`Loja: ${process.env.LOJA_NOME}`);
          console.log(`SQL Server: ${process.env.DB_SERVER}`);
          console.log(`Banco: ${process.env.DB_DATABASE}`);
          console.log(`VPS: ${process.env.VPS_WS_URL}`);
          break;
          
        case '6':
          console.log('🔄 Reconectando sistemas...');
          await this.connectToSQLServer();
          if (this.ws) this.ws.close();
          setTimeout(() => this.connectToVPS(), 1000);
          break;
          
        case '7':
          console.log('👋 Encerrando sistema...');
          if (this.ws) this.ws.close();
          if (this.sqlPool) this.sqlPool.close();
          process.exit(0);
          
        default:
          console.log('❌ Opção inválida!');
      }
      
      console.log('\n⏸️  Pressione ENTER para continuar...');
      readline.question('');
    }
  }

  async testeSQLConnection() {
    try {
      if (!this.sqlConnected) {
        await this.connectToSQLServer();
      }
      
      if (this.sqlConnected) {
        const result = await this.sqlPool.request().query('SELECT COUNT(*) as total FROM vprodutos');
        console.log(`✅ Teste SQL OK - ${result.recordset[0].total} produtos encontrados`);
      }
    } catch (error) {
      console.error('🚨 Erro no teste SQL:', error.message);
    }
  }

  async mostrarProdutosSQL() {
    try {
      if (!this.sqlConnected) {
        await this.connectToSQLServer();
      }
      
      if (this.sqlConnected) {
        const query = `
          select TOP 10
            codigo, 
            nome, 
            pco_remar, 
            est_atual, 
            est_minim, 
            (select a.nome from sub_grupos a where a.codigo = vprodutos.subg) subg 
          from vprodutos
        `;
        
        const result = await this.sqlPool.request().query(query);
        
        console.log('\n📦 PRODUTOS (TOP 10):');
        console.log('-'.repeat(80));
        result.recordset.forEach((produto, i) => {
          const status = produto.est_atual <= produto.est_minim ? '⚠️ ' : '✅ ';
          console.log(`${(i+1).toString().padStart(2)}. ${status}${produto.nome.substring(0,30).padEnd(32)} | Est: ${produto.est_atual.toString().padStart(3)} | R$ ${produto.pco_remar.toFixed(2)}`);
        });
        console.log('-'.repeat(80));
      }
    } catch (error) {
      console.error('🚨 Erro ao consultar produtos:', error.message);
    }
  }

  async start() {
    console.log('🚀 Iniciando sistema...\n');
    
    // Conectar SQL Server
    await this.connectToSQLServer();
    
    // Conectar VPS
    await this.connectToVPS();
    
    // Aguardar e iniciar menu
    setTimeout(() => {
      this.startInteractiveMode();
    }, 3000);
  }
}

// Inicializar sistema
const cliente = new LojaClient();
cliente.start();

// Tratamento de saída
process.on('SIGINT', () => {
  console.log('\n👋 Sistema encerrado pelo usuário');
  process.exit(0);
});