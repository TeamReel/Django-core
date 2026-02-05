"""
Seed BrandAssets for Ajax, PSV, Feyenoord
"""
from branding.models import BrandProfile, BrandAsset, DesignToken

# Get brand profiles
profiles = BrandProfile.objects.filter(name__icontains='brand')
print(f'Found {profiles.count()} brand profiles')

for profile in profiles:
    print(f'\nProfile: {profile.name}')

    # Determine club name
    club_name = profile.name.split()[0]  # 'Ajax Brand Identity' -> 'Ajax'

    # Create assets for logo and logo_dark
    for asset_type in ['logo', 'logo_dark', 'icon', 'banner']:
        existing = BrandAsset.objects.filter(profile=profile, asset_type=asset_type).first()
        if existing:
            print(f'  {asset_type}: already exists (id={existing.id})')
            continue

        alt_text = f'{club_name} {asset_type.replace("_", " ").title()}'
        asset = BrandAsset.objects.create(
            profile=profile,
            asset_type=asset_type,
            alt_text=alt_text,
            is_active=True,
        )
        print(f'  {asset_type}: CREATED (id={asset.id})')

# Also add more design tokens if missing
TOKEN_ADDITIONS = {
    'Ajax': [
        ('shadow_sm', '0 1px 2px rgba(200, 16, 46, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(200, 16, 46, 0.15)', 'shadow'),
        ('button_radius', '8px', 'radius'),
        ('card_radius', '12px', 'radius'),
    ],
    'PSV': [
        ('shadow_sm', '0 1px 2px rgba(237, 28, 36, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(237, 28, 36, 0.15)', 'shadow'),
        ('button_radius', '6px', 'radius'),
        ('card_radius', '10px', 'radius'),
    ],
    'Feyenoord': [
        ('shadow_sm', '0 1px 2px rgba(238, 28, 37, 0.1)', 'shadow'),
        ('shadow_md', '0 4px 6px rgba(238, 28, 37, 0.15)', 'shadow'),
        ('button_radius', '4px', 'radius'),
        ('card_radius', '8px', 'radius'),
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
    token_count = DesignToken.objects.filter(profile=profile).count()
    asset_count = BrandAsset.objects.filter(profile=profile).count()
    print(f'{profile.name}: {token_count} tokens, {asset_count} assets')

print('\nDone!')
