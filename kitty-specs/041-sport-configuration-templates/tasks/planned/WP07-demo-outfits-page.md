---
work_package_id: "WP07"
subtasks:
  - "T040"
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
title: "Demo: Outfits Page"
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

# Work Package Prompt: WP07 – Demo: Outfits Page

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create React page to manage outfit configurations
2. Show inheritance (inherited vs own configs)
3. Color picker for outfit colors
4. CRUD operations for outfit configs
5. Visual preview of outfit colors

**Success Test**: Can create/edit outfit configs, see which are inherited.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Frontend Stack**: React, TypeScript, Vite, TanStack Query
- **Dependencies**: WP04 (Outfit API), WP06 (shared patterns)
- **Planning Decision PL-2**: Show inherited flag clearly
- **Constraints**:
  - Show clear indicator for inherited configs
  - Color picker should be intuitive
  - Project selector to switch context

## Subtasks & Detailed Guidance

### T040 – Create TypeScript types for Outfit API
- **Purpose**: Type-safe outfit API responses
- **Steps**:
  1. Add to `demo/src/types/sport-config.ts`:
     ```typescript
     export type OutfitType = 'home' | 'away' | 'goalkeeper' | 'trainer' | 'third_kit';

     export interface OutfitColors {
       primary?: string;
       secondary?: string;
       accent?: string;
       text?: string;
     }

     export interface OutfitConfiguration {
       id: number;
       project: number;
       outfit_type: OutfitType;
       colors: OutfitColors;
       sponsor_config: Record<string, unknown>;
       number_font: Record<string, unknown>;
       badge_position: string;
       metadata: Record<string, unknown>;
       is_active: boolean;
       inherited: boolean;
       source_project_name: string;
       created_at: string;
       updated_at: string;
     }

     export interface OutfitConfigurationCreate {
       project: number;
       outfit_type: OutfitType;
       colors: OutfitColors;
       sponsor_config?: Record<string, unknown>;
       number_font?: Record<string, unknown>;
       badge_position?: string;
       is_active?: boolean;
     }
     ```
- **Files**: `demo/src/types/sport-config.ts`
- **Parallel?**: Yes

### T041 – Create Outfit API hooks
- **Purpose**: TanStack Query hooks for outfits
- **Steps**:
  1. Create `demo/src/hooks/useOutfits.ts`:
     ```typescript
     import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
     import { apiClient } from '../lib/api';
     import type { OutfitConfiguration, OutfitConfigurationCreate } from '../types/sport-config';

     export function useOutfits(projectId?: number) {
       return useQuery<OutfitConfiguration[]>({
         queryKey: ['outfits', { project: projectId }],
         queryFn: () => apiClient.get('/api/v1/outfits/', {
           params: projectId ? { project: projectId } : undefined
         }).then(r => r.data.results ?? r.data),
         enabled: !!projectId,
       });
     }

     export function useResolvedOutfits(projectId: number) {
       return useQuery<OutfitConfiguration[]>({
         queryKey: ['outfits', 'resolved', projectId],
         queryFn: () => apiClient.get('/api/v1/outfits/resolved/', {
           params: { project: projectId }
         }).then(r => r.data),
         enabled: !!projectId,
       });
     }

     export function useCreateOutfit() {
       const queryClient = useQueryClient();

       return useMutation({
         mutationFn: (data: OutfitConfigurationCreate) =>
           apiClient.post('/api/v1/outfits/', data),
         onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['outfits'] });
         },
       });
     }

     export function useUpdateOutfit(id: number) {
       const queryClient = useQueryClient();

       return useMutation({
         mutationFn: (data: Partial<OutfitConfigurationCreate>) =>
           apiClient.patch(`/api/v1/outfits/${id}/`, data),
         onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['outfits'] });
         },
       });
     }

     export function useDeleteOutfit() {
       const queryClient = useQueryClient();

       return useMutation({
         mutationFn: (id: number) => apiClient.delete(`/api/v1/outfits/${id}/`),
         onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['outfits'] });
         },
       });
     }
     ```
