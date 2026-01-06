import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ CHANGE THIS:
// If running in Web Browser on Pi: 'http://localhost:4002'
// If running on Phone: 'http://192.168.X.X:4002' (Your Pi's IP)
const API_URL = 'http://10.10.2.0:4002'; 

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored login on app start
  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const storedToken = await AsyncStorage.getItem('token');
    if (storedToken) setToken(storedToken);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {token ? (
        <Dashboard token={token} onLogout={() => { setToken(null); AsyncStorage.removeItem('token'); }} />
      ) : (
        <LoginScreen onLogin={(newToken) => { setToken(newToken); AsyncStorage.setItem('token', newToken); }} />
      )}
    </View>
  );
}

// --- SCREEN 1: LOGIN ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePress = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        onLogin(data.token);
      } else {
        Alert.alert("Login Failed", data.error || "Check credentials");
      }
    } catch (e) {
      Alert.alert("Error", "Could not connect to server. Check IP address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.headerTitle}>🏠 Household Manager</Text>
      <Text style={styles.subHeader}>Mobile App</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Username" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />

      <TouchableOpacity style={styles.btnPrimary} onPress={handlePress} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Log In</Text>}
      </TouchableOpacity>
    </View>
  );
}

// --- SCREEN 2: DASHBOARD ---
function Dashboard({ token, onLogout }) {
  const [households, setHouseholds] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/my-households`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(Array.isArray(data)) setHouseholds(data);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[styles.badge, item.role === 'admin' ? styles.badgeAdmin : styles.badgeMember]}>
          <Text style={styles.badgeText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.cardSub}>ID: {item.id}</Text>
    </View>
  );

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>My Households</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={households}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshing={refreshing}
        onRefresh={fetchHouseholds}
        ListEmptyComponent={<Text style={styles.emptyText}>No households found.</Text>}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Auth Styles
  authContainer: { flex: 1, justifyContent: 'center', padding: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subHeader: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  btnPrimary: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Dashboard Styles
  dashboardContainer: { flex: 1, paddingTop: 50 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, alignItems: 'center' },
  navTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutText: { color: '#dc3545', fontWeight: 'bold' },
  
  // Card Styles
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSub: { color: '#888' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeAdmin: { backgroundColor: '#007bff' },
  badgeMember: { backgroundColor: '#28a745' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }
});