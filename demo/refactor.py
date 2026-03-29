import re

with open('extracted_hub_tab_content.txt', 'r', encoding='utf-8') as f:
    extracted = f.read()

props_interface = """interface HubTabContentProps {
  activeTab: string;
  seasonCtx: any;
  d: any;
  team: any;
  isAdmin: boolean;
  isSupporter: boolean;
  memberAssetSummary: any;
  creditsLabel: any;
  handleSelectMatch: any;
  navigateToTab: any;
  setActiveAssetSheet: any;
  setCreditsSheetOpen: any;
  setSelectedMember: any;
}"""

content = f"""import React from 'react';
import {{ Alert }} from '@django-core/design-system';
import {{ HubOverviewTab }} from './HubOverviewTab';
import {{ HubWedstrijdenTab }} from './HubWedstrijdenTab';
import {{ HubSelectieTab }} from './HubSelectieTab';
import {{ HubBeheerTab }} from './HubBeheerTab';
import {{ HubClubTab }} from './HubClubTab';
import {{ AssetsTab }} from '../../components/AssetsTab';
import type {{ MatchRecord }} from '../periods/SeasonMatchesTab';
import type {{ SquadMember }} from '../periods/squadTabTypes';
import s from './MyTeamHubPage.module.css';
import {{ projectsApi }} from '../../api';

{props_interface}

export const HubTabContent: React.FC<HubTabContentProps> = ({{
  activeTab,
  seasonCtx,
  d,
  team,
  isAdmin,
  isSupporter,
  memberAssetSummary,
  creditsLabel,
  handleSelectMatch,
  navigateToTab,
  setActiveAssetSheet,
  setCreditsSheetOpen,
  setSelectedMember,
}}) => {{
  return (
    {extracted}
  );
}};
"""

with open('src/pages/identity/HubTabContent.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/pages/identity/MyTeamHubPage.tsx', 'r', encoding='utf-8') as f:
    original = f.read()

new_content = original.replace(extracted, """<div className={s.tabContent}>
          <HubTabContent
            activeTab={activeTab}
            seasonCtx={seasonCtx}
            d={d}
            team={team}
            isAdmin={isAdmin}
            isSupporter={isSupporter}
            memberAssetSummary={memberAssetSummary}
            creditsLabel={creditsLabel}
            handleSelectMatch={handleSelectMatch}
            navigateToTab={navigateToTab}
            setActiveAssetSheet={setActiveAssetSheet}
            setCreditsSheetOpen={setCreditsSheetOpen}
            setSelectedMember={setSelectedMember}
          />
        </div>""")

new_content = new_content.replace(
    "import { HubOverviewTab } from './HubOverviewTab';",
    "import { HubTabContent } from './HubTabContent';\nimport { HubOverviewTab } from './HubOverviewTab';"
)

with open('src/pages/identity/MyTeamHubPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
