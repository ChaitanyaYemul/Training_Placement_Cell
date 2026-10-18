import { collectionDefinitions } from '../../../database/mongodb/schemas/definitions.js';
/** Explicit collection/index administration; runtime connections never auto-create schema. */
export async function applyMongoSchemas(connection) {
  for (const definition of collectionDefinitions) {
    const options = {
      validator: definition.validator,
      validationLevel: 'strict',
      validationAction: 'error',
    };
    try {
      await connection.db.createCollection(definition.name, options);
    } catch (error) {
      if (error.code !== 48) throw error;
      await connection.db.command({ collMod: definition.name, ...options });
    }
    await connection.db
      .collection(definition.name)
      .createIndexes(definition.indexes);
  }
}
