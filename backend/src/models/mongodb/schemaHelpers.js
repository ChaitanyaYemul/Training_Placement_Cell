import mongoose from 'mongoose';
import {
  SAFE_KEY,
  ID_MAX,
  DOCUMENT_LIMIT,
  collectionDefinitions,
} from '../../../../database/mongodb/schemas/definitions.js';
export const idField = () => ({
  type: Number,
  required: true,
  min: 1,
  max: ID_MAX,
  validate: Number.isInteger,
});
export const trimmedText = (max) => ({
  type: String,
  required: true,
  trim: true,
  minlength: 1,
  maxlength: max,
});
export function safeFlexible(value, depth = 0) {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 2000;
  if (typeof value === 'number')
    return Number.isFinite(value) && Math.abs(value) <= 1e12;
  if (depth >= 4) return false;
  if (Array.isArray(value))
    return (
      value.length <= 30 && value.every((item) => safeFlexible(item, depth + 1))
    );
  return (
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length <= 30 &&
    Object.entries(value).every(
      ([key, item]) => SAFE_KEY.test(key) && safeFlexible(item, depth + 1),
    )
  );
}
export const flexibleField = () => ({
  type: mongoose.Schema.Types.Mixed,
  default: () => ({}),
  validate: (value) =>
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    safeFlexible(value),
});
export function addSharedRules(schema, collectionName) {
  schema.pre('validate', function () {
    if (
      mongoose.mongo.BSON.calculateObjectSize(this.toObject()) > DOCUMENT_LIMIT
    )
      this.invalidate('document', 'Document exceeds 64 KiB');
  });
  for (const { key, ...options } of collectionDefinitions.find(
    (entry) => entry.name === collectionName,
  ).indexes)
    schema.index(key, options);
}
