export type RiskLevel = 'safe' | 'caution' | 'dangerous';

const DANGEROUS_PATTERNS = [
  // Destructive file operations
  /\brm\s+(-[rf]+\s+)*\//,         // rm -rf /
  /\brm\s+-[rf]*\s/,               // rm -r or rm -f
  /\bsudo\b/,                      // sudo anything
  /\bchmod\s+7[0-7][0-7]/,         // chmod 777 etc
  /\bchown\b/,                     // chown
  /\bmkfs\b/,                      // make filesystem
  /\bdd\s/,                        // dd command
  /\bfdisk\b/,                     // fdisk
  /\bparted\b/,                    // parted

  // Process/system control
  /\bkill\s+-9/,                   // kill -9
  /\bkillall\b/,                   // killall
  /\bpkill\b/,                     // pkill
  /\breboot\b/,                    // reboot
  /\bshutdown\b/,                  // shutdown
  /\binit\s+[0-6]/,                // init levels

  // Git dangerous operations
  /\bgit\s+push\s+.*--force/,      // git push --force
  /\bgit\s+reset\s+--hard/,        // git reset --hard
  /\bgit\s+clean\s+-[df]+/,        // git clean -fd

  // Database operations
  /\bDROP\s+(DATABASE|TABLE)/i,    // DROP DATABASE/TABLE
  /\bTRUNCATE\s+TABLE/i,           // TRUNCATE TABLE
  /\bDELETE\s+FROM\b.*(?!WHERE)/i, // DELETE without WHERE

  // Remote code execution
  /curl.*\|\s*(ba)?sh/,            // curl | bash
  /wget.*\|\s*(ba)?sh/,            // wget | bash
  /\beval\s/,                      // eval

  // Container/cluster operations
  /\bdocker\s+system\s+prune/,     // docker system prune
  /\bkubectl\s+delete\s+namespace/, // kubectl delete namespace

  // Environment destruction
  /\bunset\s+PATH/,                // unset PATH
  /\bexport\s+PATH\s*=/,           // overwrite PATH

  // Encryption/data loss
  /\bshred\b/,                     // shred files
  /\bwipe\b/,                      // wipe

  // Network attacks (should never approve)
  /\bnmap\b.*-sS/,                 // stealth scan
  /\bnetcat\b.*-e/,                // netcat reverse shell
];

const CAUTION_PATTERNS = [
  // File operations
  /\brm\s/,                        // rm (any)
  /\bmv\s/,                        // mv
  /\bcp\s+-[rf]/,                  // cp -r or -f

  // Git operations
  /\bgit\s+push\b/,                // git push
  /\bgit\s+reset\b/,               // git reset
  /\bgit\s+checkout\b/,            // git checkout
  /\bgit\s+rebase\b/,              // git rebase
  /\bgit\s+merge\b/,               // git merge
  /\bgit\s+stash\s+drop/,          // git stash drop

  // Package publishing
  /\bnpm\s+publish\b/,             // npm publish
  /\byarn\s+publish\b/,            // yarn publish

  // Container operations
  /\bdocker\s+rm\b/,               // docker rm
  /\bdocker\s+rmi\b/,              // docker rmi
  /\bdocker\s+prune\b/,            // docker prune

  // Kubernetes operations
  /\bkubectl\s+delete\b/,          // kubectl delete
  /\bkubectl\s+apply\b/,           // kubectl apply
  /\bkubectl\s+scale\b/,           // kubectl scale

  // Permission changes
  /\bchmod\b/,                     // chmod (any)

  // Environment manipulation
  /\bexport\b/,                    // export
  /\bsource\b/,                    // source
  /\beval\b/,                      // eval
  /\bexec\b/,                      // exec

  // Service control
  /\bsystemctl\s+(start|stop|restart)/,  // systemctl
  /\bservice\s+\w+\s+(start|stop|restart)/, // service
];

/**
 * Assess the risk level of a bash command
 */
export function assessRisk(command: string): RiskLevel {
  // Check dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return 'dangerous';
    }
  }

  // Check caution patterns
  for (const pattern of CAUTION_PATTERNS) {
    if (pattern.test(command)) {
      return 'caution';
    }
  }

  return 'safe';
}

/**
 * Get risk indicator emoji and message
 */
export function getRiskIndicator(level: RiskLevel): { emoji: string; message: string } {
  switch (level) {
    case 'dangerous':
      return {
        emoji: '🔴',
        message: 'This command may cause irreversible changes. Review carefully!'
      };
    case 'caution':
      return {
        emoji: '🟡',
        message: 'This command modifies files or system state. Proceed with caution.'
      };
    case 'safe':
      return {
        emoji: '🟢',
        message: 'This command appears safe for read-only or local operations.'
      };
  }
}
