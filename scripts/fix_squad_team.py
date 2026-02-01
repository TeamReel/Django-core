#!/usr/bin/env python3
"""Remove duplicate team tab section from ProjectSeasonDetailPage.tsx"""

def main():
    filepath = 'demo/src/pages/periods/ProjectSeasonDetailPage.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find the first and second 'activeTab === team' occurrences
    first_team_idx = None
    second_team_idx = None
    for i, line in enumerate(lines):
        if "activeTab === 'team'" in line:
            if first_team_idx is None:
                first_team_idx = i
            else:
                second_team_idx = i
                break

    if first_team_idx is None or second_team_idx is None:
        print("Could not find both team tab sections")
        return

    print(f'First team tab at line {first_team_idx + 1}')
    print(f'Second team tab at line {second_team_idx + 1}')

    # Remove lines from first_team_idx to second_team_idx (exclusive)
    # But we need to keep the closing )} from the squad section before the first team
    # Look back from first_team_idx to find the end of the squad section

    # The pattern should be:
    # ... end of squad tab ...
    # )}
    #
    # {activeTab === 'team' && (  <- first_team_idx (broken/old)
    # ...
    # )}
    #
    # {activeTab === 'team' && (  <- second_team_idx (correct)

    # We want to remove from first_team_idx-1 (the line with {activeTab) through second_team_idx-1
    # Actually we want to keep everything before first_team_idx and from second_team_idx onwards

    new_lines = lines[:first_team_idx] + lines[second_team_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    removed = second_team_idx - first_team_idx
    print(f'Removed {removed} lines (lines {first_team_idx + 1} to {second_team_idx})')
    print(f'New file has {len(new_lines)} lines')


if __name__ == '__main__':
    main()