- **Files**: `demo/src/hooks/useOutfits.ts`
- **Parallel?**: Yes (after T040)

### T042 – Create ColorPicker component
- **Purpose**: Visual color selection for outfits
- **Steps**:
  1. Create `demo/src/components/sport-config/ColorPicker.tsx`:
     ```typescript
     interface ColorPickerProps {
       label: string;
       value: string;
       onChange: (color: string) => void;
       disabled?: boolean;
     }

     export function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
       return (
         <div className="flex items-center gap-3">
           <label className="text-sm font-medium w-24">{label}</label>
           <div className="flex items-center gap-2">
             <input
               type="color"
               value={value || '#000000'}
               onChange={e => onChange(e.target.value)}
               disabled={disabled}
               className="w-10 h-10 rounded cursor-pointer disabled:cursor-not-allowed"
             />
             <input
               type="text"
               value={value || ''}
               onChange={e => onChange(e.target.value)}
               placeholder="#000000"
               disabled={disabled}
               className="w-24 px-2 py-1 border rounded text-sm"
             />
           </div>
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/ColorPicker.tsx`
- **Parallel?**: Yes

### T043 – Create OutfitCard component
- **Purpose**: Display outfit config with visual preview
- **Steps**:
  1. Create `demo/src/components/sport-config/OutfitCard.tsx`:
     ```typescript
     import { OutfitConfiguration } from '../../types/sport-config';

     interface OutfitCardProps {
       outfit: OutfitConfiguration;
       onEdit?: () => void;
       onDelete?: () => void;
       canEdit: boolean;
     }

     const OUTFIT_TYPE_LABELS: Record<string, string> = {
       home: '🏠 Home',
       away: '✈️ Away',
       goalkeeper: '🧤 Goalkeeper',
       trainer: '🎽 Trainer',
       third_kit: '3️⃣ Third Kit',
     };

     export function OutfitCard({ outfit, onEdit, onDelete, canEdit }: OutfitCardProps) {
       const colors = outfit.colors;

       return (
         <div className="border rounded-lg p-4 relative">
           {outfit.inherited && (
             <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
               Inherited from {outfit.source_project_name}
             </span>
           )}

           <h3 className="font-semibold mb-3">
             {OUTFIT_TYPE_LABELS[outfit.outfit_type] || outfit.outfit_type}
           </h3>

           {/* Color Preview */}
           <div className="flex gap-2 mb-3">
             {colors.primary && (
               <div
                 className="w-8 h-8 rounded border"
                 style={{ backgroundColor: colors.primary }}
                 title="Primary"
               />
             )}
             {colors.secondary && (
               <div
                 className="w-8 h-8 rounded border"
                 style={{ backgroundColor: colors.secondary }}
                 title="Secondary"
               />
             )}
             {colors.accent && (
               <div
                 className="w-8 h-8 rounded border"
                 style={{ backgroundColor: colors.accent }}
                 title="Accent"
               />
             )}
           </div>

           <div className="text-sm text-gray-600">
             <p>Badge: {outfit.badge_position}</p>
           </div>

           {canEdit && !outfit.inherited && (
             <div className="mt-3 flex gap-2">
               <button
                 onClick={onEdit}
                 className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
               >
                 Edit
               </button>
               <button
                 onClick={onDelete}
                 className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
               >
                 Delete
               </button>
             </div>
           )}
         </div>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/OutfitCard.tsx`
- **Parallel?**: Yes (after T040)

