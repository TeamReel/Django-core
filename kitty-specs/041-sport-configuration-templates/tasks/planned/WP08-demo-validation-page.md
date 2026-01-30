---
work_package_id: "WP08"
subtasks:
  - "T046"
  - "T047"
  - "T048"
  - "T049"
  - "T050"
title: "Demo: Validation Page"
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

# Work Package Prompt: WP08 – Demo: Validation Page

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create React page to test validation rules
2. Interactive forms for team size, positions, formation validation
3. Display validation results with proper styling
4. Warnings show as yellow, errors as red, info as blue
5. Clear UX for understanding validation results

**Success Test**: Can validate team size, positions, formation and see results.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Frontend Stack**: React, TypeScript, Vite, TanStack Query
- **Dependencies**: WP05 (Validation API), WP06 (shared patterns)
- **Planning Decision CL-1**: Warnings are non-blocking (advisory)
- **Constraints**:
  - Make clear that warnings don't block
  - Show validation context (allowed values)
  - Sport selector to choose sport for validation

## Subtasks & Detailed Guidance

### T046 – Create Validation types and hooks
- **Purpose**: Type-safe validation API integration
- **Steps**:
  1. Add to `demo/src/types/sport-config.ts`:
     ```typescript
     export type ValidationLevel = 'info' | 'warning' | 'error';

     export interface ValidationIssue {
       code: string;
       message: string;
       level: ValidationLevel;
       field: string | null;
       context: Record<string, unknown>;
     }

     export interface ValidationResult {
       is_valid: boolean;
       has_errors: boolean;
       has_warnings: boolean;
       issues: ValidationIssue[];
     }

     export interface TeamSizeValidationRequest {
       sport_slug: string;
       player_count: number;
     }

     export interface PositionsValidationRequest {
       sport_slug: string;
       positions: string[];
     }

     export interface FormationValidationRequest {
       sport_slug: string;
       formation: string;
     }
     ```
  2. Create `demo/src/hooks/useValidation.ts`:
     ```typescript
     import { useMutation } from '@tanstack/react-query';
     import { apiClient } from '../lib/api';
     import type {
       ValidationResult,
       TeamSizeValidationRequest,
       PositionsValidationRequest,
       FormationValidationRequest
     } from '../types/sport-config';

     export function useValidateTeamSize() {
       return useMutation<ValidationResult, Error, TeamSizeValidationRequest>({
         mutationFn: (data) =>
           apiClient.post('/api/v1/validation/team_size/', data).then(r => r.data),
       });
     }

     export function useValidatePositions() {
       return useMutation<ValidationResult, Error, PositionsValidationRequest>({
         mutationFn: (data) =>
           apiClient.post('/api/v1/validation/positions/', data).then(r => r.data),
       });
     }

     export function useValidateFormation() {
       return useMutation<ValidationResult, Error, FormationValidationRequest>({
         mutationFn: (data) =>
           apiClient.post('/api/v1/validation/formation/', data).then(r => r.data),
       });
     }
     ```
- **Files**: `demo/src/types/sport-config.ts`, `demo/src/hooks/useValidation.ts`
- **Parallel?**: Yes

