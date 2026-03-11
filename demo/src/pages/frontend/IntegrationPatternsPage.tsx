import React, { useState, useEffect } from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import { logger } from '@/utils/logger';
import styles from './IntegrationPatternsPage.module.css';
import { INTEGRATION_PATTERNS, type PatternData } from './integrationPatternsData';

const CodeBlock = ({ code, language = 'typescript' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy', err);
    }
  };

  return (
    <div className="relative mt-16 mb-16">
      <div className={`absolute z-10 ${styles.copyButtonWrapper}`}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre
        className={`p-16 rounded-8 overflow-x-auto fs-14 m-0 ${styles.codeBlockPre}`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

const PatternSection = ({
  id,
  title,
  description,
  code,
  bestPractices,
  pitfalls
}: {
  id: string;
  title: string;
  description: string;
  code: string;
  bestPractices: string[];
  pitfalls?: string[];
}) => (
  <section id={id} className={styles.patternSection}>
    <h2 className="fs-24 fw-700 mb-16 text-primary">{title}</h2>
    <p className={`fs-16 mb-24 text-secondary ${styles.patternDescription}`}>
      {description}
    </p>

    <CodeBlock code={code} />

    <div className="grid gap-24 mt-24 grid-cols-2">
      <Card className={`p-20 ${styles.practiceCard}`}>
        <h3 className="fs-16 fw-600 mb-12 text-success">
          ✅ Best Practices
        </h3>
        <ul className={`m-0 text-secondary ${styles.practiceList}`}>
          {bestPractices.map((practice) => (
            <li key={practice} className="mb-8">{practice}</li>
          ))}
        </ul>
      </Card>

      {pitfalls && (
        <Card className={`p-20 ${styles.practiceCard}`}>
          <h3 className="fs-16 fw-600 mb-12 text-error">
            ⚠️ Common Pitfalls
          </h3>
          <ul className={`m-0 text-secondary ${styles.practiceList}`}>
            {pitfalls.map((pitfall) => (
              <li key={pitfall} className="mb-8">{pitfall}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  </section>
);

export function IntegrationPatternsPage() {
  const [activeSection, setActiveSection] = useState('fetching');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const patterns = INTEGRATION_PATTERNS;

  return (
    <AppShell>
      <div className={`flex-row ${styles.pageContainer}`}>
        {/* Sidebar Navigation */}
        <div
          className={`sticky overflow-y-auto bg-surface p-24 ${styles.sidebar}`}
        >
          <h3 className="fs-18 fw-700 mb-16 text-primary">
            Patterns
          </h3>
          <nav>
            <ul className={`p-0 m-0 ${styles.navList}`}>
              {patterns.map((pattern) => (
                <li key={pattern.id} className="mb-8">
                  <button
                    onClick={() => scrollToSection(pattern.id)}
                    className={`w-full text-left rounded-6 border-none cursor-pointer transition ${styles.navButton}`}
                    data-active={activeSection === pattern.id ? 'true' : undefined}
                  >
                    {pattern.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${styles.mainContent}`}>
          <div className={styles.headerSection}>
            <h1 className={`fw-800 mb-16 text-primary ${styles.pageTitle}`}>
              Integration Patterns
            </h1>
            <p className={`fs-18 text-secondary ${styles.pageDescription}`}>
              Reference guide for integrating frontend components with backend services.
              Follow these patterns to ensure consistency, security, and reliability across the application.
            </p>
          </div>

          {patterns.map((pattern) => (
            <PatternSection key={pattern.id} {...pattern} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
