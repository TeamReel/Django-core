import { useEffect, useReducer, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { formReducer, makeSetter } from '@/utils/formReducer';
import {
  TEMPLATE_CATEGORIES,
  SUBTYPE_LABELS,
  type ContentTemplate,
  type Sport,
  type Formation,
} from './contentTemplatesData';

export interface EditFormState {
  name: string;
  description: string;
  template_type: string;
  template_subtype: string;
  sport: number | null;
  sport_category: number | null;
  formation_code: string;
  style_variant: string;
  ai_workflow_id: string;
  is_active: boolean;
  credits_required: number;
  input_requirements: Record<string, any>;
}

const INITIAL_EDIT_FORM: EditFormState = {
  name: '',
  description: '',
  template_type: 'pre_match',
  template_subtype: '',
  sport: null,
  sport_category: null,
  formation_code: '',
  style_variant: '',
  ai_workflow_id: '',
  is_active: true,
  credits_required: 1,
  input_requirements: {},
};

export interface UseContentTemplatesDataReturn {
  // Data
  templates: ContentTemplate[];
  filteredTemplates: ContentTemplate[];
  groupedBySubtype: Record<string, ContentTemplate[]>;
  sports: Sport[];
  formations: Formation[];
  formationsForSelectedSport: Formation[];
  sportCategories: { categories: Sport[]; variants: Sport[] };
  loading: boolean;
  error: string | null;
  // Filter state
  selectedCategory: string;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  showInactive: boolean;
  setShowInactive: Dispatch<SetStateAction<boolean>>;
  selectedFormation: string;
  setSelectedFormation: Dispatch<SetStateAction<string>>;
  selectedStyle: string;
  setSelectedStyle: Dispatch<SetStateAction<string>>;
  selectedSport: string;
  setSelectedSport: Dispatch<SetStateAction<string>>;
  selectedSubtype: string;
  setSelectedSubtype: Dispatch<SetStateAction<string>>;
  selectedType: string;
  setSelectedType: Dispatch<SetStateAction<string>>;
  // Filter options
  availableFormations: { code: string; name: string }[];
  availableStyles: string[];
  availableSports: { id: number; name: string }[];
  availableTypes: string[];
  availableSubtypes: string[];
  // Modal state
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  editingTemplate: ContentTemplate | null;
  setEditingTemplate: Dispatch<SetStateAction<ContentTemplate | null>>;
  saving: boolean;
  modalTab: 'basic' | 'requirements';
  setModalTab: Dispatch<SetStateAction<'basic' | 'requirements'>>;
  editForm: EditFormState;
  setEditForm: Dispatch<SetStateAction<EditFormState>>;
  // Helpers
  getVariantsForCategory: (categoryId: number | null) => Sport[];
  getSubtypesForType: (templateType: string) => { value: string; label: string }[];
  // Handlers
  handleToggleActive: (template: ContentTemplate) => Promise<void>;
  handleDelete: (template: ContentTemplate) => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  // Computed
  pageTitle: string;
  navigate: ReturnType<typeof useNavigate>;
}

export function useContentTemplatesData(): UseContentTemplatesDataReturn {
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  interface TemplatesState {
    templates: ContentTemplate[];
    sports: Sport[];
    formations: Formation[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    showInactive: boolean;
    selectedFormation: string;
    selectedStyle: string;
    selectedSport: string;
    selectedSubtype: string;
    selectedType: string;
    isCreateModalOpen: boolean;
    editingTemplate: ContentTemplate | null;
    saving: boolean;
    modalTab: 'basic' | 'requirements';
    editForm: EditFormState;
  }

  const [s, dispatch] = useReducer(formReducer<TemplatesState>, {
    templates: [], sports: [], formations: [],
    loading: true, error: null,
    searchQuery: '', showInactive: false,
    selectedFormation: 'all', selectedStyle: 'all', selectedSport: 'all',
    selectedSubtype: 'all', selectedType: 'all',
    isCreateModalOpen: false, editingTemplate: null, saving: false,
    modalTab: 'basic', editForm: INITIAL_EDIT_FORM,
  });

  const setTemplates = useMemo(() => makeSetter<TemplatesState, 'templates'>(dispatch, 'templates'), [dispatch]);
  const setSports = useMemo(() => makeSetter<TemplatesState, 'sports'>(dispatch, 'sports'), [dispatch]);
  const setFormations = useMemo(() => makeSetter<TemplatesState, 'formations'>(dispatch, 'formations'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<TemplatesState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<TemplatesState, 'error'>(dispatch, 'error'), [dispatch]);
  const setSearchQuery = useMemo(() => makeSetter<TemplatesState, 'searchQuery'>(dispatch, 'searchQuery'), [dispatch]);
  const setShowInactive = useMemo(() => makeSetter<TemplatesState, 'showInactive'>(dispatch, 'showInactive'), [dispatch]);
  const setSelectedFormation = useMemo(() => makeSetter<TemplatesState, 'selectedFormation'>(dispatch, 'selectedFormation'), [dispatch]);
  const setSelectedStyle = useMemo(() => makeSetter<TemplatesState, 'selectedStyle'>(dispatch, 'selectedStyle'), [dispatch]);
  const setSelectedSport = useMemo(() => makeSetter<TemplatesState, 'selectedSport'>(dispatch, 'selectedSport'), [dispatch]);
  const setSelectedSubtype = useMemo(() => makeSetter<TemplatesState, 'selectedSubtype'>(dispatch, 'selectedSubtype'), [dispatch]);
  const setSelectedType = useMemo(() => makeSetter<TemplatesState, 'selectedType'>(dispatch, 'selectedType'), [dispatch]);
  const setIsCreateModalOpen = useMemo(() => makeSetter<TemplatesState, 'isCreateModalOpen'>(dispatch, 'isCreateModalOpen'), [dispatch]);
  const setEditingTemplate = useMemo(() => makeSetter<TemplatesState, 'editingTemplate'>(dispatch, 'editingTemplate'), [dispatch]);
  const setSaving = useMemo(() => makeSetter<TemplatesState, 'saving'>(dispatch, 'saving'), [dispatch]);
  const setModalTab = useMemo(() => makeSetter<TemplatesState, 'modalTab'>(dispatch, 'modalTab'), [dispatch]);
  const setEditForm = useMemo(() => makeSetter<TemplatesState, 'editForm'>(dispatch, 'editForm'), [dispatch]);

  // Get selected category from URL query param
  const selectedCategory = searchParams.get('tab') || 'all';

  // Update form when editing template changes
  useEffect(() => {
    if (s.editingTemplate) {
      const currentSport = s.sports.find(sp => sp.id === s.editingTemplate!.sport);
      const categoryId = currentSport?.parent_sport_id || (currentSport?.is_category ? currentSport.id : null);

      setEditForm({
        name: s.editingTemplate.name,
        description: s.editingTemplate.description || '',
        template_type: s.editingTemplate.template_type,
        template_subtype: s.editingTemplate.template_subtype || '',
        sport: s.editingTemplate.sport,
        sport_category: categoryId,
        formation_code: s.editingTemplate.formation_detail?.code || '',
        style_variant: s.editingTemplate.style_variant || '',
        ai_workflow_id: s.editingTemplate.ai_workflow_id,
        is_active: s.editingTemplate.is_active,
        credits_required: s.editingTemplate.credits_required ?? 1,
        input_requirements: s.editingTemplate.input_requirements || {},
      });
      setModalTab('basic');
    } else {
      setEditForm(INITIAL_EDIT_FORM);
      setModalTab('basic');
    }
  }, [s.editingTemplate, s.sports]);

  // Load templates, sports and formations
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [templatesListRes, sportsListRes, formationsListRes] = await Promise.all([
          api.list<ContentTemplate>('/content-generation/templates/', { pageSize: 500 }),
          api.list<Sport>('/sports/', { pageSize: 100 }),
          api.list<Formation>('/formations/', { pageSize: 100 }),
        ]);

        setTemplates(templatesListRes.results || []);
        setSports(sportsListRes.results || []);
        setFormations(formationsListRes.results || []);
      } catch (e) {
        logger.error('Failed to fetch templates data', e);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────

  const sportCategories = useMemo(() => {
    const cats = s.sports.filter(sp => sp.is_category);
    const vars = s.sports.filter(sp => sp.is_variant);
    return { categories: cats, variants: vars };
  }, [s.sports]);

  const getVariantsForCategory = (categoryId: number | null) => {
    if (!categoryId) return [];
    return sportCategories.variants.filter(v => v.parent_sport_id === categoryId);
  };

  const getSubtypesForType = (templateType: string): { value: string; label: string }[] => {
    const category = TEMPLATE_CATEGORIES.find(c => c.types?.includes(templateType));
    if (!category?.subtypes) return [];
    return category.subtypes.map(st => ({
      value: st,
      label: SUBTYPE_LABELS[st] || st,
    }));
  };

  const formationsForSelectedSport = useMemo(() => {
    if (!s.editForm.sport) return s.formations;
    return s.formations.filter(f => f.sport_id === s.editForm.sport);
  }, [s.formations, s.editForm.sport]);

  const availableFormations = useMemo(() => {
    const formationMap = new Map<string, { code: string; name: string }>();
    s.templates.forEach(t => {
      if (t.formation_detail) {
        formationMap.set(t.formation_detail.code, t.formation_detail);
      }
    });
    return Array.from(formationMap.values());
  }, [s.templates]);

  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    s.templates.forEach(t => {
      if (t.style_variant) styles.add(t.style_variant);
    });
    return Array.from(styles).sort();
  }, [s.templates]);

  const availableSports = useMemo(() => {
    const sportMap = new Map<number, { id: number; name: string }>();
    s.templates.forEach(t => {
      if (t.sport_detail) sportMap.set(t.sport_detail.id, t.sport_detail);
    });
    return Array.from(sportMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [s.templates]);

  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    s.templates.forEach(t => {
      if (t.template_type) typeSet.add(t.template_type);
    });
    return Array.from(typeSet).sort();
  }, [s.templates]);

  const availableSubtypes = useMemo(() => {
    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    const subtypeSet = new Set<string>();
    s.templates.forEach(t => {
      if (t.template_subtype) {
        if (s.selectedType !== 'all') {
          if (t.template_type === s.selectedType) subtypeSet.add(t.template_subtype);
        } else if (category?.types) {
          if (category.types.includes(t.template_type)) subtypeSet.add(t.template_subtype);
        } else {
          subtypeSet.add(t.template_subtype);
        }
      }
    });
    return Array.from(subtypeSet).sort();
  }, [s.templates, selectedCategory, s.selectedType]);

  const filteredTemplates = useMemo(() => {
    let result = s.templates;

    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    if (category?.types) {
      result = result.filter(t => category.types!.includes(t.template_type));
    }

    if (s.selectedType !== 'all') result = result.filter(t => t.template_type === s.selectedType);
    if (s.selectedSport !== 'all') result = result.filter(t => t.sport_detail?.id === parseInt(s.selectedSport));
    if (s.selectedSubtype !== 'all') result = result.filter(t => t.template_subtype === s.selectedSubtype);
    if (s.selectedFormation !== 'all') result = result.filter(t => t.formation_detail?.code === s.selectedFormation);
    if (s.selectedStyle !== 'all') result = result.filter(t => t.style_variant === s.selectedStyle);

    if (s.searchQuery) {
      const query = s.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.template_subtype?.toLowerCase().includes(query)
      );
    }

    if (!s.showInactive) result = result.filter(t => t.is_active);
    return result;
  }, [s.templates, selectedCategory, s.selectedType, s.selectedSport, s.selectedSubtype, s.selectedFormation, s.selectedStyle, s.searchQuery, s.showInactive]);

  const groupedBySubtype = useMemo(() => {
    const groups: Record<string, ContentTemplate[]> = {};
    filteredTemplates.forEach(t => {
      const key = t.template_subtype || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleToggleActive = async (template: ContentTemplate) => {
    try {
      await api.patch(`/content-generation/templates/${template.id}/`, { is_active: !template.is_active });
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_active: !t.is_active } : t));
    } catch (e) {
      logger.error('Failed to toggle template', e);
    }
  };

  const handleDelete = async (template: ContentTemplate) => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    try {
      await api.delete(`/content-generation/templates/${template.id}/`);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
    } catch (e) {
      logger.error('Failed to delete template', e);
    }
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const isEditing = !!s.editingTemplate;
      let formationId: number | null = null;
      if (s.editForm.formation_code) {
        const matchingFormation = formationsForSelectedSport.find(
          f => f.code.toLowerCase() === s.editForm.formation_code.toLowerCase()
        );
        formationId = matchingFormation?.id || null;
      }

      const body = {
        name: s.editForm.name,
        description: s.editForm.description || null,
        template_type: s.editForm.template_type,
        template_subtype: s.editForm.template_subtype || null,
        sport: s.editForm.sport,
        formation: formationId,
        style_variant: s.editForm.style_variant || null,
        ai_workflow_id: s.editForm.ai_workflow_id || null,
        is_active: s.editForm.is_active,
        credits_required: s.editForm.credits_required,
        input_requirements: s.editForm.input_requirements,
      };

      const saved = isEditing
        ? await api.patch<ContentTemplate>(`/content-generation/templates/${s.editingTemplate!.id}/`, body)
        : await api.post<ContentTemplate>('/content-generation/templates/', body);

      if (isEditing) {
        setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
      } else {
        setTemplates(prev => [...prev, saved]);
      }
      setIsCreateModalOpen(false);
      setEditingTemplate(null);
    } catch (e) {
      logger.error('Failed to save template', e);
      pushToast({ message: 'Failed to save template', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────

  const currentCategory = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
  const pageTitle = currentCategory?.id === 'all' ? 'All Templates' : `${currentCategory?.label || 'Templates'} Templates`;

  return {
    // Data
    templates: s.templates, filteredTemplates, groupedBySubtype,
    sports: s.sports, formations: s.formations, formationsForSelectedSport,
    sportCategories, loading: s.loading, error: s.error,

    // Filter state
    selectedCategory, searchQuery: s.searchQuery, setSearchQuery,
    showInactive: s.showInactive, setShowInactive,
    selectedFormation: s.selectedFormation, setSelectedFormation,
    selectedStyle: s.selectedStyle, setSelectedStyle,
    selectedSport: s.selectedSport, setSelectedSport,
    selectedSubtype: s.selectedSubtype, setSelectedSubtype,
    selectedType: s.selectedType, setSelectedType,

    // Filter options
    availableFormations, availableStyles, availableSports, availableTypes, availableSubtypes,

    // Modal state
    isCreateModalOpen: s.isCreateModalOpen, setIsCreateModalOpen,
    editingTemplate: s.editingTemplate, setEditingTemplate,
    saving: s.saving, modalTab: s.modalTab, setModalTab,
    editForm: s.editForm, setEditForm,

    // Helpers
    getVariantsForCategory, getSubtypesForType,

    // Handlers
    handleToggleActive, handleDelete, handleSaveTemplate,

    // Computed
    pageTitle, navigate,
  };
}
