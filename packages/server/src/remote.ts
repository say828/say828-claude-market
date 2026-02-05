/**
 * Remote session detection and port configuration
 */

export function isRemote(): boolean {
  return (
    process.env.YOURTURN_REMOTE === '1' ||
    !!process.env.SSH_TTY ||
    !!process.env.SSH_CONNECTION
  );
}

export function getPort(): number {
  const envPort = process.env.YOURTURN_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }
  // Remote sessions need fixed port for port forwarding
  if (isRemote()) {
    return 18765;
  }
  // Local sessions use random port
  return 0;
}
