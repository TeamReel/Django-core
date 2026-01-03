import re


def sanitize_query(query_string: str) -> str:
    """
    Sanitize the search query string to prevent syntax errors in PostgreSQL.

    Handles:
    - Unbalanced quotes
    - Trailing operators (OR, AND)
    - Empty queries
    - Special characters that might break ts_query
    """
    if not query_string:
        return ""

    # Remove null bytes
    query = query_string.replace("\x00", "")

    # Balance quotes
    if query.count('"') % 2 != 0:
        query += '"'

    # Remove trailing logical operators
    # Regex looks for OR/AND at the end of the string, case insensitive
    query = re.sub(r"\s+(OR|AND|NOT)\s*$", "", query, flags=re.IGNORECASE)

    # Remove leading logical operators
    query = re.sub(r"^\s*(OR|AND)\s+", "", query, flags=re.IGNORECASE)

    # If the query is just operators or empty after cleanup
    if not query.strip() or re.match(r"^\s*(OR|AND|NOT)\s*$", query, flags=re.IGNORECASE):
        return ""

    return query.strip()