### T047 – Create ValidationResultDisplay component
- **Purpose**: Visual display of validation results
- **Steps**:
  1. Create `demo/src/components/sport-config/ValidationResultDisplay.tsx`:
     ```typescript
     import type { ValidationResult, ValidationLevel } from '../../types/sport-config';

     interface ValidationResultDisplayProps {
       result: ValidationResult | null;
       isLoading?: boolean;
     }

     const LEVEL_STYLES: Record<ValidationLevel, string> = {
       info: 'bg-blue-50 border-blue-200 text-blue-800',
       warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
       error: 'bg-red-50 border-red-200 text-red-800',
     };

     const LEVEL_ICONS: Record<ValidationLevel, string> = {
       info: 'ℹ️',
       warning: '⚠️',
       error: '❌',
     };

     export function ValidationResultDisplay({ result, isLoading }: ValidationResultDisplayProps) {
       if (isLoading) {
         return (
           <div className="p-4 border rounded bg-gray-50">
             <p className="text-gray-600">Validating...</p>
           </div>
         );
       }

       if (!result) {
         return (
           <div className="p-4 border rounded bg-gray-50">
             <p className="text-gray-500">Run a validation to see results</p>
           </div>
         );
       }

       return (
         <div className="border rounded">
           {/* Summary Header */}
           <div className={`p-4 border-b ${result.is_valid ? 'bg-green-50' : 'bg-red-50'}`}>
             <div className="flex items-center gap-2">
               <span className="text-2xl">{result.is_valid ? '✅' : '⚠️'}</span>
               <div>
                 <p className="font-semibold">
                   {result.is_valid ? 'Valid' : 'Issues Found'}
                 </p>
                 <p className="text-sm text-gray-600">
                   {result.issues.length} issue(s) •
                   {result.has_errors ? ' Has errors' : ' No errors'}
                   {result.has_warnings ? ' • Has warnings' : ''}
                 </p>
               </div>
             </div>

             {!result.has_errors && result.has_warnings && (
               <p className="mt-2 text-sm text-yellow-700">
                 ℹ️ Warnings are advisory only - they won't block your operations.
               </p>
             )}
           </div>

           {/* Issues List */}
           {result.issues.length > 0 && (
             <div className="p-4 space-y-2">
               {result.issues.map((issue, index) => (
                 <div
                   key={index}
                   className={`p-3 border rounded ${LEVEL_STYLES[issue.level]}`}
                 >
                   <div className="flex items-start gap-2">
                     <span>{LEVEL_ICONS[issue.level]}</span>
                     <div className="flex-1">
                       <p className="font-medium">{issue.message}</p>
                       <p className="text-xs opacity-75 mt-1">Code: {issue.code}</p>
                       {issue.field && (
                         <p className="text-xs opacity-75">Field: {issue.field}</p>
                       )}
                       {Object.keys(issue.context).length > 0 && (
                         <details className="mt-2">
                           <summary className="text-xs cursor-pointer">Context</summary>
                           <pre className="mt-1 text-xs bg-white/50 p-2 rounded overflow-auto">
                             {JSON.stringify(issue.context, null, 2)}
                           </pre>
                         </details>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}

           {result.issues.length === 0 && (
             <div className="p-4 text-center text-gray-500">
               No issues found 🎉
             </div>
           )}
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/ValidationResultDisplay.tsx`
- **Parallel?**: Yes

