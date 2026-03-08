import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../utils/apiBase';
import {
  TEMPLATE_CATEGORIES,
  SUBTYPE_LABELS,
  type ContentTemplate,
  type Sport,
  type Formation,
} from './contentTemplatesData';
import { getCsrfToken } from '../../utils/csrf';

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

export function useContentTemplatesData() {
  const apiBaseUrl = getApiBaseUrl();
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
        const [templatesRes, sportsRes, formationsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?page_size=500`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/sports/?page_size=100`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/formations/?page_size=100`, {
            credentials: 'include',
          }),
        ]);

        if (templatesRes.ok) {
          const response = await templatesRes.json();
          let templateList: ContentTemplate[] = [];
          if (Array.isArray(response)) {
            templateList = response;
          } else if (response.data?.results && Array.isArray(response.data.results)) {
            templateList = response.data.results;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            templateList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            templateList = response.results;
          }
          setTemplates(templateList);
        } else {
          console.error('Templates fetch failed:', templatesRes.status, await templatesRes.text());
          setTemplates([]);
        }

        if (sportsRes.ok) {
          const response = await sportsRes.json();
          let sportList: Sport[] = [];
          if (Array.isArray(response)) {
            sportList = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            sportList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            sportList = response.results;
          }
          setSports(sportList);
        }

        if (formationsRes.ok) {
          const response = await formationsRes.json();
          let formationList: Formation[] = [];
          if (Array.isArray(response)) {
            formationList = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            formationList = response.data.data;
          } else if (response.results && Array.isArray(response.results)) {
            formationList = response.results;
          }
          setFormations(formationList);
        }
      } catch (e) {
        console.error(e);
        console.error('Failed to fetch data:', e);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl]);

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
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/${template.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ is_active: !template.is_active }),
      });
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_active: !t.is_active } : t));
      }
    } catch (e) {
      console.error(e);
      console.error('Failed to toggle template:', e);
    }
  };

  const handleDelete = async (template: ContentTemplate) => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/${template.id}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== template.id));
      }
    } catch (e) {
      console.error(e);
      console.error('Failed to delete template:', e);
    }
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const isEditing = !!editingTemplate;
      const url = isEditing
        ? `${apiBaseUrl}/api/v1/content-generation/templates/${editingTemplate.id}/`
        : `${apiBaseUrl}/api/v1/content-generation/templates/`;

      let formationId: number | null = null;
      if (editForm.formation_code) {
        const matchingFormation = formationsForSelectedSport.find(
          f => f.code.toLowerCase() === editForm.formation_code.toLowerCase()
        );
        formationId = matchingFormation?.id || null;
      }

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const saved = data?.data?.data || data?.data || data;
        if (isEditing) {
          setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
        } else {
          setTemplates(prev => [...prev, saved]);
        }
        setIsCreateModalOpen(false);
        setEditingTemplate(null);
      } else {
        const errorData = await res.json();
        console.error('Failed to save template:', errorData);
        alert(`Failed to save: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      console.error(e);
      console.error('Failed to save template:', e);
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
