/**
 * NavbarModalShell — Renders centered overlay on desktop, BottomSheet on mobile.
 * Used by all navbar modals for consistent mobile/desktop behavior.
 *
 * On mobile: BottomSheet provides its own header (title + close + drag handle).
 * On desktop: renders centered overlay panel; children must include their own header.
 */
import { BottomSheet } from '@django-core/design-system';
import { useIsMobile } from '../hooks/useIsMobile';
import { useEscapeKey } from '../hooks/useEscapeKey';
import s from './TopNavbarModals.module.css';

interface NavbarModalShellProps {
  onClose: () => void;
  title: string;
  panelClassName: string;
  /** Desktop header + content. On mobile, only body/footer is rendered (BottomSheet provides header). */
  desktopHeader?: React.ReactNode;
  /** Main content — shown in both modes */
  children: React.ReactNode;
  /** Footer — shown in both modes */
  footer?: React.ReactNode;
}

export function NavbarModalShell({ onClose, title, panelClassName, desktopHeader, children, footer }: NavbarModalShellProps) {
  const isMobile = useIsMobile();
  useEscapeKey(onClose);

  if (isMobile) {
    return (
      <BottomSheet isOpen onClose={onClose} title={title}>
        {children}
        {footer}
      </BottomSheet>
    );
  }

  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${s.modalPanel} ${panelClassName}`}
        role="dialog"
        aria-label={title}
      >
        {desktopHeader}
        {children}
        {footer}
      </div>
    </div>
  );
}