### T048 – Create ValidationForm component
- **Purpose**: Forms for each validation type
- **Steps**:
  1. Create `demo/src/components/sport-config/ValidationForms.tsx`:
     ```typescript
     import { useState } from 'react';
     import type { Sport } from '../../types/sport-config';

     interface ValidationFormBaseProps {
       sports: Sport[];
       selectedSport: string;
       onSportChange: (slug: string) => void;
     }

     interface TeamSizeFormProps extends ValidationFormBaseProps {
       onValidate: (playerCount: number) => void;
       isPending: boolean;
     }

     export function TeamSizeForm({ sports, selectedSport, onSportChange, onValidate, isPending }: TeamSizeFormProps) {
       const [playerCount, setPlayerCount] = useState(11);

       return (
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium mb-1">Sport</label>
             <select
               value={selectedSport}
               onChange={e => onSportChange(e.target.value)}
               className="w-full border rounded px-3 py-2"
             >
               <option value="">Select sport...</option>
               {sports.map(s => (
                 <option key={s.id} value={s.slug}>{s.name}</option>
               ))}
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium mb-1">Player Count</label>
             <input
               type="number"
               value={playerCount}
               onChange={e => setPlayerCount(+e.target.value)}
               min={0}
               className="w-full border rounded px-3 py-2"
             />
           </div>

           <button
             onClick={() => onValidate(playerCount)}
             disabled={!selectedSport || isPending}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
           >
             {isPending ? 'Validating...' : 'Validate Team Size'}
           </button>
         </div>
       );
     }

     interface PositionsFormProps extends ValidationFormBaseProps {
       onValidate: (positions: string[]) => void;
       isPending: boolean;
     }

     export function PositionsForm({ sports, selectedSport, onSportChange, onValidate, isPending }: PositionsFormProps) {
       const [positions, setPositions] = useState('GK, CB, CM, ST');

       return (
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium mb-1">Sport</label>
             <select
               value={selectedSport}
               onChange={e => onSportChange(e.target.value)}
               className="w-full border rounded px-3 py-2"
             >
               <option value="">Select sport...</option>
               {sports.map(s => (
                 <option key={s.id} value={s.slug}>{s.name}</option>
               ))}
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium mb-1">Positions (comma-separated)</label>
             <textarea
               value={positions}
               onChange={e => setPositions(e.target.value)}
               rows={3}
               className="w-full border rounded px-3 py-2"
               placeholder="GK, LB, CB, RB, CM, ST"
             />
           </div>

           <button
             onClick={() => onValidate(positions.split(',').map(p => p.trim()).filter(Boolean))}
             disabled={!selectedSport || isPending}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
           >
             {isPending ? 'Validating...' : 'Validate Positions'}
           </button>
         </div>
       );
     }

     interface FormationFormProps extends ValidationFormBaseProps {
       onValidate: (formation: string) => void;
       isPending: boolean;
     }

     export function FormationForm({ sports, selectedSport, onSportChange, onValidate, isPending }: FormationFormProps) {
       const [formation, setFormation] = useState('4-3-3');

       return (
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium mb-1">Sport</label>
             <select
               value={selectedSport}
               onChange={e => onSportChange(e.target.value)}
               className="w-full border rounded px-3 py-2"
             >
               <option value="">Select sport...</option>
               {sports.map(s => (
                 <option key={s.id} value={s.slug}>{s.name}</option>
               ))}
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium mb-1">Formation</label>
             <input
               type="text"
               value={formation}
               onChange={e => setFormation(e.target.value)}
               className="w-full border rounded px-3 py-2"
               placeholder="4-3-3"
             />
           </div>

           <button
             onClick={() => onValidate(formation)}
             disabled={!selectedSport || isPending}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
           >
             {isPending ? 'Validating...' : 'Validate Formation'}
           </button>
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/ValidationForms.tsx`
- **Parallel?**: Yes

