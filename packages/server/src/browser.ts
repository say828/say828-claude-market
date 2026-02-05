import { spawn } from 'child_process';
import { isRemote } from './remote';

/**
 * Open URL in the default browser
 */
export function openBrowser(url: string): void {
  if (isRemote()) {
    console.log(`\n🌐 Open this URL in your browser:\n   ${url}\n`);
    return;
  }

  const customBrowser = process.env.YOURTURN_BROWSER;
  if (customBrowser) {
    spawn(customBrowser, [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  const platform = process.platform;
  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    // Check for WSL
    const isWSL = process.env.WSL_DISTRO_NAME ||
                  process.env.WSLENV ||
                  (process.env.PATH && process.env.PATH.includes('/mnt/c/'));

    if (isWSL) {
      command = 'cmd.exe';
      args = ['/c', 'start', '', url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
  }

  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  } catch (error) {
    console.log(`\n🌐 Open this URL in your browser:\n   ${url}\n`);
  }
}
