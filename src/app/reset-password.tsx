
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  // Handle password recovery link
  useEffect(() => {
    let mounted = true;

    const handleRecoveryLink = async (url: string) => {
      try {
        const fragment = url.split('#')[1] || '';
        const params = new URLSearchParams(fragment);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (type !== 'recovery' || !accessToken || !refreshToken) {
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          Alert.alert('Recovery Error', error.message);
          return;
        }

        if (mounted) {
          setRecoveryReady(true);
        }
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.message || 'Unable to verify recovery link.'
        );
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryLink(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleRecoveryLink(url);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Update Password
  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Both passwords must match.');
      return;
    }

    if (!recoveryReady) {
      Alert.alert(
        'Recovery Link Required',
        'Please open the latest password reset link from your email first.'
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert('Reset Failed', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Your password has been updated successfully!',
        [
          {
            text: 'Go to Login',
            onPress: async () => {
              await supabase.auth.signOut();
              router.replace('/');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>◆</Text>
        </View>

        <Text style={styles.appName}>SpendWise</Text>
        <Text style={styles.tagline}>SMART MONEY. BETTER LIFE.</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>

          <Text style={styles.subtitle}>
            Create a new password for your SpendWise account.
          </Text>

          <Text style={styles.label}>New Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor="#8992A5"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#8992A5"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.showButton}
          >
            <Text style={styles.showText}>
              {showPassword ? 'Hide Password' : 'Show Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Password →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>YOUR MONEY, YOUR CONTROL.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10182F',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 35,
  },
  logo: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: '#21C995',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    color: '#10182F',
    fontSize: 38,
    fontWeight: 'bold',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagline: {
    color: '#21C995',
    fontSize: 10,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 35,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 23,
  },
  title: {
    color: '#10182F',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8992A5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 25,
  },
  label: {
    color: '#27334B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 9,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E3E7EF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#10182F',
    marginBottom: 20,
  },
  showButton: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 20,
  },
  showText: {
    color: '#16A77C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    height: 54,
    backgroundColor: '#19BE8D',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 22,
  },
  backText: {
    color: '#16A77C',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    color: '#65718A',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 28,
  },
});
