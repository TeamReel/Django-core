import { useState, useCallback } from 'react';

// ────────────────────────────────────────────────────────────────
// useModalState — Single modal with optional item payload
// ────────────────────────────────────────────────────────────────

export interface ModalState<T = undefined> {
  /** Whether the modal is currently open. */
  isOpen: boolean;
  /** The item associated with the open modal (detail / edit). */
  item: T extends undefined ? undefined : T | null;
  /** Open the modal, optionally with an item. */
  open: T extends undefined ? () => void : (item: T) => void;
  /** Close the modal and clear the item. */
  close: () => void;
}

/**
 * Manages a single modal's open/close + optional item state.
 *
 * @example
 * // Modal without payload (create)
 * const createModal = useModalState();
 * createModal.open();
 *
 * // Modal with payload (detail / edit)
 * const detailModal = useModalState<User>();
 * detailModal.open(user);
 * detailModal.item // User | null
 */
export function useModalState<T = undefined>(): ModalState<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);

  const open = useCallback((payload?: T) => {
    if (payload !== undefined) setItem(payload);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  return { isOpen, item, open, close } as ModalState<T>;
}

// ────────────────────────────────────────────────────────────────
// useCrudModals — Detail + Edit + Create modal combo
// ────────────────────────────────────────────────────────────────

export interface CrudModals<T> {
  /** Detail (read-only view) modal. */
  detail: ModalState<T>;
  /** Edit modal. */
  edit: ModalState<T>;
  /** Create modal (no item). */
  create: ModalState<undefined>;
}

/**
 * Manages the classic CRUD triad: detail / edit / create modals.
 *
 * Replaces the common 5-useState pattern:
 * ```ts
 * const [detailItem, setDetailItem]       = useState<T | null>(null);
 * const [isDetailOpen, setIsDetailOpen]   = useState(false);
 * const [editItem, setEditItem]           = useState<T | null>(null);
 * const [isEditOpen, setIsEditOpen]       = useState(false);
 * const [isCreateOpen, setIsCreateOpen]   = useState(false);
 * ```
 *
 * @example
 * const modals = useCrudModals<Competition>();
 *
 * // Open detail:  modals.detail.open(competition);
 * // Close detail: modals.detail.close();
 * // Open create:  modals.create.open();
 * // In JSX:
 * {modals.detail.isOpen && <DetailModal item={modals.detail.item!} onClose={modals.detail.close} />}
 * {modals.edit.isOpen   && <EditModal   item={modals.edit.item!}   onClose={modals.edit.close} />}
 * {modals.create.isOpen && <CreateModal onClose={modals.create.close} />}
 */
export function useCrudModals<T>(): CrudModals<T> {
  const detail = useModalState<T>();
  const edit = useModalState<T>();
  const create = useModalState();

  return { detail, edit, create };
}
