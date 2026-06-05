SET NAMES utf8mb4;
USE ai_command_atlas;

-- Tools
INSERT INTO tools (slug, name, company, description, color, avatar, version, source_type, github_url, docs_url) VALUES
('claude-code', 'Claude Code', 'Anthropic', 'Anthropic''s agentic coding CLI. Deep IDE integration, rich slash commands, MCP tool protocol, granular permission controls, and context-compaction for long sessions.', '#d97706', 'CC', 'v1.x', 'official', 'https://github.com/anthropics/claude-code', 'https://docs.anthropic.com/en/docs/claude-code'),
('codex-cli', 'Codex CLI', 'OpenAI', 'OpenAI''s lightweight terminal coding agent. Configurable approval modes (suggest / auto-edit / full-auto), sandboxed execution, and support for multiple model providers.', '#16a34a', 'CX', 'v0.1.x', 'official', 'https://github.com/openai/codex', 'https://openai.github.io/codex/docs'),
('gemini-cli', 'Gemini CLI', 'Google', 'Google''s open-source AI agent for the terminal, powered by Gemini models. Supports file operations, web search, image understanding, and tool-use extensions.', '#2563eb', 'GC', 'v0.1.x', 'official', 'https://github.com/google-gemini/gemini-cli', 'https://ai.google.dev/gemini-api/docs/gemini-cli'),
('aider', 'Aider', 'Independent', 'AI pair programmer in your terminal. Git-native with automatic commit messages, multi-file edits, and broad model support (OpenAI, Anthropic, local models via Ollama).', '#7c3aed', 'AI', 'v0.71.x', 'official', 'https://github.com/Aider-AI/aider', 'https://aider.chat/docs'),
('opencode', 'OpenCode', 'Independent', 'Terminal-based AI coding agent from SST with a full TUI interface. Supports multiple providers, persistent sessions, file operations, and shell command execution.', '#0891b2', 'OC', 'v0.1.x', 'github', 'https://github.com/sst/opencode', NULL);