### T044 – Create OutfitForm component
- **Purpose**: Create/edit outfit configurations
- **Steps**:
  1. Create `demo/src/components/sport-config/OutfitForm.tsx`:
     ```typescript
     import { useState } from 'react';
     import { ColorPicker } from './ColorPicker';
     import type { OutfitConfiguration, OutfitConfigurationCreate, OutfitType, OutfitColors } from '../../types/sport-config';

     interface OutfitFormProps {
       projectId: number;
       outfit?: OutfitConfiguration;
       onSubmit: (data: OutfitConfigurationCreate) => void;
       onCancel: () => void;
       isPending: boolean;
     }

     const OUTFIT_TYPES: OutfitType[] = ['home', 'away', 'goalkeeper', 'trainer', 'third_kit'];

     export function OutfitForm({ projectId, outfit, onSubmit, onCancel, isPending }: OutfitFormProps) {
       const [formData, setFormData] = useState<OutfitConfigurationCreate>({
         project: projectId,
         outfit_type: outfit?.outfit_type ?? 'home',
         colors: outfit?.colors ?? {},
         badge_position: outfit?.badge_position ?? 'left_chest',
         is_active: outfit?.is_active ?? true,
       });

       const updateColor = (key: keyof OutfitColors, value: string) => {
         setFormData({
           ...formData,
           colors: { ...formData.colors, [key]: value }
         });
       };

       const handleSubmit = (e: React.FormEvent) => {
         e.preventDefault();
         onSubmit(formData);
       };

       return (
         <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
           <h3 className="font-semibold">{outfit ? 'Edit Outfit' : 'New Outfit'}</h3>

           <div>
             <label className="block text-sm font-medium mb-1">Outfit Type</label>
             <select
               value={formData.outfit_type}
               onChange={e => setFormData({...formData, outfit_type: e.target.value as OutfitType})}
               disabled={!!outfit}
               className="w-full border rounded px-3 py-2"
             >
               {OUTFIT_TYPES.map(type => (
                 <option key={type} value={type}>{type}</option>
               ))}
             </select>
           </div>

           <div className="space-y-2">
             <ColorPicker
               label="Primary"
               value={formData.colors.primary ?? ''}
               onChange={v => updateColor('primary', v)}
             />
             <ColorPicker
               label="Secondary"
               value={formData.colors.secondary ?? ''}
               onChange={v => updateColor('secondary', v)}
             />
             <ColorPicker
               label="Accent"
               value={formData.colors.accent ?? ''}
               onChange={v => updateColor('accent', v)}
             />
           </div>

           <div>
             <label className="block text-sm font-medium mb-1">Badge Position</label>
             <select
               value={formData.badge_position}
               onChange={e => setFormData({...formData, badge_position: e.target.value})}
               className="w-full border rounded px-3 py-2"
             >
               <option value="left_chest">Left Chest</option>
               <option value="right_chest">Right Chest</option>
               <option value="center_chest">Center Chest</option>
             </select>
           </div>

           <div className="flex gap-2">
             <button
               type="submit"
               disabled={isPending}
               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
             >
               {isPending ? 'Saving...' : 'Save'}
             </button>
             <button
               type="button"
               onClick={onCancel}
               className="px-4 py-2 border rounded hover:bg-gray-100"
             >
               Cancel
             </button>
           </div>
         </form>
       );
     }
     ```
- **Files**: `demo/src/components/sport-config/OutfitForm.tsx`
- **Parallel?**: Yes (after T042)

