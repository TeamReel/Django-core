/**
 * Kit templates — primary tenue generation (home/away/third + legacy).
 */
import type { AssetTemplate } from './assetTemplateTypes';

export const KIT_TEMPLATES_TENUE: AssetTemplate[] = [
  {
    id: 'tenue_generate',
    name: 'Tenue Genereren',
    icon: 'shirt',
    category: 'tenue',
    description: 'Genereer een realistisch voetbaltenue met logo en sponsor.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload'],
    outputAssetType: 'kit_home',
    creditsCost: 1,
    parameters: {
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'long', label: 'Lang' },
          { value: 'short', label: 'Kort' },
        ],
        default: 'long',
      },
      neck: {
        label: 'Hals',
        type: 'select',
        options: [
          { value: 'round', label: 'Ronde kraag' },
          { value: 'collar', label: 'Polo kraag' },
          { value: 'v_neck', label: 'V-hals' },
        ],
        default: 'round',
      },
      kit_type: {
        label: 'Type',
        type: 'select',
        options: [
          { value: 'home', label: 'Thuis' },
          { value: 'away', label: 'Uit' },
          { value: 'third', label: 'Derde' },
        ],
        default: 'home',
      },
      shirt_base: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Shirt Kleur',
        type: 'select',
        options: [
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'navy', label: 'Navy' },
          { value: 'grey', label: 'Grijs' },
          { value: 'red', label: 'Rood' },
          { value: 'blue', label: 'Blauw' },
          { value: 'green', label: 'Groen' },
          { value: 'yellow', label: 'Geel' },
          { value: 'orange', label: 'Oranje' },
          { value: 'purple', label: 'Paars' },
          { value: 'pink', label: 'Roze' },
        ],
        default: 'white',
      },
      shorts_base: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Broek Kleur',
        type: 'select',
        options: [
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'navy', label: 'Navy' },
          { value: 'grey', label: 'Grijs' },
          { value: 'same_as_shirt', label: 'Zelfde als Shirt' },
        ],
        default: 'white',
      },
      socks_base: {
        visibleIf: { param: 'kit_type', excludes: ['home'] },
        label: 'Sokken Kleur',
        type: 'select',
        options: [
          { value: 'white', label: 'Wit' },
          { value: 'black', label: 'Zwart' },
          { value: 'same_as_shirt', label: 'Zelfde als Shirt' },
          { value: 'same_as_shorts', label: 'Zelfde als Broek' },
        ],
        default: 'white',
      },
    },
  },
  {
    id: 'legacy_tenue_generate',
    name: 'Legacy Tenue',
    icon: 'history',
    category: 'tenue',
    description: 'Genereer een retro/legacy tenue gebaseerd op een historisch shirt. Kies een tijdperk voor de stijl.',
    inputRequirements: ['logo', 'sponsor', 'reference'],
    requiredAssetTypes: ['logo_upload', 'sponsor_logo_upload', 'kit_legacy_upload'],
    outputAssetType: 'kit_legacy',
    creditsCost: 1,
    parameters: {
      era_style: {
        label: 'Tijdperk',
        type: 'select',
        options: [
          { value: 'default', label: 'Standaard' },
          { value: 'jaren80', label: 'Jaren \'80' },
          { value: 'jaren90', label: 'Jaren \'90' },
          { value: 'jaren00', label: 'Jaren \'00' },
        ],
        default: 'default',
      },
      sleeves: {
        label: 'Mouwen',
        type: 'select',
        options: [
          { value: 'long', label: 'Lang' },
          { value: 'short', label: 'Kort' },
        ],
        default: 'long',
      },
      neck: {
        label: 'Hals',
        type: 'select',
        options: [
          { value: 'round', label: 'Ronde kraag' },
          { value: 'collar', label: 'Polo kraag' },
          { value: 'v_neck', label: 'V-hals' },
        ],
        default: 'collar',
      },
    },
  },
];
