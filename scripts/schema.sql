CREATE DATABASE IF NOT EXISTS ai_command_atlas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET NAMES utf8mb4;
USE ai_command_atlas;

CREATE TABLE IF NOT EXISTS tools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  company VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  color VARCHAR(16) NOT NULL,
  avatar VARCHAR(8) NOT NULL,
  version VARCHAR(32) NOT NULL,
  source_type ENUM('official','github','community') NOT NULL DEFAULT 'official',
  github_url VARCHAR(512) DEFAULT NULL,
  docs_url VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_id INT NOT NULL,
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(256) NOT NULL,
  command_type ENUM('option','slash','subcommand','flag','config') NOT NULL,
  category VARCHAR(64) NOT NULL,
  risk_level ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  source ENUM('official','github','community') NOT NULL DEFAULT 'official',
  description TEXT NOT NULL,
  description_zh TEXT DEFAULT NULL,
  syntax TEXT DEFAULT NULL,
  value_hint VARCHAR(256) DEFAULT NULL,
  parameters JSON DEFAULT NULL,
  examples JSON DEFAULT NULL,
  notes JSON DEFAULT NULL,
  notes_zh JSON DEFAULT NULL,
  caveats JSON DEFAULT NULL,
  caveats_zh JSON DEFAULT NULL,
  source_url VARCHAR(512) DEFAULT NULL,
  source_note TEXT DEFAULT NULL,
  related_command_ids JSON DEFAULT NULL,
  last_checked DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tool_slug (tool_id, slug),
  INDEX idx_category (category),
  INDEX idx_risk (risk_level),
  INDEX idx_type (command_type),
  FULLTEXT INDEX ft_search (name, description)
);

CREATE TABLE IF NOT EXISTS compare_capabilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capability VARCHAR(128) NOT NULL,
  capability_desc TEXT NOT NULL,
  category ENUM('model','session','permission','mcp','config') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS compare_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capability_id INT NOT NULL,
  tool_id INT NOT NULL,
  has_feature TINYINT(1) NOT NULL DEFAULT 1,
  command_name VARCHAR(256) DEFAULT NULL,
  command_slug VARCHAR(128) DEFAULT NULL,
  command_desc TEXT DEFAULT NULL,
  none_label VARCHAR(256) DEFAULT NULL,
  risk_level ENUM('low','medium','high') DEFAULT NULL,
  source ENUM('official','github','community') DEFAULT NULL,
  copy_text VARCHAR(512) DEFAULT NULL,
  FOREIGN KEY (capability_id) REFERENCES compare_capabilities(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);
