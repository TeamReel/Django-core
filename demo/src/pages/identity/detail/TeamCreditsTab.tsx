import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import GovernanceSummaryCard from '@/components/Governance/GovernanceSummaryCard';
import {
  useTeamCreditsData,
  formatCredits,
  formatDateTime,
  sourceTypeLabel,
  type TeamCreditsTabProps,
} from './useTeamCreditsData';
import styles from './TeamCreditsTab.module.css';

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
      <div className="mb-16 flex-row justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchBalance();
            fetchUserBalance();
            if (props.view === 'transactions') fetchTransactionsList();
          }}
        >
          Vernieuwen
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
            <div className="p-16 text-center opacity-70">Balans laden…</div>
          ) : (
            <>
              <div className="mb-12">
                <GovernanceSummaryCard
                  organisationId={props.organisationId}
                  projectId={props.projectId}
                  title="Governance (organisatiebeleid)"
                  description="Balansbeleid geldt voor teamtegoed en wedstrijdtransacties."
                />
              </div>

              <div className={`grid gap-12 ${styles.balanceGrid}`}>
                <Card
                  className={`p-24 text-center ${styles.balanceCard}`}
                >
                  <div className="fs-12 opacity-60 uppercase tracking-wide">
                    Jouw tegoed
                  </div>
                  <div
                    className={`fw-800 ${styles.balanceAmount}`}
                    data-status={numericUserBalance !== null && numericUserBalance < 500 ? 'warning' : 'success'}
                  >
                    {formatCredits(userBalance?.current_balance)}
                  </div>
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12 opacity-50">Afgeschreven van jouw account</div>
                </Card>

                <Card
                  className={`p-24 text-center ${styles.balanceCard}`}
                >
                  <div className="fs-12 opacity-60 uppercase tracking-wide">
                    {(walletLabel || 'Team')} tegoed
                  </div>
                  <div
                    className={`fw-800 ${styles.balanceAmount}`}
                    data-status={numericBalance !== null && numericBalance < 500 ? 'warning' : 'success'}
                  >
                    {formatCredits(balance?.current_balance)}
                  </div>
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12 opacity-50">
                    {projectName || balance?.project_name || 'Team'}
                    {balance?.updated_at ? ` • Laatst bijgewerkt ${formatDateTime(balance.updated_at)}` : ''}
                  </div>
                </Card>
              </div>

              {/* Transaction Timeline + Recent Activity */}
              <div className="mt-16">
                <Card className="p-24 mb-12">
                  <h3 className="m-0 mb-16 fs-18">Transactie-overzicht</h3>
                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Transacties laden…</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">Nog geen transacties.</div>
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
                              <div className={`fs-12 opacity-70 text-right ${styles.dateColumn}`}>
                                {new Date(txn.timestamp).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                              </div>

                              <div className={`flex-row flex-1 relative ${styles.barContainer}`}>
                                <div
                                  className={`rounded-4 transition flex-row px-8 ${styles.bar}`}
                                  data-positive={isPositive}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  <span
                                    className="fs-12 fw-700 whitespace-nowrap text-white"
                                  >
                                    {isPositive ? '+' : ''}
                                    {Number.isFinite(amount) ? amount.toLocaleString() : String(txn.amount)}
                                  </span>
                                </div>
                              </div>

                              <div
                                className={`fs-12 opacity-60 truncate ${styles.notesColumn}`}
                              >
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {transactions.length > 10 && (
                        <div className="mt-16 text-center fs-12 opacity-60">
                          10 van {transactions.length} transacties
                        </div>
                      )}
                    </>
                  )}
                </Card>

                <Card className="p-24">
                  <div className="flex-between mb-16">
                    <h3 className="m-0 fs-18">Recente activiteit</h3>
                  </div>

                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Transacties laden…</div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">Geen recente activiteit.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {recentTransactions.map((txn) => {
                        const amount = Number(txn.amount);
                        const isPositive = Number.isFinite(amount) && amount > 0;
                        return (
                          <div
                            key={txn.id}
                            className="flex-between p-16 rounded-8 bg-surface-2 border transition"
                          >
                            <div className="flex-1-min">
                              <div className="fs-14 fw-500 mb-4">
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                              <div className="fs-13 opacity-60">
                                {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div
                              className={`fs-20 fw-700 text-right ${styles.activityAmount}`}
                              data-positive={isPositive}
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
              title="Governance (organisatiebeleid)"
              description="Verklaart waarom sommige transacties kunnen waarschuwen of blokkeren bij laag saldo."
            />
          </div>

          {transactionsLoading ? (
            <div className="p-16 text-center opacity-70">Transacties laden…</div>
          ) : transactions.length === 0 ? (
            <Alert variant="info">Geen transacties gevonden voor dit team.</Alert>
          ) : (
            <>
              <div
                className={`grid gap-12 mb-16 ${styles.summaryGrid}`}
              >
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60 uppercase">Totaal bijgeschreven</div>
                  <div className={`fw-800 text-success ${styles.summaryValue}`}>
                    +{formatCredits(totals.added)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60 uppercase">Totaal gebruikt</div>
                  <div className={`fw-800 text-error ${styles.summaryValue}`}>
                    {formatCredits(totals.used)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60 uppercase">Net</div>
                  <div
                    className={`fw-800 ${styles.netValue}`}
                    data-positive={totals.net >= 0}
                  >
                    {totals.net >= 0 ? '+' : ''}
                    {formatCredits(totals.net)}
                  </div>
                  <div className="fs-11 opacity-50 mt-4">
                    {totals.count} transacties geladen
                  </div>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="border-bottom py-12 px-16">
                  <div className="fs-14 fw-700">Team transacties</div>
                  <div className="fs-12 opacity-60">
                    {transactions.length} meest recente transacties
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="detail-table">
                    <thead>
                      <tr>
                        <th className="detail-th">Tijd</th>
                        <th className="detail-th">Type</th>
                        <th className="detail-th">Bedrag</th>
                        <th className="detail-th">Notities</th>
                        <th className="detail-th">Gebruiker</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => {
                        const amountNum = Number(t.amount);
                        const showPlus = Number.isFinite(amountNum) && amountNum > 0;
                        return (
                          <tr key={t.id}>
                            <td className="detail-td-text">{formatDateTime(t.timestamp)}</td>
                            <td className="detail-td-text">
                              <Badge variant="default">{sourceTypeLabel(t.source_type)}</Badge>
                            </td>
                            <td className={`detail-td fw-700 ${styles.amountCell}`} data-sign={amountNum > 0 ? 'positive' : amountNum < 0 ? 'negative' : 'zero'}>
                              {showPlus ? '+' : ''}
                              {formatCredits(t.amount)}
                            </td>
                            <td className="detail-td-text">
                              <span className={styles.dimPlaceholder} data-empty={!t.notes}>{t.notes || '—'}</span>
                            </td>
                            <td className="detail-td-text">
                              <span className={styles.dimPlaceholder} data-empty={!t.created_by_email}>{t.created_by_email || '—'}</span>
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
