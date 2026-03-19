---
name: "developer"
description: "Full-stack development agent — implements features, fixes bugs, refactors code, builds modules, writes docs"
tools:
  [
    vscode/extensions, vscode/askQuestions, vscode/getProjectSetupInfo, vscode/installExtension,
    vscode/memory, vscode/newWorkspace, vscode/runCommand, vscode/vscodeAPI,
    execute/getTerminalOutput, execute/awaitTerminal, execute/killTerminal, execute/createAndRunTask,
    execute/runInTerminal, execute/runTests, execute/runNotebookCell, execute/testFailure,
    read/terminalSelection, read/terminalLastCommand, read/getNotebookSummary,
    read/problems, read/readFile, read/readNotebookCellOutput,
    agent/runSubagent,
    browser/openBrowserPage,
    edit/createDirectory, edit/createFile, edit/createJupyterNotebook,
    edit/editFiles, edit/editNotebook, edit/rename,
    search/changes, search/codebase, search/fileSearch, search/listDirectory,
    search/searchResults, search/textSearch, search/usages,
    web/fetch, web/githubRepo,
    playwright/browser_click, playwright/browser_close, playwright/browser_console_messages,
    playwright/browser_drag, playwright/browser_evaluate, playwright/browser_file_upload,
    playwright/browser_fill_form, playwright/browser_handle_dialog, playwright/browser_hover,
    playwright/browser_install, playwright/browser_navigate, playwright/browser_navigate_back,
    playwright/browser_network_requests, playwright/browser_press_key, playwright/browser_resize,
    playwright/browser_run_code, playwright/browser_select_option, playwright/browser_snapshot,
    playwright/browser_tabs, playwright/browser_take_screenshot, playwright/browser_type,
    playwright/browser_wait_for,
    todo
  ]
agents:
  - reviewer
  - planner
  - playwright-tester
  - postgresql-dba
  - ops-deploy
  - domain-expert
handoffs:
  - label: "Review this code"
    agent: reviewer
    prompt: "Review the changes I just made."
    send: false
  - label: "Plan next steps"
    agent: planner
    prompt: "Help me plan the next implementation steps."
    send: false
  - label: "Test in browser"
    agent: playwright-tester
    prompt: "Test the feature I just built in the browser."
    send: false
  - label: "Check database"
    agent: postgresql-dba
    prompt: "Review the database impact of these changes."
    send: false
  - label: "Deploy"
    agent: ops-deploy
    prompt: "Deploy the latest changes to Railway."
    send: false
---
