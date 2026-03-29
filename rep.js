const fs = require('fs');

let text = fs.readFileSync('demo/src/pages/activities/match-detail/MatchLineupField.tsx', 'utf-8');

const replTypes = "import { type SquadMember, getSquadMemberName, getUserKey } from './MatchLineupTypes';";
text = text.replace(/\/\*\* Squad member \/ participation record \*\*\/[\s\S]+?export interface FieldVisualizationProps/, replTypes + '\n\nexport interface FieldVisualizationProps');

const benchStartStr = '{/* Bench: squad members not in lineup */}';
const benchStart = text.indexOf(benchStartStr);
if (benchStart !== -1) {
  const benchEndMatchStr = "</div>\n    </div>\n  );\n}";
  const benchEnd = text.indexOf(benchEndMatchStr, benchStart);

  if (benchEnd !== -1) {
    const origBench = text.substring(benchStart, benchEnd + benchEndMatchStr.length);
    const replacement = {/* Bench: squad members not in lineup */}
      {(() => {
        const usedIds = new Set([...gkSelected, ...playerSelected].filter(Boolean));
        const benchMembers = allMembersDeduped.filter((p) => !usedIds.has(p.id));
        return (
          <MatchLineupBench
            benchMembers={benchMembers}
            lineupBenchStatus={lineupBenchStatus}
            setLineupBenchStatus={setLineupBenchStatus}
          />
        );
      })()};
      
    text = text.replace(origBench, replacement);
    text = text.replace('import styles from "./MatchLineupField.module.css";', 'import styles from "./MatchLineupField.module.css";\nimport { MatchLineupBench } from "./MatchLineupBench";');
    fs.writeFileSync('demo/src/pages/activities/match-detail/MatchLineupField.tsx', text);
    console.log('Done node script');
  } else {
    console.log('Bench end not found');
  }
} else {
  console.log('Bench start not found');
}
