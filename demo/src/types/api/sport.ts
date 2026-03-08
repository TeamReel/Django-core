/**
 * Sport configuration types — Sport, SportVariant, Position.
 * Mirrors: src/sport_configuration/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Position                                                           */
/* ------------------------------------------------------------------ */

export interface Position {
  id: number;
  name: string;
  abbreviation: string;
  category: string;
  sort_order: number;
}

/* ------------------------------------------------------------------ */
/*  Sport Variant                                                      */
/* ------------------------------------------------------------------ */

export interface SportVariant {
  id: number;
  name: string;
  slug: string;
  parent_sport: number;
  squad_size: number | null;
  match_duration_minutes: number | null;
  positions: Position[];
  configuration: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Sport                                                              */
/* ------------------------------------------------------------------ */

export interface Sport {
  id: number;
  name: string;
  slug: string;
  sport_icon: string;
  parent_sport_id: number | null;
  is_category: boolean;
  is_variant: boolean;
  squad_size: number | null;
  match_duration_minutes: number | null;
  variants: SportVariant[];
  positions: Position[];
  configuration: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Sport Configuration (project-level)                                */
/* ------------------------------------------------------------------ */

export interface SportConfiguration {
  sport: number;
  sport_name: string;
  variant: number | null;
  variant_name: string | null;
  positions_enabled: boolean;
  custom_positions: Position[];
}
