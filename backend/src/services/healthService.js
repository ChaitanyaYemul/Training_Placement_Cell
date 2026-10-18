export function getHealth() {
  return {
    status: 'ok',
    service: 'placement-api',
    phase: 'initialization',
    databases: 'not-configured',
  };
}
