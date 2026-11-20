
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
  'Food & Grocery',
  'Shopping',
  'Transport',
  'Bills',
  'Education',
  'Health',
  'Entertainment',
  'Other',
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const transactionId =
    typeof params.id === 'string' ? params.id : undefined;

  const isEditing = Boolean(transactionId);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Grocery');
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
    if (!transactionId) {
      setLoadingTransaction(false);
      return;
    }

    let isMounted = true;

    const loadExpense = async () => {
      setLoadingTransaction(true);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category, description, transaction_date')
        .eq('id', transactionId)
        .eq('type', 'expense')
        .single();

      if (!isMounted) return;

      if (error || !data) {
        Alert.alert(
          'Unable to load expense',
          error?.message || 'Expense transaction could not be found.',
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

      setAmount(String(data.amount ?? ''));
      setCategory(data.category || 'Other');
      setDescription(data.description || '');
      setDate(data.transaction_date || '');
      setLoadingTransaction(false);
    };

    loadExpense();

    return () => {
      isMounted = false;
    };
  }, [transactionId, router]);

  // Check monthly category budget after saving an expense.
  const getBudgetAlert = async (
    userId: string,
    expenseDate: string,
    expenseCategory: string,
    expenseId?: string
  ): Promise<string | null> => {
    try {
      const [year, month] = expenseDate.split('-').map(Number);

      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

      const nextMonth = new Date(year, month, 1);

      const nextMonthStart =
        `${nextMonth.getFullYear()}-${String(
          nextMonth.getMonth() + 1
        ).padStart(2, '0')}-01`;

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('monthly_limit')
        .eq('user_id', userId)
        .eq('category', expenseCategory)
        .eq('budget_month', monthStart)
        .maybeSingle();

      if (budgetError || !budget) {
        return null;
      }

      let expenseQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('category', expenseCategory)
        .gte('transaction_date', monthStart)
        .lt('transaction_date', nextMonthStart);

      if (expenseId) {
        expenseQuery = expenseQuery.neq('id', expenseId);
      }

      const { data: expenses, error: expenseError } =
        await expenseQuery;

      if (expenseError) {
        return null;
      }

      const previousSpent = (expenses || []).reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      const currentSpent = previousSpent + (
        isEditing ? Number(amount.trim()) : 0
      );

      const totalSpent = isEditing
        ? currentSpent
        : previousSpent;

      const limit = Number(budget.monthly_limit);
      const percentage = (totalSpent / limit) * 100;

      if (percentage > 100) {
        return `⚠️ Budget exceeded! You have spent Rs. ${totalSpent.toLocaleString()} against your Rs. ${limit.toLocaleString()} budget.`;
      }

      if (percentage >= 100) {
        return `🚨 You have used 100% of your ${expenseCategory} budget!`;
      }

      if (percentage >= 80) {
        return `⚠️ You have used ${Math.round(percentage)}% of your ${expenseCategory} budget. Be careful with further spending!`;
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleSaveExpense = async () => {
    const numericAmount = Number(amount.trim());

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid expense amount.'
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert(
        'Invalid Date',
        'Please use YYYY-MM-DD format.'
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Login Required', 'Please sign in again.');
        return;
      }

      const transactionData = {
        amount: numericAmount,
        category,
        description: description.trim() || null,
        transaction_date: date,
      };

      if (isEditing && transactionId) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionId)
          .eq('user_id', user.id)
          .eq('type', 'expense');

        if (error) {
          Alert.alert('Update Failed', error.message);
          return;
        }
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'expense',
            ...transactionData,
          });

        if (error) {
          Alert.alert('Save Failed', error.message);
          return;
        }
      }

      const budgetAlert = await getBudgetAlert(
        user.id,
        date,
        category,
        isEditing ? transactionId : undefined
      );

      const successMessage = isEditing
        ? 'Your expense has been updated successfully.'
        : 'Your expense has been saved successfully.';

      const alertTitle = budgetAlert
        ? 'Spending Alert!'
        : isEditing
          ? 'Updated!'
          : 'Success!';

      const alertMessage = budgetAlert
        ? `${successMessage}\n\n${budgetAlert}`
        : successMessage;

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/explore'),
          },
        ]
      );
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
                {isEditing ? 'Edit Expense' : 'Add Expense'}
              </Text>

              <Text style={styles.headerSubtitle}>
                {isEditing
                  ? 'Update your spending details'
                  : 'Record your money spent'}
              </Text>
            </View>
          </View>

          {loadingTransaction ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                Loading expense...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>
                  EXPENSE AMOUNT
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
                  Enter the amount you spent
                </Text>
              </View>

              <Text style={styles.label}>
                Expense Category
              </Text>

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
                placeholder="e.g. Grocery shopping"
                placeholderTextColor="#8290A8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>
                Expense Date
              </Text>

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
                onPress={handleSaveExpense}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading
                    ? isEditing
                      ? 'Updating Expense...'
                      : 'Saving Expense...'
                    : isEditing
                      ? 'Update Expense  →'
                      : 'Save Expense  →'}
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
    backgroundColor: '#FF7D89',
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  amountLabel: {
    color: '#572B38',
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
    color: '#572B38',
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
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#1B2540',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#35415C',
  },
  selectedCategory: {
    backgroundColor: '#FF7D89',
    borderColor: '#FF7D89',
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
    backgroundColor: '#FF7D89',
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
  footerText: {
    color: '#8290A8',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
