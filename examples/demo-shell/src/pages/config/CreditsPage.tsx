import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Alert,
  Table,
  Button,
} from '@django-core/design-system';
import { CreditsChart } from '../../components/CreditsChart';
import type { CreditsTransaction } from '../../types/chart';

/**
 * T014 - Credits Page
 *
 * Purpose: Show credit balance, usage, and low-balance alerts
 * - Displays current balance and recent transactions (last 30 days)
 * - Shows alert for MarketingHub low balance (<100)
 * - Chart placeholder ready for WP06 (charting implementation)
 * - No charts in MVP phase (WP06 handles visualizations)
 */

interface CreditTransaction {
  id: string;
  amount: number;
  operation: 'add' | 'use' | 'refund';
  reason: string;
  created_at: string;
  product?: string;
}

interface CreditBalance {
  current_balance: number;
  monthly_limit: number;
  used_this_month: number;
  marketing_hub_balance: number;
}

export const CreditsPage: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert backend transactions to chart format
  const chartTransactions: CreditsTransaction[] = transactions.map(tx => ({
    id: tx.id,
    date: tx.created_at,
    amount: tx.amount,
    type: tx.operation === 'use' ? 'usage' : tx.operation === 'add' ? 'purchase' : 'refund',
    description: tx.reason,
  }));

  useEffect(() => {
    const fetchCreditsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch credit balance
        const balanceResponse = await fetch('/api/credits/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (balanceResponse.ok) {
          const balanceData: CreditBalance = await balanceResponse.json();
          setBalance(balanceData);
        } else {
          throw new Error(`Failed to fetch balance: ${balanceResponse.status}`);
        }

        // Fetch recent transactions
        const txResponse = await fetch('/api/credits/transactions/?limit=30', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (txResponse.ok) {
          const txData = await txResponse.json();
          setTransactions(txData.results || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch credits data');
        console.error('Credits fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditsData();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Credits"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Credits' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading credits...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div>
        <PageHeader
          title="Credits"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Credits' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="credits-error">
            {error || 'Failed to load credits'}
          </Alert>
        </PageContent>
      </div>
    );
  }

  // Determine if marketing hub balance is low
  const isMarketingHubLow = balance.marketing_hub_balance < 100;

  return (
    <div>
      <PageHeader
        title="Credits & Usage"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Credits' },
        ]}
        action={
          <Button variant="primary" size="md">
            Buy Credits
          </Button>
        }
      />

      <PageContent>
        {/* Low balance alert */}
        {isMarketingHubLow && (
          <Alert type="error" className="mb-4" data-testid="credits-marketing-hub-low">
            <strong>MarketingHub Balance Low:</strong> Your MarketingHub credit balance is
            below 100. Certain features may be limited. Consider purchasing additional
            credits.
          </Alert>
        )}

        {/* Credit balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="credits-summary-available">
            <div className="text-sm text-gray-600 font-semibold mb-2">
              Available Credits
            </div>
            <div className="text-3xl font-bold">{balance.current_balance}</div>
            <div className="text-xs text-gray-500 mt-1">of {balance.monthly_limit} this month</div>
          </Card>

          <Card data-testid="credits-summary-used">
            <div className="text-sm text-gray-600 font-semibold mb-2">
              Used This Month
            </div>
            <div className="text-3xl font-bold">{balance.used_this_month}</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(
                ((balance.used_this_month || 0) / (balance.monthly_limit || 1)) * 100
              )}
              % of monthly limit
            </div>
          </Card>

          <Card
            data-testid="credits-summary-marketing-hub"
            className={isMarketingHubLow ? 'border-red-300 border-2' : ''}
          >
            <div className="text-sm text-gray-600 font-semibold mb-2">
              MarketingHub Balance
            </div>
            <div
              className={`text-3xl font-bold ${
                isMarketingHubLow ? 'text-red-600' : ''
              }`}
            >
              {balance.marketing_hub_balance}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isMarketingHubLow && (
                <span className="text-red-600 font-semibold">⚠️ Low balance</span>
              )}
            </div>
          </Card>
        </div>

        {/* Usage progress bar */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Credits Used</span>
              <span className="font-semibold">
                {balance.used_this_month} / {balance.monthly_limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  (balance.used_this_month || 0) > (balance.monthly_limit || 1) * 0.8
                    ? 'bg-red-500'
                    : (balance.used_this_month || 0) >
                        (balance.monthly_limit || 1) * 0.5
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(
                    ((balance.used_this_month || 0) / (balance.monthly_limit || 1)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Usage Chart */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Usage Trend (Last 30 Days)</h3>
          <CreditsChart
            transactions={chartTransactions}
            className="w-full"
          />
        </Card>

        {/* Recent transactions */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          {transactions.length > 0 ? (
            <Table
              columns={[
                {
                  key: 'timestamp',
                  label: 'Date',
                },
                {
                  key: 'operation',
                  label: 'Type',
                },
                {
                  key: 'amount',
                  label: 'Amount',
                },
                {
                  key: 'product',
                  label: 'Product',
                },
                {
                  key: 'reason',
                  label: 'Description',
                },
              ]}
              rows={transactions.map((tx) => ({
                id: tx.id,
                timestamp: (
                  <span
                    className="text-sm"
                    data-testid={`tx-date-${tx.id}`}
                  >
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                ),
                operation: (
                  <Badge
                    variant={
                      tx.operation === 'add'
                        ? 'success'
                        : tx.operation === 'use'
                          ? 'warning'
                          : 'info'
                    }
                    data-testid={`tx-operation-${tx.id}`}
                  >
                    {tx.operation.charAt(0).toUpperCase() +
                      tx.operation.slice(1)}
                  </Badge>
                ),
                amount: (
                  <span
                    className={`font-semibold ${
                      tx.operation === 'use' ? 'text-red-600' : 'text-green-600'
                    }`}
                    data-testid={`tx-amount-${tx.id}`}
                  >
                    {tx.operation === 'use' ? '-' : '+'}{tx.amount}
                  </span>
                ),
                product: (
                  <span
                    className="text-sm"
                    data-testid={`tx-product-${tx.id}`}
                  >
                    {tx.product || '-'}
                  </span>
                ),
                reason: (
                  <span
                    className="text-sm text-gray-600"
                    data-testid={`tx-reason-${tx.id}`}
                  >
                    {tx.reason}
                  </span>
                ),
              }))}
              data-testid="credits-transactions-table"
            />
          ) : (
            <Alert type="info">No transactions yet.</Alert>
          )}
        </Card>
      </PageContent>
    </div>
  );
};

export default CreditsPage;
