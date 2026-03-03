/**
 * Asset Generation Template type definitions.
 */

export interface TemplateParameter {
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
  default: string;
  /** Only show this parameter if another parameter has a specific value */
  visibleIf?: {
    param: string;
    /** Show if param value is one of these */
    includes?: string[];
    /** Show if param value is NOT one of these */
    excludes?: string[];
  };
}

export interface AssetTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  inputRequirements: string[];
  parameters: Record<string, TemplateParameter>;
  /** Which brand asset types are needed as input */
  requiredAssetTypes: string[];
  /** Which brand asset type the result saves as */
  outputAssetType: string;
  /** Credits cost per variant */
  creditsCost: number;
  /** Output type: 'image' (default) or 'video' */
  outputType?: 'image' | 'video';
  /** Video configuration (only for video templates) */
  videoConfig?: {
    durationSeconds: number;
    aspectRatio: string;
    resolution: string;
  };
}
