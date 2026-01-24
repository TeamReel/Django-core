import os

file_path = "src/pages/identity/OrganisationDetailPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
in_overview = False

# We will iterate and build new_lines
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    # 1. Start skipping activeTab === 'users' onwards until PageContent
    if "{/* Users */}" in stripped:
        skip = True
        # Look ahead to find </PageContent>
        # We will stop skipping when we see </PageContent>
        i += 1
        continue

    if skip:
        if "</PageContent>" in stripped:
            skip = False
            new_lines.append(line) # Add the </PageContent> line
        else:
            # Drop the line
            pass
        i += 1
        continue

    # 2. Unwrap Overview
    if "{activeTab === 'overview' && (" in stripped:
        # Just skip this line
        i += 1
        continue

    # Check for closing Overview block
    # It ends with `)}` and is indented.
    # We need to rely on the closing `)}` that matches overview.
    # Logic: The overview block opens at ~1436.
    # The code uses indentation.
    # If we are strictly deleting "Users" onwards, the Overview block closes JUST BEFORE "Users".
    # So we should remove the `)}` that appears right before `{/* Users */}`.
    # Wait, the `readlines` approach processes sequentially.

    # Let's adjust approach.
    new_lines.append(line)
    i += 1

# Now we need to handle the Overview closing parenthesis.
# It is located right before the CUT point of Users.
# In the original file, it was:
# ...
#          </div>
#        )}
#
#        {/* Users */}

# Since we blindly appended lines until `{/* Users */}`, the `new_lines` currently ends with that `)}`.
# We need to remove the last `)}` line if it exists in the buffer near the end.

# Let's inspect the last few lines of new_lines to remove the closing `)}` corresponding to overview.
# We scan backwards.
removed_closing = False
for j in range(len(new_lines) - 1, -1, -1):
    if stripped_line := new_lines[j].strip():
        if stripped_line == ")}":
            new_lines.pop(j)
            removed_closing = True
            break
        # If we hit </div> or something, keep going back a bit?
        if j < len(new_lines) - 10: # Don't go back too far
            break

# Also, update "Quick Actions" onClick to navigate.
# Pattern: onClick={() => setActiveTab('users')} -> onClick={() => navigate('/organisations/${org?.id || id}/users')}
# Pattern: setActiveTab('governance') -> ...
for idx, l in enumerate(new_lines):
    if "setActiveTab('users')" in l:
        new_lines[idx] = l.replace("setActiveTab('users')", "navigate(`/organisations/${org?.id || id}/users`)")
    if "setActiveTab('governance')" in l:
        # Assuming governance page exists or logic
        pass
    if "setActiveTab('operations')" in l:
         # Assuming operations page exists
        pass

# Write back
with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Refactored OrganisationDetailPage.tsx")
