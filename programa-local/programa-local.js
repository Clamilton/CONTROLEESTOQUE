const WebSocket = require('ws');
const readline = require('readline-sync');
require('dotenv').config();

class LojaClient {
  constructor() {
    this.ws = null;
    this.cnpj = process.env.CNPJ || '12345678000123';
    this.connected = false;
    
    console.clear();
    console.log('='.repeat(60));
    console.log('🏪 SISTEMA CONTROLE DE ESTOQUE - CLIENTE LOCAL v1.0');
    console.log('='.repeat(60));
    console.log(`📋 Loja: ${process.env.LOJA_NOME || 'Loja Teste'}`);
    console.log(`📋 CNPJ: ${this.cnpj}`);
    console.log(`🌐 VPS: ${process.env.VPS_WS_URL || 'ws://31.97.24.246:8080'}`);
    console.log('='.repeat(60));
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
        console.log('❌ Conexão perdida. Tentando reconectar em 5s...');
        this.connected = false;
        setTimeout(() => this.connectToVPS(), 5000);
      });
      
      this.ws.on('error', (error) => {
        console.error('🚨 Erro na conexão:', error.message);
        console.log('⏳ Tentando novamente em 5 segundos...');
        setTimeout(() => this.connectToVPS(), 5000);
      });
      
    } catch (error) {
      console.error('🚨 Erro ao conectar:', error.message);
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
          console.log(`📨 Query recebida: ${message.sql}`);
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
      // Simular dados por enquanto (depois conectaremos no SQL Server real)
      const dadosSimulados = this.gerarDadosSimulados(message.sql);
      
      const response = {
        type: 'response',
        requestId: message.requestId,
        data: dadosSimulados,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(response));
      console.log(`✅ Resposta enviada: ${dadosSimulados.length} registros`);
      
    } catch (error) {
      const errorResponse = {
        type: 'response',
        requestId: message.requestId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(errorResponse));
      console.error('🚨 Erro na consulta:', error.message);
    }
  }

  gerarDadosSimulados(sql) {
    if (sql.includes('produtos') || sql.includes('vw_produtos_mobile')) {
      return [
        {
          codigo: '7891234567890',
          nome: 'Notebook Dell Inspiron 15 3000',
          precoAtual: 2599.99,
          estoqueAtual: 5,
          estoqueMinimo: 3,
          subgrupo: 'Notebooks'
        },
        {
          codigo: '7891234567891', 
          nome: 'Mouse Logitech MX Master 3',
          precoAtual: 399.90,
          estoqueAtual: 2,
          estoqueMinimo: 5,
          subgrupo: 'Periféricos'
        },
        {
          codigo: '7891234567892',
          nome: 'Teclado Mecânico Razer BlackWidow',
          precoAtual: 599.00,
          estoqueAtual: 8,
          estoqueMinimo: 4,
          subgrupo: 'Periféricos'
        },
        {
          codigo: '7891234567893',
          nome: 'Monitor LG 24" Full HD IPS',
          precoAtual: 899.00,
          estoqueAtual: 1,
          estoqueMinimo: 2,
          subgrupo: 'Monitores'
        },
        {
          codigo: '7891234567894',
          nome: 'Cabo HDMI 2.0 Premium 3m',
          precoAtual: 45.90,
          estoqueAtual: 25,
          estoqueMinimo: 10,
          subgrupo: 'Cabos'
        }
      ];
    }
    return [];
  }

  showMenu() {
    console.log('\n' + '='.repeat(50));
    console.log('📱 MENU DO SISTEMA');
    console.log('='.repeat(50));
    console.log('1. 📊 Status da conexão');
    console.log('2. 📡 Testar comunicação (ping)');
    console.log('3. 📦 Visualizar produtos simulados');
    console.log('4. ⚙️  Mostrar configurações');
    console.log('5. 🔄 Reconectar VPS');
    console.log('6. 🚪 Sair do sistema');
    console.log('='.repeat(50));
  }

  async startInteractiveMode() {
    while (true) {
      this.showMenu();
      const opcao = readline.question('Escolha uma opção (1-6): ');
      
      switch (opcao) {
        case '1':
          console.log('\n📊 STATUS DO SISTEMA:');
          console.log(`Conexão VPS: ${this.connected ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
          console.log(`CNPJ: ${this.cnpj}`);
          console.log(`Loja: ${process.env.LOJA_NOME || 'Loja Teste'}`);
          console.log(`VPS: ${process.env.VPS_WS_URL || 'ws://31.97.24.246:8080'}`);
          console.log(`Hora: ${new Date().toLocaleString('pt-BR')}`);
          break;
          
        case '2':
          if (this.connected) {
            this.ws.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
            console.log('📡 Ping enviado para VPS...');
          } else {
            console.log('❌ Não conectado na VPS');
          }
          break;
          
        case '3':
          const dados = this.gerarDadosSimulados('SELECT * FROM produtos');
          console.log('\n📦 PRODUTOS CADASTRADOS:');
          console.log('-'.repeat(80));
          dados.forEach((p, i) => {
            const status = p.estoqueAtual <= p.estoqueMinimo ? '⚠️  BAIXO' : '✅ OK';
            console.log(`${(i+1).toString().padStart(2)}. ${p.nome.padEnd(35)} | Est: ${p.estoqueAtual.toString().padStart(3)} | ${status}`);
          });
          console.log('-'.repeat(80));
          console.log(`Total: ${dados.length} produtos`);
          break;
          
        case '4':
          console.log('\n⚙️ CONFIGURAÇÕES:');
          console.log(`CNPJ: ${process.env.CNPJ || 'Não configurado'}`);
          console.log(`Loja: ${process.env.LOJA_NOME || 'Não configurado'}`);
          console.log(`VPS: ${process.env.VPS_WS_URL || 'Padrão'}`);
          console.log(`Debug: ${process.env.DEBUG || 'false'}`);
          console.log(`Pasta: ${__dirname}`);
          break;
          
        case '5':
          console.log('🔄 Reconectando...');
          if (this.ws) {
            this.ws.close();
          }
          setTimeout(() => this.connectToVPS(), 1000);
          break;
          
        case '6':
          console.log('👋 Encerrando sistema...');
          if (this.ws) {
            this.ws.close();
          }
          process.exit(0);
          
        default:
          console.log('❌ Opção inválida! Escolha de 1 a 6');
      }
      
      console.log('\n⏸️  Pressione ENTER para continuar...');
      readline.question('');
    }
  }

  async start() {
    console.log('🚀 Iniciando conexão com VPS...\n');
    await this.connectToVPS();
    
    // Aguardar conexão e iniciar menu
    setTimeout(() => {
      this.startInteractiveMode();
    }, 3000);
  }
}

// Inicializar sistema
console.log('Carregando sistema...');
const cliente = new LojaClient();
cliente.start();

// Tratamento de saída
process.on('SIGINT', () => {
  console.log('\n👋 Sistema encerrado pelo usuário');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Sistema encerrado');
  process.exit(0);
});