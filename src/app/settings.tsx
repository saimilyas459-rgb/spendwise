
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('Student');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        Alert.alert(
          'Login Required',
          'Please sign in to view your profile.'
        );
        router.replace('/');
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Student';

      setFullName(name);
      setEditName(name);
      setEmail(user.email || 'No email available');
    } catch {
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    const newName = editName.trim();

    if (!newName) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    if (newName.length < 2) {
      Alert.alert(
        'Invalid Name',
        'Name must contain at least 2 characters.'
      );
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: newName,
        },
      });

      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }

      const updatedName =
        data.user?.user_metadata?.full_name || newName;

      setFullName(updatedName);
      setEditName(updatedName);
      setEditing(false);

      Alert.alert(
        'Profile Updated!',
        'Your name has been updated successfully.'
      );
    } catch {
      Alert.alert('Error', 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from SpendWise?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);

              const { error } = await supabase.auth.signOut();

              if (error) {
                Alert.alert('Logout Failed', error.message);
                return;
              }

              router.replace('/');
            } catch {
              Alert.alert('Error', 'Something went wrong.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21C995" />
          <Text style={styles.loadingText}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage your account and preferences
        </Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {fullName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>

          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>
              ✓ Active Account
            </Text>
          </View>
        </View>

        {/* Edit Profile */}
        <Text style={styles.sectionTitle}>EDIT PROFILE</Text>

        <View style={styles.settingCard}>
          <Text style={styles.fieldLabel}>Full Name</Text>

          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter your full name"
            placeholderTextColor="#8290A8"
            editable={editing && !saving}
          />

          {editing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditName(fullName);
                  setEditing(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateName}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editButtonText}>
                ✎  Edit Name
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Information */}
        <Text style={styles.sectionTitle}>ACCOUNT INFORMATION</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Text style={styles.settingIcon}>👤</Text>
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Full Name</Text>
              <Text style={styles.settingValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Text style={styles.settingIcon}>✉️</Text>
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Address</Text>
              <Text style={styles.settingValue}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Text style={styles.settingIcon}>💰</Text>
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Currency</Text>
              <Text style={styles.settingValue}>
                Pakistani Rupee (PKR)
              </Text>
            </View>

            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>PKR</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Text style={styles.settingIcon}>🌙</Text>
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>App Theme</Text>
              <Text style={styles.settingValue}>Dark Mode</Text>
            </View>
          </View>
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>SECURITY</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Text style={styles.settingIcon}>🔒</Text>
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Account Security
              </Text>
              <Text style={styles.settingValue}>
                Your account is protected by Supabase
              </Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            loggingOut && styles.disabledButton,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Text style={styles.logoutButtonText}>
            {loggingOut ? 'Logging out...' : '↪  Logout'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>SpendWise v1.0.0</Text>

        <Text style={styles.footerSubtitle}>
          Manage money. Build better habits.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10182F',
  },
  container: {
    padding: 22,
    paddingBottom: 40,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#AAB4CA',
    fontSize: 13,
    marginTop: 7,
    marginBottom: 25,
  },
  profileCard: {
    backgroundColor: '#1B2540',
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#293A55',
    marginBottom: 30,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#21C995',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#10182F',
    fontSize: 30,
    fontWeight: '900',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#AAB4CA',
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
  },
  accountBadge: {
    backgroundColor: '#173F3A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 15,
  },
  accountBadgeText: {
    color: '#21C995',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#21C995',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: '#1B2540',
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
    borderWidth: 1,
    borderColor: '#293A55',
  },
  fieldLabel: {
    color: '#AAB4CA',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#10182F',
    borderWidth: 1,
    borderColor: '#35415C',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#35415C',
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#21C995',
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#10182F',
    fontWeight: '900',
  },
  editButton: {
    backgroundColor: '#173F3A',
    padding: 13,
    borderRadius: 11,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#21C995',
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#273650',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  settingIcon: {
    fontSize: 19,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#AAB4CA',
    fontSize: 11,
    marginBottom: 5,
  },
  settingValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#35415C',
  },
  currencyBadge: {
    backgroundColor: '#173F3A',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  currencyBadgeText: {
    color: '#21C995',
    fontSize: 11,
    fontWeight: '900',
  },
  logoutButton: {
    backgroundColor: '#3A2636',
    borderWidth: 1,
    borderColor: '#8B4059',
    borderRadius: 15,
    padding: 17,
    alignItems: 'center',
    marginTop: 5,
  },
  logoutButtonText: {
    color: '#FF7D89',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.5,
  },
  footer: {
    color: '#AAB4CA',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
    fontWeight: '700',
  },
  footerSubtitle: {
    color: '#66748F',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 13,
  },
});