### T045 – Create OutfitsPage
- **Purpose**: Main page for outfit management
- **Steps**:
  1. Create `demo/src/pages/sport-config/OutfitsPage.tsx`:
     ```typescript
     import { useState } from 'react';
     import { useResolvedOutfits, useCreateOutfit, useUpdateOutfit, useDeleteOutfit } from '../../hooks/useOutfits';
     import { useProjects } from '../../hooks/useProjects'; // Existing hook
     import { OutfitCard } from '../../components/sport-config/OutfitCard';
     import { OutfitForm } from '../../components/sport-config/OutfitForm';
     import { useAuth } from '../../hooks/useAuth';
     import type { OutfitConfiguration, OutfitConfigurationCreate } from '../../types/sport-config';

     export function OutfitsPage() {
       const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
       const [editingOutfit, setEditingOutfit] = useState<OutfitConfiguration | null>(null);
       const [showForm, setShowForm] = useState(false);

       const { data: projects } = useProjects();
       const { data: outfits, isLoading } = useResolvedOutfits(selectedProjectId ?? 0);
       const createMutation = useCreateOutfit();
       const updateMutation = useUpdateOutfit(editingOutfit?.id ?? 0);
       const deleteMutation = useDeleteOutfit();
       const { user } = useAuth();
       const canEdit = user?.is_staff ?? false;

       const handleSubmit = (data: OutfitConfigurationCreate) => {
         if (editingOutfit) {
           updateMutation.mutate(data, {
             onSuccess: () => {
               setEditingOutfit(null);
               setShowForm(false);
             }
           });
         } else {
           createMutation.mutate(data, {
             onSuccess: () => setShowForm(false)
           });
         }
       };

       const handleDelete = (outfit: OutfitConfiguration) => {
         if (confirm('Delete this outfit configuration?')) {
           deleteMutation.mutate(outfit.id);
         }
       };

       return (
         <div className="container mx-auto p-4">
           <h1 className="text-2xl font-bold mb-6">Outfit Configurations</h1>

           {/* Project Selector */}
           <div className="mb-6">
             <label className="block text-sm font-medium mb-2">Select Project</label>
             <select
               value={selectedProjectId ?? ''}
               onChange={e => setSelectedProjectId(e.target.value ? +e.target.value : null)}
               className="w-full max-w-xs border rounded px-3 py-2"
             >
               <option value="">Select a project...</option>
               {projects?.results?.map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
             </select>
           </div>

           {selectedProjectId && (
             <>
               {canEdit && !showForm && (
                 <button
                   onClick={() => { setShowForm(true); setEditingOutfit(null); }}
                   className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                 >
                   + Add Outfit
                 </button>
               )}

               {showForm && (
                 <div className="mb-6">
                   <OutfitForm
                     projectId={selectedProjectId}
                     outfit={editingOutfit ?? undefined}
                     onSubmit={handleSubmit}
                     onCancel={() => { setShowForm(false); setEditingOutfit(null); }}
                     isPending={createMutation.isPending || updateMutation.isPending}
                   />
                 </div>
               )}

               {isLoading ? (
                 <p>Loading outfits...</p>
               ) : (
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {outfits?.map(outfit => (
                     <OutfitCard
                       key={`${outfit.id}-${outfit.inherited}`}
                       outfit={outfit}
                       canEdit={canEdit}
                       onEdit={() => { setEditingOutfit(outfit); setShowForm(true); }}
                       onDelete={() => handleDelete(outfit)}
                     />
                   ))}
                   {outfits?.length === 0 && (
                     <p className="text-gray-500 col-span-full">No outfit configurations yet.</p>
                   )}
                 </div>
               )}
             </>
           )}
         </div>
       );
     }
     ```
  2. Add route in App.tsx:
     ```typescript
     { path: '/sport-config/outfits', element: <OutfitsPage /> }
     ```
  3. Export from index: `export { OutfitsPage } from './OutfitsPage';`
- **Files**: `demo/src/pages/sport-config/OutfitsPage.tsx`, `demo/src/App.tsx`
- **Parallel?**: No (after T041, T043, T044)

## Definition of Done Checklist

- [ ] TypeScript types for OutfitConfiguration
- [ ] TanStack Query hooks (list, resolved, create, update, delete)
- [ ] ColorPicker component
- [ ] OutfitCard with visual preview
- [ ] OutfitForm for create/edit
- [ ] OutfitsPage with project selector
- [ ] Inherited badge shown on inherited configs
- [ ] Route registered
- [ ] No TypeScript errors
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify inheritance badge displays correctly
- Test color picker in different browsers
- Check form validation (duplicate outfit_type)
- Test CRUD operations
- Verify project filtering works

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
