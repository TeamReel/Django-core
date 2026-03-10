import { useEffect, useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { logger } from '@/utils/logger';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected category from URL query param
  const selectedCategory = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal tab state
  const [modalTab, setModalTab] = useState<'basic' | 'requirements'>('basic');

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormState>(INITIAL_EDIT_FORM);

  // Update form when editing template changes
  useEffect(() => {
    if (editingTemplate) {
      const currentSport = sports.find(s => s.id === editingTemplate.sport);
      const categoryId = currentSport?.parent_sport_id || (currentSport?.is_category ? currentSport.id : null);

      setEditForm({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        template_type: editingTemplate.template_type,
        template_subtype: editingTemplate.template_subtype || '',
        sport: editingTemplate.sport,
        sport_category: categoryId,
        formation_code: editingTemplate.formation_detail?.code || '',
        style_variant: editingTemplate.style_variant || '',
        ai_workflow_id: editingTemplate.ai_workflow_id,
        is_active: editingTemplate.is_active,
        credits_required: editingTemplate.credits_required ?? 1,
        input_requirements: editingTemplate.input_requirements || {},
      });
      setModalTab('basic');
    } else {
      setEditForm(INITIAL_EDIT_FORM);
      setModalTab('basic');
    }
  }, [editingTemplate, sports]);

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
    const categories = sports.filter(s => s.is_category);
    const variants = sports.filter(s => s.is_variant);
    return { categories, variants };
  }, [sports]);

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
    if (!editForm.sport) return formations;
    return formations.filter(f => f.sport_id === editForm.sport);
  }, [formations, editForm.sport]);

  const availableFormations = useMemo(() => {
    const formationMap = new Map<string, { code: string; name: string }>();
    templates.forEach(t => {
      if (t.formation_detail) {
        formationMap.set(t.formation_detail.code, t.formation_detail);
      }
    });
    return Array.from(formationMap.values());
  }, [templates]);

  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    templates.forEach(t => {
      if (t.style_variant) styles.add(t.style_variant);
    });
    return Array.from(styles).sort();
  }, [templates]);

  const availableSports = useMemo(() => {
    const sportMap = new Map<number, { id: number; name: string }>();
    templates.forEach(t => {
      if (t.sport_detail) sportMap.set(t.sport_detail.id, t.sport_detail);
    });
    return Array.from(sportMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    templates.forEach(t => {
      if (t.template_type) typeSet.add(t.template_type);
    });
    return Array.from(typeSet).sort();
  }, [templates]);

  const availableSubtypes = useMemo(() => {
    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    const subtypeSet = new Set<string>();
    templates.forEach(t => {
      if (t.template_subtype) {
        if (selectedType !== 'all') {
          if (t.template_type === selectedType) subtypeSet.add(t.template_subtype);
        } else if (category?.types) {
          if (category.types.includes(t.template_type)) subtypeSet.add(t.template_subtype);
        } else {
          subtypeSet.add(t.template_subtype);
        }
      }
    });
    return Array.from(subtypeSet).sort();
  }, [templates, selectedCategory, selectedType]);

  const filteredTemplates = useMemo(() => {
    let result = templates;

    const category = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
    if (category?.types) {
      result = result.filter(t => category.types!.includes(t.template_type));
    }

    if (selectedType !== 'all') result = result.filter(t => t.template_type === selectedType);
    if (selectedSport !== 'all') result = result.filter(t => t.sport_detail?.id === parseInt(selectedSport));
    if (selectedSubtype !== 'all') result = result.filter(t => t.template_subtype === selectedSubtype);
    if (selectedFormation !== 'all') result = result.filter(t => t.formation_detail?.code === selectedFormation);
    if (selectedStyle !== 'all') result = result.filter(t => t.style_variant === selectedStyle);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.template_subtype?.toLowerCase().includes(query)
      );
    }

    if (!showInactive) result = result.filter(t => t.is_active);
    return result;
  }, [templates, selectedCategory, selectedType, selectedSport, selectedSubtype, selectedFormation, selectedStyle, searchQuery, showInactive]);

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
      const isEditing = !!editingTemplate;
      let formationId: number | null = null;
      if (editForm.formation_code) {
        const matchingFormation = formationsForSelectedSport.find(
          f => f.code.toLowerCase() === editForm.formation_code.toLowerCase()
        );
        formationId = matchingFormation?.id || null;
      }

      const body = {
        name: editForm.name,
        description: editForm.description || null,
        template_type: editForm.template_type,
        template_subtype: editForm.template_subtype || null,
        sport: editForm.sport,
        formation: formationId,
        style_variant: editForm.style_variant || null,
        ai_workflow_id: editForm.ai_workflow_id || null,
        is_active: editForm.is_active,
        credits_required: editForm.credits_required,
        input_requirements: editForm.input_requirements,
      };

      const saved = isEditing
        ? await api.patch<ContentTemplate>(`/content-generation/templates/${editingTemplate.id}/`, body)
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
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────

  const currentCategory = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory);
  const pageTitle = currentCategory?.id === 'all' ? 'All Templates' : `${currentCategory?.label || 'Templates'} Templates`;

  return {
    // Data
    templates, filteredTemplates, groupedBySubtype,
    sports, formations, formationsForSelectedSport,
    sportCategories, loading, error,

    // Filter state
    selectedCategory, searchQuery, setSearchQuery,
    showInactive, setShowInactive,
    selectedFormation, setSelectedFormation,
    selectedStyle, setSelectedStyle,
    selectedSport, setSelectedSport,
    selectedSubtype, setSelectedSubtype,
    selectedType, setSelectedType,

    // Filter options
    availableFormations, availableStyles, availableSports, availableTypes, availableSubtypes,

    // Modal state
    isCreateModalOpen, setIsCreateModalOpen,
    editingTemplate, setEditingTemplate,
    saving, modalTab, setModalTab,
    editForm, setEditForm,

    // Helpers
    getVariantsForCategory, getSubtypesForType,

    // Handlers
    handleToggleActive, handleDelete, handleSaveTemplate,

    // Computed
    pageTitle, navigate,
  };
}
