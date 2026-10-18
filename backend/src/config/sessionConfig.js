import session from 'express-session';
import mysqlSession from 'express-mysql-session';
export const SESSION_COOKIE = 'placement.sid';
const MySQLStore = mysqlSession(session);
export function sessionConfig(pool, settings) {
  const store = new MySQLStore(
    {
      createDatabaseTable: false,
      endConnectionOnClose: false,
      expiration: settings.SESSION_MAX_AGE_MS,
      checkExpirationInterval: 900000,
      schema: {
        tableName: 'app_sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data',
        },
      },
    },
    pool.pool,
  );
  return {
    store,
    middleware: session({
      name: SESSION_COOKIE,
      store,
      secret: settings.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: settings.secure,
        sameSite: 'lax',
        maxAge: settings.SESSION_MAX_AGE_MS,
      },
    }),
  };
}