-- Claude Code commands
SET @cc = (SELECT id FROM tools WHERE slug = 'claude-code');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@cc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify the AI model to use for the current session.', '--model <model-id>', NULL, '2026-05-28'),
(@cc, 'dangerously-skip-permissions', '--dangerously-skip-permissions', 'flag', 'Permission', 'high', 'official', 'Skip all permission prompts — dangerous in production. Allows the agent to execute any action without user confirmation.', '--dangerously-skip-permissions', NULL, '2026-05-28'),
(@cc, 'permission-mode', '--permission-mode', 'option', 'Permission', 'medium', 'official', 'Control permission level: default (ask for everything), acceptEdits (auto-accept file edits), bypassPermissions (full bypass).', '--permission-mode <mode>', '<default|acceptEdits|bypassPermissions>', '2026-05-28'),
(@cc, 'resume', 'resume', 'subcommand', 'Session', 'low', 'official', 'Resume a previous session by conversation ID.', 'claude resume [session-id]', '[session-id]', '2026-05-28'),
(@cc, 'mcp', 'mcp', 'subcommand', 'MCP', 'medium', 'official', 'Manage MCP (Model Context Protocol) server connections: add, remove, list, run servers.', 'claude mcp <add|remove|list|run>', NULL, '2026-05-28'),
(@cc, 'mcp-add', 'mcp add', 'subcommand', 'MCP', 'medium', 'official', 'Register a new MCP tool server. Supports stdio, sse, and http transports.', 'claude mcp add --transport <transport> <name>', NULL, '2026-05-28'),
(@cc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or modify persistent settings stored in ~/.claude/settings.json.', 'claude config', NULL, '2026-05-28'),
(@cc, 'compact', '/compact', 'slash', 'Session', 'low', 'official', 'Compact and compress the current conversation context to free up context window tokens for longer coding sessions.', '/compact [instructions]', NULL, '2026-05-28'),
(@cc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history and start fresh. Alias: /reset.', '/clear', NULL, '2026-05-28'),
(@cc, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display all available slash commands and their descriptions.', '/help', NULL, '2026-05-28'),
(@cc, 'memory', '/memory', 'slash', 'Config', 'low', 'official', 'Read or write to the persistent CLAUDE.md memory file.', '/memory', NULL, '2026-05-28'),
(@cc, 'claude-md', 'CLAUDE.md', 'config', 'Config', 'low', 'official', 'Project or global instructions file injected into every session. Checked in project root or home directory.', 'CLAUDE.md', NULL, '2026-05-28');

-- Update /compact with full details
UPDATE commands SET
  notes = JSON_ARRAY(
    'Compaction uses the model itself to write the summary — quality depends on how well you phrase the optional instructions. Be specific about tasks in progress.',
    'The original conversation history is discarded after compaction — there is no undo. If you need the full context, use resume to start a new session instead.',
    'Works best after a clearly defined phase has completed (e.g. after a bug fix, before switching features).'
  ),
  caveats = JSON_ARRAY(
    'The summary is non-deterministic — two identical invocations may produce slightly different summaries depending on the model sampling.',
    'Tool call outputs (large file reads, long command output) may be summarised aggressively. If a specific shell output is critical, quote it explicitly in your instructions.'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'After a long debugging session', 'lang', 'shell', 'code', '> /compact Keep the bug in auth.ts we just fixed and the test structure. Forget the failed attempts.'),
    JSON_OBJECT('label', 'Before switching to a new subtask', 'lang', 'shell', 'code', '> /compact Summarise the database migration work. I am now working on the API layer.')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code',
  source_note = 'Verified against official Claude Code documentation.'
WHERE tool_id = @cc AND slug = 'compact';

-- Codex CLI commands
SET @cx = (SELECT id FROM tools WHERE slug = 'codex-cli');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@cx, 'compact', '/compact', 'slash', 'Session', 'low', 'official', 'Compact and compress the current conversation context to free up context window tokens.', '/compact [instructions]', NULL, '2026-05-28'),
(@cx, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display all available slash commands and their descriptions.', '/help', NULL, '2026-05-28'),
(@cx, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history and start fresh.', '/clear', NULL, '2026-05-28'),
(@cx, 'history', '/history', 'slash', 'Session', 'low', 'official', 'Show a paginated log of the current conversation history.', '/history', NULL, '2026-05-28'),
(@cx, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify the OpenAI model to use (e.g. o4-mini, gpt-4o).', '--model <model-id>', '-m <model-id>', '2026-05-28'),
(@cx, 'provider', '--provider', 'option', 'Model', 'low', 'official', 'Select the AI provider backend (openai, azure, ollama, anthropic).', '--provider <provider>', '<provider>', '2026-05-28'),
(@cx, 'temperature', '--temperature', 'option', 'Model', 'low', 'github', 'Control model sampling randomness. Float 0.0–2.0.', '--temperature <float>', '<0.0-2.0>', '2026-05-28'),
(@cx, 'approval-mode', '--approval-mode', 'option', 'Permission', 'medium', 'official', 'Control how the agent requests user approval before executing actions.', '--approval-mode <mode>', '<suggest|auto-edit|full-auto>', '2026-05-28'),
(@cx, 'sandbox', '--sandbox', 'flag', 'Permission', 'low', 'github', 'Run the agent inside an isolated sandbox environment (macOS Sandbox or Docker).', '--sandbox[=<policy>]', NULL, '2026-05-28'),
(@cx, 'full-auto', '--full-auto', 'flag', 'Permission', 'high', 'official', 'Enable fully autonomous execution — agent acts without any approval prompts.', '--full-auto', NULL, '2026-05-28'),
(@cx, 'dangerously-auto-approve-everything', '--dangerously-auto-approve-everything', 'flag', 'Permission', 'high', 'official', 'Auto-approve all actions without confirmation — use only in trusted, isolated environments.', '--dangerously-auto-approve-everything', NULL, '2026-05-28'),
(@cx, 'quiet', '--quiet', 'flag', 'Config', 'low', 'official', 'Suppress verbose output, only show essential messages and results.', '--quiet', '-q', '2026-05-28'),
(@cx, 'json', '--json', 'flag', 'Config', 'low', 'official', 'Output structured JSON instead of human-readable text.', '--json', NULL, '2026-05-28'),
(@cx, 'config-path', '--config', 'option', 'Config', 'low', 'official', 'Specify a custom path to the Codex configuration file.', '--config <path>', '<path>', '2026-05-28'),
(@cx, 'context-window-size', '--context-window-size', 'option', 'Config', 'low', 'github', 'Override the default maximum context window token limit.', '--context-window-size <tokens>', '<tokens>', '2026-05-28'),
(@cx, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or interactively edit persistent Codex configuration values.', 'codex config [get|set] [key] [value]', NULL, '2026-05-28'),
(@cx, 'resume', 'resume', 'subcommand', 'Session', 'low', 'official', 'Resume a previous Codex session by session ID or interactively select from history.', 'codex resume [session-id]', '[session-id]', '2026-05-28'),
(@cx, 'agents-md', 'AGENTS.md', 'config', 'Config', 'low', 'official', 'Agent instructions file loaded at project level, injected into every session.', 'AGENTS.md', NULL, '2026-05-28');

-- Gemini CLI commands
SET @gc = (SELECT id FROM tools WHERE slug = 'gemini-cli');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@gc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Select the Gemini model variant (e.g. gemini-2.5-pro).', '--model <model-id>', '<model-id>', '2026-05-28'),
(@gc, 'compress', '/compress', 'slash', 'Session', 'low', 'official', 'Compress conversation history to free up context window.', '/compress', NULL, '2026-05-28'),
(@gc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28'),
(@gc, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display available commands and usage information.', '/help', NULL, '2026-05-28'),
(@gc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit Gemini CLI configuration stored in ~/.gemini/config.yaml.', 'gemini config', NULL, '2026-05-28'),
(@gc, 'gemini-md', 'GEMINI.md', 'config', 'Config', 'low', 'official', 'Custom instructions file loaded from project root, injected into every session.', 'GEMINI.md', NULL, '2026-05-28');

-- Aider commands
SET @ai = (SELECT id FROM tools WHERE slug = 'aider');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@ai, 'model', '--model', 'option', 'Model', 'low', 'official', 'Select the AI model to use. Supports OpenAI, Anthropic, and local models via Ollama.', '--model <model-id>', '<model-id>', '2026-05-28'),
(@ai, 'temperature', '--temperature', 'option', 'Model', 'low', 'official', 'Control model sampling temperature. Float, model-specific range.', '--temperature <float>', NULL, '2026-05-28'),
(@ai, 'watch', '--watch', 'flag', 'Session', 'low', 'official', 'Watch files for changes and auto-apply suggested edits.', '--watch', NULL, '2026-05-28'),
(@ai, 'yes', '--yes', 'flag', 'Permission', 'high', 'official', 'Auto-confirm all prompts without user approval.', '--yes', '-y', '2026-05-28'),
(@ai, 'drop', '/drop', 'slash', 'Session', 'low', 'official', 'Drop all files from the current context.', '/drop', NULL, '2026-05-28'),
(@ai, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display available commands and usage information.', '/help', NULL, '2026-05-28'),
(@ai, 'tokens', '/tokens', 'slash', 'Session', 'low', 'official', 'Show token usage statistics for the current session.', '/tokens', NULL, '2026-05-28'),
(@ai, 'system-md', '.aider.system.md', 'config', 'Config', 'low', 'official', 'Custom system prompt file loaded at session start.', '.aider.system.md', NULL, '2026-05-28'),
(@ai, 'conf-yml', '.aider.conf.yml', 'config', 'Config', 'low', 'official', 'YAML configuration file for persistent Aider settings.', '.aider.conf.yml', NULL, '2026-05-28');

-- OpenCode commands
SET @oc = (SELECT id FROM tools WHERE slug = 'opencode');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@oc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify via provider/model format (e.g. anthropic/claude-opus-4-5).', '--model <provider/model>', NULL, '2026-05-28'),
(@oc, 'provider', '--provider', 'option', 'Model', 'low', 'official', 'Select AI provider: anthropic, openai, groq, ollama.', '--provider <provider>', NULL, '2026-05-28'),
(@oc, 'mcp', 'mcp', 'subcommand', 'MCP', 'medium', 'official', 'Native MCP support — add, remove, list tool servers.', 'opencode mcp <add|remove|list>', NULL, '2026-05-28'),
(@oc, 'mcp-add', 'mcp add', 'subcommand', 'MCP', 'medium', 'official', 'Register a new MCP tool server.', 'opencode mcp add', NULL, '2026-05-28'),
(@oc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit configuration with get/set/list subcommands.', 'opencode config [get|set|list]', NULL, '2026-05-28'),
(@oc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28');

-- Compare capabilities
INSERT INTO compare_capabilities (capability, capability_desc, category, sort_order) VALUES
('Specify model', 'Choose which model variant to use per session', 'model', 1),
('Select provider', 'Switch between API providers (OpenAI, Anthropic, local)', 'model', 2),
('Set temperature', 'Control model sampling randomness', 'model', 3),
('Compact context', 'Summarise history to free context window tokens', 'session', 1),
('Resume session', 'Continue a previous conversation by ID', 'session', 2),
('Clear history', 'Wipe conversation without summary', 'session', 3),
('Skip permissions', 'Execute without approval prompts', 'permission', 1),
('Sandbox mode', 'Isolate execution from host filesystem', 'permission', 2),
('Approval mode', 'Granular control over what auto-executes', 'permission', 3),
('MCP support', 'Model Context Protocol tool server integration', 'mcp', 1),
('Add MCP server', 'Register a new tool server', 'mcp', 2),
('View / edit config', 'Inspect and modify persistent settings', 'config', 1),
('Custom instructions file', 'Project or global instructions injected into every session', 'config', 2);

-- Compare entries
SET @cap_model1 = (SELECT id FROM compare_capabilities WHERE capability='Specify model');
SET @cap_model2 = (SELECT id FROM compare_capabilities WHERE capability='Select provider');
SET @cap_model3 = (SELECT id FROM compare_capabilities WHERE capability='Set temperature');
SET @cap_sess1  = (SELECT id FROM compare_capabilities WHERE capability='Compact context');
SET @cap_sess2  = (SELECT id FROM compare_capabilities WHERE capability='Resume session');
SET @cap_sess3  = (SELECT id FROM compare_capabilities WHERE capability='Clear history');
SET @cap_perm1  = (SELECT id FROM compare_capabilities WHERE capability='Skip permissions');
SET @cap_perm2  = (SELECT id FROM compare_capabilities WHERE capability='Sandbox mode');
SET @cap_perm3  = (SELECT id FROM compare_capabilities WHERE capability='Approval mode');
SET @cap_mcp1   = (SELECT id FROM compare_capabilities WHERE capability='MCP support');
SET @cap_mcp2   = (SELECT id FROM compare_capabilities WHERE capability='Add MCP server');
SET @cap_cfg1   = (SELECT id FROM compare_capabilities WHERE capability='View / edit config');
SET @cap_cfg2   = (SELECT id FROM compare_capabilities WHERE capability='Custom instructions file');

SET @cc = (SELECT id FROM tools WHERE slug='claude-code');
SET @cx = (SELECT id FROM tools WHERE slug='codex-cli');
SET @gc = (SELECT id FROM tools WHERE slug='gemini-cli');
SET @ai = (SELECT id FROM tools WHERE slug='aider');
SET @oc = (SELECT id FROM tools WHERE slug='opencode');

INSERT INTO compare_entries (capability_id, tool_id, has_feature, command_name, command_slug, command_desc, none_label, risk_level, source, copy_text) VALUES
(@cap_model1,@cc,1,'--model','model','e.g. claude-opus-4-5',NULL,'low','official','--model claude-opus-4-5'),
(@cap_model1,@cx,1,'--model','model','e.g. o4-mini, gpt-4o',NULL,'low','official','--model o4-mini'),
(@cap_model1,@gc,1,'--model','model','e.g. gemini-2.5-pro',NULL,'low','official','--model gemini-2.5-pro'),
(@cap_model1,@ai,1,'--model','model','e.g. gpt-4o, claude-3-5-sonnet',NULL,'low','official','--model claude-3-5-sonnet-20241022'),
(@cap_model1,@oc,1,'--model','model','Specify via provider/model format',NULL,'low','official','--model anthropic/claude-opus-4-5'),
(@cap_model2,@cc,0,NULL,NULL,NULL,'Not applicable',NULL,NULL,NULL),
(@cap_model2,@cx,1,'--provider','provider','openai, azure, ollama, anthropic',NULL,'low','official','--provider ollama'),
(@cap_model2,@gc,0,NULL,NULL,NULL,'Google-only',NULL,NULL,NULL),
(@cap_model2,@ai,0,NULL,NULL,NULL,'Uses model ID prefix',NULL,NULL,NULL),
(@cap_model2,@oc,1,'--provider','provider','anthropic, openai, groq, ollama',NULL,'low','official','--provider groq'),
(@cap_model3,@cc,0,NULL,NULL,NULL,'Via settings.json',NULL,NULL,NULL),
(@cap_model3,@cx,1,'--temperature','temperature','Float 0.0–2.0',NULL,'low','github','--temperature 0.2'),
(@cap_model3,@gc,0,NULL,NULL,NULL,'Not exposed',NULL,NULL,NULL),
(@cap_model3,@ai,1,'--temperature','temperature','Float, model-specific range',NULL,'low','official','--temperature 0'),
(@cap_model3,@oc,0,NULL,NULL,NULL,'Via config file',NULL,NULL,NULL),
(@cap_sess1,@cc,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@cx,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@gc,1,'/compress','compress','Compresses history automatically',NULL,'low','official','/compress'),
(@cap_sess1,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess1,@oc,0,NULL,NULL,NULL,'Planned',NULL,NULL,NULL),
(@cap_sess2,@cc,1,'resume','resume','Subcommand, pass session ID',NULL,'low','official','claude resume'),
(@cap_sess2,@cx,1,'resume','resume','Interactive picker if no ID given',NULL,'low','official','codex resume'),
(@cap_sess2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess2,@ai,0,NULL,NULL,NULL,'No persistent sessions',NULL,NULL,NULL),
(@cap_sess2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess3,@cc,1,'/clear','clear','Alias: /reset',NULL,'low','official','/clear'),
(@cap_sess3,@cx,1,'/clear','clear','Wipes current session',NULL,'low','official','/clear'),
(@cap_sess3,@gc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
(@cap_sess3,@ai,1,'/drop','drop','Drops all files from context',NULL,'low','official','/drop'),
(@cap_sess3,@oc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
(@cap_perm1,@cc,1,'--dangerously-skip-permissions','dangerously-skip-permissions','Full bypass, all tools',NULL,'high','official','--dangerously-skip-permissions'),
(@cap_perm1,@cx,1,'--dangerously-auto-approve-everything','dangerously-auto-approve-everything','Auto-approves all actions',NULL,'high','official','--dangerously-auto-approve-everything'),
(@cap_perm1,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm1,@ai,1,'--yes','yes','Auto-confirm all prompts',NULL,'high','official','--yes'),
(@cap_perm1,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@cc,0,NULL,NULL,NULL,'Uses OS-level containers',NULL,NULL,NULL),
(@cap_perm2,@cx,1,'--sandbox','sandbox','macOS Sandbox / Docker',NULL,'low','github','--sandbox'),
(@cap_perm2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm3,@cc,1,'--permission-mode','permission-mode','default, acceptEdits, bypassPermissions',NULL,'medium','official','--permission-mode acceptEdits'),
(@cap_perm3,@cx,1,'--approval-mode','approval-mode','suggest, auto-edit, full-auto',NULL,'medium','official','--approval-mode auto-edit'),
(@cap_perm3,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm3,@ai,0,NULL,NULL,NULL,'Per-action prompts only',NULL,NULL,NULL),
(@cap_perm3,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp1,@cc,1,'mcp','mcp','Native — add, remove, list, run servers',NULL,'medium','official','claude mcp add'),
(@cap_mcp1,@cx,0,NULL,NULL,NULL,'Not yet implemented',NULL,NULL,NULL),
(@cap_mcp1,@gc,0,NULL,NULL,NULL,'Planned (Google extensions)',NULL,NULL,NULL),
(@cap_mcp1,@ai,0,NULL,NULL,NULL,'Not supported',NULL,NULL,NULL),
(@cap_mcp1,@oc,1,'mcp','mcp','Native MCP support via config',NULL,'medium','official','opencode mcp add'),
(@cap_mcp2,@cc,1,'mcp add','mcp-add','Supports stdio, sse, http',NULL,'medium','official','claude mcp add --transport stdio my-server'),
(@cap_mcp2,@cx,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@oc,1,'mcp add','mcp-add',NULL,NULL,'medium','official','opencode mcp add'),
(@cap_cfg1,@cc,1,'config','config','JSON settings at ~/.claude/settings.json',NULL,'low','official','claude config'),
(@cap_cfg1,@cx,1,'config','config','Interactive editor + get/set subcommands',NULL,'low','official','codex config set model o4-mini'),
(@cap_cfg1,@gc,1,'config','config','YAML config at ~/.gemini/config.yaml',NULL,'low','official','gemini config'),
(@cap_cfg1,@ai,0,NULL,NULL,NULL,'Via .aider.conf.yml',NULL,NULL,NULL),
(@cap_cfg1,@oc,1,'config','config','JSON config with get/set/list',NULL,'low','official','opencode config list'),
(@cap_cfg2,@cc,1,'CLAUDE.md','claude-md','Checked in project root or home dir',NULL,'low','official','CLAUDE.md'),
(@cap_cfg2,@cx,1,'AGENTS.md','agents-md','Agent instructions, project-level',NULL,'low','official','AGENTS.md'),
(@cap_cfg2,@gc,1,'GEMINI.md','gemini-md','Loaded from project root',NULL,'low','official','GEMINI.md'),
(@cap_cfg2,@ai,1,'.aider.system.md','system-md','Custom system prompt file',NULL,'low','official','.aider.system.md'),
(@cap_cfg2,@oc,0,NULL,NULL,NULL,'Via config instructions key',NULL,NULL,NULL);

-- ============================================================================
-- Enrich priority commands with examples, notes, caveats, source_urls
-- ============================================================================

-- Re-set tool variables (they were overwritten by compare_entries block)
SET @cc = (SELECT id FROM tools WHERE slug = 'claude-code');
SET @cx = (SELECT id FROM tools WHERE slug = 'codex-cli');
SET @gc = (SELECT id FROM tools WHERE slug = 'gemini-cli');
SET @ai = (SELECT id FROM tools WHERE slug = 'aider');
SET @oc = (SELECT id FROM tools WHERE slug = 'opencode');

-- --------------------------------------------------------------------------
-- 1. claude-code / dangerously-skip-permissions (high risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Only use in trusted sandboxed environments (Docker, CI)',
    'Equivalent to --permission-mode bypassPermissions but with no safety net',
    'Cannot be combined with --permission-mode'
  ),
  caveats = JSON_ARRAY(
    'The agent can execute arbitrary shell commands, delete files, and modify system state without confirmation',
    'If used outside a sandbox, there is no rollback — damage is immediate and permanent'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'In a CI pipeline', 'lang', 'shell', 'code', 'claude --dangerously-skip-permissions -p "Run the test suite and fix any failures"'),
    JSON_OBJECT('label', 'In a Docker container', 'lang', 'shell', 'code', 'docker run --rm -v $(pwd):/work -w /work anthropic/claude-code --dangerously-skip-permissions -p "Refactor utils.ts"')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code/settings#security-and-permissions',
  source_note = 'Verified against official Claude Code security documentation.'
WHERE tool_id = @cc AND slug = 'dangerously-skip-permissions';

-- --------------------------------------------------------------------------
-- 2. claude-code / permission-mode (medium risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Three modes: default (ask for everything), acceptEdits (auto-accept file writes), bypassPermissions (skip all prompts)',
    'acceptEdits is the most common middle-ground for active development'
  ),
  caveats = JSON_ARRAY(
    'bypassPermissions is functionally identical to --dangerously-skip-permissions'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Default mode — ask before every action', 'lang', 'shell', 'code', 'claude --permission-mode default'),
    JSON_OBJECT('label', 'Auto-accept file edits, still ask for shell commands', 'lang', 'shell', 'code', 'claude --permission-mode acceptEdits'),
    JSON_OBJECT('label', 'Bypass all permission prompts', 'lang', 'shell', 'code', 'claude --permission-mode bypassPermissions')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code/settings#security-and-permissions',
  source_note = 'Verified against official Claude Code security documentation.'
WHERE tool_id = @cc AND slug = 'permission-mode';

-- --------------------------------------------------------------------------
-- 3. claude-code / mcp-add (medium risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Supports three transports: stdio, sse, http',
    'Server config is stored in ~/.claude/settings.json'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Add a stdio-based MCP server', 'lang', 'shell', 'code', 'claude mcp add --transport stdio my-server -- npx -y @my-org/mcp-server'),
    JSON_OBJECT('label', 'Add to project scope instead of user scope', 'lang', 'shell', 'code', 'claude mcp add --transport stdio --scope project my-server -- node server.js')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  source_note = 'Verified against official Claude Code MCP documentation.'
WHERE tool_id = @cc AND slug = 'mcp-add';

-- --------------------------------------------------------------------------
-- 4. claude-code / memory (low risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Writes to CLAUDE.md in the project root or ~/.claude/CLAUDE.md globally',
    'Memory persists across sessions'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Open memory for reading and editing', 'lang', 'shell', 'code', '> /memory'),
    JSON_OBJECT('label', 'Ask Claude to remember a preference', 'lang', 'shell', 'code', '> /memory Always use single quotes in TypeScript files in this project.')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code/memory',
  source_note = 'Verified against official Claude Code memory documentation.'
WHERE tool_id = @cc AND slug = 'memory';

-- --------------------------------------------------------------------------
-- 5. codex-cli / approval-mode (medium risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Three modes: suggest (read-only), auto-edit (write files, ask for commands), full-auto (no prompts)',
    'Default is suggest'
  ),
  caveats = JSON_ARRAY(
    'full-auto mode allows arbitrary command execution without confirmation'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Suggest-only mode (default, safest)', 'lang', 'shell', 'code', 'codex --approval-mode suggest "Explain this function"'),
    JSON_OBJECT('label', 'Auto-edit — writes files, asks before shell commands', 'lang', 'shell', 'code', 'codex --approval-mode auto-edit "Add input validation to handler.ts"'),
    JSON_OBJECT('label', 'Full-auto — no prompts at all', 'lang', 'shell', 'code', 'codex --approval-mode full-auto "Fix the failing tests"')
  ),
  source_url = 'https://github.com/openai/codex',
  source_note = 'Verified against Codex CLI README.'
WHERE tool_id = @cx AND slug = 'approval-mode';

-- --------------------------------------------------------------------------
-- 6. codex-cli / full-auto (high risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Shorthand for --approval-mode full-auto',
    'Best used with --sandbox for safety'
  ),
  caveats = JSON_ARRAY(
    'Agent can execute any shell command without confirmation',
    'Network access is unrestricted unless sandboxed'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Full-auto with sandbox protection', 'lang', 'shell', 'code', 'codex --full-auto --sandbox "Run tests and fix any failures"'),
    JSON_OBJECT('label', 'Full-auto without sandbox (dangerous)', 'lang', 'shell', 'code', 'codex --full-auto "Refactor the auth module"')
  ),
  source_url = 'https://github.com/openai/codex',
  source_note = 'Verified against Codex CLI README.'
WHERE tool_id = @cx AND slug = 'full-auto';

-- --------------------------------------------------------------------------
-- 7. codex-cli / dangerously-auto-approve-everything (high risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Same as --full-auto but with explicit danger naming',
    'Intended for fully isolated environments only'
  ),
  caveats = JSON_ARRAY(
    'No safety prompts of any kind — all actions are auto-approved',
    'Should only be used in disposable containers'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'In a disposable Docker container', 'lang', 'shell', 'code', 'docker run --rm -v $(pwd):/work -w /work codex-cli --dangerously-auto-approve-everything "Migrate database schema"')
  ),
  source_url = 'https://github.com/openai/codex',
  source_note = 'Verified against Codex CLI README.'
WHERE tool_id = @cx AND slug = 'dangerously-auto-approve-everything';

-- --------------------------------------------------------------------------
-- 8. aider / yes (high risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Automatically approves all code changes without prompting',
    'Often used with --auto-commits for fully automated workflows'
  ),
  caveats = JSON_ARRAY(
    'All file modifications are applied immediately without review',
    'Combined with git auto-commit, changes go directly to the repository'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Auto-approve all changes', 'lang', 'shell', 'code', 'aider --yes "Add error handling to all API endpoints"'),
    JSON_OBJECT('label', 'Auto-approve with automatic git commits', 'lang', 'shell', 'code', 'aider --yes --auto-commits "Refactor utils module into separate files"')
  ),
  source_url = 'https://aider.chat/docs/config/options.html',
  source_note = 'Verified against official Aider configuration documentation.'
WHERE tool_id = @ai AND slug = 'yes';

-- --------------------------------------------------------------------------
-- 9. aider / model (low risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Supports OpenAI, Anthropic, Google, and local models via Ollama',
    'Use provider prefix for non-OpenAI models (e.g. anthropic/claude-3.5-sonnet)'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Use an OpenAI model', 'lang', 'shell', 'code', 'aider --model gpt-4o'),
    JSON_OBJECT('label', 'Use an Anthropic model', 'lang', 'shell', 'code', 'aider --model anthropic/claude-3.5-sonnet'),
    JSON_OBJECT('label', 'Use a local Ollama model', 'lang', 'shell', 'code', 'aider --model ollama/llama3')
  ),
  source_url = 'https://aider.chat/docs/config/options.html',
  source_note = 'Verified against official Aider configuration documentation.'
WHERE tool_id = @ai AND slug = 'model';

-- --------------------------------------------------------------------------
-- 10. gemini-cli / model (low risk)
-- --------------------------------------------------------------------------
UPDATE commands SET
  notes = JSON_ARRAY(
    'Default model is gemini-2.5-pro',
    'Only Google models are supported'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'Select a specific Gemini model', 'lang', 'shell', 'code', 'gemini --model gemini-2.5-flash'),
    JSON_OBJECT('label', 'Use the default model explicitly', 'lang', 'shell', 'code', 'gemini --model gemini-2.5-pro')
  ),
  source_url = 'https://ai.google.dev/gemini-api/docs/gemini-cli',
  source_note = 'Verified against official Gemini CLI documentation.'
WHERE tool_id = @gc AND slug = 'model';

-- ============================================================================
-- Bulk source_url updates for all remaining commands without one
-- ============================================================================

-- Claude Code: set source_url for commands that don't have one yet
UPDATE commands SET source_url = 'https://docs.anthropic.com/en/docs/claude-code'
WHERE tool_id = @cc AND slug IN ('model', 'resume', 'mcp', 'config', 'clear', 'help', 'claude-md')
  AND source_url IS NULL;

-- Codex CLI: set source_url for commands that don't have one yet
UPDATE commands SET source_url = 'https://github.com/openai/codex'
WHERE tool_id = @cx AND slug IN ('compact', 'help', 'clear', 'history', 'model', 'provider', 'temperature', 'sandbox', 'quiet', 'json', 'config-path', 'context-window-size', 'config', 'resume', 'agents-md')
  AND source_url IS NULL;

-- Gemini CLI: set source_url for commands that don't have one yet
UPDATE commands SET source_url = 'https://ai.google.dev/gemini-api/docs/gemini-cli'
WHERE tool_id = @gc AND slug IN ('compress', 'clear', 'help', 'config', 'gemini-md')
  AND source_url IS NULL;

-- Aider: set source_url for commands that don't have one yet
UPDATE commands SET source_url = 'https://aider.chat/docs/config/options.html'
WHERE tool_id = @ai AND slug IN ('temperature', 'watch', 'drop', 'help', 'tokens', 'system-md', 'conf-yml')
  AND source_url IS NULL;

-- OpenCode: set source_url for commands that don't have one yet
UPDATE commands SET source_url = 'https://github.com/sst/opencode'
WHERE tool_id = @oc AND slug IN ('model', 'provider', 'mcp', 'mcp-add', 'config', 'clear')
  AND source_url IS NULL;

-- ============================================================================
-- Add Chinese descriptions (description_zh) for all commands
-- ============================================================================

-- Claude Code
UPDATE commands SET description_zh = CASE slug
  WHEN 'model' THEN '指定当前会话使用的 AI 模型。'
  WHEN 'dangerously-skip-permissions' THEN '跳过所有权限确认提示——在生产环境中使用极其危险。允许代理在无需用户确认的情况下执行任何操作。'
  WHEN 'permission-mode' THEN '控制权限级别：default（所有操作均需确认）、acceptEdits（自动接受文件编辑）、bypassPermissions（完全跳过权限检查）。'
  WHEN 'resume' THEN '通过会话 ID 恢复之前的对话。'
  WHEN 'mcp' THEN '管理 MCP（Model Context Protocol）服务器连接：添加、移除、列出、运行服务器。'
  WHEN 'mcp-add' THEN '注册新的 MCP 工具服务器。支持 stdio、sse 和 http 传输方式。'
  WHEN 'config' THEN '查看或修改存储在 ~/.claude/settings.json 中的持久化设置。'
  WHEN 'compact' THEN '压缩当前对话上下文，释放 context window 令牌空间，以支持更长的编码会话。'
  WHEN 'clear' THEN '清除当前对话历史并重新开始。别名：/reset。'
  WHEN 'help' THEN '显示所有可用的 slash 命令及其说明。'
  WHEN 'memory' THEN '读取或写入持久化的 CLAUDE.md 记忆文件。'
  WHEN 'claude-md' THEN '项目级或全局指令文件，在每次会话中自动注入。可放置在项目根目录或用户主目录。'
END
WHERE tool_id = @cc;

-- Codex CLI
UPDATE commands SET description_zh = CASE slug
  WHEN 'compact' THEN '压缩当前对话上下文，释放 context window 令牌空间。'
  WHEN 'help' THEN '显示所有可用的 slash 命令及其说明。'
  WHEN 'clear' THEN '清除当前对话历史并重新开始。'
  WHEN 'history' THEN '显示当前对话历史的分页日志。'
  WHEN 'model' THEN '指定要使用的 OpenAI 模型（例如 o4-mini、gpt-4o）。'
  WHEN 'provider' THEN '选择 AI 提供商后端（openai、azure、ollama、anthropic）。'
  WHEN 'temperature' THEN '控制模型采样的随机性。浮点数，范围 0.0–2.0。'
  WHEN 'approval-mode' THEN '控制代理在执行操作前如何请求用户批准。'
  WHEN 'sandbox' THEN '在隔离的沙盒环境中运行代理（macOS Sandbox 或 Docker）。'
  WHEN 'full-auto' THEN '启用完全自主执行模式——代理在无需任何批准提示的情况下运行。'
  WHEN 'dangerously-auto-approve-everything' THEN '自动批准所有操作且不进行确认——仅在受信任的隔离环境中使用。'
  WHEN 'quiet' THEN '抑制详细输出，仅显示关键信息和结果。'
  WHEN 'json' THEN '输出结构化 JSON 格式，而非人类可读的文本。'
  WHEN 'config-path' THEN '指定 Codex 配置文件的自定义路径。'
  WHEN 'context-window-size' THEN '覆盖默认的 context window 最大令牌数限制。'
  WHEN 'config' THEN '查看或交互式编辑持久化的 Codex 配置值。'
  WHEN 'resume' THEN '通过会话 ID 恢复之前的 Codex 会话，或从历史记录中交互式选择。'
  WHEN 'agents-md' THEN '项目级代理指令文件，在每次会话中自动注入。'
END
WHERE tool_id = @cx;

-- Gemini CLI
UPDATE commands SET description_zh = CASE slug
  WHEN 'model' THEN '选择 Gemini 模型变体（例如 gemini-2.5-pro）。'
  WHEN 'compress' THEN '压缩对话历史以释放 context window 空间。'
  WHEN 'clear' THEN '清除当前对话历史。'
  WHEN 'help' THEN '显示可用命令及使用说明。'
  WHEN 'config' THEN '查看或编辑存储在 ~/.gemini/config.yaml 中的 Gemini CLI 配置。'
  WHEN 'gemini-md' THEN '从项目根目录加载的自定义指令文件，在每次会话中自动注入。'
END
WHERE tool_id = @gc;

-- Aider
UPDATE commands SET description_zh = CASE slug
  WHEN 'model' THEN '选择要使用的 AI 模型。支持 OpenAI、Anthropic 以及通过 Ollama 使用的本地模型。'
  WHEN 'temperature' THEN '控制模型采样温度。浮点数，范围因模型而异。'
  WHEN 'watch' THEN '监听文件变更并自动应用建议的编辑。'
  WHEN 'yes' THEN '自动确认所有提示，无需用户批准。'
  WHEN 'drop' THEN '从当前上下文中移除所有文件。'
  WHEN 'help' THEN '显示可用命令及使用说明。'
  WHEN 'tokens' THEN '显示当前会话的令牌使用统计信息。'
  WHEN 'system-md' THEN '会话启动时加载的自定义系统提示词文件。'
  WHEN 'conf-yml' THEN '用于持久化 Aider 设置的 YAML 配置文件。'
END
WHERE tool_id = @ai;

-- OpenCode
UPDATE commands SET description_zh = CASE slug
  WHEN 'model' THEN '通过 provider/model 格式指定模型（例如 anthropic/claude-opus-4-5）。'
  WHEN 'provider' THEN '选择 AI 提供商：anthropic、openai、groq、ollama。'
  WHEN 'mcp' THEN '原生 MCP 支持——添加、移除、列出工具服务器。'
  WHEN 'mcp-add' THEN '注册新的 MCP 工具服务器。'
  WHEN 'config' THEN '通过 get/set/list 子命令查看或编辑配置。'
  WHEN 'clear' THEN '清除当前对话历史。'
END
WHERE tool_id = @oc;

-- ============================================================================
-- Add Chinese notes_zh / caveats_zh for commands that have notes/caveats
-- ============================================================================

-- claude-code / compact
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '压缩使用模型自身来生成摘要——摘要质量取决于你对可选指令的措辞。请明确描述正在进行的任务。',
    '压缩后原始对话历史将被丢弃，且无法撤销。如果需要完整上下文，请改用 resume 开启新会话。',
    '建议在某个明确阶段完成后使用（例如修完一个 bug 后、切换功能前）。'
  ),
  caveats_zh = JSON_ARRAY(
    '摘要具有非确定性——两次相同的调用可能会因模型采样不同而产生略有差异的摘要。',
    '工具调用的输出（大文件读取、长命令输出）可能会被大幅精简。如果某个特定输出很关键，请在指令中明确引用。'
  )
WHERE tool_id = @cc AND slug = 'compact';

-- claude-code / dangerously-skip-permissions
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '仅在受信任的沙盒环境（Docker、CI）中使用',
    '等同于 --permission-mode bypassPermissions，但没有任何安全保护',
    '不能与 --permission-mode 同时使用'
  ),
  caveats_zh = JSON_ARRAY(
    '代理可以在无需确认的情况下执行任意 shell 命令、删除文件、修改系统状态',
    '如果在沙盒外使用，没有回滚机制——损害是即时且永久的'
  )
WHERE tool_id = @cc AND slug = 'dangerously-skip-permissions';

-- claude-code / permission-mode
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '三种模式：default（所有操作均需确认）、acceptEdits（自动接受文件写入）、bypassPermissions（跳过所有提示）',
    'acceptEdits 是日常开发中最常用的折中选项'
  ),
  caveats_zh = JSON_ARRAY(
    'bypassPermissions 在功能上等同于 --dangerously-skip-permissions'
  )
WHERE tool_id = @cc AND slug = 'permission-mode';

-- claude-code / mcp-add
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '支持三种传输方式：stdio、sse、http',
    '服务器配置存储在 ~/.claude/settings.json 中'
  )
WHERE tool_id = @cc AND slug = 'mcp-add';

-- claude-code / memory
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '写入项目根目录的 CLAUDE.md 或全局的 ~/.claude/CLAUDE.md',
    '记忆内容在会话之间持久保存'
  )
WHERE tool_id = @cc AND slug = 'memory';

-- codex-cli / approval-mode
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '三种模式：suggest（只读建议）、auto-edit（自动写入文件，执行命令需确认）、full-auto（无需任何提示）',
    '默认模式为 suggest'
  ),
  caveats_zh = JSON_ARRAY(
    'full-auto 模式允许无需确认即可执行任意命令'
  )
WHERE tool_id = @cx AND slug = 'approval-mode';

-- codex-cli / full-auto
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '等同于 --approval-mode full-auto 的简写',
    '建议搭配 --sandbox 使用以确保安全'
  ),
  caveats_zh = JSON_ARRAY(
    '代理可以在无需确认的情况下执行任意 shell 命令',
    '除非启用沙盒，否则网络访问不受限制'
  )
WHERE tool_id = @cx AND slug = 'full-auto';

-- codex-cli / dangerously-auto-approve-everything
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '与 --full-auto 相同，但命名上明确标注了危险性',
    '仅适用于完全隔离的环境'
  ),
  caveats_zh = JSON_ARRAY(
    '没有任何安全提示——所有操作均自动批准',
    '应仅在一次性容器中使用'
  )
WHERE tool_id = @cx AND slug = 'dangerously-auto-approve-everything';

-- aider / yes
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '自动批准所有代码修改，无需提示确认',
    '常与 --auto-commits 搭配使用以实现完全自动化的工作流'
  ),
  caveats_zh = JSON_ARRAY(
    '所有文件修改将立即应用，无法事先审查',
    '与 git 自动提交结合使用时，修改将直接提交到代码仓库'
  )
WHERE tool_id = @ai AND slug = 'yes';

-- aider / model
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '支持 OpenAI、Anthropic、Google 以及通过 Ollama 使用的本地模型',
    '非 OpenAI 模型需使用提供商前缀（如 anthropic/claude-3.5-sonnet）'
  )
WHERE tool_id = @ai AND slug = 'model';

-- gemini-cli / model
UPDATE commands SET
  notes_zh = JSON_ARRAY(
    '默认模型为 gemini-2.5-pro',
    '仅支持 Google 模型'
  )
WHERE tool_id = @gc AND slug = 'model';
