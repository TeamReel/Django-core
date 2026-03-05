/**
 * Brand & post-process asset templates (logo, sponsor, location, background, postprocess).
 */
import type { AssetTemplate } from './assetTemplateTypes';

export const BRAND_TEMPLATES: AssetTemplate[] = [
  {
    id: 'logo_standardize',
    name: 'Logo Standaardiseren',
    icon: 'landmark',
    category: 'logo',
    description: 'Zet een clublogo om naar vierkant formaat met transparante achtergrond.',
    inputRequirements: ['logo'],
    requiredAssetTypes: ['logo_upload'],
    outputAssetType: 'logo',
    creditsCost: 1,
    parameters: {
      background: {
        label: 'Achtergrond',
        type: 'select',
        options: [
          { value: 'transparent', label: 'Transparant' },
          { value: 'white', label: 'Wit' },
          { value: 'light_grey', label: 'Lichtgrijs' },
        ],
        default: 'transparent',
      },
      style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'original', label: 'Origineel' },
          { value: 'clean_vector', label: 'Clean Vector' },
          { value: 'minimalist', label: 'Minimalistisch' },
        ],
        default: 'original',
      },
    },
  },
  {
    id: 'sponsor_standardize',
    name: 'Sponsor Standaardiseren',
    icon: 'briefcase',
    category: 'sponsor',
    description: 'Zet een sponsorlogo om naar standaard formaat met transparante achtergrond.',
    inputRequirements: ['sponsor'],
    requiredAssetTypes: ['sponsor_logo_upload'],
    outputAssetType: 'sponsor_logo',
    creditsCost: 1,
    parameters: {
      background: {
        label: 'Achtergrond',
        type: 'select',
        options: [
          { value: 'transparent', label: 'Transparant' },
          { value: 'white', label: 'Wit' },
        ],
        default: 'transparent',
      },
      style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'original', label: 'Origineel' },
          { value: 'clean_vector', label: 'Clean Vector' },
        ],
        default: 'original',
      },
    },
  },
  {
    id: 'location_standardize',
    name: 'Locatie Achtergrond',
    icon: 'map-pin',
    category: 'location',
    description: 'Zet een voetbalveld/stadion foto om naar portrait formaat voor lineup video en flyer.',
    inputRequirements: ['location'],
    requiredAssetTypes: ['location_photo'],
    outputAssetType: 'stadium_background',
    creditsCost: 1,
    parameters: {
      time_of_day: {
        label: 'Tijdstip',
        type: 'select',
        options: [
          { value: 'as_is', label: 'Zoals de foto' },
          { value: 'golden_hour', label: 'Golden Hour' },
          { value: 'evening_lights', label: 'Avond (verlichting)' },
          { value: 'overcast', label: 'Bewolkt' },
        ],
        default: 'as_is',
      },
      style: {
        label: 'Stijl',
        type: 'select',
        options: [
          { value: 'realistic', label: 'Realistisch' },
          { value: 'vibrant', label: 'Levendig' },
          { value: 'cinematic', label: 'Cinematic' },
        ],
        default: 'realistic',
      },
      pitch_type: {
        label: 'Veldtype',
        type: 'select',
        options: [
          { value: 'professional', label: 'Professioneel' },
          { value: 'amateur', label: 'Amateurveld' },
          { value: 'worn', label: 'Versleten veld' },
        ],
        default: 'professional',
      },
    },
  },
  {
    id: 'background_standardize',
    name: 'Achtergrond Optimaliseren',
    icon: 'image',
    category: 'location',
    description: 'Optimaliseer een achtergrond voor portrait video compositing. De AI past de afbeelding aan zodat een speler er realistisch op geplakt kan worden.',
    inputRequirements: ['source'],
    requiredAssetTypes: [],
    outputAssetType: 'club_background',
    creditsCost: 1,
    parameters: {},
  },
  // ── Post-process templates ──
  {
    id: 'logo_postprocess',
    name: 'Logo Bewerken',
    icon: 'scissors',
    category: 'postprocess',
    description: 'Achtergrond verwijderen en logo optimaliseren voor print en flyers.',
    inputRequirements: ['source'],
    requiredAssetTypes: [],
    outputAssetType: 'logo',
    creditsCost: 1,
    parameters: {
      style: {
        label: 'Bewerking',
        type: 'select',
        options: [
          { value: 'remove_bg', label: 'Achtergrond verwijderen' },
          { value: 'enhance_edges', label: 'Randen verscherpen' },
          { value: 'upscale_hd', label: 'Opschalen naar HD' },
        ],
        default: 'remove_bg',
      },
    },
  },
  {
    id: 'sponsor_postprocess',
    name: 'Sponsor Logo Bewerken',
    icon: 'scissors',
    category: 'postprocess',
    description: 'Achtergrond verwijderen en sponsorlogo optimaliseren.',
    inputRequirements: ['source'],
    requiredAssetTypes: [],
    outputAssetType: 'sponsor_logo',
    creditsCost: 1,
    parameters: {
      style: {
        label: 'Bewerking',
        type: 'select',
        options: [
          { value: 'remove_bg', label: 'Achtergrond verwijderen' },
          { value: 'upscale_hd', label: 'Opschalen naar HD' },
        ],
        default: 'remove_bg',
      },
    },
  },
  {
    id: 'kit_postprocess',
    name: 'Tenue Bewerken',
    icon: 'scissors',
    category: 'postprocess',
    description: 'Achtergrond verwijderen en tenue-afbeelding optimaliseren voor print.',
    inputRequirements: ['source'],
    requiredAssetTypes: [],
    outputAssetType: 'kit_home',
    creditsCost: 1,
    parameters: {
      style: {
        label: 'Bewerking',
        type: 'select',
        options: [
          { value: 'remove_bg', label: 'Achtergrond verwijderen' },
          { value: 'upscale_hd', label: 'Opschalen naar HD' },
        ],
        default: 'remove_bg',
      },
    },
  },
  {
    id: 'location_postprocess',
    name: 'Locatie Bewerken',
    icon: 'scissors',
    category: 'postprocess',
    description: 'Locatiefoto optimaliseren als achtergrond voor video compositing.',
    inputRequirements: ['source'],
    requiredAssetTypes: [],
    outputAssetType: 'stadium_background',
    creditsCost: 1,
    parameters: {
      brightness: {
        label: 'Helderheid',
        type: 'select',
        options: [
          { value: 'darker', label: 'Donkerder' },
          { value: 'normal', label: 'Normaal' },
          { value: 'brighter', label: 'Helderder' },
        ],
        default: 'normal',
      },
      blur_center: {
        label: 'Centrum blur',
        type: 'select',
        options: [
          { value: 'none', label: 'Geen' },
          { value: 'subtle', label: 'Subtiel' },
          { value: 'medium', label: 'Medium' },
        ],
        default: 'subtle',
      },
      pitch_type: {
        label: 'Veldtype',
        type: 'select',
        options: [
          { value: 'professional', label: 'Professioneel' },
          { value: 'amateur', label: 'Amateurveld' },
          { value: 'worn', label: 'Versleten veld' },
        ],
        default: 'professional',
      },
    },
  },
];
