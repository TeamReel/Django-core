"""
Seed Design Tokens for Ajax, PSV, Feyenoord Brand Profiles
Note: BrandAssets require file_id (NOT NULL), so we only seed tokens here
"""
from branding.models import BrandProfile, BrandAsset, DesignToken

# Get brand profiles for the 3 main clubs
profiles = BrandProfile.objects.filter(name__icontains='brand')
print(f'Found {profiles.count()} brand profiles')

# Design tokens to add
TOKEN_ADDITIONS = {
    'Ajax': [
        ('shadow_sm', '0 1px 2px rgba(200, 16, 46, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(200, 16, 46, 0.15)', 'shadow'),
        ('button_radius', '8px', 'radius'),
        ('card_radius', '12px', 'radius'),
        ('font_size_sm', '12px', 'font'),
        ('font_size_base', '14px', 'font'),
        ('font_size_lg', '18px', 'font'),
        ('spacing_xs', '4px', 'spacing'),
        ('spacing_sm', '8px', 'spacing'),
        ('spacing_md', '16px', 'spacing'),
        ('spacing_lg', '24px', 'spacing'),
    ],
    'PSV': [
        ('shadow_sm', '0 1px 2px rgba(237, 28, 36, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(237, 28, 36, 0.15)', 'shadow'),
        ('button_radius', '6px', 'radius'),
        ('card_radius', '10px', 'radius'),
        ('font_size_sm', '12px', 'font'),
        ('font_size_base', '14px', 'font'),
        ('font_size_lg', '18px', 'font'),
        ('spacing_xs', '4px', 'spacing'),
        ('spacing_sm', '8px', 'spacing'),
        ('spacing_md', '16px', 'spacing'),
        ('spacing_lg', '24px', 'spacing'),
    ],
    'Feyenoord': [
        ('shadow_sm', '0 1px 2px rgba(238, 28, 37, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(238, 28, 37, 0.15)', 'shadow'),
        ('button_radius', '4px', 'radius'),
        ('card_radius', '8px', 'radius'),
        ('font_size_sm', '12px', 'font'),
        ('font_size_base', '14px', 'font'),
        ('font_size_lg', '18px', 'font'),
        ('spacing_xs', '4px', 'spacing'),
        ('spacing_sm', '8px', 'spacing'),
        ('spacing_md', '16px', 'spacing'),
        ('spacing_lg', '24px', 'spacing'),
    ],
}

for profile in profiles:
    club_name = profile.name.split()[0]
    if club_name not in TOKEN_ADDITIONS:
        continue

    print(f'\nAdding tokens to {profile.name}:')
    for key, value, token_type in TOKEN_ADDITIONS[club_name]:
        existing = DesignToken.objects.filter(profile=profile, key=key).first()
        if existing:
            print(f'  {key}: already exists')
            continue

        token = DesignToken.objects.create(
            profile=profile,
            key=key,
            value=value,
            type=token_type,
            description=f'{club_name} {key.replace("_", " ")}'
        )
        print(f'  {key}: CREATED')

print('\n=== SUMMARY ===')
for profile in profiles:
    if profile.name.split()[0] in TOKEN_ADDITIONS:
        token_count = DesignToken.objects.filter(profile=profile).count()
        asset_count = BrandAsset.objects.filter(profile=profile).count()
        print(f'{profile.name}: {token_count} tokens, {asset_count} assets')

print('\nDone!')
