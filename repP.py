import re
with open('demo/src/pages/activities/match-detail/MatchLineupField.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

repl_types = "import { type SquadMember, getSquadMemberName, getUserKey } from './MatchLineupTypes';"
text = re.sub(r'\/\*\* Squad member \/ participation record \*\*\/[\s\S]+?export interface FieldVisualizationProps', repl_types + '\n\nexport interface FieldVisualizationProps', text)

bench_start_str = '{/* Bench: squad members not in lineup */}'
bench_start = text.find(bench_start_str)

if bench_start != -1:
    bench_end_str = '</div>\n    </div>\n  );\n}'
    bench_end = text.find(bench_end_str, bench_start)
    if bench_end != -1:
        orig_bench = text[bench_start:bench_end + len(bench_end_str)]
        replacement = '''{/* Bench: squad members not in lineup */}
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
      })()}'''
        text = text.replace(orig_bench, replacement)
        text = text.replace('import styles from "./MatchLineupField.module.css";', 'import styles from "./MatchLineupField.module.css";\nimport { MatchLineupBench } from "./MatchLineupBench";')

with open('demo/src/pages/activities/match-detail/MatchLineupField.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
