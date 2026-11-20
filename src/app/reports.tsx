
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  transaction_date: string;
  description?: string | null;
};

export default function ReportsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
  });

  const getNextMonth = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber, 1);

    return `${next.getFullYear()}-${String(
      next.getMonth() + 1
    ).padStart(2, '0')}`;
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const nextMonth = getNextMonth(selectedMonth);

      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, type, amount, category, transaction_date, description'
        )
        .gte('transaction_date', `${selectedMonth}-01`)
        .lt('transaction_date', `${nextMonth}-01`)
        .order('transaction_date', { ascending: false });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setTransactions(data || []);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [selectedMonth])
  );

  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalSavings = totalIncome - totalExpenses;

  const categoryTotals = transactions
    .filter((item) => item.type === 'expense')
    .reduce((result: Record<string, number>, item) => {
      const category = item.category || 'Other';

      result[category] =
        (result[category] || 0) + Number(item.amount);

      return result;
    }, {});

  const categoryData = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const maxCategoryAmount = Math.max(
    ...categoryData.map((item) => item[1]),
    1
  );

  const weeklyData = [1, 2, 3, 4, 5].map((week) => {
    const amount = transactions
      .filter((item) => {
        if (item.type !== 'expense') return false;

        const day = Number(item.transaction_date.split('-')[2]);
        const transactionWeek = Math.ceil(day / 7);

        return transactionWeek === week;
      })
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      label: `Week ${week}`,
      amount,
    };
  });

  const maxWeeklyAmount = Math.max(
    ...weeklyData.map((item) => item.amount),
    1
  );

  const maxMonthlyAmount = Math.max(
    totalIncome,
    totalExpenses,
    1
  );

  const formattedMonth = new Date(
    Number(selectedMonth.split('-')[0]),
    Number(selectedMonth.split('-')[1]) - 1,
    1
  ).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  });

  const changeMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);

    const newDate = new Date(year, month - 1 + direction, 1);

    setSelectedMonth(
      `${newDate.getFullYear()}-${String(
        newDate.getMonth() + 1
      ).padStart(2, '0')}`
    );
  };

  const formatAmount = (amount: number) =>
    `Rs. ${amount.toLocaleString('en-PK', {
      maximumFractionDigits: 2,
    })}`;

  const escapeHTML = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    });

  const escapeCSV = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  // PDF EXPORT - UPDATED
  const exportPDF = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const categoryRows =
        categoryData.length > 0
          ? categoryData
              .map(
                ([category, amount]) => `
                  <tr>
                    <td>${escapeHTML(category)}</td>
                    <td>${formatAmount(amount)}</td>
                  </tr>
                `
              )
              .join('')
          : '<tr><td colspan="2">No expenses recorded</td></tr>';

      const transactionRows =
        transactions.length > 0
          ? transactions
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHTML(item.transaction_date)}</td>
                    <td>${escapeHTML(item.type)}</td>
                    <td>${escapeHTML(item.category || 'Other')}</td>
                    <td>${escapeHTML(item.description || '-')}</td>
                    <td>${formatAmount(Number(item.amount))}</td>
                  </tr>
                `
              )
              .join('')
          : '<tr><td colspan="5">No transactions found</td></tr>';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #172338;
            }

            h1 {
              color: #176B59;
              margin-bottom: 5px;
            }

            .subtitle {
              color: #68788d;
              margin-bottom: 25px;
            }

            .summary {
              background: #e9f8f2;
              padding: 18px;
              border-radius: 10px;
              margin-bottom: 20px;
            }

            .summary p {
              margin: 9px 0;
              font-size: 14px;
            }

            h2 {
              margin-top: 25px;
              color: #176B59;
              font-size: 18px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            th, td {
              border: 1px solid #dce3e9;
              padding: 9px;
              text-align: left;
              font-size: 11px;
              word-break: break-word;
            }

            th {
              background: #176B59;
              color: white;
            }

            .footer {
              margin-top: 30px;
              text-align: center;
              color: #68788d;
              font-size: 11px;
            }
          </style>
        </head>

        <body>
          <h1>SpendWise Monthly Report</h1>

          <p class="subtitle">
            Financial Report - ${escapeHTML(formattedMonth)}
          </p>

          <div class="summary">
            <p><strong>Total Income:</strong> ${formatAmount(totalIncome)}</p>
            <p><strong>Total Expenses:</strong> ${formatAmount(totalExpenses)}</p>
            <p><strong>Total Savings:</strong> ${formatAmount(totalSavings)}</p>
            <p><strong>Total Transactions:</strong> ${transactions.length}</p>
          </div>

          <h2>Expense Category Breakdown</h2>

          <table>
            <tr>
              <th>Category</th>
              <th>Amount</th>
            </tr>
            ${categoryRows}
          </table>

          <h2>Transaction Details</h2>

          <table>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
            ${transactionRows}
          </table>

          <div class="footer">
            Generated by SpendWise
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const result = await Print.printToFileAsync({
        html,
      });

      // Check generated PDF
      if (!result.uri) {
        throw new Error('PDF file could not be generated.');
      }

      // Get available storage directory
      const directory =
        FileSystem.cacheDirectory ||
        FileSystem.documentDirectory;

      if (!directory) {
        throw new Error('Phone storage is not available.');
      }

      // Create destination PDF path
      const pdfUri =
        `${directory}SpendWise_Report_${selectedMonth}.pdf`;

      // Copy generated PDF to app storage
      await FileSystem.copyAsync({
        from: result.uri,
        to: pdfUri,
      });

      // Verify PDF file
      const fileInfo = await FileSystem.getInfoAsync(pdfUri);

      if (!fileInfo.exists) {
        throw new Error(
          'PDF file was not saved successfully.'
        );
      }

      // Check sharing availability
      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'PDF Created',
          `PDF saved successfully at: ${pdfUri}`
        );
        return;
      }

      // Share copied PDF
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share SpendWise PDF Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      Alert.alert(
        'PDF Export Failed',
        error.message || 'Unable to create PDF.'
      );
    } finally {
      setExporting(false);
    }
  };

  // CSV EXPORT
  const exportCSV = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const rows = [
        [
          'Date',
          'Type',
          'Category',
          'Description',
          'Amount (PKR)',
        ],
        ...transactions.map((item) => [
          item.transaction_date,
          item.type,
          item.category || 'Other',
          item.description || '',
          Number(item.amount).toFixed(2),
        ]),
      ];

      const csvContent = rows
        .map((row) => row.map(escapeCSV).join(','))
        .join('\r\n');

      const fileName = `SpendWise_Report_${selectedMonth}.csv`;

      const directory =
        FileSystem.cacheDirectory ||
        FileSystem.documentDirectory;

      if (!directory) {
        throw new Error('File storage is not available.');
      }

      const fileUri = directory + fileName;

      await FileSystem.writeAsStringAsync(
        fileUri,
        '\uFEFF' + csvContent,
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'CSV Created',
          `CSV file created at: ${fileUri}`
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share SpendWise CSV Report',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error: any) {
      Alert.alert(
        'CSV Export Failed',
        error.message || 'Unable to create CSV.'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>
              SPENDWISE ANALYTICS
            </Text>

            <Text style={styles.headerTitle}>
              Monthly Reports
            </Text>

            <Text style={styles.headerSubtitle}>
              Understand your spending habits
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>📊</Text>
          </View>
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => changeMonth(-1)}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.monthTextContainer}>
            <Text style={styles.monthLabel}>
              SELECTED MONTH
            </Text>

            <Text style={styles.monthText}>
              {formattedMonth}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => changeMonth(1)}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#21C995" />
            <Text style={styles.loadingText}>
              Loading reports...
            </Text>
          </View>
        ) : (
          <>
            {/* Export Buttons */}
            <View style={styles.exportCard}>
              <Text style={styles.exportTitle}>
                Export Your Report
              </Text>

              <Text style={styles.exportSubtitle}>
                Save or share your {formattedMonth} financial report.
              </Text>

              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={[
                    styles.exportButton,
                    styles.pdfButton,
                  ]}
                  onPress={exportPDF}
                  disabled={exporting}
                >
                  <Text style={styles.exportButtonIcon}>📄</Text>
                  <Text style={styles.exportButtonText}>
                    {exporting ? 'Please wait...' : 'Export PDF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.exportButton,
                    styles.csvButton,
                  ]}
                  onPress={exportCSV}
                  disabled={exporting}
                >
                  <Text style={styles.exportButtonIcon}>📊</Text>
                  <Text style={styles.exportButtonText}>
                    {exporting ? 'Please wait...' : 'Export CSV'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Savings Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                TOTAL SAVINGS
              </Text>

              <Text
                style={[
                  styles.summaryAmount,
                  totalSavings < 0 && styles.negativeAmount,
                ]}
              >
                {formatAmount(totalSavings)}
              </Text>

              <Text style={styles.summaryDescription}>
                Income minus expenses for this month
              </Text>
            </View>

            {/* Income and Expense Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconIncome}>
                  <Text style={styles.statIconText}>↗</Text>
                </View>

                <Text style={styles.statLabel}>
                  TOTAL INCOME
                </Text>

                <Text style={styles.incomeAmount}>
                  {formatAmount(totalIncome)}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconExpense}>
                  <Text style={styles.statIconText}>↘</Text>
                </View>

                <Text style={styles.statLabel}>
                  TOTAL EXPENSES
                </Text>

                <Text style={styles.expenseAmount}>
                  {formatAmount(totalExpenses)}
                </Text>
              </View>
            </View>

            {/* Monthly Cash Flow Chart */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Monthly Cash Flow
              </Text>

              <Text style={styles.sectionSubtitle}>
                Visual comparison of income and expenses
              </Text>

              <View style={styles.chartContainer}>
                <View style={styles.chartColumn}>
                  <Text style={styles.chartValue}>
                    {formatAmount(totalIncome)}
                  </Text>

                  <View style={styles.chartBarArea}>
                    <View
                      style={[
                        styles.verticalBar,
                        styles.incomeChartBar,
                        {
                          height: `${Math.max(
                            (totalIncome / maxMonthlyAmount) * 100,
                            totalIncome > 0 ? 3 : 0
                          )}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.chartLabel}>
                    Income
                  </Text>
                </View>

                <View style={styles.chartColumn}>
                  <Text style={styles.chartValue}>
                    {formatAmount(totalExpenses)}
                  </Text>

                  <View style={styles.chartBarArea}>
                    <View
                      style={[
                        styles.verticalBar,
                        styles.expenseChartBar,
                        {
                          height: `${Math.max(
                            (totalExpenses / maxMonthlyAmount) * 100,
                            totalExpenses > 0 ? 3 : 0
                          )}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.chartLabel}>
                    Expenses
                  </Text>
                </View>
              </View>

              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={styles.incomeLegendDot} />
                  <Text style={styles.legendText}>Income</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={styles.expenseLegendDot} />
                  <Text style={styles.legendText}>Expenses</Text>
                </View>
              </View>
            </View>

            {/* Weekly Expense Chart */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Weekly Spending
              </Text>

              <Text style={styles.sectionSubtitle}>
                Your expenses during this month
              </Text>

              <View style={styles.weeklyChart}>
                {weeklyData.map((week) => {
                  const barHeight =
                    (week.amount / maxWeeklyAmount) * 120;

                  return (
                    <View
                      key={week.label}
                      style={styles.weekColumn}
                    >
                      <Text style={styles.weekAmount}>
                        {week.amount > 0
                          ? formatAmount(week.amount)
                          : 'Rs. 0'}
                      </Text>

                      <View style={styles.weekBarArea}>
                        <View
                          style={[
                            styles.weekBar,
                            {
                              height:
                                week.amount > 0
                                  ? Math.max(barHeight, 5)
                                  : 3,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.weekLabel}>
                        {week.label.replace('Week ', 'W')}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.chartHint}>
                W1: Days 1–7  •  W2: Days 8–14  •  W3: Days 15–21
              </Text>

              <Text style={styles.chartHint}>
                W4: Days 22–28  •  W5: Days 29–31
              </Text>
            </View>

            {/* Expense Category Breakdown */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Expense Breakdown
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Where your money goes
                  </Text>
                </View>

                <Text style={styles.sectionEmoji}>💸</Text>
              </View>

              {categoryData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📭</Text>

                  <Text style={styles.emptyTitle}>
                    No Expenses Yet
                  </Text>

                  <Text style={styles.emptyText}>
                    Your expense categories will appear here.
                  </Text>
                </View>
              ) : (
                categoryData.map(([category, amount]) => {
                  const percentage =
                    (amount / maxCategoryAmount) * 100;

                  return (
                    <View
                      key={category}
                      style={styles.categoryItem}
                    >
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>
                          {category}
                        </Text>

                        <Text style={styles.categoryAmount}>
                          {formatAmount(amount)}
                        </Text>
                      </View>

                      <View style={styles.progressBackground}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Monthly Overview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Monthly Overview
              </Text>

              <Text style={styles.sectionSubtitle}>
                Income vs Expenses
              </Text>

              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>
                  Income
                </Text>

                <Text style={styles.incomeAmount}>
                  {formatAmount(totalIncome)}
                </Text>
              </View>

              <View style={styles.overviewBarBackground}>
                <View
                  style={[
                    styles.incomeBar,
                    {
                      width: `${
                        totalIncome + totalExpenses === 0
                          ? 0
                          : (totalIncome /
                              (totalIncome + totalExpenses)) *
                            100
                      }%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>
                  Expenses
                </Text>

                <Text style={styles.expenseAmount}>
                  {formatAmount(totalExpenses)}
                </Text>
              </View>

              <View style={styles.overviewBarBackground}>
                <View
                  style={[
                    styles.expenseBar,
                    {
                      width: `${
                        totalIncome + totalExpenses === 0
                          ? 0
                          : (totalExpenses /
                              (totalIncome + totalExpenses)) *
                            100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerEmoji}>💚</Text>

              <Text style={styles.footerText}>
                Smart spending today, better savings tomorrow!
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101B2D',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  headerLabel: {
    color: '#21C995',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 7,
  },

  headerSubtitle: {
    color: '#91A0B5',
    fontSize: 13,
    marginTop: 5,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1D3045',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    fontSize: 25,
  },

  monthSelector: {
    backgroundColor: '#1B2A3D',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  monthArrow: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#293D50',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowText: {
    color: '#21C995',
    fontSize: 30,
    marginTop: -4,
  },

  monthTextContainer: {
    alignItems: 'center',
  },

  monthLabel: {
    color: '#8293A9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  monthText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },

  exportCard: {
    backgroundColor: '#1B2A3D',
    borderRadius: 19,
    padding: 19,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#293D50',
  },

  exportTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  exportSubtitle: {
    color: '#8293A9',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 17,
  },

  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  exportButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 8,
  },

  pdfButton: {
    backgroundColor: '#176B59',
  },

  csvButton: {
    backgroundColor: '#293D50',
    borderWidth: 1,
    borderColor: '#21C995',
  },

  exportButtonIcon: {
    fontSize: 17,
  },

  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  summaryCard: {
    backgroundColor: '#176B59',
    borderRadius: 20,
    padding: 23,
    marginBottom: 16,
  },

  summaryLabel: {
    color: '#B8F5DF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 12,
  },

  negativeAmount: {
    color: '#FFD0D0',
  },

  summaryDescription: {
    color: '#C3EDE0',
    fontSize: 12,
    marginTop: 8,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1B2A3D',
    borderRadius: 17,
    padding: 16,
  },

  statIconIncome: {
    backgroundColor: '#17483F',
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  statIconExpense: {
    backgroundColor: '#49313A',
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  statIconText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#8293A9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  incomeAmount: {
    color: '#21C995',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 9,
  },

  expenseAmount: {
    color: '#FF7D89',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 9,
  },

  sectionCard: {
    backgroundColor: '#1B2A3D',
    borderRadius: 19,
    padding: 19,
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#8293A9',
    fontSize: 12,
    marginTop: 5,
  },

  sectionEmoji: {
    fontSize: 24,
  },

  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginTop: 25,
  },

  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },

  chartValue: {
    color: '#DCE5EF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },

  chartBarArea: {
    height: 150,
    width: 65,
    backgroundColor: '#293D50',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  verticalBar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  incomeChartBar: {
    backgroundColor: '#21C995',
  },

  expenseChartBar: {
    backgroundColor: '#FF7D89',
  },

  chartLabel: {
    color: '#DCE5EF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },

  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginTop: 20,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  incomeLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#21C995',
  },

  expenseLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF7D89',
  },

  legendText: {
    color: '#AAB8C9',
    fontSize: 11,
  },

  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 25,
  },

  weekColumn: {
    flex: 1,
    alignItems: 'center',
  },

  weekAmount: {
    color: '#AAB8C9',
    fontSize: 9,
    marginBottom: 8,
    textAlign: 'center',
  },

  weekBarArea: {
    height: 125,
    width: 28,
    backgroundColor: '#293D50',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  weekBar: {
    width: '100%',
    backgroundColor: '#21C995',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },

  weekLabel: {
    color: '#DCE5EF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 9,
  },

  chartHint: {
    color: '#8293A9',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 9,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  emptyEmoji: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  emptyText: {
    color: '#8293A9',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  categoryItem: {
    marginBottom: 19,
  },

  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  categoryName: {
    color: '#E6EDF5',
    fontSize: 13,
    fontWeight: '600',
  },

  categoryAmount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#2B3D50',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#21C995',
    borderRadius: 10,
  },

  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },

  overviewLabel: {
    color: '#DCE5EF',
    fontSize: 13,
    fontWeight: '600',
  },

  overviewBarBackground: {
    height: 10,
    backgroundColor: '#2B3D50',
    borderRadius: 10,
    overflow: 'hidden',
  },

  incomeBar: {
    height: '100%',
    backgroundColor: '#21C995',
    borderRadius: 10,
  },

  expenseBar: {
    height: '100%',
    backgroundColor: '#FF7D89',
    borderRadius: 10,
  },

  loader: {
    paddingVertical: 80,
    alignItems: 'center',
  },

  loadingText: {
    color: '#91A0B5',
    marginTop: 12,
    fontSize: 13,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  footerEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },

  footerText: {
    color: '#91A0B5',
    fontSize: 12,
    textAlign: 'center',
  },
});
