"""
Management-style repair script for misassigned member assets.

Usage (run via Django shell or `python manage.py shell < this_file_wont_work` — use runscript):

    # Inspect memberships by name:
    python manage.py shell -c "
    exec(open('scripts/repair_member_assets.py').read())
    inspect_member('Jeroen van Oenen')
    inspect_member('Jeroen Klei')
    "

    # Move a specific asset key from one member to another:
    python manage.py shell -c "
    exec(open('scripts/repair_member_assets.py').read())
    move_asset(
        from_membership_id='<UUID of Klei>',
        to_membership_id='<UUID of van Oenen>',
        asset_keys=['member_in_tenue_home', 'member_closeup_home'],  # or None to show diff
        dry_run=True,  # set False to actually commit
    )
    "
"""

import json
from django.db import transaction

# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

def _get_memberships_by_name(name_fragment: str):
    """Return ProjectMembership queryset matching a user's display name."""
    from projects.models import ProjectMembership
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # search by first_name + last_name or display_name
    matching_users = User.objects.filter(
        first_name__icontains=name_fragment.split()[0]
    ) | User.objects.filter(
        last_name__icontains=name_fragment.split()[-1]
    )
    user_ids = matching_users.values_list('id', flat=True)
    return ProjectMembership.objects.filter(user_id__in=user_ids).select_related('user', 'project')


def inspect_member(name_fragment: str):
    """Print metadata.assets for all memberships matching a name."""
    memberships = _get_memberships_by_name(name_fragment)
    if not memberships.exists():
        print(f"❌ No memberships found matching: {name_fragment!r}")
        return

    for m in memberships:
        user_name = f"{m.user.first_name} {m.user.last_name}" if m.user else "Unknown"
        project_name = m.project.name if m.project else "Unknown"
        assets = (m.metadata or {}).get('assets', {})
        asset_variants = (m.metadata or {}).get('asset_variants', {})
        print(f"\n{'='*60}")
        print(f"Membership ID : {m.id}")
        print(f"User          : {user_name}")
        print(f"Project       : {project_name} (id={m.project_id})")
        print(f"metadata.assets:")
        print(json.dumps(assets, indent=2, default=str))
        print(f"metadata.asset_variants:")
        print(json.dumps(asset_variants, indent=2, default=str))


