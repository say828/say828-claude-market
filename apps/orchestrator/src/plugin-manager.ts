import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PluginInstallInfo {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

export interface Plugin {
  id: string; // format: "plugin-name@marketplace-name"
  name: string;
  marketplace: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  installPath: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
  hooks?: PluginHook[];
  commands?: PluginCommand[];
}

export interface PluginHook {
  event: string;
  matcher?: string;
  command: string;
  timeout?: number;
}

export interface PluginCommand {
  name: string;
  description?: string;
  command: string;
}

export class PluginManager {
  private pluginsDir: string;
  private installedPluginsPath: string;

  constructor() {
    this.pluginsDir = path.join(os.homedir(), '.claude', 'plugins');
    this.installedPluginsPath = path.join(this.pluginsDir, 'installed_plugins.json');
  }

  /**
   * Get all installed plugins
   */
  async getInstalledPlugins(): Promise<Plugin[]> {
    try {
      // Read installed_plugins.json
      const installedData = JSON.parse(
        fs.readFileSync(this.installedPluginsPath, 'utf-8')
      );

      const plugins: Plugin[] = [];

      // Iterate through each plugin
      for (const [pluginId, installations] of Object.entries(installedData.plugins || {})) {
        const [name, marketplace] = pluginId.split('@');
        const installInfos = installations as PluginInstallInfo[];

        // Get the most recent installation
        const latestInstall = installInfos[installInfos.length - 1];

        // Read plugin manifest
        const manifest = await this.readPluginManifest(latestInstall.installPath);

        // Read hooks if available
        const hooks = await this.readPluginHooks(latestInstall.installPath);

        // Read commands if available
        const commands = await this.readPluginCommands(latestInstall.installPath);

        plugins.push({
          id: pluginId,
          name,
          marketplace,
          version: latestInstall.version,
          description: manifest?.description || '',
          author: manifest?.author,
          homepage: manifest?.homepage,
          repository: manifest?.repository,
          license: manifest?.license,
          keywords: manifest?.keywords,
          installPath: latestInstall.installPath,
          installedAt: latestInstall.installedAt,
          lastUpdated: latestInstall.lastUpdated,
          enabled: true, // Claude Code doesn't have disable feature yet
          hooks,
          commands
        });
      }

      return plugins.sort((a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    } catch (error) {
      console.error('Failed to read installed plugins:', error);
      return [];
    }
  }

  /**
   * Get specific plugin details
   */
  async getPlugin(pluginId: string): Promise<Plugin | null> {
    const plugins = await this.getInstalledPlugins();
    return plugins.find(p => p.id === pluginId) || null;
  }

  /**
   * Read plugin.json manifest
   */
  private async readPluginManifest(installPath: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = path.join(installPath, '.claude-plugin', 'plugin.json');
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Read hooks.json if available
   */
  private async readPluginHooks(installPath: string): Promise<PluginHook[] | undefined> {
    try {
      // Try multiple locations for hooks.json
      const possiblePaths = [
        path.join(installPath, '.claude-plugin', 'hooks.json'),
        path.join(installPath, 'hooks', 'hooks.json'),
        path.join(installPath, 'hooks.json')
      ];

      for (const hooksPath of possiblePaths) {
        if (fs.existsSync(hooksPath)) {
          const hooksData = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));

          // Claude Code hooks.json format: { hooks: { EventType: [{ matcher?, hooks: [...] }] } }
          if (hooksData.hooks && typeof hooksData.hooks === 'object') {
            const hooks: PluginHook[] = [];

            // Iterate through each event type (PermissionRequest, PreToolUse, Stop, etc.)
            for (const [eventType, matchers] of Object.entries(hooksData.hooks)) {
              if (Array.isArray(matchers)) {
                for (const matcherEntry of matchers) {
                  const matcher = (matcherEntry as any).matcher;
                  const hookList = (matcherEntry as any).hooks;

                  if (Array.isArray(hookList)) {
                    for (const hook of hookList) {
                      if (hook.command) {
                        hooks.push({
                          event: eventType,
                          matcher,
                          command: hook.command,
                          timeout: hook.timeout
                        });
                      }
                    }
                  }
                }
              }
            }

            return hooks.length > 0 ? hooks : undefined;
          }

          // Fallback: simple array format
          if (Array.isArray(hooksData.hooks)) {
            return hooksData.hooks;
          }
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Read slash commands from plugin
   */
  private async readPluginCommands(installPath: string): Promise<PluginCommand[] | undefined> {
    try {
      // Check for commands.json in multiple locations
      const possibleCommandsPaths = [
        path.join(installPath, '.claude-plugin', 'commands.json'),
        path.join(installPath, 'commands', 'commands.json'),
        path.join(installPath, 'commands.json')
      ];

      for (const commandsPath of possibleCommandsPaths) {
        if (fs.existsSync(commandsPath)) {
          const commandsData = JSON.parse(fs.readFileSync(commandsPath, 'utf-8'));
          return commandsData.commands || [];
        }
      }

      // Check for CLAUDE.md with slash commands
      const claudeMdPath = path.join(installPath, 'CLAUDE.md');
      if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf-8');
        const commands = this.extractCommandsFromMarkdown(content);
        if (commands.length > 0) {
          return commands;
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract slash commands from CLAUDE.md
   */
  private extractCommandsFromMarkdown(content: string): PluginCommand[] {
    const commands: PluginCommand[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for patterns like: /command - description
      const match = line.match(/^[-*]\s*`?(\/\w+[^\s`]*)`?\s*[-–]\s*(.+)$/);
      if (match) {
        commands.push({
          name: match[1],
          description: match[2].trim(),
          command: match[1]
        });
      }
    }

    return commands;
  }

  /**
   * Get plugin statistics
   */
  async getPluginStats(): Promise<{
    total: number;
    enabled: number;
    withHooks: number;
    withCommands: number;
  }> {
    const plugins = await this.getInstalledPlugins();
    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      withHooks: plugins.filter(p => p.hooks && p.hooks.length > 0).length,
      withCommands: plugins.filter(p => p.commands && p.commands.length > 0).length
    };
  }
}
