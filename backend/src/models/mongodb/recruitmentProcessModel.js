import mongoose from 'mongoose';
import {
  ROUND_TYPES,
  MODES,
} from '../../../../database/mongodb/schemas/definitions.js';
import {
  idField,
  trimmedText,
  flexibleField,
  addSharedRules,
} from './schemaHelpers.js';
const roundSchema = new mongoose.Schema(
  {
    roundNumber: { ...idField(), max: 20 },
    roundName: trimmedText(120),
    roundType: { type: String, required: true, enum: ROUND_TYPES },
    description: { type: String, maxlength: 2000, default: '' },
    mode: { type: String, required: true, enum: MODES },
    scheduledAt: { type: Date, default: null },
    details: flexibleField(),
  },
  { _id: false, strict: 'throw', minimize: false },
);
const schema = new mongoose.Schema(
  {
    placementDriveId: idField(),
    rounds: {
      type: [roundSchema],
      default: [],
      validate: {
        validator: (rounds) =>
          rounds.length <= 20 &&
          rounds.every(
            (round, index) =>
              round.roundNumber === index + 1 &&
              (index === 0 ||
                !round.scheduledAt ||
                !rounds[index - 1].scheduledAt ||
                round.scheduledAt >= rounds[index - 1].scheduledAt),
          ),
        message:
          'BR-06: rounds must be contiguous, ordered and have nondecreasing consecutive schedules',
      },
    },
    requiredDocuments: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 120 }],
      default: [],
      validate: (values) =>
        values.length <= 30 && new Set(values).size === values.length,
    },
    additionalRequirements: flexibleField(),
    schemaVersion: { type: Number, enum: [1], default: 1, required: true },
    updatedBy: idField(),
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    strict: 'throw',
    minimize: false,
    autoIndex: false,
    autoCreate: false,
  },
);
addSharedRules(schema, 'recruitment_processes');
export function recruitmentProcessModel(connection) {
  return (
    connection.models.RecruitmentProcess ||
    connection.model('RecruitmentProcess', schema, 'recruitment_processes')
  );
}
