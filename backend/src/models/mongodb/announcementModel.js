import mongoose from 'mongoose';
import { idField, trimmedText, addSharedRules } from './schemaHelpers.js';
const audienceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['all', 'branches'], required: true },
    branchIds: {
      type: [idField()],
      default: [],
      validate: (ids) => ids.length <= 100 && new Set(ids).size === ids.length,
    },
  },
  { _id: false, strict: 'throw' },
);
const linkSchema = new mongoose.Schema(
  {
    label: trimmedText(120),
    url: {
      ...trimmedText(2048),
      validate: (value) =>
        URL.canParse(value) &&
        ['http:', 'https:'].includes(new URL(value).protocol) &&
        !/\s/.test(value),
    },
  },
  { _id: false, strict: 'throw' },
);
const schema = new mongoose.Schema(
  {
    title: trimmedText(160),
    body: trimmedText(10000),
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      required: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal',
      required: true,
    },
    audience: {
      type: audienceSchema,
      required: true,
      default: () => ({ type: 'all', branchIds: [] }),
    },
    relatedDriveId: {
      ...idField(),
      required: false,
      default: null,
      validate: (value) => value === null || Number.isInteger(value),
    },
    links: {
      type: [linkSchema],
      default: [],
      validate: (values) => values.length <= 10,
    },
    isPinned: { type: Boolean, default: false, required: true },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: idField(),
  },
  { timestamps: true, strict: 'throw', autoIndex: false, autoCreate: false },
);
schema.pre('validate', function () {
  const ids = this.audience?.branchIds || [];
  if (this.audience?.type === 'branches' ? ids.length === 0 : ids.length !== 0)
    this.invalidate(
      'audience',
      'Branch audiences require branch ids; all audiences require no branch ids',
    );
  if (this.status === 'published' && !this.publishedAt)
    this.invalidate(
      'publishedAt',
      'Published announcements require a publication date',
    );
});
addSharedRules(schema, 'placement_announcements');
export function announcementModel(connection) {
  return (
    connection.models.Announcement ||
    connection.model('Announcement', schema, 'placement_announcements')
  );
}