def move_asset(
    from_membership_id: str,
    to_membership_id: str,
    asset_keys: list | None = None,
    dry_run: bool = True,
):
    """
    Move asset entries from one membership's metadata to another.

    Parameters
    ----------
    from_membership_id : UUID string of the membership that has WRONG assets
    to_membership_id   : UUID string of the membership that should have the assets
    asset_keys         : list of top-level metadata.assets keys to move, e.g.
                         ['member_in_tenue_home', 'member_closeup_home']
                         If None, print a diff and take no action.
    dry_run            : If True, print changes without saving.
    """
    from projects.models import ProjectMembership  # noqa

    try:
        src = ProjectMembership.objects.get(id=from_membership_id)
        dst = ProjectMembership.objects.get(id=to_membership_id)
    except ProjectMembership.DoesNotExist as e:
        print(f"❌ {e}")
        return

    src_user = f"{src.user.first_name} {src.user.last_name}" if src.user else "Unknown"
    dst_user = f"{dst.user.first_name} {dst.user.last_name}" if dst.user else "Unknown"

    src_meta = dict(src.metadata or {})
    dst_meta = dict(dst.metadata or {})

    src_assets = dict(src_meta.get('assets', {}))
    dst_assets = dict(dst_meta.get('assets', {}))
    src_variants = dict(src_meta.get('asset_variants', {}))
    dst_variants = dict(dst_meta.get('asset_variants', {}))

    print(f"\nSource : {src_user} ({from_membership_id})")
    print(f"Dest   : {dst_user} ({to_membership_id})")

    if asset_keys is None:
        print("\n[INFO] No asset_keys specified — showing current state:")
        print(f"\nSource assets : {json.dumps(src_assets, indent=2, default=str)}")
        print(f"Dest assets   : {json.dumps(dst_assets, indent=2, default=str)}")
        print(f"\nSource variants : {json.dumps(src_variants, indent=2, default=str)}")
        print(f"Dest variants   : {json.dumps(dst_variants, indent=2, default=str)}")
        return

    moved = []
    for key in asset_keys:
        if key in src_assets:
            print(f"  📦 Moving assets.{key}: {src_assets[key]!r}")
            dst_assets[key] = src_assets.pop(key)
            moved.append(key)
        else:
            print(f"  ⚠️  Key {key!r} not found in source assets — skipping")

        # Also move from asset_variants if present
        if key in src_variants:
            print(f"  📦 Moving asset_variants.{key}: {src_variants[key]!r}")
            dst_variants[key] = src_variants.pop(key)

    if not moved:
        print("❌ Nothing to move.")
        return

    src_meta['assets'] = src_assets
    src_meta['asset_variants'] = src_variants
    dst_meta['assets'] = dst_assets
    dst_meta['asset_variants'] = dst_variants

    if dry_run:
        print(f"\n[DRY RUN] Would update:")
        print(f"  Source metadata.assets → {json.dumps(src_assets, indent=2, default=str)}")
        print(f"  Dest   metadata.assets → {json.dumps(dst_assets, indent=2, default=str)}")
        print(f"\n  Re-run with dry_run=False to commit.")
    else:
        with transaction.atomic():
            src.metadata = src_meta
            dst.metadata = dst_meta
            src.save(update_fields=['metadata'])
            dst.save(update_fields=['metadata'])
        print(f"\n✅ Saved! Moved {moved} from {src_user} → {dst_user}")


def swap_all_member_assets(
    membership_id_a: str,
    membership_id_b: str,
    dry_run: bool = True,
):
    """
    Swap the ENTIRE metadata.assets + metadata.asset_variants between two memberships.
    Use with extreme caution.
    """
    from projects.models import ProjectMembership  # noqa

    try:
        a = ProjectMembership.objects.get(id=membership_id_a)
        b = ProjectMembership.objects.get(id=membership_id_b)
    except ProjectMembership.DoesNotExist as e:
        print(f"❌ {e}")
        return

    a_user = f"{a.user.first_name} {a.user.last_name}" if a.user else "Unknown"
    b_user = f"{b.user.first_name} {b.user.last_name}" if b.user else "Unknown"

    a_meta = dict(a.metadata or {})
    b_meta = dict(b.metadata or {})

    # Capture asset sections
    a_assets = a_meta.get('assets', {})
    b_assets = b_meta.get('assets', {})
    a_variants = a_meta.get('asset_variants', {})
    b_variants = b_meta.get('asset_variants', {})

    print(f"\nSwapping assets between:")
    print(f"  A: {a_user} ({membership_id_a})")
    print(f"  B: {b_user} ({membership_id_b})")
    print(f"\nA assets  → B: {json.dumps(a_assets, indent=2, default=str)}")
    print(f"B assets  → A: {json.dumps(b_assets, indent=2, default=str)}")

    if dry_run:
        print("\n[DRY RUN] Re-run with dry_run=False to commit.")
        return

    a_meta['assets'] = b_assets
    a_meta['asset_variants'] = b_variants
    b_meta['assets'] = a_assets
    b_meta['asset_variants'] = a_variants

    with transaction.atomic():
        a.metadata = a_meta
        b.metadata = b_meta
        a.save(update_fields=['metadata'])
        b.save(update_fields=['metadata'])

    print(f"\n✅ Assets swapped between {a_user} and {b_user}.")


# ────────────────────────────────────────────────────────────
# Quick-start: inspect both Jeroens
# ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Run this inside `python manage.py shell` using exec().")
