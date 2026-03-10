/**
 * ThenVsNowModal - Type definitions
 */

export type ThenVsNowVideoType =
  | 'duo_portret'
  | 'duo_portret_cover'
  | 'duo_portret_overlay'
  | 'sidebyside_cover'
  | 'sidebyside_overlay'
  | 'transformation'
  | 'walking_composite';

export type ModalStep = 'members' | 'generating' | 'submitted' | 'error';

export interface Background {
  id: string;
  url: string;
  label?: string;
  profile_name?: string;
}

export interface ThenVsNowMember {
  id: string;
  name: string;
  shirtNumber?: string;
  position?: string;
  hasDuoPortret: boolean;
  hasDuoPortretCover: boolean;
  hasDuoPortretOverlay: boolean;
  hasSidebysideCover: boolean;
  hasSidebysideOverlay: boolean;
  hasTransformation: boolean;
  hasWalkingComposite: boolean;
  transformationKeys?: string[];
}

export interface ThenVsNowModalProps {
  videoType: ThenVsNowVideoType;
  eligibleMembers: ThenVsNowMember[];
  apiBaseUrl: string;
  projectId: string;
  seasonId: string;
  onClose: () => void;
}

export const VIDEO_TYPE_LABELS: Record<ThenVsNowVideoType, string> = {
  duo_portret: 'Duo Portret',
  duo_portret_cover: 'Duo Portret Cover',
  duo_portret_overlay: 'Duo Portret Overlay',
  sidebyside_cover: 'Then vs Now Cover',
  sidebyside_overlay: 'Then vs Now Overlay',
  transformation: 'Transformation',
  walking_composite: 'Walking Composite',
};

export const STEP_SUBTITLES: Record<ModalStep, string> = {
  members: 'Selecteer spelers voor de compilatie video',
  generating: 'Job wordt aangemaakt...',
  submitted: 'Job is gestart!',
  error: 'Er is een fout opgetreden',
};

export function filterByVideoType(m: ThenVsNowMember, videoType: ThenVsNowVideoType): boolean {
  switch (videoType) {
    case 'duo_portret': return m.hasDuoPortret;
    case 'duo_portret_cover': return m.hasDuoPortretCover;
    case 'duo_portret_overlay': return m.hasDuoPortretOverlay;
    case 'sidebyside_cover': return m.hasSidebysideCover;
    case 'sidebyside_overlay': return m.hasSidebysideOverlay;
    case 'walking_composite': return m.hasWalkingComposite;
    case 'transformation': return m.hasTransformation;
  }
}
