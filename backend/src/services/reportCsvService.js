const columns = {
  drives: [
    'driveId',
    'title',
    'status',
    'companyId',
    'companyName',
    'registrationDeadline',
    'applications',
    'participants',
    'selections',
    'placedStudents',
  ],
  companies: [
    'companyId',
    'companyName',
    'drives',
    'applications',
    'participants',
    'selections',
    'placedStudents',
  ],
  branches: [
    'branchId',
    'code',
    'name',
    'students',
    'drives',
    'applications',
    'participants',
    'selections',
    'placedStudents',
    'placementRate',
  ],
  statuses: ['status', 'count'],
  participation: [
    'driveId',
    'title',
    'eligibleStudents',
    'participants',
    'eligibleParticipants',
    'participationRate',
  ],
};
function cell(value) {
  let text = value == null ? '' : String(value);
  // Spreadsheet apps may evaluate formulas after whitespace; neutralize before RFC 4180 quoting.
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function reportCsv(name, result) {
  let rows = result.data,
    headers = columns[name];
  if (name === 'overview') {
    headers = ['section', 'metric', 'value'];
    rows = Object.entries(result.data)
      .filter(([key]) => key !== 'recruitment')
      .map(([metric, value]) => ({ section: 'placement', metric, value }));
    const recruitment = result.data.recruitment;
    rows.push({
      section: 'recruitment',
      metric: 'availability',
      value: recruitment ? 'available' : 'unavailable',
    });
    for (const item of recruitment?.roundTypes || [])
      rows.push({
        section: 'roundTypes',
        metric: item.roundType,
        value: item.count,
      });
    for (const item of recruitment?.requiredDocuments || [])
      rows.push({
        section: 'requiredDocuments',
        metric: item.document,
        value: item.count,
      });
  }
  return (
    [
      headers.map(cell).join(','),
      ...rows.map((row) => headers.map((key) => cell(row[key])).join(',')),
    ].join('\r\n') + '\r\n'
  );
}
