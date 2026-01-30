---
work_package_id: "WP09"
subtasks:
  - "T051"
  - "T052"
  - "T053"
  - "T054"
title: "Demo: Positions Page"
phase: "Phase 3 - Frontend"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP09 – Demo: Positions Page

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create React page to browse positions per sport
2. Visual position grid/list display
3. Show position metadata if available
4. Filter by sport
5. Helpful for understanding what positions are valid

**Success Test**: Can browse all positions for a sport, understand position codes.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Frontend Stack**: React, TypeScript, Vite, TanStack Query
- **Dependencies**: WP03 (Sports API), WP06 (shared patterns)
- **Planning Decision CL-2**: Positions are flexible (advisory)
- **Constraints**:
  - Read-only view (edit via SportConfigEditor)
  - Clear visual presentation
  - Sport selector required

## Subtasks & Detailed Guidance

### T051 – Create PositionBadge component
- **Purpose**: Visual badge for position display
- **Steps**:
  1. Create `demo/src/components/sport-config/PositionBadge.tsx`:
     ```typescript
     interface PositionBadgeProps {
       position: string;
       isGoalkeeper?: boolean;
       description?: string;
     }

     // Common position color mappings
     const POSITION_COLORS: Record<string, string> = {
       GK: 'bg-yellow-100 text-yellow-800 border-yellow-300',
       // Defenders
       LB: 'bg-blue-100 text-blue-800 border-blue-300',
       CB: 'bg-blue-100 text-blue-800 border-blue-300',
       RB: 'bg-blue-100 text-blue-800 border-blue-300',
       LWB: 'bg-blue-100 text-blue-800 border-blue-300',
       RWB: 'bg-blue-100 text-blue-800 border-blue-300',
       // Midfielders
       DM: 'bg-green-100 text-green-800 border-green-300',
       CM: 'bg-green-100 text-green-800 border-green-300',
       AM: 'bg-green-100 text-green-800 border-green-300',
       LM: 'bg-green-100 text-green-800 border-green-300',
       RM: 'bg-green-100 text-green-800 border-green-300',
       // Forwards
       LW: 'bg-red-100 text-red-800 border-red-300',
       RW: 'bg-red-100 text-red-800 border-red-300',
       CF: 'bg-red-100 text-red-800 border-red-300',
       ST: 'bg-red-100 text-red-800 border-red-300',
     };

     export function PositionBadge({ position, isGoalkeeper, description }: PositionBadgeProps) {
       const colorClass = isGoalkeeper
         ? POSITION_COLORS.GK
         : POSITION_COLORS[position] ?? 'bg-gray-100 text-gray-800 border-gray-300';

       return (
         <div
           className={`inline-flex items-center px-3 py-1.5 rounded-full border ${colorClass}`}
           title={description}
         >
           <span className="font-mono font-semibold text-sm">{position}</span>
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/PositionBadge.tsx`
- **Parallel?**: Yes

### T052 – Create PositionGrid component
- **Purpose**: Display all positions for a sport
- **Steps**:
  1. Create `demo/src/components/sport-config/PositionGrid.tsx`:
     ```typescript
     import { PositionBadge } from './PositionBadge';
     import type { SportConfiguration } from '../../types/sport-config';

     interface PositionGridProps {
       config: SportConfiguration;
       sportName: string;
     }

     export function PositionGrid({ config, sportName }: PositionGridProps) {
       const positions = config.positions;
       const hasGoalkeeper = config.has_goalkeeper;

       // Group positions by type (simple heuristic)
       const goalkeeper = positions.filter(p => p === 'GK' || p.toLowerCase().includes('keeper'));
       const defenders = positions.filter(p =>
         ['LB', 'CB', 'RB', 'LWB', 'RWB', 'SW'].includes(p) ||
         p.toLowerCase().includes('back') ||
         p.toLowerCase().includes('defender')
       );
       const midfielders = positions.filter(p =>
         ['DM', 'CM', 'AM', 'LM', 'RM', 'CDM', 'CAM'].includes(p) ||
         p.toLowerCase().includes('mid')
       );
       const forwards = positions.filter(p =>
         ['LW', 'RW', 'CF', 'ST', 'SS'].includes(p) ||
         p.toLowerCase().includes('wing') ||
         p.toLowerCase().includes('forward') ||
         p.toLowerCase().includes('striker')
       );
       const other = positions.filter(p =>
         !goalkeeper.includes(p) &&
         !defenders.includes(p) &&
         !midfielders.includes(p) &&
         !forwards.includes(p)
       );

       const groups = [
         { name: 'Goalkeeper', positions: goalkeeper },
         { name: 'Defenders', positions: defenders },
         { name: 'Midfielders', positions: midfielders },
         { name: 'Forwards', positions: forwards },
         { name: 'Other', positions: other },
       ].filter(g => g.positions.length > 0);

       return (
         <div className="space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="font-semibold text-lg">{sportName} Positions</h3>
             <span className="text-sm text-gray-500">
               {positions.length} total • {hasGoalkeeper ? 'Has GK' : 'No GK'}
             </span>
           </div>

           {groups.map(group => (
             <div key={group.name}>
               <h4 className="text-sm font-medium text-gray-600 mb-2">{group.name}</h4>
               <div className="flex flex-wrap gap-2">
                 {group.positions.map(pos => (
                   <PositionBadge
                     key={pos}
                     position={pos}
                     isGoalkeeper={goalkeeper.includes(pos)}
                   />
                 ))}
               </div>
             </div>
           ))}

           {positions.length === 0 && (
             <p className="text-gray-500 text-center py-4">
               No positions defined for this sport
             </p>
           )}
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/PositionGrid.tsx`
- **Parallel?**: Yes (after T051)

