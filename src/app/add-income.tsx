
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const categories = [
  'Salary',
  'Business',
  'Freelancing',
  'Investment',
  'Other',
];

export default function AddIncomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const transactionId =
    typeof params.id === 'string' ? params.id : undefined;
  const isEditing = Boolean(transactionId);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [description, setDescription] = useState('');

  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [loading, setLoading] = useState(false);
  const [loadingTransaction, setLoadingTransaction] =
    useState(isEditing);

  useEffect(() => {
    if (!transactionId) return;

    let isMounted = true;

    const loadTransaction = async () => {
      setLoadingTransaction(true);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category, description, transaction_date')
        .eq('id', transactionId)
        .eq('type', 'income')
        .single();

      if (!isMounted) return;

      if (error || !data) {
        Alert.alert(
          'Could not load income',
          error?.message || 'This income transaction could not be found.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/explore'),
            },
          ]
        );

        setLoadingTransaction(false);
        return;
      }

      setAmount(String(data.amount));
      setCategory(data.category);
      setDescription(data.description || '');
      setDate(data.transaction_date);
      setLoadingTransaction(false);
    };

    loadTransaction();

    return () => {
      isMounted = false;
    };
  }, [transactionId, router]);

  const handleSaveIncome = async () => {
    const numericAmount = Number(amount.trim());

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid income amount.'
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert(
        'Invalid Date',
        'Please enter date in YYYY-MM-DD format.'
      );
      return;
    }

    try {
      setLoading(true);

      if (isEditing && transactionId) {
        const { error } = await supabase
          .from('transactions')
          .update({
            amount: numericAmount,
            category,
            description: description.trim() || null,
            transaction_date: date,
          })
          .eq('id', transactionId)
          .eq('type', 'income');

        if (error) {
          Alert.alert('Update Failed', error.message);
          return;
        }

        Alert.alert(
          'Success!',
          'Your income has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/explore'),
            },
          ]
        );
      } else {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          Alert.alert(
            'Login Required',
            'Please sign in again.'
          );
          return;
        }

        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'income',
            amount: numericAmount,
            category,
            description: description.trim() || null,
            transaction_date: date,
          });

        if (error) {
          Alert.alert('Save Failed', error.message);
          return;
        }

        Alert.alert(
          'Success!',
          'Your income has been saved successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/explore'),
            },
          ]
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong.';

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Income' : 'Add Income'}
              </Text>

              <Text style={styles.headerSubtitle}>
                {isEditing
                  ? 'Update your income details'
                  : 'Record your money received'}
              </Text>
            </View>
          </View>

          {loadingTransaction ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>
                Loading income details...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>
                  INCOME AMOUNT
                </Text>

                <View style={styles.amountInputRow}>
                  <Text style={styles.currency}>Rs.</Text>

                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#8290A8"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                <Text style={styles.amountHint}>
                  Enter the amount you received
                </Text>
              </View>

              <Text style={styles.label}>Income Category</Text>

              <View style={styles.categoryContainer}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryButton,
                      category === item && styles.selectedCategory,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item &&
                          styles.selectedCategoryText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>
                Description (Optional)
              </Text>

              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="e.g. Monthly salary"
                placeholderTextColor="#8290A8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>Income Date</Text>

              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8290A8"
                value={date}
                onChangeText={setDate}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.disabledButton,
                ]}
                onPress={handleSaveIncome}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading
                    ? isEditing
                      ? 'Updating Income...'
                      : 'Saving Income...'
                    : isEditing
                      ? 'Update Income  →'
                      : 'Save Income  →'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Your financial information is private and secure.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#10182F',
  },
  container: {
    padding: 22,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#27334D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#AAB4CA',
    fontSize: 12,
    marginTop: 5,
  },
  amountCard: {
    backgroundColor: '#21C995',
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  amountLabel: {
    color: '#174C40',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  currency: {
    color: '#10182F',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    color: '#10182F',
    fontSize: 32,
    fontWeight: '900',
    padding: 0,
  },
  amountHint: {
    color: '#174C40',
    fontSize: 11,
    marginTop: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 5,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1B2540',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#35415C',
  },
  selectedCategory: {
    backgroundColor: '#21C995',
    borderColor: '#21C995',
  },
  categoryText: {
    color: '#D5DCEC',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: '#10182F',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#1B2540',
    borderWidth: 1,
    borderColor: '#35415C',
    borderRadius: 13,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 25,
  },
  descriptionInput: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#21C995',
    borderRadius: 15,
    padding: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#10182F',
    fontSize: 16,
    fontWeight: '900',
  },
  loadingBox: {
    backgroundColor: '#1B2540',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    color: '#8290A8',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
  },
});
