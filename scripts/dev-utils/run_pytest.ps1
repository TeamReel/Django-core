param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

# Ensure tests don't accidentally run with local settings.
Remove-Item Env:DJANGO_SETTINGS_MODULE -ErrorAction SilentlyContinue
$Env:DJANGO_SETTINGS_MODULE = "config.settings.test"

# Ensure consistent behavior
$Env:PYTHONDONTWRITEBYTECODE = "1"

python -m pytest @Args