### T053 – Create PositionsPage
- **Purpose**: Main page for browsing positions
- **Steps**:
  1. Create `demo/src/pages/sport-config/PositionsPage.tsx`:
     ```typescript
     import { useState } from 'react';
     import { useSports, useSport } from '../../hooks/useSports';
     import { PositionGrid } from '../../components/sport-config/PositionGrid';
     import { PositionBadge } from '../../components/sport-config/PositionBadge';

     export function PositionsPage() {
       const [selectedSlug, setSelectedSlug] = useState('');
       const { data: sportsData, isLoading: loadingSports } = useSports();
       const { data: selectedSport, isLoading: loadingSport } = useSport(selectedSlug);

       const sports = sportsData?.results ?? [];

       return (
         <div className="container mx-auto p-4">
           <h1 className="text-2xl font-bold mb-2">Position Reference</h1>
           <p className="text-gray-600 mb-6">
             Browse available positions for each sport. These are advisory - custom positions are allowed.
           </p>

           {/* Sport Selector */}
           <div className="mb-6">
             <label className="block text-sm font-medium mb-2">Select Sport</label>
             <div className="flex flex-wrap gap-2">
               {loadingSports ? (
                 <span className="text-gray-500">Loading sports...</span>
               ) : (
                 sports.map(sport => (
                   <button
                     key={sport.id}
                     onClick={() => setSelectedSlug(sport.slug)}
                     className={`px-4 py-2 rounded-lg border transition ${
                       selectedSlug === sport.slug
                         ? 'bg-blue-600 text-white border-blue-600'
                         : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                     }`}
                   >
                     {sport.sport_icon && <span className="mr-2">{sport.sport_icon}</span>}
                     {sport.name}
                   </button>
                 ))
               )}
             </div>
           </div>

           {/* Position Display */}
           {selectedSlug && (
             <div className="border rounded-lg p-6">
               {loadingSport ? (
                 <p className="text-gray-500">Loading positions...</p>
               ) : selectedSport?.configuration ? (
                 <PositionGrid
                   config={selectedSport.configuration}
                   sportName={selectedSport.name}
                 />
               ) : (
                 <p className="text-gray-500">No configuration found for this sport</p>
               )}
             </div>
           )}

           {/* Position Legend */}
           <div className="mt-8 p-4 bg-gray-50 rounded-lg">
             <h3 className="font-semibold mb-3">Position Color Legend</h3>
             <div className="flex flex-wrap gap-4 text-sm">
               <div className="flex items-center gap-2">
                 <PositionBadge position="GK" isGoalkeeper />
                 <span>Goalkeeper</span>
               </div>
               <div className="flex items-center gap-2">
                 <PositionBadge position="CB" />
                 <span>Defender</span>
               </div>
               <div className="flex items-center gap-2">
                 <PositionBadge position="CM" />
                 <span>Midfielder</span>
               </div>
               <div className="flex items-center gap-2">
                 <PositionBadge position="ST" />
                 <span>Forward</span>
               </div>
             </div>
           </div>

           {/* Info Box */}
           <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
             <p className="text-sm text-blue-800">
               <strong>ℹ️ Note:</strong> Positions are advisory. You can use custom position codes -
               the system will warn but allow them. This flexibility supports different coaching styles
               and regional naming conventions.
             </p>
           </div>
         </div>
       );
     }
     ```
- **Files**: `demo/src/pages/sport-config/PositionsPage.tsx`
- **Parallel?**: No (after T052)

### T054 – Add route and navigation
- **Purpose**: Wire up positions page
- **Steps**:
  1. Add route in App.tsx:
     ```typescript
     { path: '/sport-config/positions', element: <PositionsPage /> }
     ```
  2. Export from index:
     ```typescript
     export { PositionsPage } from './PositionsPage';
     ```
  3. Add navigation link
  4. Consider adding sub-navigation for sport-config section
- **Files**: `demo/src/App.tsx`, `demo/src/pages/sport-config/index.ts`
- **Parallel?**: No (after T053)

## Definition of Done Checklist

- [ ] PositionBadge with color coding
- [ ] PositionGrid with grouping logic
- [ ] PositionsPage with sport selector
- [ ] Position legend displayed
- [ ] Advisory note about flexibility (CL-2)
- [ ] Route registered
- [ ] No TypeScript errors
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify position grouping logic works for different sports
- Check color coding is clear and accessible
- Test with sports that have unusual position codes
- Verify advisory message is visible
- Check responsive layout

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
