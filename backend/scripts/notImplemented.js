// Compatibility for the original reconciliation command path.
if (process.argv[2] === 'reconcile') process.argv.splice(2, 1);
await import('./reconcile.js');
