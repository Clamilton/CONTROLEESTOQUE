import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Produto {
  codigo: string;
  nome: string;
  precoAtual: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  subgrupo: string;
}

export default function Produtos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cnpj = params.cnpj as string;
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  
  const VPS_URL = "http://31.97.24.246:3000";

  const carregarProdutos = async () => {
    setCarregando(true);
    setErro("");
    
    try {
      console.log(`Carregando produtos para CNPJ: ${cnpj}`);
      
      const response = await fetch(`${VPS_URL}/api/${cnpj}/produtos/teste`);
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Loja offline. Verifique a conexão local.");
        }
        throw new Error(`Erro do servidor: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setProdutos(data.data);
        console.log(`${data.data.length} produtos carregados`);
      } else {
        throw new Error("Formato de resposta inválido");
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      setErro(error.message);
      Alert.alert("Erro", error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (cnpj) {
      carregarProdutos();
    }
  }, [cnpj]);

  const voltarLogin = () => {
    router.back();
  };

  const renderProduto = ({ item }: { item: Produto }) => {
    const estoqueAbaixo = item.estoqueAtual <= item.estoqueMinimo;
    
    return (
      <View style={[styles.produto, estoqueAbaixo && styles.produtoAlerta]}>
        <View style={styles.produtoHeader}>
          <Text style={styles.nomeProduto}>{item.nome}</Text>
          <Text style={styles.codigoProduto}>#{item.codigo}</Text>
        </View>
        
        <View style={styles.produtoInfo}>
          <Text style={styles.preco}>R$ {item.precoAtual?.toFixed(2)}</Text>
          <Text style={styles.subgrupo}>{item.subgrupo}</Text>
        </View>
        
        <View style={styles.estoqueInfo}>
          <Text style={[styles.estoque, estoqueAbaixo && styles.estoqueAlerta]}>
            Estoque: {item.estoqueAtual}
          </Text>
          <Text style={styles.minimo}>Mín: {item.estoqueMinimo}</Text>
        </View>
        
        {estoqueAbaixo && (
          <View style={styles.alerta}>
            <Text style={styles.alertaTexto}>⚠️ ESTOQUE BAIXO</Text>
          </View>
        )}
      </View>
    );
  };

  if (carregando) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: "Carregando...",
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: 'white',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
          <Text style={styles.cnpjText}>CNPJ: {cnpj}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: `Produtos (${produtos.length})`,
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={voltarLogin} style={styles.voltarBtn}>
            <Text style={styles.voltarText}>← Sair</Text>
          </TouchableOpacity>
          <Text style={styles.cnpjHeader}>CNPJ: {cnpj}</Text>
          <TouchableOpacity onPress={carregarProdutos} style={styles.recarregarBtn}>
            <Text style={styles.recarregarText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {erro ? (
          <View style={styles.erroContainer}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity onPress={carregarProdutos} style={styles.tentarNovamente}>
              <Text style={styles.tentarNovamenteText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={produtos}
            renderItem={renderProduto}
            keyExtractor={(item, index) => item.codigo || index.toString()}
            style={styles.lista}
            contentContainerStyle={styles.listaContent}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  cnpjText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  voltarBtn: {
    padding: 5,
  },
  voltarText: {
    color: '#007AFF',
    fontSize: 16,
  },
  cnpjHeader: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  recarregarBtn: {
    padding: 5,
  },
  recarregarText: {
    fontSize: 18,
  },
  lista: {
    flex: 1,
  },
  listaContent: {
    padding: 15,
  },
  produto: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  produtoAlerta: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nomeProduto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  codigoProduto: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  produtoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preco: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  subgrupo: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  estoqueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estoque: {
    fontSize: 14,
    color: '#666',
  },
  estoqueAlerta: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  minimo: {
    fontSize: 12,
    color: '#999',
  },
  alerta: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
    alignItems: 'center',
  },
  alertaTexto: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  erroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  erroTexto: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  tentarNovamente: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
  },
  tentarNovamenteText: {
    color: 'white',
    fontWeight: 'bold',
  },
});