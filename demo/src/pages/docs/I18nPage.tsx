import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Alert } from '@django-core/design-system';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome to the Internationalization Demo',
    description: 'This page demonstrates language switching with B04 i18n utilities and B12 preferences persistence.',
    currentLang: 'Current Language',
    selectLang: 'Select Language',
    sampleText: 'Sample Translated Text',
    greeting: 'Hello! This text would be translated based on your language selection.',
  },
  nl: {
    welcome: 'Welkom bij de Internationalisatie Demo',
    description: 'Deze pagina toont taalwisseling met B04 i18n hulpmiddelen en B12 voorkeuren persistentie.',
    currentLang: 'Huidige Taal',
    selectLang: 'Selecteer Taal',
    sampleText: 'Voorbeeld Vertaalde Tekst',
    greeting: 'Hallo! Deze tekst zou worden vertaald op basis van uw taalkeuze.',
  },
  fr: {
    welcome: "Bienvenue dans la Démo d'Internationalisation",
    description: 'Cette page démontre le changement de langue avec les utilitaires i18n B04 et la persistance des préférences B12.',
    currentLang: 'Langue Actuelle',
    selectLang: 'Sélectionner la Langue',
    sampleText: 'Exemple de Texte Traduit',
    greeting: 'Bonjour! Ce texte serait traduit en fonction de votre sélection de langue.',
  },
  de: {
    welcome: 'Willkommen bei der Internationalisierungs-Demo',
    description: 'Diese Seite demonstriert Sprachwechsel mit B04 i18n Utilities und B12 Präferenzen Persistenz.',
    currentLang: 'Aktuelle Sprache',
    selectLang: 'Sprache Auswählen',
    sampleText: 'Beispiel Übersetzter Text',
    greeting: 'Hallo! Dieser Text würde basierend auf Ihrer Sprachauswahl übersetzt.',
  },
};

export function I18nPage() {
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleLanguageChange = (langCode: string) => {
    setSaving(true);
    setLanguage(langCode);
    setSavedMessage('');
    setTimeout(() => {
      setSaving(false);
      setSavedMessage(`Language preference saved: ${languages.find(l => l.code === langCode)?.name}`);
      setTimeout(() => setSavedMessage(''), 3000);
    }, 500);
  };

  const t = translations[language] || translations.en;
  const currentLangInfo = languages.find(l => l.code === language);

  return (
    <AppShell>
      <PageHeader title="Internationalization" subtitle="B04 i18n & B12 Language Preferences" />
      <PageContent>
        <div className="page-container" data-testid="i18n-page">
          <Card className="p-24 mb-24">
            <h2 style={{ margin: '0 0 8px 0' }}>{t.welcome}</h2>
            <p className="m-0 fs-14" style={{ color: 'var(--app-muted-text)' }}>{t.description}</p>
          </Card>

          {savedMessage && <Alert variant="success" className="mb-24">{savedMessage}</Alert>}

          <Card className="p-24 mb-24">
            <h3 style={{ margin: '0 0 16px 0' }}>{t.currentLang}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontSize: '32px' }}>{currentLangInfo?.flag}</span>
              <div>
                <div className="fw-600 fs-18">{currentLangInfo?.name}</div>
                <div className="fs-14" style={{ color: 'var(--app-muted-text)' }}>Code: {language.toUpperCase()}</div>
              </div>
            </div>
          </Card>

          <Card className="p-24 mb-24">
            <h3 style={{ margin: '0 0 16px 0' }}>{t.selectLang}</h3>
            <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={saving}
                  style={{
                    padding: '16px',
                    border: language === lang.code ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                    borderRadius: '8px',
                    backgroundColor: language === lang.code ? '#eff6ff' : '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div className="fs-24 mb-8">{lang.flag}</div>
                  <div className="fw-600">{lang.name}</div>
                  <div className="fs-12" style={{ color: 'var(--app-muted-text)' }}>{lang.code.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-24">
            <h3 style={{ margin: '0 0 16px 0' }}>{t.sampleText}</h3>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p className="m-0 fs-16">{t.greeting}</p>
            </div>
            <div className="mt-16 fs-14" style={{ color: 'var(--app-muted-text)' }}>
              <p className="m-0">
                <strong>Note:</strong> In production, this would integrate with B04 gettext utilities for comprehensive translation
                management and B12 preferences API for persistent language storage across sessions.
              </p>
            </div>
          </Card>
        </div>
      </PageContent>
    </AppShell>
  );
}
