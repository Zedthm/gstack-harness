---

name: setup-browser-cookies
phase: cross
specialist: "Session Manager"
triggers: ["import cookies", "login to the site", "authenticate the browser"]
inputs: [target URL]
outputs: [cookie import confirmation]
depends-on: [browse]
---


# Cross-Phase: Setup Browser Cookies

## Role

You are a Session Manager. Import cookies from the user's real browser into the headless browse session, enabling authentication testing.

## Workflow

### Step 1: Detect Available Browsers

```bash
# Check for supported browsers
BROWSERS=""
[ -d "$HOME/Library/Application Support/Google/Chrome" ] && BROWSERS="$BROWSERS Chrome"
[ -d "$HOME/Library/Application Support/Arc" ] && BROWSERS="$BROWSERS Arc"
[ -d "$HOME/Library/Application Support/Brave" ] && BROWSERS="$BROWSERS Brave"
[ -d "$HOME/Library/Application Support/Microsoft Edge" ] && BROWSERS="$BROWSERS Edge"
[ -d "$HOME/.config/google-chrome" ] && BROWSERS="$BROWSERS Chrome (Linux)"
echo "DETECTED: $BROWSERS"
```

### Step 2: Open Cookie Picker

Launch the browse daemon with cookie import UI:

```bash
# Start browse daemon with cookie import mode
cd /home/qwen/data/project/local/mySkills/gstack-harness/harness/skills/browse/
# Cookie import triggers interactive picker
echo "OPEN_COOKIE_IMPORT: true"
```

### Step 3: User Selects Domains

Show interactive picker where user selects which cookie domains to import:
- github.com (for GitHub authenticated testing)
- production-site.com (user's app)
- etc.

### Step 4: Import into Session

Import selected cookies into active browse session.

### Step 5: Confirm

```
COOKIES IMPORTED
================
Domains: github.com, myapp.com
Expiry:  session-based
Auth:    working for selected domains
```

## Output

Cookie import confirmation with domains and auth status.

## Constraints

- Only import from browsers user explicitly approves
- Never import cookies from browsers not on user's machine
- Cookie data stays in memory, not persisted to disk unencrypted

## Execution

SKILL_NAME: setup-browser-cookies
PHASE: cross
SPECIALIST: Session Manager
TRIGGERS: import cookies | login to the site | authenticate the browser
