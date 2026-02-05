import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, Button, Stack, Text, Alert, Badge } from '@django-core/design-system';
import { useMediaLibrary, MediaLibraryFilters, MediaItem } from '../../hooks/useMediaLibrary';
import { useMasterData, MediaTag, getTagCategoryLabel, TAG_CATEGORY_LABELS } from '../../utils/masterData';

const MediaLibraryPage: React.FC = () => {
    const { items, loading, error, pagination, fetchItems } = useMediaLibrary();
    const { data: tagsByCategory, loading: tagsLoading } = useMasterData<Map<string, MediaTag[]>>('mediaTagsByCategory');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedState, setSelectedState] = useState<string>('all');

    useEffect(() => {
        // Initial fetch
        fetchItems();
    }, [fetchItems]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const filters: MediaLibraryFilters = { q: searchQuery };
        if (selectedTags.length > 0) filters.tags = selectedTags;
        if (selectedState !== 'all') filters.state = selectedState;
        fetchItems(filters);
    };

    const handleTagToggle = (tagSlug: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagSlug)
                ? prev.filter((t) => t !== tagSlug)
                : [...prev, tagSlug]
        );
    };

    const handleApplyFilters = () => {
        const filters: MediaLibraryFilters = {};
        if (searchQuery) filters.q = searchQuery;
        if (selectedTags.length > 0) filters.tags = selectedTags;
        if (selectedState !== 'all') filters.state = selectedState;
        fetchItems(filters);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedTags([]);
        setSelectedCategory('all');
        setSelectedState('all');
        fetchItems();
    };

    const handleLoadMore = () => {
        if (pagination.next) {
            // Cursor is inside the next URL, extracting it is tricky if we don't have a parser,
            // but the hook expects just the cursor value?
            // Actually my hook logic takes `cursor` strings but the `next` url is full.
            // I should probably parse it or just pass filters and let the hook handle URL construction.
            // For now, let's assume `next` contains the cursor param.

            const url = new URL(pagination.next);
            const cursor = url.searchParams.get('cursor');
            if (cursor) {
                fetchItems({ q: searchQuery }, cursor);
            }
        }
    };

    return (
        <AppShell>
           <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
                    <Stack direction="column" gap="2">
                        <Text size="xl" weight="bold">Smart Asset Library</Text>
                        <Text size="md" color="secondary">
                            Search and manage your media assets with AI-powered search.
                        </Text>
                    </Stack>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>

                        {/* Sidebar Filters */}
                        <div>
                            <Card style={{ padding: '16px', position: 'sticky', top: '24px' }}>
                                <Stack direction="column" gap="4">
                                    <Text weight="bold" size="md">Filters</Text>

                                    {/* State Filter */}
                                    <div>
                                        <Text size="sm" color="secondary" style={{ marginBottom: '8px' }}>Status</Text>
                                        <select
                                            value={selectedState}
                                            onChange={(e) => setSelectedState(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="raw">Raw</option>
                                            <option value="edited">Edited</option>
                                            <option value="approved">Approved</option>
                                            <option value="published">Published</option>
                                        </select>
                                    </div>

                                    {/* Category Filter */}
                                    <div>
                                        <Text size="sm" color="secondary" style={{ marginBottom: '8px' }}>Tag Category</Text>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}
                                        >
                                            <option value="all">All Categories</option>
                                            {tagsByCategory && Array.from(tagsByCategory.keys()).sort().map((category) => (
                                                <option key={category} value={category}>
                                                    {getTagCategoryLabel(category)} ({tagsByCategory.get(category)?.length || 0})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <Text size="sm" color="secondary" style={{ marginBottom: '8px' }}>
                                            Tags {selectedTags.length > 0 && `(${selectedTags.length} selected)`}
                                        </Text>
                                        {tagsLoading ? (
                                            <Text size="sm" color="secondary">Loading tags...</Text>
                                        ) : tagsByCategory ? (
                                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--app-border)', borderRadius: '4px', padding: '8px' }}>
                                                {Array.from(tagsByCategory.entries())
                                                    .filter(([category]) => selectedCategory === 'all' || category === selectedCategory)
                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                    .map(([category, tags]) => (
                                                        <div key={category} style={{ marginBottom: '12px' }}>
                                                            <Text size="xs" weight="bold" color="secondary" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                {getTagCategoryLabel(category)}
                                                            </Text>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {tags.map((tag) => (
                                                                    <button
                                                                        key={tag.id}
                                                                        onClick={() => handleTagToggle(tag.slug)}
                                                                        style={{
                                                                            padding: '4px 8px',
                                                                            fontSize: '12px',
                                                                            borderRadius: '4px',
                                                                            border: selectedTags.includes(tag.slug) ? '2px solid var(--color-primary)' : '1px solid var(--app-border)',
                                                                            backgroundColor: selectedTags.includes(tag.slug) ? 'var(--color-primary-light, rgba(59, 130, 246, 0.1))' : 'transparent',
                                                                            color: selectedTags.includes(tag.slug) ? 'var(--color-primary)' : 'inherit',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    >
                                                                        {tag.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <Text size="sm" color="secondary">No tags available</Text>
                                        )}
                                    </div>

                                    {/* Filter Actions */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <Button onClick={handleApplyFilters} variant="primary" style={{ flex: 1 }}>
                                            Apply Filters
                                        </Button>
                                        <Button onClick={handleClearFilters} variant="secondary">
                                            Clear
                                        </Button>
                                    </div>
                                </Stack>
                            </Card>
                        </div>

                        {/* Main Content */}
                        <div>
                            <Stack direction="column" gap="4">

                                {/* Search Bar */}
                                <Card style={{ padding: '16px' }}>
                                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search specific items (e.g., 'training video')..."
                                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}
                                        />
                                        <Button type="submit" variant="primary" disabled={loading}>
                                            {loading ? 'Searching...' : 'Search'}
                                        </Button>
                                    </form>
                                </Card>

                                {error && <Alert variant="error">{error}</Alert>}

                                {/* Results Summary */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text size="sm" color="secondary">
                                        {items.length} item{items.length !== 1 ? 's' : ''} found
                                        {selectedTags.length > 0 && ` • Filtered by ${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''}`}
                                    </Text>
                                </div>

                                {/* Results Grid */}
                                {items && items.length > 0 ? (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                        gap: '16px'
                                    }}>
                                        {items.map((item: MediaItem) => (
                                            <Card key={item.id} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                {/* Thumbnail placeholder */}
                                                <div style={{
                                                    height: '140px',
                                                    backgroundColor: '#f1f1f1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderBottom: '1px solid #eee'
                                                }}>
                                                    {item.mime_type.startsWith('image/') ? (
                                                        <span style={{ fontSize: '32px' }}>🖼️</span>
                                                    ) : (
                                                        <span style={{ fontSize: '32px' }}>📄</span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                    <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.title}
                                                    </Text>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {item.tags.slice(0, 3).map(tag => (
                                                            <Badge key={tag.id} size="sm" variant="primary">{tag.name}</Badge>
                                                        ))}
                                                        {item.tags.length > 3 && (
                                                            <Badge size="sm" variant="default">+{item.tags.length - 3}</Badge>
                                                        )}
                                                        <Badge size="sm" variant="default">{item.state}</Badge>
                                                    </div>
                                                    <Text size="xs" color="secondary">
                                                        {(item.file_size_bytes / 1024).toFixed(1)} KB
                                                    </Text>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    !loading && (
                                        <Card style={{ textAlign: 'center', padding: '48px' }}>
                                            <Text size="lg" style={{ marginBottom: '8px' }}>📁</Text>
                                            <Text color="secondary">No media items found.</Text>
                                            <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                                                Upload some media or adjust your filters.
                                            </Text>
                                        </Card>
                                    )
                                )}

                                {/* Pagination */}
                                {pagination.next && (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Button onClick={handleLoadMore} disabled={loading} variant="secondary">
                                            Load More
                                        </Button>
                                    </div>
                                )}
                            </Stack>
                        </div>
                    </div>
                </div>
           </div>
        </AppShell>
    );
};

export default MediaLibraryPage;
