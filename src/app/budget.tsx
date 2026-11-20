
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

type Budget = {
  id: string;
  category: string;
  monthly_limit: number | string;
  budget_month: string;
};

type Expense = {
  category: string;
  amount: number | string;
};

export default function BudgetScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] =
    useState('Food & Grocery');
  const [amount, setAmount] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const monthStart = `${year}-${month}-01`;
  const nextMonth = new Date(year, today.getMonth() + 1, 1);
  const nextMonthStart =
    `${nextMonth.getFullYear()}-${String(
      nextMonth.getMonth() + 1
    ).padStart(2, '0')}-01`;

  const monthName = today.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const loadBudgetData = async () => {
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

      const [budgetResult, expenseResult] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, category, monthly_limit, budget_month')
          .eq('user_id', user.id)
          .eq('budget_month', monthStart),

        supabase
          .from('transactions')
          .select('category, amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('transaction_date', monthStart)
          .lt('transaction_date', nextMonthStart),
      ]);

      if (budgetResult.error) {
        Alert.alert('Budget Error', budgetResult.error.message);
        return;
      }

      if (expenseResult.error) {
        Alert.alert('Expense Error', expenseResult.error.message);
        return;
      }

      setBudgets(budgetResult.data || []);
      setExpenses(expenseResult.data || []);
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

  useFocusEffect(
    useCallback(() => {
      loadBudgetData();
    }, [])
  );

  const getSpent = (category: string) => {
    return expenses
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const totalBudget = budgets.reduce(
    (sum, item) => sum + Number(item.monthly_limit),
    0
  );

  const totalSpent = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const remaining = totalBudget - totalSpent;

  const resetForm = () => {
    setAmount('');
    setSelectedCategory('Food & Grocery');
    setEditingBudgetId(null);
  };

  const handleEditBudget = (item: Budget) => {
    setEditingBudgetId(item.id);
    setSelectedCategory(item.category);
    setAmount(String(item.monthly_limit));
  };

  const handleSaveBudget = async () => {
    const numericAmount = Number(amount.trim());

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid budget amount.'
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Login Required', 'Please sign in again.');
        return;
      }

      let error;

      if (editingBudgetId) {
        const result = await supabase
          .from('budgets')
          .update({
            category: selectedCategory,
            monthly_limit: numericAmount,
          })
          .eq('id', editingBudgetId)
          .eq('user_id', user.id);

        error = result.error;
      } else {
        const result = await supabase
          .from('budgets')
          .upsert(
            {
              user_id: user.id,
              category: selectedCategory,
              monthly_limit: numericAmount,
              budget_month: monthStart,
            },
            {
              onConflict: 'user_id,category,budget_month',
            }
          );

        error = result.error;
      }

      if (error) {
        Alert.alert('Save Failed', error.message);
        return;
      }

      const wasEditing = Boolean(editingBudgetId);
      resetForm();
      await loadBudgetData();

      Alert.alert(
        'Success!',
        wasEditing
          ? 'Your budget has been updated successfully.'
          : `${selectedCategory} budget saved successfully.`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong.';

      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = (item: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the ${item.category} budget?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingBudgetId(item.id);

              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError || !user) {
                Alert.alert('Login Required', 'Please sign in again.');
                return;
              }

              const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user.id);

              if (error) {
                Alert.alert('Delete Failed', error.message);
                return;
              }

              if (editingBudgetId === item.id) {
                resetForm();
              }

              await loadBudgetData();

              Alert.alert(
                'Deleted!',
                `${item.category} budget deleted successfully.`
              );
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Something went wrong.';

              Alert.alert('Error', message);
            } finally {
              setDeletingBudgetId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Monthly Budget</Text>
            <Text style={styles.headerSubtitle}>
              Manage your spending limits
            </Text>
          </View>
        </View>

        <Text style={styles.monthText}>{monthName}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL MONTHLY BUDGET</Text>
          <Text style={styles.summaryAmount}>
            Rs. {totalBudget.toLocaleString()}
          </Text>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.smallLabel}>Total Spent</Text>
              <Text style={styles.spentAmount}>
                Rs. {totalSpent.toLocaleString()}
              </Text>
            </View>

            <View>
              <Text style={styles.smallLabel}>Remaining</Text>
              <Text
                style={[
                  styles.remainingAmount,
                  remaining < 0 && styles.overBudget,
                ]}
              >
                Rs. {remaining.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {editingBudgetId ? 'Edit Category Budget' : 'Set Category Budget'}
        </Text>

        <Text style={styles.label}>Select Category</Text>

        <View style={styles.categoryContainer}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.selectedCategory,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item &&
                    styles.selectedCategoryText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Monthly Budget Amount</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter amount (e.g. 10000)"
          placeholderTextColor="#8290A8"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.disabledButton,
          ]}
          onPress={handleSaveBudget}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? 'Saving Budget...'
              : editingBudgetId
                ? 'Update Budget  →'
                : 'Save Budget  →'}
          </Text>
        </TouchableOpacity>

        {editingBudgetId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}

        <View style={styles.budgetHeading}>
          <Text style={styles.sectionTitle}>Your Category Budgets</Text>

          <TouchableOpacity onPress={loadBudgetData}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#21C995"
            style={styles.loader}
          />
        ) : budgets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Budgets Yet</Text>
            <Text style={styles.emptyText}>
              Set your first category budget above.
            </Text>
          </View>
        ) : (
          budgets.map((item) => {
            const limit = Number(item.monthly_limit);
            const spent = getSpent(item.category);
            const left = limit - spent;
            const percentage =
              limit > 0 ? (spent / limit) * 100 : 0;
            const progress = Math.min(percentage, 100);

            return (
              <View key={item.id} style={styles.budgetCard}>
                <View style={styles.budgetTopRow}>
                  <Text style={styles.budgetCategory}>
                    {item.category}
                  </Text>
                  <Text
                    style={[
                      styles.percentage,
                      percentage > 100 && styles.overBudget,
                    ]}
                  >
                    {Math.round(percentage)}%
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                      percentage > 100 && styles.progressOver,
                    ]}
                  />
                </View>

                <View style={styles.budgetBottomRow}>
                  <Text style={styles.budgetDetail}>
                    Spent: Rs. {spent.toLocaleString()}
                  </Text>
                  <Text style={styles.budgetDetail}>
                    Limit: Rs. {limit.toLocaleString()}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.remainingText,
                    left < 0 && styles.overBudget,
                  ]}
                >
                  {left >= 0
                    ? `Rs. ${left.toLocaleString()} remaining`
                    : `Rs. ${Math.abs(left).toLocaleString()} over budget`}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditBudget(item)}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      deletingBudgetId === item.id && styles.disabledButton,
                    ]}
                    onPress={() => handleDeleteBudget(item)}
                    disabled={deletingBudgetId === item.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deletingBudgetId === item.id
                        ? 'Deleting...'
                        : '🗑 Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.footerText}>
          Your budget information is private and secure.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  monthText: {
    color: '#21C995',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: '#1B2540',
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#35415C',
  },
  summaryLabel: {
    color: '#AAB4CA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryAmount: {
    color: '#21C995',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallLabel: {
    color: '#AAB4CA',
    fontSize: 12,
    marginBottom: 6,
  },
  spentAmount: {
    color: '#FF7D89',
    fontSize: 17,
    fontWeight: '800',
  },
  remainingAmount: {
    color: '#21C995',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
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
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#21C995',
    borderRadius: 15,
    padding: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#10182F',
    fontSize: 16,
    fontWeight: '900',
  },
  cancelButton: {
    backgroundColor: '#35415C',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    marginBottom: 25,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  budgetHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  refreshText: {
    color: '#21C995',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 30,
  },
  emptyBox: {
    backgroundColor: '#1B2540',
    borderRadius: 15,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#AAB4CA',
    fontSize: 12,
    marginTop: 8,
  },
  budgetCard: {
    backgroundColor: '#1B2540',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#35415C',
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  budgetCategory: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  percentage: {
    color: '#21C995',
    fontSize: 13,
    fontWeight: '800',
  },
  progressBackground: {
    height: 9,
    backgroundColor: '#35415C',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#21C995',
    borderRadius: 10,
  },
  progressOver: {
    backgroundColor: '#FF7D89',
  },
  budgetBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetDetail: {
    color: '#AAB4CA',
    fontSize: 11,
  },
  remainingText: {
    color: '#21C995',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  overBudget: {
    color: '#FF7D89',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#263A55',
    padding: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#21C995',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#492D3D',
    padding: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF7D89',
    fontSize: 13,
    fontWeight: '800',
  },
  footerText: {
    color: '#8290A8',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 25,
  },
});
