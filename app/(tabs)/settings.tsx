import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, User, LayoutDashboard } from 'lucide-react-native';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  const showDashboard = profile?.role === 'dispatcher' || profile?.role === 'admin';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <User size={32} color="#007AFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            <Text style={styles.profileRole}>{profile?.role}</Text>
          </View>
        </View>
      </View>

      {showDashboard && (
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => router.push('/dashboard')}>
          <LayoutDashboard size={20} color="#007AFF" />
          <Text style={styles.dashboardButtonText}>Open Dashboard</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#ff3b30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  dashboardButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    marginHorizontal: 24,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  signOutText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
});
