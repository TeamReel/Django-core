import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@django-core/design-system';
import {
  Zap,
  Calendar,
  CalendarDays,
  Users,
  UserRound,
  FileText,
  Image,
  Video,
  Plus,
  Search,
  FolderOpen,
  Shield,
  Building2,
  Trophy,
  ScrollText,
  CreditCard,
  Layers,
  type LucideIcon
} from 'lucide-react';
import styles from './SmartEmptyState.module.css';

type EmptyStateType =
  | 'content'
  | 'matches'
  | 'members'
  | 'files'
  | 'images'
  | 'videos'
  | 'search'
  | 'generic'
  | 'projects'
  | 'teams'
  | 'clubs'
  | 'users'
  | 'seasons'
  | 'competitions'
  | 'audit'
  | 'transactions'
  | 'media';

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
  projects: {
    icon: FolderOpen,
    title: 'Geen projecten gevonden',
    description: 'Maak een nieuw project aan om te beginnen.',
    primaryAction: {
      label: 'Project aanmaken',
    },
  },
  teams: {
    icon: Shield,
    title: 'Geen teams gevonden',
    description: 'Maak een team aan binnen je club.',
    primaryAction: {
      label: 'Team aanmaken',
    },
  },
  clubs: {
    icon: Building2,
    title: 'Geen clubs gevonden',
    description: 'Voeg een club toe aan je organisatie.',
    primaryAction: {
      label: 'Club toevoegen',
    },
  },
  users: {
    icon: UserRound,
    title: 'Geen gebruikers gevonden',
    description: 'Nodig gebruikers uit om samen te werken.',
    primaryAction: {
      label: 'Gebruiker uitnodigen',
    },
  },
  seasons: {
    icon: CalendarDays,
    title: 'Geen seizoenen gevonden',
    description: 'Maak een seizoen aan om wedstrijden te plannen.',
    primaryAction: {
      label: 'Seizoen aanmaken',
    },
  },
  competitions: {
    icon: Trophy,
    title: 'Geen competities gevonden',
    description: 'Voeg een competitie toe aan het seizoen.',
    primaryAction: {
      label: 'Competitie toevoegen',
    },
  },
  audit: {
    icon: ScrollText,
    title: 'Geen events gevonden',
    description: 'Er zijn nog geen audit events geregistreerd.',
  },
  transactions: {
    icon: CreditCard,
    title: 'Geen transacties',
    description: 'Er zijn nog geen transacties uitgevoerd.',
  },
  media: {
    icon: Layers,
    title: 'Geen media gevonden',
    description: 'Upload media of genereer content om je bibliotheek te vullen.',
    primaryAction: {
      label: 'Media uploaden',
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
  /** Hide default action buttons (useful for filtered-empty states). */
  hideActions?: boolean;
  matchId?: string;
  className?: string;
  /** Compact variant with less padding, suitable for inline/table contexts. */
  compact?: boolean;
}

export default function SmartEmptyState({
  type,
  title,
  description,
  primaryAction,
  secondaryAction,
  onPrimaryAction,
  onSecondaryAction,
  hideActions,
  matchId,
  className,
  compact,
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
      className={`${styles.container} ${compact ? styles.compact : ''} ${className || ''}`}
    >
      {/* Icon with subtle background */}
      <div className={styles.iconWrapper}>
        <Icon
          size={compact ? 28 : 36}
          className={styles.icon}
        />
      </div>

      {/* Title */}
      <h3 className={styles.title}>
        {finalTitle}
      </h3>

      {/* Description */}
      <p className={styles.description}>
        {finalDescription}
      </p>

      {/* Actions */}
      {!hideActions && (finalPrimaryAction || finalSecondaryAction) && (
        <div className={styles.actions}>
          {finalPrimaryAction && (
            <Button
              variant="primary"
              onClick={handlePrimaryClick}
              className={styles.fullWidth}
            >
              {finalPrimaryAction.label}
            </Button>
          )}

          {finalSecondaryAction && (
            <Button
              variant="secondary"
              onClick={handleSecondaryClick}
              className={styles.fullWidth}
            >
              {finalSecondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Export type for consumers
export type { EmptyStateType, SmartEmptyStateProps };
