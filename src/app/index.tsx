
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function HomeScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase Login Function
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your email and password.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (data.session) {
        Alert.alert('Success', 'Welcome to SpendWise!');
        router.replace('/explore');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Function
  const handleForgotPassword = async () => {
    const userEmail = email.trim().toLowerCase();

    if (!userEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your registered email address first.'
      );
      return;
    }

    try {
      setLoading(true);

      const redirectTo = Linking.createURL('reset-password');

      const { error } = await supabase.auth.resetPasswordForEmail(
        userEmail,
        { redirectTo }
      );

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Reset Email Sent',
        'Please check your Gmail for the password reset link.'
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>◆</Text>
          </View>

          <Text style={styles.appName}>SpendWise</Text>

          <Text style={styles.tagline}>
            SMART MONEY. BETTER LIFE.
          </Text>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>
            Welcome Back!
          </Text>

          <Text style={styles.welcomeText}>
            Take control of your money and build a better financial future.
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <Text style={styles.cardSubtitle}>
            Enter your details to continue
          </Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>

          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#8992A5"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordBox}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#8992A5"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Please Wait...' : 'Sign In →'}
            </Text>
          </TouchableOpacity>

          {/* Create Account */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>
              Don't have an account?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signupLink}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          YOUR MONEY, YOUR CONTROL.
        </Text>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10182F',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 25,
  },

  header: {
    alignItems: 'center',
    marginBottom: 35,
  },

  logo: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: '#21C995',
    justifyContent: 'center',
    alignItems: 'center',
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
    letterSpacing: 1,
  },

  tagline: {
    color: '#21C995',
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 6,
  },

  welcome: {
    marginBottom: 25,
  },

  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
    marginBottom: 9,
  },

  welcomeText: {
    color: '#A7B0C3',
    fontSize: 14,
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 23,
  },

  cardTitle: {
    color: '#10182F',
    fontSize: 23,
    fontWeight: 'bold',
  },

  cardSubtitle: {
    color: '#8992A5',
    fontSize: 13,
    marginTop: 6,
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

  passwordBox: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E3E7EF',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#10182F',
  },

  showText: {
    color: '#16A77C',
    fontWeight: 'bold',
    fontSize: 12,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 23,
  },

  forgotText: {
    color: '#16A77C',
    fontSize: 12,
    fontWeight: '600',
  },

  loginButton: {
    height: 54,
    backgroundColor: '#19BE8D',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },

  signupText: {
    color: '#8992A5',
    fontSize: 12,
  },

  signupLink: {
    color: '#16A77C',
    fontWeight: 'bold',
    fontSize: 12,
  },

  footer: {
    color: '#65718A',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 28,
  },
});
