const fs = require('fs');
const mainFile = 'demo/src/pages/periods/MemberAssetsTab.tsx';
let txt = fs.readFileSync(mainFile, 'utf8');

const kStart = txt.indexOf('{effectiveKits.map((kit) => {');
const kEnd = txt.indexOf('        })}', kStart) + 11;
const kitsBlock = txt.substring(kStart, kEnd);

const replacement = `<MemberKitAssetCards
            effectiveKits={effectiveKits}
            videoVariants={videoVariants}
            setVideoVariants={setVideoVariants}
            form={form}
            setForm={setForm}
            membership={membership}
            apiBaseUrl={apiBaseUrl}
            membershipId={membershipId}
            selectedRole={selectedRole}
            expandedKits={expandedKits}
            derivedExpanded={derivedExpanded}
            toggleKit={toggleKit}
            toggleDerived={toggleDerived}
            openAiModal={openAiModal}
            startProcessingPoll={startProcessingPoll}
            confirm={confirm}
            handleMetadataUpdate={handleMetadataUpdate}
          />`;

txt = txt.substring(0, kStart) + replacement + txt.substring(kEnd);
txt = txt.replace("import type { MemberTabCommonProps } from './memberDetailUtils';", "import type { MemberTabCommonProps } from './memberDetailUtils';\nimport { MemberKitAssetCards } from './MemberKitAssetCards';");

// Legacy extraction
const leg_st = txt.indexOf('{legacyPhotoUrl && (() => {');
const leg_en = txt.indexOf('      })()}', leg_st) + 11;
const legBlock = txt.substring(leg_st, leg_en);

const legRep = `<MemberLegacyAssetBlock
            legacyPhotoUrl={legacyPhotoUrl}
            videoVariants={videoVariants}
            setVideoVariants={setVideoVariants}
            form={form}
            membership={membership}
            apiBaseUrl={apiBaseUrl}
            membershipId={membershipId}
            selectedRole={selectedRole}
            openAiModal={openAiModal}
            startProcessingPoll={startProcessingPoll}
            confirm={confirm}
            handleMetadataUpdate={handleMetadataUpdate}
          />`;
txt = txt.substring(0, leg_st) + legRep + txt.substring(leg_en);
txt = txt.replace("import { MemberKitAssetCards } from './MemberKitAssetCards';", "import { MemberKitAssetCards } from './MemberKitAssetCards';\nimport { MemberLegacyAssetBlock } from './MemberLegacyAssetBlock';");

fs.writeFileSync(mainFile, txt);

let compText = `import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@django-core/design-system';
import { clickableProps } from '../../utils/accessibility';
import { ProcessingBadge } from './ProcessingBadge';
import { getVariantDisplayUrl, getVariantRawUrl, isLineupReady, isProcessing } from '../../utils/assetStatus';
import { resolveDisplayUrl } from '../../utils/urlResolution';
import { mergeAssetsIntoMetadata } from './memberDetailUtils';
import { triggerAssetProcessing } from '../../utils/assetStatus';
import s from './MemberAssetsTab.module.css';
import m from './MemberDetailModals.module.css';

export function MemberKitAssetCards({
  effectiveKits, videoVariants, setVideoVariants, form, setForm,
  membership, apiBaseUrl, membershipId, selectedRole,
  expandedKits, derivedExpanded, toggleKit, toggleDerived,
  openAiModal, startProcessingPoll, confirm, handleMetadataUpdate
}: any) {
  return (
    <>
      ${kitsBlock}
    </>
  );
}
`;
fs.writeFileSync('demo/src/pages/periods/MemberKitAssetCards.tsx', compText);

let legText = `import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@django-core/design-system';
import { clickableProps } from '../../utils/accessibility';
import { ProcessingBadge } from './ProcessingBadge';
import { getVariantDisplayUrl, getVariantRawUrl, isLineupReady, isProcessing } from '../../utils/assetStatus';
import { resolveDisplayUrl } from '../../utils/urlResolution';
import { mergeAssetsIntoMetadata } from './memberDetailUtils';
import { triggerAssetProcessing } from '../../utils/assetStatus';
import s from './MemberAssetsTab.module.css';
import m from './MemberDetailModals.module.css';

export function MemberLegacyAssetBlock({
  legacyPhotoUrl, videoVariants, setVideoVariants, form, 
  membership, apiBaseUrl, membershipId, selectedRole,
  openAiModal, startProcessingPoll, confirm, handleMetadataUpdate
}: any) {
  return (
    <>
      ${legBlock}
    </>
  );
}
`;
fs.writeFileSync('demo/src/pages/periods/MemberLegacyAssetBlock.tsx', legText);
console.log('done extracting');
