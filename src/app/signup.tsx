
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

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Error', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Signup Failed', error.message);
        return;
      }

      if (data.session) {
        Alert.alert('Success', 'Your SpendWise account has been created!');
        router.replace('/');
      } else {
        Alert.alert(
          'Check Your Email',
          'Your account has been registered. Please check your email for the verification link.'
        );
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
    <StatusBar barStyle="light-content" />   
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>◆</Text>
          </View>

          <Text style={styles.brand}>SpendWise</Text>
          <Text style={styles.tagline}>SMART MONEY. BETTER LIFE.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>
            Start your journey towards smarter money management.
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#8992A5"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#8992A5"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#8992A5"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor="#8992A5"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              Already have an account? 
            </Text>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10182F' },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 55,
    paddingBottom: 30,
  },
  back: { color: '#21C995', fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', marginVertical: 25 },
  logo: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: '#21C995',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 32, color: '#10182F' },
  brand: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
    marginTop: 10,
  },
  tagline: {
    color: '#21C995',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 5,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 22 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#10182F' },
  subtitle: {
    color: '#8992A5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 22,
  },
  label: {
    color: '#27334B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E3E7EF',
    borderRadius: 11,
    paddingHorizontal: 13,
    color: '#10182F',
    marginBottom: 17,
    fontSize: 14,
  },
  button: {
    height: 53,
    backgroundColor: '#19BE8D',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 7,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 23,
  },
  footerText: { color: '#8992A5', fontSize: 12 },
  loginLink: { color: '#16A77C', fontWeight: 'bold', fontSize: 12 },
});
