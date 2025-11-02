import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PTT System</Text>
      <Text style={styles.subtitle}>Welcome, {profile?.full_name}</Text>
      <Text style={styles.role}>Role: {profile?.role}</Text>
      <Text style={styles.info}>
        Full PTT interface coming soon!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#999',
    marginBottom: 16,
  },
  role: {
    fontSize: 16,
    color: '#007AFF',
    textTransform: 'capitalize',
    marginBottom: 32,
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
