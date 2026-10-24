const field = (name, label, type = 'text', options = {}) => ({
  name,
  label,
  type,
  ...options,
});
export const companyFields = [
  field('name', 'Company name', 'text', { required: true, maxLength: 160 }),
  field('industry', 'Industry', 'text', { maxLength: 120 }),
  field('website', 'Website', 'url', { maxLength: 2048 }),
  field('description', 'Description', 'textarea', { maxLength: 10000 }),
  field('headquarters', 'Headquarters', 'text', { maxLength: 160 }),
  field('contactEmail', 'Contact email', 'email', { maxLength: 254 }),
  field('isActive', 'Active', 'checkbox', { default: true }),
];
export const postingFields = [
  field('title', 'Job title', 'text', { required: true, maxLength: 160 }),
  field('description', 'Job description', 'textarea', {
    required: true,
    maxLength: 10000,
  }),
  field('jobType', 'Job type', 'select', {
    required: true,
    choices: ['full_time', 'internship', 'internship_ppo'],
  }),
  field('ctcLpa', 'CTC (LPA)', 'number', { min: 0, max: 999999, step: '0.01' }),
  field('location', 'Location', 'text', { maxLength: 160 }),
  field('isActive', 'Active', 'checkbox', { default: true }),
];
export const driveFields = [
  field('jobPostingId', 'Job posting ID', 'number', {
    required: true,
    min: 1,
    step: 1,
    hint: 'Use the posting ID shown under Companies → job postings.',
  }),
  field('title', 'Drive title', 'text', { required: true, maxLength: 160 }),
  field('description', 'Description', 'textarea', { maxLength: 10000 }),
  field('registrationDeadline', 'Registration deadline', 'datetime-local', {
    required: true,
  }),
  field('driveDate', 'Drive date', 'datetime-local'),
  field('minCgpa', 'Minimum CGPA', 'number', { min: 0, max: 10, step: '0.01' }),
  field('maxActiveBacklogs', 'Maximum active backlogs', 'number', {
    min: 0,
    max: 65535,
    step: 1,
  }),
  field('eligibleGraduationYear', 'Graduation year', 'number', {
    min: 2000,
    max: 2200,
    step: 1,
  }),
  field('eligibleBranchIds', 'Eligible branches', 'branches'),
];
export const profileFields = [
  field('fullName', 'Full name', 'text', { required: true, maxLength: 120 }),
  field('enrollmentNumber', 'Enrollment number', 'text', {
    required: true,
    maxLength: 40,
  }),
  field('phone', 'Phone', 'tel', { maxLength: 30 }),
  field('branchId', 'Branch', 'branch', { required: true }),
  field('graduationYear', 'Graduation year', 'number', {
    min: 2000,
    max: 2200,
    step: 1,
    required: true,
  }),
];
export const announcementFields = [
  field('title', 'Title', 'text', { required: true, maxLength: 160 }),
  field('body', 'Message', 'textarea', { required: true, maxLength: 10000 }),
  field('status', 'Publication status', 'select', {
    choices: ['draft', 'published'],
    default: 'draft',
  }),
  field('priority', 'Priority', 'select', {
    choices: ['normal', 'important', 'urgent'],
    default: 'normal',
  }),
  field('audienceType', 'Audience', 'select', {
    choices: ['all', 'branches'],
    default: 'all',
  }),
  field('branchIds', 'Audience branches', 'branches', {
    hint: 'Used only when the audience is branches.',
  }),
  field('relatedDriveId', 'Related drive ID', 'number', { min: 1, step: 1 }),
  field('publishedAt', 'Publish at', 'datetime-local'),
  field('expiresAt', 'Expires at', 'datetime-local'),
  field('isPinned', 'Pinned', 'checkbox'),
  field('links', 'Links', 'json', {
    default: [],
    hint: 'JSON list of objects with label and http(s) url. Use [] for no links.',
  }),
];
