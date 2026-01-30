---
work_package_id: "WP06"
subtasks:
  - "T034"
  - "T035"
  - "T036"
  - "T037"
  - "T038"
  - "T039"
title: "Demo: Sports Page"
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

# Work Package Prompt: WP06 – Demo: Sports Page

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create React page to list all sports
2. Show sport with nested configuration
3. Allow staff users to edit configuration
4. Use existing demo patterns (hooks, components)
5. Page is responsive and follows demo styling

**Success Test**: Can view all sports, see configurations, edit config as staff user.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Frontend Stack**: React, TypeScript, Vite, TanStack Query
- **Dependencies**: WP03 (Sports API)
- **Patterns**: Follow existing demo pages in `demo/src/pages/`
- **Constraints**:
  - Use existing API client patterns
  - TypeScript strict mode
  - Responsive design

## Subtasks & Detailed Guidance

### T034 – Create TypeScript types for Sport API
- **Purpose**: Type-safe API responses
- **Steps**:
  1. Create `demo/src/types/sport-config.ts`:
     ```typescript
     export interface SportConfiguration {
       team_size_min: number;
       team_size_max: number;
       max_substitutes: number;
       positions: string[];
       formations: Record<string, unknown>;
       outfit_types: string[];
       has_goalkeeper: boolean;
       metadata: Record<string, unknown>;
     }

     export interface Sport {
       id: number;
       name: string;
       slug: string;
       sport_icon: string;
       federation_metadata: Record<string, unknown>;
       is_active: boolean;
       configuration: SportConfiguration | null;
       created_at: string;
       updated_at: string;
     }

     export interface SportListResponse {
       count: number;
       next: string | null;
       previous: string | null;
       results: Sport[];
     }
     ```
- **Files**: `demo/src/types/sport-config.ts`
- **Parallel?**: Yes

### T035 – Create Sports API hooks
- **Purpose**: TanStack Query hooks for sports data
- **Steps**:
  1. Create `demo/src/hooks/useSports.ts`:
     ```typescript
     import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
     import { apiClient } from '../lib/api';
     import type { Sport, SportListResponse, SportConfiguration } from '../types/sport-config';

     export function useSports() {
       return useQuery<SportListResponse>({
         queryKey: ['sports'],
         queryFn: () => apiClient.get('/api/v1/sports/').then(r => r.data),
       });
     }

     export function useSport(slug: string) {
       return useQuery<Sport>({
         queryKey: ['sports', slug],
         queryFn: () => apiClient.get(`/api/v1/sports/${slug}/`).then(r => r.data),
         enabled: !!slug,
       });
     }

     export function useSportConfiguration(slug: string) {
       return useQuery<SportConfiguration>({
         queryKey: ['sports', slug, 'configuration'],
         queryFn: () => apiClient.get(`/api/v1/sports/${slug}/configuration/`).then(r => r.data),
         enabled: !!slug,
       });
     }

     export function useUpdateSportConfiguration(slug: string) {
       const queryClient = useQueryClient();

       return useMutation({
         mutationFn: (data: Partial<SportConfiguration>) =>
           apiClient.patch(`/api/v1/sports/${slug}/configuration/`, data),
         onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['sports', slug] });
         },
       });
     }
     ```
- **Files**: `demo/src/hooks/useSports.ts`
- **Parallel?**: Yes (after T034)

### T036 – Create SportCard component
- **Purpose**: Display sport with configuration summary
- **Steps**:
  1. Create `demo/src/components/sport-config/SportCard.tsx`:
     ```typescript
     import { Sport } from '../../types/sport-config';

     interface SportCardProps {
       sport: Sport;
       onSelect?: (sport: Sport) => void;
     }

     export function SportCard({ sport, onSelect }: SportCardProps) {
       const config = sport.configuration;

       return (
         <div
           className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
           onClick={() => onSelect?.(sport)}
         >
           <div className="flex items-center gap-3">
             {sport.sport_icon && (
               <span className="text-2xl">{sport.sport_icon}</span>
             )}
             <div>
               <h3 className="font-semibold">{sport.name}</h3>
               <p className="text-sm text-gray-500">{sport.slug}</p>
             </div>
           </div>

           {config && (
             <div className="mt-3 text-sm text-gray-600">
               <p>Team size: {config.team_size_min}-{config.team_size_max}</p>
               <p>Positions: {config.positions.length}</p>
               <p>Formations: {Object.keys(config.formations).length}</p>
             </div>
           )}

           {!sport.is_active && (
             <span className="mt-2 inline-block px-2 py-1 text-xs bg-gray-200 rounded">
               Inactive
             </span>
           )}
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/SportCard.tsx`
- **Parallel?**: Yes

