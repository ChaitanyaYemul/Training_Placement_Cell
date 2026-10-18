export const ROUND_TYPES = [
  'screening',
  'assessment',
  'group_discussion',
  'interview',
  'hr',
  'other',
];
export const MODES = ['online', 'offline', 'hybrid'];
export const SAFE_KEY =
  /^(?!\$)(?!.*\.)(?!__proto__$|constructor$|prototype$).+$/;
export const ID_MAX = 4294967295;
export const DOCUMENT_LIMIT = 65536;
export const id = {
  bsonType: ['int', 'long', 'double', 'decimal'],
  minimum: 1,
  maximum: ID_MAX,
  multipleOf: 1,
};
const text = (maxLength) => ({
  bsonType: 'string',
  minLength: 1,
  maxLength,
  pattern: '^\\S(?:[\\s\\S]*\\S)?$',
});
// Explicit finite recursion makes MongoDB's flexible fields bounded and rejects unsafe keys at every level.
export function flexibleValue(depth = 0) {
  const values = [
    { bsonType: 'string', maxLength: 2000 },
    { bsonType: 'bool' },
    { bsonType: 'null' },
    {
      bsonType: ['int', 'long', 'double', 'decimal'],
      minimum: -1e12,
      maximum: 1e12,
    },
  ];
  if (depth < 4)
    values.push(flexibleObject(depth), {
      bsonType: 'array',
      maxItems: 30,
      items: flexibleValue(depth + 1),
    });
  return { anyOf: values };
}
export function flexibleObject(depth = 0) {
  return {
    bsonType: 'object',
    maxProperties: 30,
    patternProperties: { [SAFE_KEY.source]: flexibleValue(depth + 1) },
    additionalProperties: false,
  };
}
const timestamps = {
  _id: { bsonType: 'objectId' },
  __v: { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 },
  createdAt: { bsonType: 'date' },
  updatedAt: { bsonType: 'date' },
};
const round = {
  bsonType: 'object',
  additionalProperties: false,
  required: [
    'roundNumber',
    'roundName',
    'roundType',
    'description',
    'mode',
    'scheduledAt',
    'details',
  ],
  properties: {
    roundNumber: { ...id, maximum: 20 },
    roundName: text(120),
    roundType: { enum: ROUND_TYPES },
    description: { bsonType: 'string', maxLength: 2000 },
    mode: { enum: MODES },
    scheduledAt: { bsonType: ['date', 'null'] },
    details: flexibleObject(),
  },
};
export const recruitmentSchema = {
  bsonType: 'object',
  additionalProperties: false,
  required: [
    'placementDriveId',
    'rounds',
    'requiredDocuments',
    'additionalRequirements',
    'schemaVersion',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    ...timestamps,
    placementDriveId: id,
    rounds: { bsonType: 'array', maxItems: 20, items: round },
    requiredDocuments: {
      bsonType: 'array',
      uniqueItems: true,
      maxItems: 30,
      items: text(120),
    },
    additionalRequirements: flexibleObject(),
    schemaVersion: { enum: [1] },
    updatedBy: id,
  },
};
const recruitmentOrder = {
  $cond: [
    { $isArray: '$rounds' },
    {
      $and: [
        {
          $eq: [
            {
              $map: {
                input: '$rounds',
                as: 'round',
                in: '$$round.roundNumber',
              },
            },
            { $range: [1, { $add: [1, { $size: '$rounds' }] }] },
          ],
        },
        {
          $allElementsTrue: [
            {
              $map: {
                input: { $range: [1, { $size: '$rounds' }] },
                as: 'index',
                in: {
                  $let: {
                    vars: {
                      previous: {
                        $arrayElemAt: [
                          '$rounds',
                          { $subtract: ['$$index', 1] },
                        ],
                      },
                      current: { $arrayElemAt: ['$rounds', '$$index'] },
                    },
                    in: {
                      $or: [
                        { $eq: ['$$previous.scheduledAt', null] },
                        { $eq: ['$$current.scheduledAt', null] },
                        {
                          $gte: [
                            '$$current.scheduledAt',
                            '$$previous.scheduledAt',
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    false,
  ],
};
export const announcementSchema = {
  bsonType: 'object',
  additionalProperties: false,
  required: [
    'title',
    'body',
    'status',
    'priority',
    'audience',
    'relatedDriveId',
    'links',
    'isPinned',
    'publishedAt',
    'expiresAt',
    'createdBy',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    ...timestamps,
    title: text(160),
    body: text(10000),
    status: { enum: ['draft', 'published'] },
    priority: { enum: ['normal', 'important', 'urgent'] },
    audience: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['type', 'branchIds'],
      properties: {
        type: { enum: ['all', 'branches'] },
        branchIds: {
          bsonType: 'array',
          uniqueItems: true,
          maxItems: 100,
          items: id,
        },
      },
    },
    relatedDriveId: { anyOf: [id, { bsonType: 'null' }] },
    links: {
      bsonType: 'array',
      maxItems: 10,
      items: {
        bsonType: 'object',
        additionalProperties: false,
        required: ['label', 'url'],
        properties: {
          label: text(120),
          url: {
            ...text(2048),
            pattern: '^https?://[^\\s/]+(?:[/\\?#][^\\s]*)?$',
          },
        },
      },
    },
    isPinned: { bsonType: 'bool' },
    publishedAt: { bsonType: ['date', 'null'] },
    expiresAt: { bsonType: ['date', 'null'] },
    createdBy: id,
  },
};
const audienceRule = {
  $cond: [
    { $isArray: '$audience.branchIds' },
    {
      $cond: [
        { $eq: ['$audience.type', 'branches'] },
        { $gt: [{ $size: '$audience.branchIds' }, 0] },
        { $eq: [{ $size: '$audience.branchIds' }, 0] },
      ],
    },
    false,
  ],
};
export const collectionDefinitions = [
  {
    name: 'recruitment_processes',
    validator: {
      $and: [
        { $jsonSchema: recruitmentSchema },
        {
          $expr: {
            $and: [
              recruitmentOrder,
              { $lte: [{ $bsonSize: '$$ROOT' }, DOCUMENT_LIMIT] },
            ],
          },
        },
      ],
    },
    indexes: [
      {
        key: { placementDriveId: 1 },
        name: 'uq_recruitment_drive',
        unique: true,
      },
      { key: { 'rounds.scheduledAt': 1 }, name: 'idx_rounds_schedule' },
    ],
  },
  {
    name: 'placement_announcements',
    validator: {
      $and: [
        { $jsonSchema: announcementSchema },
        {
          $expr: {
            $and: [
              audienceRule,
              {
                $or: [
                  { $ne: ['$status', 'published'] },
                  { $ne: ['$publishedAt', null] },
                ],
              },
              { $lte: [{ $bsonSize: '$$ROOT' }, DOCUMENT_LIMIT] },
            ],
          },
        },
      ],
    },
    indexes: [
      {
        key: { status: 1, publishedAt: -1 },
        name: 'idx_announcements_status_published',
      },
      { key: { relatedDriveId: 1 }, name: 'idx_announcements_drive' },
    ],
  },
];