### T049 – Create ValidationPage
- **Purpose**: Main validation testing page
- **Steps**:
  1. Create `demo/src/pages/sport-config/ValidationPage.tsx`:
     ```typescript
     import { useState } from 'react';
     import { useSports } from '../../hooks/useSports';
     import { useValidateTeamSize, useValidatePositions, useValidateFormation } from '../../hooks/useValidation';
     import { ValidationResultDisplay } from '../../components/sport-config/ValidationResultDisplay';
     import { TeamSizeForm, PositionsForm, FormationForm } from '../../components/sport-config/ValidationForms';
     import type { ValidationResult } from '../../types/sport-config';

     type ValidationType = 'team_size' | 'positions' | 'formation';

     export function ValidationPage() {
       const [activeTab, setActiveTab] = useState<ValidationType>('team_size');
       const [selectedSport, setSelectedSport] = useState('');
       const [result, setResult] = useState<ValidationResult | null>(null);

       const { data: sportsData } = useSports();
       const sports = sportsData?.results ?? [];

       const teamSizeMutation = useValidateTeamSize();
       const positionsMutation = useValidatePositions();
       const formationMutation = useValidateFormation();

       const isPending = teamSizeMutation.isPending || positionsMutation.isPending || formationMutation.isPending;

       const tabs: { id: ValidationType; label: string }[] = [
         { id: 'team_size', label: '👥 Team Size' },
         { id: 'positions', label: '📍 Positions' },
         { id: 'formation', label: '⚽ Formation' },
       ];

       return (
         <div className="container mx-auto p-4">
           <h1 className="text-2xl font-bold mb-2">Validation Tester</h1>
           <p className="text-gray-600 mb-6">
             Test sport configurations against validation rules. Warnings are advisory only.
           </p>

           {/* Tabs */}
           <div className="flex gap-1 mb-6 border-b">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => { setActiveTab(tab.id); setResult(null); }}
                 className={`px-4 py-2 -mb-px border-b-2 ${
                   activeTab === tab.id
                     ? 'border-blue-600 text-blue-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </div>

           <div className="grid md:grid-cols-2 gap-6">
             {/* Form */}
             <div className="border rounded-lg p-6">
               <h2 className="font-semibold mb-4">
                 {activeTab === 'team_size' && 'Validate Team Size'}
                 {activeTab === 'positions' && 'Validate Positions'}
                 {activeTab === 'formation' && 'Validate Formation'}
               </h2>

               {activeTab === 'team_size' && (
                 <TeamSizeForm
                   sports={sports}
                   selectedSport={selectedSport}
                   onSportChange={setSelectedSport}
                   isPending={teamSizeMutation.isPending}
                   onValidate={(playerCount) => {
                     teamSizeMutation.mutate(
                       { sport_slug: selectedSport, player_count: playerCount },
                       { onSuccess: setResult }
                     );
                   }}
                 />
               )}

               {activeTab === 'positions' && (
                 <PositionsForm
                   sports={sports}
                   selectedSport={selectedSport}
                   onSportChange={setSelectedSport}
                   isPending={positionsMutation.isPending}
                   onValidate={(positions) => {
                     positionsMutation.mutate(
                       { sport_slug: selectedSport, positions },
                       { onSuccess: setResult }
                     );
                   }}
                 />
               )}

               {activeTab === 'formation' && (
                 <FormationForm
                   sports={sports}
                   selectedSport={selectedSport}
                   onSportChange={setSelectedSport}
                   isPending={formationMutation.isPending}
                   onValidate={(formation) => {
                     formationMutation.mutate(
                       { sport_slug: selectedSport, formation },
                       { onSuccess: setResult }
                     );
                   }}
                 />
               )}
             </div>

             {/* Result */}
             <div>
               <h2 className="font-semibold mb-4">Validation Result</h2>
               <ValidationResultDisplay result={result} isLoading={isPending} />
             </div>
           </div>
         </div>
       );
     }
     ```
- **Files**: `demo/src/pages/sport-config/ValidationPage.tsx`
- **Parallel?**: No (after T046, T047, T048)

### T050 – Add route and navigation
- **Purpose**: Wire up validation page
- **Steps**:
  1. Add route in App.tsx:
     ```typescript
     { path: '/sport-config/validation', element: <ValidationPage /> }
     ```
  2. Export from index:
     ```typescript
     export { ValidationPage } from './ValidationPage';
     ```
  3. Add navigation link
- **Files**: `demo/src/App.tsx`, `demo/src/pages/sport-config/index.ts`
- **Parallel?**: No (after T049)

## Definition of Done Checklist

- [ ] Validation types in sport-config.ts
- [ ] TanStack Query mutation hooks for all validations
- [ ] ValidationResultDisplay with color-coded issues
- [ ] Forms for team_size, positions, formation validation
- [ ] ValidationPage with tabs
- [ ] Route registered
- [ ] Clear messaging that warnings don't block
- [ ] Context details expandable
- [ ] No TypeScript errors
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify warning vs error styling is clear
- Check mutation state management
- Test with invalid sport slug
- Verify context display works
- Check responsive layout

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
