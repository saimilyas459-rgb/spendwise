
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number | string;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

type TypeFilter = 'all' | 'income' | 'expense';
type DateFilter = 'all' | 'today' | 'month';

const formatMoney = (amount: number) =>
  `Rs. ${amount.toLocaleString('en-PK', {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getTransactionIcon = (transaction: Transaction) => {
  if (transaction.type === 'income') return '💰';

  const category = transaction.category.toLowerCase();

  if (category.includes('food') || category.includes('grocery')) return '🛒';
  if (category.includes('shopping')) return '🛍️';
  if (category.includes('transport')) return '🚗';
  if (category.includes('bill')) return '🧾';
  if (category.includes('education')) return '📚';
  if (category.includes('health')) return '💊';
  if (category.includes('entertainment')) return '🎬';

  return '💸';
};

export default function TabTwoScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Load transactions from Supabase
  const loadTransactions = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Could not load transactions', error.message);
      setLoading(false);
      return;
    }

    setTransactions((data || []) as Transaction[]);
    setLoading(false);
  }, []);

  // Refresh dashboard whenever user returns
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  // Edit transaction
  const handleEditTransaction = (item: Transaction) => {
    router.push({
      pathname: item.type === 'income' ? '/add-income' : '/add-expense',
      params: {
        id: item.id,
      },
    });
  };

  // Delete transaction
  const handleDeleteTransaction = (item: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${item.type} of ${formatMoney(
        Number(item.amount) || 0
      )}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);

            const { error } = await supabase
              .from('transactions')
              .delete()
              .eq('id', item.id);

            setDeletingId(null);

            if (error) {
              Alert.alert('Delete failed', error.message);
              return;
            }

            setTransactions((current) =>
              current.filter((transaction) => transaction.id !== item.id)
            );

            Alert.alert(
              'Deleted',
              'Transaction deleted successfully. Your balance has been updated.'
            );
          },
        },
      ]
    );
  };

  const handleAddIncome = () => {
    router.push('/add-income');
  };

  const handleAddExpense = () => {
    router.push('/add-expense');
  };

  // Calculate totals using all transactions
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalBalance = totalIncome - totalExpenses;

  // Get available categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(transactions.map((item) => item.category))
    );

    return ['All', ...uniqueCategories];
  }, [transactions]);

  // Apply search and filters
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search by description or category
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();

      result = result.filter((item) => {
        const description = item.description?.toLowerCase() || '';
        const category = item.category.toLowerCase();

        return (
          description.includes(search) ||
          category.includes(search) ||
          item.type.toLowerCase().includes(search)
        );
      });
    }

    // Filter by transaction type
    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter);
    }

    // Filter by category
    if (categoryFilter !== 'All') {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Filter by date
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const currentMonth = today.slice(0, 7);

    if (dateFilter === 'today') {
      result = result.filter((item) => item.transaction_date === today);
    } else if (dateFilter === 'month') {
      result = result.filter((item) =>
        item.transaction_date.startsWith(currentMonth)
      );
    }

    return result;
  }, [transactions, searchText, typeFilter, categoryFilter, dateFilter]);

  const clearFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setDateFilter('all');
    setCategoryFilter('All');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dashboard Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK 👋</Text>
            <Text style={styles.userName}>Your Dashboard</Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.profileText}>S</Text>
          </TouchableOpacity>
        </View>

        {/* Total Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>

          <Text style={styles.balanceAmount}>
            {formatMoney(totalBalance)}
          </Text>

          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceSmallLabel}>Your money</Text>
              <Text style={styles.balanceSmallText}>
                Manage it wisely ✨
              </Text>
            </View>

            <Text style={styles.balanceIcon}>💳</Text>
          </View>
        </View>

        {/* Financial Overview */}
        <Text style={styles.sectionTitle}>Financial Overview</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconIncome}>
              <Text style={styles.statEmoji}>↗</Text>
            </View>

            <Text style={styles.statLabel}>Total Income</Text>

            <Text style={styles.incomeAmount}>
              {formatMoney(totalIncome)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconExpense}>
              <Text style={[styles.statEmoji, styles.expenseAmount]}>
                ↘
              </Text>
            </View>

            <Text style={styles.statLabel}>Total Expenses</Text>

            <Text style={styles.expenseAmount}>
              {formatMoney(totalExpenses)}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.incomeButton}
            onPress={handleAddIncome}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>＋</Text>
            <Text style={styles.actionText}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expenseButton}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>－</Text>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Search */}
        <Text style={styles.sectionTitle}>Search Transactions</Text>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search description or category..."
            placeholderTextColor="#75819A"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filters */}
        <Text style={styles.filterHeading}>Transaction Type</Text>

        <View style={styles.filterRow}>
          {[
            { label: 'All', value: 'all' },
            { label: 'Income', value: 'income' },
            { label: 'Expense', value: 'expense' },
          ].map((filter) => {
            const selected = typeFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  selected && styles.activeFilterChip,
                ]}
                onPress={() => setTypeFilter(filter.value as TypeFilter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.activeFilterText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date Filters */}
        <Text style={styles.filterHeading}>Date Range</Text>

        <View style={styles.filterRow}>
          {[
            { label: 'All Time', value: 'all' },
            { label: 'Today', value: 'today' },
            { label: 'This Month', value: 'month' },
          ].map((filter) => {
            const selected = dateFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  selected && styles.activeFilterChip,
                ]}
                onPress={() => setDateFilter(filter.value as DateFilter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.activeFilterText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category Filters */}
        <Text style={styles.filterHeading}>Category</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => {
            const selected = categoryFilter === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selected && styles.activeFilterChip,
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.activeFilterText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results Header */}
        <View style={styles.transactionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.resultCount}>
              {filteredTransactions.length} transaction(s) found
            </Text>
          </View>

          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilters}>Clear Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Results */}
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#21C995" />
            <Text style={styles.emptyText}>
              Loading transactions...
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔎</Text>

            <Text style={styles.emptyText}>
              No transactions found
            </Text>

            <Text style={styles.emptySubText}>
              Try changing your search or filters.
            </Text>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={clearFilters}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTransactions.map((item) => {
            const isIncome = item.type === 'income';
            const amount = Number(item.amount) || 0;
            const isDeleting = deletingId === item.id;

            return (
              <View style={styles.transactionCard} key={item.id}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionEmoji}>
                      {getTransactionIcon(item)}
                    </Text>
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text
                      style={styles.transactionTitle}
                      numberOfLines={1}
                    >
                      {item.description?.trim() || item.category}
                    </Text>

                    <Text style={styles.transactionCategory}>
                      {item.category} · {formatDate(item.transaction_date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      isIncome
                        ? styles.incomeAmount
                        : styles.expenseAmount,
                    ]}
                  >
                    {isIncome ? '+' : '-'} {formatMoney(amount)}
                  </Text>

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTransaction(item)}
                    disabled={deletingId !== null}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTransaction(item)}
                    disabled={deletingId !== null}
                    activeOpacity={0.7}
                  >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color="#FF7D89"
                      />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        Delete
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SpendWise · Smart Money. Better Life.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10182F',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greeting: {
    color: '#21C995',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 6,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#21C995',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#10182F',
    fontSize: 20,
    fontWeight: '900',
  },
  balanceCard: {
    backgroundColor: '#21C995',
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  balanceLabel: {
    color: '#103B34',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  balanceAmount: {
    color: '#10182F',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 12,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
  },
  balanceSmallLabel: {
    color: '#174C40',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceSmallText: {
    color: '#174C40',
    fontSize: 12,
    marginTop: 4,
  },
  balanceIcon: {
    fontSize: 34,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1B2540',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#293450',
  },
  statIconIncome: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#153E39',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconExpense: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#422B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    color: '#21C995',
    fontSize: 23,
    fontWeight: '800',
  },
  statLabel: {
    color: '#AAB4CA',
    fontSize: 12,
    marginBottom: 8,
  },
  incomeAmount: {
    color: '#21C995',
    fontSize: 15,
    fontWeight: '800',
  },
  expenseAmount: {
    color: '#FF7D89',
    fontSize: 15,
    fontWeight: '800',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  incomeButton: {
    flex: 1,
    backgroundColor: '#21C995',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  expenseButton: {
    flex: 1,
    backgroundColor: '#27334D',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#3A4863',
  },
  actionIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2540',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#293450',
    paddingHorizontal: 14,
    marginBottom: 20,
    minHeight: 52,
  },
  searchIcon: {
    fontSize: 17,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 12,
  },
  clearSearch: {
    color: '#AAB4CA',
    fontSize: 18,
    padding: 5,
  },
  filterHeading: {
    color: '#AAB4CA',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1B2540',
    borderWidth: 1,
    borderColor: '#293450',
  },
  activeFilterChip: {
    backgroundColor: '#21C995',
    borderColor: '#21C995',
  },
  filterChipText: {
    color: '#AAB4CA',
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#10182F',
    fontWeight: '900',
  },
  categoryScroll: {
    gap: 9,
    paddingBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1B2540',
    borderWidth: 1,
    borderColor: '#293450',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 10,
  },
  resultCount: {
    color: '#75819A',
    fontSize: 11,
    marginTop: -9,
    marginBottom: 12,
  },
  clearFilters: {
    color: '#21C995',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  transactionCard: {
    backgroundColor: '#1B2540',
    borderRadius: 15,
    padding: 14,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#293450',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    flex: 1,
    paddingRight: 8,
  },
  transactionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#27334D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionEmoji: {
    fontSize: 21,
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  transactionCategory: {
    color: '#AAB4CA',
    fontSize: 10,
    marginTop: 5,
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  editButton: {
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#153E39',
    minWidth: 58,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#21C995',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteButton: {
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#422B38',
    minWidth: 58,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF7D89',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#1B2540',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#AAB4CA',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#21C995',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  resetButtonText: {
    color: '#10182F',
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#75819A',
    fontSize: 11,
  },
});
