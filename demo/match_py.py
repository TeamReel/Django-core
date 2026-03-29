file = "src/pages/activities/match-detail/MatchLineupField.tsx"
text = open(file, encoding="utf8").read()

types_start = text.find('export interface LineupPlayer')
types_end = text.find('// ── MatchLineupField')

if types_start != -1 and types_end != -1:
    types_code = text[types_start:types_end]
    open("src/pages/activities/match-detail/MatchLineupTypes.ts", "w", encoding="utf8").write(types_code)
    text = text[:types_start] + "import { LineupPlayer, FieldPosition, MatchLineupFieldProps } from './MatchLineupTypes';\n" + text[types_end:]
    open(file, "w", encoding="utf8").write(text)
    print("Types extracted")

bench_start = text.find('      {/* ── Bench ── */}')
bench_end = text.find('    </div>\n  );\n};')

if bench_start != -1 and bench_end != -1:
    bench_code = text[bench_start:bench_end]
    wrapper = f"""import React from 'react';
import type {{ LineupPlayer, FieldPosition }} from './MatchLineupTypes';
import {{ X, Plus }} from 'lucide-react';
import styles from './MatchLineupField.module.css';

interface MatchLineupBenchProps {{
  localBench: LineupPlayer[];
  editingPositions: boolean;
  canEdit: boolean;
  onRemoveFromBench: (id: string) => void;
  benchCountLabel: string;
}}

export const MatchLineupBench: React.FC<MatchLineupBenchProps> = ({{
  localBench,
  editingPositions,
  canEdit,
  onRemoveFromBench,
  benchCountLabel,
}}) => {{
  return (
    <>
{bench_code}
    </>
  );
}};
"""
    open("src/pages/activities/match-detail/MatchLineupBench.tsx", "w", encoding="utf8").write(wrapper)
    
    rep = f"""      <MatchLineupBench
        localBench={{localBench}}
        editingPositions={{editingPositions}}
        canEdit={{canEdit}}
        onRemoveFromBench={{handleRemoveFromBench}}
        benchCountLabel={{benchCountLabel}}
      />\n"""
    text = text[:bench_start] + rep + text[bench_end:]
    text = text.replace("import styles from './MatchLineupField.module.css';", "import { MatchLineupBench } from './MatchLineupBench';\nimport styles from './MatchLineupField.module.css';")
    open(file, "w", encoding="utf8").write(text)
    print("Bench extracted")

