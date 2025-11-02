import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Building2, Users, Radio, LogOut, Plus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Organization = {
  id: string;
  name: string;
  created_at: string;
};

type OrganizationStats = {
  organization: Organization;
  user_count: number;
  supervisor_count: number;
  dispatcher_count: number;
  talkgroup_count: number;
};

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'organizations' | 'users' | 'system'>('organizations');
  const [organizations, setOrganizations] = useState<OrganizationStats[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadOrganizations(), loadAllUsers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganizations() {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) throw error;

    const orgsWithStats = await Promise.all(
      (orgs || []).map(async (org) => {
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('role', 'user');

        const { count: supervisorCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('role', 'supervisor');

        const { count: dispatcherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('role', 'dispatcher');

        const { count: talkgroupCount } = await supabase
          .from('talkgroups')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        return {
          organization: org,
          user_count: userCount || 0,
          supervisor_count: supervisorCount || 0,
          dispatcher_count: dispatcherCount || 0,
          talkgroup_count: talkgroupCount || 0,
        };
      })
    );

    setOrganizations(orgsWithStats);
  }

  async function loadAllUsers() {
    const { data, error } = await supabase.rpc('get_all_profiles');

    if (error) throw error;
    setAllUsers(data || []);
  }

  async function handleCreateOrganization() {
    const name = prompt('Enter organization name:');
    if (!name) return;

    const { error } = await supabase.from('organizations').insert({ name });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadOrganizations();
    }
  }

  async function handleDeleteOrganization(orgId: string) {
    Alert.alert(
      'Delete Organization',
      'This will delete all users, groups, and data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('organizations').delete().eq('id', orgId);
            if (error) Alert.alert('Error', error.message);
            else loadData();
          },
        },
      ]
    );
  }

  async function handleUpdateUserRole(userId: string, newRole: Profile['role']) {
    const { error } = await supabase.rpc('update_user_role', {
      user_id: userId,
      new_role: newRole,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadAllUsers();
    }
  }

  async function handleDeleteUser(userId: string) {
    Alert.alert('Delete User', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          if (error) Alert.alert('Error', error.message);
          else loadAllUsers();
        },
      },
    ]);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const totalUsers = allUsers.filter((u) => u.role === 'user').length;
  const totalSupervisors = allUsers.filter((u) => u.role === 'supervisor').length;
  const totalDispatchers = allUsers.filter((u) => u.role === 'dispatcher').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color="#ff3b30" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Building2 size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{organizations.length}</Text>
          <Text style={styles.statLabel}>Organizations</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#34C759" />
          <Text style={styles.statNumber}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#FF9500" />
          <Text style={styles.statNumber}>{totalSupervisors}</Text>
          <Text style={styles.statLabel}>Supervisors</Text>
        </View>
        <View style={styles.statCard}>
          <Radio size={24} color="#FF3B30" />
          <Text style={styles.statNumber}>{totalDispatchers}</Text>
          <Text style={styles.statLabel}>Dispatchers</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'organizations' && styles.tabActive]}
          onPress={() => setActiveTab('organizations')}>
          <Building2 size={20} color={activeTab === 'organizations' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'organizations' && styles.tabTextActive]}>
            Organizations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}>
          <Users size={20} color={activeTab === 'users' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>All Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'system' && styles.tabActive]}
          onPress={() => setActiveTab('system')}>
          <Radio size={20} color={activeTab === 'system' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>System</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'organizations' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Organizations</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleCreateOrganization}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Organization</Text>
              </TouchableOpacity>
            </View>

            {organizations.map((orgData) => (
              <View key={orgData.organization.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{orgData.organization.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteOrganization(orgData.organization.id)}>
                    <Trash2 size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
                <View style={styles.orgStats}>
                  <View style={styles.orgStat}>
                    <Text style={styles.orgStatValue}>{orgData.user_count}</Text>
                    <Text style={styles.orgStatLabel}>Users</Text>
                  </View>
                  <View style={styles.orgStat}>
                    <Text style={styles.orgStatValue}>{orgData.supervisor_count}</Text>
                    <Text style={styles.orgStatLabel}>Supervisors</Text>
                  </View>
                  <View style={styles.orgStat}>
                    <Text style={styles.orgStatValue}>{orgData.dispatcher_count}</Text>
                    <Text style={styles.orgStatLabel}>Dispatchers</Text>
                  </View>
                  <View style={styles.orgStat}>
                    <Text style={styles.orgStatValue}>{orgData.talkgroup_count}</Text>
                    <Text style={styles.orgStatLabel}>Groups</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'users' && (
          <View>
            <Text style={styles.sectionTitle}>All Users</Text>
            {allUsers.map((user) => (
              <View key={user.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{user.full_name}</Text>
                    <Text style={styles.cardSubtitle}>{user.email}</Text>
                  </View>
                  <View style={styles.cardHeaderActions}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{user.role}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteUser(user.id)}>
                      <Trash2 size={20} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.roleButtons}>
                  {(['user', 'supervisor', 'dispatcher', 'admin'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        user.role === role && styles.roleButtonActive,
                      ]}
                      onPress={() => handleUpdateUserRole(user.id, role)}>
                      <Text
                        style={[
                          styles.roleButtonText,
                          user.role === role && styles.roleButtonTextActive,
                        ]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'system' && (
          <View>
            <Text style={styles.sectionTitle}>System Information</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PTT System v1.0</Text>
              <Text style={styles.infoText}>Total Organizations: {organizations.length}</Text>
              <Text style={styles.infoText}>Total Users: {allUsers.length}</Text>
              <Text style={styles.infoText}>Database: Supabase</Text>
              <Text style={styles.infoText}>Platform: Expo + React Native</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  tabActive: {
    backgroundColor: '#007AFF20',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orgStats: {
    flexDirection: 'row',
    gap: 16,
  },
  orgStat: {
    alignItems: 'center',
  },
  orgStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  orgStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
});
