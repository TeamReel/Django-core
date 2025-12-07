import { useState, useId, cloneElement, isValidElement } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import type { Placement } from '@floating-ui/react';
import { tooltip } from './Tooltip.css';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: delay },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Clone the child element and add necessary props
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ref: refs.setReference,
        'aria-describedby': isOpen ? tooltipId : undefined,
        ...getReferenceProps(),
      } as any)
    : children;

  return (
    <>
      {trigger}
      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            id={tooltipId}
            style={floatingStyles}
            className={`${tooltip} ${className ?? ''}`}
            {...getFloatingProps()}
          >
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
