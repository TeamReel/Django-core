import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
import GovernanceSummaryCard from '../../../components/Governance/GovernanceSummaryCard';
import {
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detailStyles';
import {
  useTeamCreditsData,
  formatCredits,
  formatDateTime,
  amountColor,
  sourceTypeLabel,
  type TeamCreditsTabProps,
} from './useTeamCreditsData';

export default function TeamCreditsTab(props: TeamCreditsTabProps) {
  const {
    balance,
    balanceLoading,
    balanceError,
    userBalance,
    userBalanceLoading,
    userBalanceError,
    transactions,
    transactionsLoading,
    transactionsError,
    numericBalance,
    numericUserBalance,
    totals,
    recentTransactions,
    fetchBalance,
    fetchUserBalance,
    fetchTransactionsList,
    projectName,
    walletLabel,
  } = useTeamCreditsData(props);

  return (
    <div>
      <div className="mb-16" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchBalance();
            fetchUserBalance();
            if (props.view === 'transactions') fetchTransactionsList();
          }}
        >
          Refresh
        </Button>
      </div>

      {props.view === 'balance' && (
        <>
          {balanceError && (
            <Alert variant="info" className="mb-16">
              {balanceError}
            </Alert>
          )}

          {userBalanceError && (
            <Alert variant="info" className="mb-16">
              {userBalanceError}
            </Alert>
          )}

          {balanceLoading || userBalanceLoading ? (
            <div className="p-16 text-center opacity-70">Loading balance…</div>
          ) : (
            <>
              <div className="mb-12">
                <GovernanceSummaryCard
                  organisationId={props.organisationId}
                  projectId={props.projectId}
                  title="Governance (Org policies)"
                  description="Balance policy applies to team credits and match transactions."
                />
              </div>

              <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                <Card
                  className="p-24 text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Your Credits Balance
                  </div>
                  <div
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      margin: '8px 0',
                      color:
                        numericUserBalance !== null && numericUserBalance < 500
                          ? 'var(--app-warning)'
                          : 'var(--app-success)',
                    }}
                  >
                    {formatCredits(userBalance?.current_balance)}
                  </div>
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12" style={{ opacity: 0.55 }}>Charged to your account</div>
                </Card>

                <Card
                  className="p-24 text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {(walletLabel || 'Team')} Credits Balance
                  </div>
                  <div
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      margin: '8px 0',
                      color: numericBalance !== null && numericBalance < 500 ? 'var(--app-warning)' : 'var(--app-success)',
                    }}
                  >
                    {formatCredits(balance?.current_balance)}
                  </div>
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12" style={{ opacity: 0.55 }}>
                    {projectName || balance?.project_name || 'Team'}
                    {balance?.updated_at ? ` • Last updated ${formatDateTime(balance.updated_at)}` : ''}
                  </div>
                </Card>
              </div>

              {/* Transaction Timeline + Recent Activity */}
              <div className="mt-16">
                <Card className="p-24 mb-12">
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>📊 Transaction Timeline</h3>
                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Loading transactions…</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">No transactions recorded yet.</div>
                  ) : (
                    <>
                      <div className="flex-col gap-8">
                        {transactions.slice(0, 10).map((txn) => {
                          const amount = Number(txn.amount);
                          const maxAmount = Math.max(
                            ...transactions.slice(0, 10).map((t) => Math.abs(Number(t.amount))).filter((n) => Number.isFinite(n)),
                            0,
                          );
                          const absAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
                          const barWidth = maxAmount > 0 ? (absAmount / maxAmount) * 100 : 0;
                          const isPositive = Number.isFinite(amount) && amount > 0;

                          return (
                            <div key={txn.id} className="flex-row gap-12">
                              <div className="fs-12 opacity-70 text-right" style={{ minWidth: '120px' }}>
                                {new Date(txn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>

                              <div className="flex-row flex-1 relative" style={{ height: '32px' }}>
                                <div
                                  style={{
                                    width: `${barWidth}%`,
                                    height: '24px',
                                    backgroundColor: isPositive ? 'var(--app-success)' : 'var(--app-error)',
                                    borderRadius: '4px',
                                    opacity: 0.8,
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: '8px',
                                    paddingRight: '8px',
                                    minWidth: '60px',
                                  }}
                                >
                                  <span
                                    className="fs-12 fw-700 whitespace-nowrap"
                                    style={{ color: 'white' }}
                                  >
                                    {isPositive ? '+' : ''}
                                    {Number.isFinite(amount) ? amount.toLocaleString() : String(txn.amount)}
                                  </span>
                                </div>
                              </div>

                              <div
                                className="fs-12 opacity-60 truncate"
                                style={{ minWidth: '150px' }}
                              >
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {transactions.length > 10 && (
                        <div className="mt-16 text-center fs-12 opacity-60">
                          Showing 10 of {transactions.length} transactions
                        </div>
                      )}
                    </>
                  )}
                </Card>

                <Card className="p-24">
                  <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h3 className="m-0 fs-18">📋 Recent Activity</h3>
                  </div>

                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Loading transactions…</div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">No recent activity.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {recentTransactions.map((txn) => {
                        const amount = Number(txn.amount);
                        const isPositive = Number.isFinite(amount) && amount > 0;
                        return (
                          <div
                            key={txn.id}
                            className="flex-between p-16 rounded-8 bg-surface-2 border"
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <div className="flex-1-min">
                              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                              <div className="fs-13 opacity-60">
                                {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div
                              className="fs-20 fw-700 text-right"
                              style={{
                                color: isPositive ? 'var(--app-success)' : 'var(--app-error)',
                                minWidth: '100px',
                              }}
                            >
                              {isPositive ? '+' : ''}
                              {Number.isFinite(amount) ? amount.toLocaleString() : String(txn.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {props.view === 'transactions' && (
        <>
          {transactionsError && (
            <Alert variant="info" className="mb-16">
              {transactionsError}
            </Alert>
          )}

          <div className="mb-12">
            <GovernanceSummaryCard
              organisationId={props.organisationId}
              projectId={props.projectId}
              title="Governance (Org policies)"
              description="Helps explain why some transactions may warn/block on low balance."
            />
          </div>

          {transactionsLoading ? (
            <div className="p-16 text-center opacity-70">Loading transactions…</div>
          ) : transactions.length === 0 ? (
            <Alert variant="info">No transactions found for this team.</Alert>
          ) : (
            <>
              <div
                className="grid gap-12 mb-16"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
              >
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>➕ Total Added</div>
                  <div className="fw-800 text-success" style={{ fontSize: '26px' }}>
                    +{formatCredits(totals.added)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>➖ Total Used</div>
                  <div className="fw-800 text-error" style={{ fontSize: '26px' }}>
                    {formatCredits(totals.used)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>📊 Net</div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      color: totals.net >= 0 ? 'var(--app-success)' : 'var(--app-error)',
                    }}
                  >
                    {totals.net >= 0 ? '+' : ''}
                    {formatCredits(totals.net)}
                  </div>
                  <div className="fs-11 opacity-50 mt-4">
                    {totals.count} transactions loaded
                  </div>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="border-bottom" style={{ padding: '14px 16px' }}>
                  <div className="fs-14 fw-700">Team Transactions</div>
                  <div className="fs-12 opacity-60">
                    Showing {transactions.length} most recent entries
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table style={compactTableStyle}>
                    <thead>
                      <tr>
                        <th style={compactThStyle}>Time</th>
                        <th style={compactThStyle}>Type</th>
                        <th style={compactThStyle}>Amount</th>
                        <th style={compactThStyle}>Notes</th>
                        <th style={compactThStyle}>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => {
                        const amountNum = Number(t.amount);
                        const showPlus = Number.isFinite(amountNum) && amountNum > 0;
                        return (
                          <tr key={t.id}>
                            <td style={compactTextTdStyle}>{formatDateTime(t.timestamp)}</td>
                            <td style={compactTextTdStyle}>
                              <Badge variant="default">{sourceTypeLabel(t.source_type)}</Badge>
                            </td>
                            <td style={{ ...compactTdStyle, color: amountColor(amountNum), fontWeight: 700 }}>
                              {showPlus ? '+' : ''}
                              {formatCredits(t.amount)}
                            </td>
                            <td style={compactTextTdStyle}>
                              <span style={{ opacity: t.notes ? 1 : 0.5 }}>{t.notes || '—'}</span>
                            </td>
                            <td style={compactTextTdStyle}>
                              <span style={{ opacity: t.created_by_email ? 1 : 0.5 }}>{t.created_by_email || '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
