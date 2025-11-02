import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, Talkgroup, Channel } from '@/lib/supabase';
import { Users, Radio, MapPin, Plus, Trash2, CreditCard as Edit2, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type UserWithAssignment = Profile & {
  talkgroup_name?: string;
};

export function DispatcherDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'map'>('users');
  const [users, setUsers] = useState<UserWithAssignment[]>([]);
  const [talkgroups, setTalkgroups] = useState<Talkgroup[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingGroup, setEditingGroup] = useState<Talkgroup | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadTalkgroups(), loadChannels()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    if (!profile?.organization_id) return;

    const { data, error } = await supabase.rpc('get_org_profiles', {
      org_id: profile.organization_id,
    });

    if (error) throw error;

    const usersWithGroups = await Promise.all(
      (data || []).filter((u: Profile) => u.role === 'user' || u.role === 'supervisor').map(async (user: Profile) => {
        const { data: assignment } = await supabase
          .from('user_talkgroup_assignments')
          .select('talkgroup_id, talkgroups(name)')
          .eq('user_id', user.id)
          .maybeSingle();

        return {
          ...user,
          talkgroup_name: assignment ? (assignment.talkgroups as any)?.name : undefined,
        };
      })
    );

    setUsers(usersWithGroups);
  }

  async function loadTalkgroups() {
    const { data, error } = await supabase
      .from('talkgroups')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('name');

    if (error) throw error;
    setTalkgroups(data || []);
  }

  async function loadChannels() {
    const { data: tgData } = await supabase
      .from('talkgroups')
      .select('id')
      .eq('organization_id', profile?.organization_id);

    if (!tgData) return;

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .in('talkgroup_id', tgData.map(tg => tg.id))
      .order('name');

    if (error) throw error;
    setChannels(data || []);
  }

  async function handleCreateTalkgroup() {
    const name = prompt('Enter talkgroup name:');
    if (!name) return;

    const { error } = await supabase.from('talkgroups').insert({
      name,
      organization_id: profile?.organization_id,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadTalkgroups();
    }
  }

  async function handleCreateChannel(talkgroupId: string) {
    const name = prompt('Enter channel name:');
    if (!name) return;

    const { error } = await supabase.from('channels').insert({
      name,
      talkgroup_id: talkgroupId,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadChannels();
    }
  }

  async function handleDeleteTalkgroup(talkgroupId: string) {
    Alert.alert('Delete Talkgroup', 'Are you sure? This will delete all channels.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('talkgroups').delete().eq('id', talkgroupId);
          if (error) Alert.alert('Error', error.message);
          else loadData();
        },
      },
    ]);
  }

  async function handleDeleteChannel(channelId: string) {
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    if (error) Alert.alert('Error', error.message);
    else loadChannels();
  }

  async function handleAssignUser(userId: string, talkgroupId: string) {
    const { error } = await supabase.from('user_talkgroup_assignments').upsert({
      user_id: userId,
      talkgroup_id: talkgroupId,
    });

    if (error) Alert.alert('Error', error.message);
    else loadUsers();
  }

  async function handleUpdateUserRole(userId: string, newRole: 'user' | 'supervisor') {
    const { error } = await supabase.rpc('update_user_role', {
      user_id: userId,
      new_role: newRole,
    });

    if (error) Alert.alert('Error', error.message);
    else loadUsers();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dispatcher Dashboard</Text>
          <Text style={styles.headerSubtitle}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color="#ff3b30" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}>
          <Users size={20} color={activeTab === 'users' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}>
          <Radio size={20} color={activeTab === 'groups' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}>
          <MapPin size={20} color={activeTab === 'map' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>Map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'users' && (
          <View>
            <Text style={styles.sectionTitle}>Users & Supervisors</Text>
            {users.map((user) => (
              <View key={user.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{user.full_name}</Text>
                    <Text style={styles.cardSubtitle}>{user.email}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{user.role}</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.label}>Assigned Group:</Text>
                  <Text style={styles.value}>{user.talkgroup_name || 'None'}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={() => {
                        const newRole = user.role === 'user' ? 'supervisor' : 'user';
                        handleUpdateUserRole(user.id, newRole);
                      }}>
                      <Text style={styles.smallButtonText}>
                        {user.role === 'user' ? 'Make Supervisor' : 'Make User'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'groups' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Talkgroups & Channels</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleCreateTalkgroup}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Group</Text>
              </TouchableOpacity>
            </View>

            {talkgroups.map((talkgroup) => (
              <View key={talkgroup.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{talkgroup.name}</Text>
                  <View style={styles.cardHeaderActions}>
                    <TouchableOpacity onPress={() => handleCreateChannel(talkgroup.id)}>
                      <Plus size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTalkgroup(talkgroup.id)}>
                      <Trash2 size={20} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.channelsList}>
                  {channels
                    .filter((ch) => ch.talkgroup_id === talkgroup.id)
                    .map((channel) => (
                      <View key={channel.id} style={styles.channelItem}>
                        <Text style={styles.channelName}>{channel.name}</Text>
                        <TouchableOpacity onPress={() => handleDeleteChannel(channel.id)}>
                          <Trash2 size={16} color="#ff3b30" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  {channels.filter((ch) => ch.talkgroup_id === talkgroup.id).length === 0 && (
                    <Text style={styles.emptyText}>No channels yet</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'map' && (
          <View>
            <Text style={styles.sectionTitle}>Location Tracking</Text>
            <View style={styles.mapPlaceholder}>
              <MapPin size={48} color="#666" />
              <Text style={styles.mapPlaceholderText}>Map view available on web only</Text>
              <Text style={styles.mapPlaceholderSubtext}>Access this dashboard from a desktop browser to view the interactive map</Text>
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
  cardContent: {
    gap: 8,
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
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  channelsList: {
    gap: 8,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  mapPlaceholder: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  mapPlaceholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  mapPlaceholderSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
