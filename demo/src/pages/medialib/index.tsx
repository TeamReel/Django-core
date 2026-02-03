import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, Button, Stack, Text, Alert, Badge } from '@django-core/design-system';
import { useMediaLibrary, MediaLibraryFilters, MediaItem } from '../../hooks/useMediaLibrary';

const MediaLibraryPage: React.FC = () => {
    const { items, loading, error, pagination, fetchItems } = useMediaLibrary();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Initial fetch
        fetchItems();
    }, [fetchItems]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchItems({ q: searchQuery });
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
                    <Stack direction="column" gap="small">
                        <Text variant="h2" weight="bold">Smart Asset Library</Text>
                        <Text variant="body" color="muted">
                            Search and manage your media assets with AI-powered search.
                        </Text>
                    </Stack>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                    <Stack direction="column" gap="large">

                        {/* Search Bar */}
                        <Card style={{ padding: '16px' }}>
                            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search specific items (e.g., 'training video')..."
                                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                                <Button type="submit" variant="primary" disabled={loading}>
                                    {loading ? 'Searching...' : 'Search'}
                                </Button>
                            </form>
                        </Card>

                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Results Grid */}
                        {items && items.length > 0 ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '16px'
                            }}>
                                {items.map((item: MediaItem) => (
                                    <Card key={item.id} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        {/* Thumbnail placeholder */}
                                        <div style={{
                                            height: '160px',
                                            backgroundColor: '#f1f1f1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderBottom: '1px solid #eee'
                                        }}>
                                             {item.mime_type.startsWith('image/') ? (
                                                 // Ideally use a thumbnail URL if available
                                                <span style={{ fontSize: '32px' }}>🖼️</span>
                                             ) : (
                                                <span style={{ fontSize: '32px' }}>📄</span>
                                             )}
                                        </div>
                                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                            <Text weight="bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.title}
                                            </Text>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {item.tags.map(tag => (
                                                    <Badge key={tag.id} size="sm" variant="secondary">{tag.name}</Badge>
                                                ))}
                                                <Badge size="sm" variant="outline">{item.state}</Badge>
                                            </div>
                                            <Text variant="caption" color="muted">
                                                {(item.file_size_bytes / 1024).toFixed(1)} KB
                                            </Text>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            !loading && (
                                <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
                                    <Text>No media items found.</Text>
                                </div>
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
        </AppShell>
    );
};

export default MediaLibraryPage;
