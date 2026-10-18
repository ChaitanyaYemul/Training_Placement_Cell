import mongoose from 'mongoose';
import { getMongoSettings, mongoDatabaseName } from './databaseEnv.js';
export async function connectMongo(settings = getMongoSettings()) {
  mongoDatabaseName(settings.MONGODB_URI);
  return mongoose
    .createConnection(settings.MONGODB_URI, {
      autoIndex: false,
      bufferCommands: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();
}
