import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@django-core/design-system';
import {
  Zap,
  Calendar,
  Users,
  FileText,
  Image,
  Video,
  Plus,
  Search,
  type LucideIcon
} from 'lucide-react';

type EmptyStateType =
  | 'content'
  | 'matches'
  | 'members'
  | 'files'
  | 'images'
  | 'videos'
  | 'search'
  | 'generic';

interface SmartEmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

const configs: Record<EmptyStateType, SmartEmptyStateConfig> = {
  content: {
    icon: Zap,
    title: 'Nog geen content',
    description: 'Genereer in 2 taps professionele content voor je wedstrijd.',
    primaryAction: {
      label: 'Content genereren',
    },
  },
  matches: {
    icon: Calendar,
    title: 'Geen wedstrijden gevonden',
    description: 'Voeg een wedstrijd toe om te beginnen met content creatie.',
    primaryAction: {
      label: 'Wedstrijd toevoegen',
    },
  },
  members: {
    icon: Users,
    title: 'Nog geen leden',
    description: 'Nodig teamleden uit om samen content te maken.',
    primaryAction: {
      label: 'Leden uitnodigen',
    },
  },
  files: {
    icon: FileText,
    title: 'Geen bestanden',
    description: 'Upload bestanden of genereer content om te beginnen.',
    primaryAction: {
      label: 'Bestand uploaden',
    },
  },
  images: {
    icon: Image,
    title: 'Geen afbeeldingen',
    description: 'Upload foto\'s of genereer graphics voor je team.',
    primaryAction: {
      label: 'Afbeelding uploaden',
    },
    secondaryAction: {
      label: 'Graphics genereren',
    },
  },
  videos: {
    icon: Video,
    title: 'Geen video\'s',
    description: 'Upload video\'s of genereer automatisch highlights.',
    primaryAction: {
      label: 'Video uploaden',
    },
    secondaryAction: {
      label: 'Highlights genereren',
    },
  },
  search: {
    icon: Search,
    title: 'Geen resultaten',
    description: 'Probeer een andere zoekterm of bekijk alle wedstrijden.',
    primaryAction: {
      label: 'Alle wedstrijden bekijken',
    },
  },
  generic: {
    icon: Plus,
    title: 'Nog niets hier',
    description: 'Begin met het toevoegen van content.',
    primaryAction: {
      label: 'Toevoegen',
    },
  },
};

interface SmartEmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  primaryAction?: SmartEmptyStateConfig['primaryAction'];
  secondaryAction?: SmartEmptyStateConfig['secondaryAction'];
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  matchId?: string;
  className?: string;
}

export default function SmartEmptyState({
  type,
  title,
  description,
  primaryAction,
  secondaryAction,
  onPrimaryAction,
  onSecondaryAction,
  matchId,
  className,
}: SmartEmptyStateProps) {
  const navigate = useNavigate();
  const config = configs[type];
  const Icon = config.icon;

  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalPrimaryAction = primaryAction || config.primaryAction;
  const finalSecondaryAction = secondaryAction || config.secondaryAction;

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }

    if (finalPrimaryAction?.onClick) {
      finalPrimaryAction.onClick();
      return;
    }

    if (finalPrimaryAction?.href) {
      navigate(finalPrimaryAction.href);
      return;
    }

    // Default actions based on type
    switch (type) {
      case 'content':
        if (matchId) {
          navigate(`/content/generate?match=${matchId}`);
        } else {
          // Open QuickCreateFAB by dispatching custom event
          window.dispatchEvent(new CustomEvent('teamreel:open-quick-create'));
        }
        break;
      case 'matches':
        navigate('/matches/new');
        break;
      case 'members':
        navigate('/settings/memberships');
        break;
      case 'search':
        navigate('/search');
        break;
      default:
        break;
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
      return;
    }

    if (finalSecondaryAction?.onClick) {
      finalSecondaryAction.onClick();
      return;
    }

    if (finalSecondaryAction?.href) {
      navigate(finalSecondaryAction.href);
    }
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        minHeight: '200px',
      }}
    >
      {/* Icon with subtle background */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface-2, #f5f5f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <Icon
          size={36}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}
      >
        {finalTitle}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--color-text-muted)',
          marginBottom: '24px',
          maxWidth: '300px',
          lineHeight: 1.5,
        }}
      >
        {finalDescription}
      </p>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          maxWidth: '250px',
        }}
      >
        {finalPrimaryAction && (
          <Button
            variant="primary"
            onClick={handlePrimaryClick}
            style={{ width: '100%' }}
          >
            <Zap size={18} style={{ marginRight: '8px' }} />
            {finalPrimaryAction.label}
          </Button>
        )}

        {finalSecondaryAction && (
          <Button
            variant="secondary"
            onClick={handleSecondaryClick}
            style={{ width: '100%' }}
          >
            {finalSecondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Export type for consumers
export type { EmptyStateType, SmartEmptyStateProps };