### T037 – Create SportConfigEditor component
- **Purpose**: Edit sport configuration details
- **Steps**:
  1. Create `demo/src/components/sport-config/SportConfigEditor.tsx`:
     ```typescript
     import { useState } from 'react';
     import { SportConfiguration } from '../../types/sport-config';
     import { useUpdateSportConfiguration } from '../../hooks/useSports';

     interface SportConfigEditorProps {
       slug: string;
       config: SportConfiguration;
       canEdit: boolean;
     }

     export function SportConfigEditor({ slug, config, canEdit }: SportConfigEditorProps) {
       const [formData, setFormData] = useState(config);
       const mutation = useUpdateSportConfiguration(slug);

       const handleSubmit = (e: React.FormEvent) => {
         e.preventDefault();
         mutation.mutate(formData);
       };

       return (
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium">Min Team Size</label>
               <input
                 type="number"
                 value={formData.team_size_min}
                 onChange={e => setFormData({...formData, team_size_min: +e.target.value})}
                 disabled={!canEdit}
                 className="mt-1 block w-full rounded border-gray-300"
               />
             </div>
             <div>
               <label className="block text-sm font-medium">Max Team Size</label>
               <input
                 type="number"
                 value={formData.team_size_max}
                 onChange={e => setFormData({...formData, team_size_max: +e.target.value})}
                 disabled={!canEdit}
                 className="mt-1 block w-full rounded border-gray-300"
               />
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium">Positions</label>
             <textarea
               value={formData.positions.join(', ')}
               onChange={e => setFormData({
                 ...formData,
                 positions: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
               })}
               disabled={!canEdit}
               className="mt-1 block w-full rounded border-gray-300"
               rows={3}
             />
             <p className="text-xs text-gray-500">Comma-separated list</p>
           </div>

           <div className="flex items-center gap-2">
             <input
               type="checkbox"
               checked={formData.has_goalkeeper}
               onChange={e => setFormData({...formData, has_goalkeeper: e.target.checked})}
               disabled={!canEdit}
             />
             <label className="text-sm">Has Goalkeeper</label>
           </div>

           {canEdit && (
             <button
               type="submit"
               disabled={mutation.isPending}
               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
             >
               {mutation.isPending ? 'Saving...' : 'Save Configuration'}
             </button>
           )}

           {mutation.isError && (
             <p className="text-red-600 text-sm">Failed to save configuration</p>
           )}
         </form>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/SportConfigEditor.tsx`
- **Parallel?**: Yes (after T035)

### T038 – Create SportsPage
- **Purpose**: Main page component for sports management
- **Steps**:
  1. Create `demo/src/pages/sport-config/SportsPage.tsx`:
     ```typescript
     import { useState } from 'react';
     import { useSports, useSport } from '../../hooks/useSports';
     import { SportCard } from '../../components/sport-config/SportCard';
     import { SportConfigEditor } from '../../components/sport-config/SportConfigEditor';
     import { useAuth } from '../../hooks/useAuth';
     import type { Sport } from '../../types/sport-config';

     export function SportsPage() {
       const { data, isLoading, error } = useSports();
       const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
       const { data: selectedSport } = useSport(selectedSlug ?? '');
       const { user } = useAuth();
       const canEdit = user?.is_staff ?? false;

       if (isLoading) return <div className="p-4">Loading sports...</div>;
       if (error) return <div className="p-4 text-red-600">Failed to load sports</div>;

       return (
         <div className="container mx-auto p-4">
           <h1 className="text-2xl font-bold mb-6">Sports Configuration</h1>

           <div className="grid md:grid-cols-3 gap-6">
             {/* Sports List */}
             <div className="md:col-span-1">
               <h2 className="text-lg font-semibold mb-4">Available Sports</h2>
               <div className="space-y-3">
                 {data?.results.map(sport => (
                   <SportCard
                     key={sport.id}
                     sport={sport}
                     onSelect={(s) => setSelectedSlug(s.slug)}
                   />
                 ))}
               </div>
             </div>

             {/* Selected Sport Detail */}
             <div className="md:col-span-2">
               {selectedSport ? (
                 <div className="border rounded-lg p-6">
                   <div className="flex items-center gap-3 mb-6">
                     {selectedSport.sport_icon && (
                       <span className="text-4xl">{selectedSport.sport_icon}</span>
                     )}
                     <div>
                       <h2 className="text-xl font-bold">{selectedSport.name}</h2>
                       <p className="text-gray-500">{selectedSport.slug}</p>
                     </div>
                   </div>

                   {selectedSport.configuration && (
                     <SportConfigEditor
                       slug={selectedSport.slug}
                       config={selectedSport.configuration}
                       canEdit={canEdit}
                     />
                   )}
                 </div>
               ) : (
                 <div className="border rounded-lg p-6 text-center text-gray-500">
                   Select a sport to view configuration
                 </div>
               )}
             </div>
           </div>
         </div>
       );
     }
     ```
- **Files**: `demo/src/pages/sport-config/SportsPage.tsx`
- **Parallel?**: No (after T036, T037)

### T039 – Add route and navigation
- **Purpose**: Wire up sports page in app routing
- **Steps**:
  1. Update `demo/src/App.tsx` (or routes file) to add:
     ```typescript
     import { SportsPage } from './pages/sport-config/SportsPage';

     // In routes array:
     { path: '/sport-config', element: <SportsPage /> }
     ```
  2. Add navigation link in header/sidebar:
     ```typescript
     <Link to="/sport-config">Sport Config</Link>
     ```
  3. Create index file `demo/src/pages/sport-config/index.ts`:
     ```typescript
     export { SportsPage } from './SportsPage';
     ```
- **Files**: `demo/src/App.tsx`, `demo/src/pages/sport-config/index.ts`
- **Parallel?**: No (after T038)

## Definition of Done Checklist

- [ ] TypeScript types for Sport and SportConfiguration
- [ ] TanStack Query hooks (list, detail, update)
- [ ] SportCard component
- [ ] SportConfigEditor with form
- [ ] SportsPage with list + detail view
- [ ] Route registered in app
- [ ] Navigation link added
- [ ] Page is responsive
- [ ] No TypeScript errors
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify hook query keys are consistent
- Check form state management
- Test as staff vs non-staff user
- Ensure loading/error states are handled
- Check responsive layout on mobile

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
