import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Index() {
  const [cnpj, setCnpj] = useState("12345678000123");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  
  const router = useRouter();
  const VPS_URL = "http://31.97.24.246:3000";

  const verificarConexaoVPS = async () => {
    try {
      const response = await fetch(`${VPS_URL}/health`);
      const data = await response.json();
      return data.status === 'online';
    } catch (error) {
      console.error('Erro ao conectar VPS:', error);
      return false;
    }
  };

  const verificarLojaOnline = async (cnpjLoja: string) => {
    try {
      const response = await fetch(`${VPS_URL}/api/lojas/status`);
      const lojas = await response.json();
      const lojaEncontrada = lojas.find((loja: any) => loja.cnpj === cnpjLoja);
      return lojaEncontrada?.status === 'online';
    } catch (error) {
      console.error('Erro ao verificar loja:', error);
      return false;
    }
  };

  const fazerLogin = async () => {
    setErro("");
    setCarregando(true);

    if (!cnpj.trim()) {
      setErro("Digite o CNPJ da empresa");
      setCarregando(false);
      return;
    }

    if (!usuario.trim()) {
      setErro("Digite o usuário");
      setCarregando(false);
      return;
    }

    if (!senha.trim()) {
      setErro("Digite a senha");
      setCarregando(false);
      return;
    }

    try {
      console.log('Verificando conexão com VPS...');
      const vpsOnline = await verificarConexaoVPS();
      
      if (!vpsOnline) {
        setErro("Servidor offline. Tente novamente.");
        setCarregando(false);
        return;
      }

      console.log('Verificando se loja está online...');
      const lojaOnline = await verificarLojaOnline(cnpj);
      
      if (!lojaOnline) {
        setErro("Loja offline. Verifique a conexão local.");
        setCarregando(false);
        return;
      }

      console.log('Login realizado com sucesso');
      router.push({
        pathname: "/produtos",
        params: { cnpj: cnpj }
      });
      
    } catch (error) {
      console.error('Erro no login:', error);
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Controle de Estoque</Text>
      <Text style={styles.subtitulo}>Conectado à VPS: 31.97.24.246</Text>
      
      <View style={styles.formulario}>
        <View style={styles.campo}>
          <Text style={styles.label}>CNPJ da Empresa</Text>
          <TextInput
            style={styles.input}
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChangeText={setCnpj}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Usuário</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite seu usuário"
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.campo}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={true}
          />
        </View>

        {erro ? (
          <Text style={styles.erro}>{erro}</Text>
        ) : null}
        
        <TouchableOpacity 
          style={[styles.botao, carregando && styles.botaoDesabilitado]} 
          onPress={fazerLogin}
          disabled={carregando}
        >
          <Text style={styles.textoBotao}>
            {carregando ? "Conectando..." : "Entrar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitulo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 40,
  },
  formulario: {
    width: '100%',
    maxWidth: 350,
  },
  campo: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  erro: {
    color: 'red',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  botao: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    backgroundColor: '#ccc',
  },
  textoBotao: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});