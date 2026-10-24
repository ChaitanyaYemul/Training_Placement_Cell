import { fromLocalInput, toLocalInput } from '../utils/dates.js';
export function initialValues(fields, row = {}) {
  return Object.fromEntries(
    fields.map((f) => {
      const value = row[f.name] ?? f.default;
      return [
        f.name,
        f.type === 'datetime-local'
          ? toLocalInput(value)
          : f.type === 'json'
            ? JSON.stringify(value ?? {}, null, 2)
            : (value ??
              (f.type === 'checkbox'
                ? false
                : f.type === 'branches'
                  ? []
                  : '')),
      ];
    }),
  );
}
export function formBody(fields, values, original = {}) {
  return Object.fromEntries(
    fields.map((f) => {
      const value = values[f.name];
      return [
        f.name,
        f.type === 'datetime-local'
          ? original[f.name] && value === toLocalInput(original[f.name])
            ? original[f.name]
            : fromLocalInput(value)
          : f.type === 'json'
            ? JSON.parse(value)
            : ['number', 'branch'].includes(f.type)
              ? value === ''
                ? null
                : Number(value)
              : f.type === 'branches'
                ? value.map(Number)
                : value === ''
                  ? null
                  : value,
      ];
    }),
  );
}
export function announcementInput(row) {
  return {
    ...row,
    audienceType: row?.audience?.type,
    branchIds: row?.audience?.branchIds,
  };
}
export function announcementBody(input) {
  const { audienceType, branchIds, ...body } = input;
  return {
    ...body,
    audience: {
      type: audienceType,
      branchIds: audienceType === 'all' ? [] : branchIds,
    },
  };
}
