const counts = [
  ['applications', 'Applications'],
  ['participants', 'Participants'],
  ['selections', 'Selections'],
  ['placedStudents', 'Placed students'],
];
export const reportViews = {
  drives: {
    title: 'Drive results',
    key: 'driveId',
    columns: [
      ['title', 'Drive'],
      ['companyName', 'Company'],
      ['status', 'Status'],
      ['registrationDeadline', 'Deadline'],
      ...counts,
    ],
  },
  companies: {
    title: 'Company selections',
    key: 'companyId',
    columns: [['companyName', 'Company'], ['drives', 'Drives'], ...counts],
  },
  branches: {
    title: 'Branch placements',
    key: 'branchId',
    columns: [
      ['code', 'Branch'],
      ['name', 'Department'],
      ['students', 'Students'],
      ['drives', 'Drives'],
      ...counts,
      ['placementRate', 'Placement rate'],
    ],
  },
  statuses: {
    title: 'Application statuses',
    key: 'status',
    columns: [
      ['status', 'Status'],
      ['count', 'Applications'],
    ],
  },
  participation: {
    title: 'Eligibility & participation',
    key: 'driveId',
    columns: [
      ['title', 'Drive'],
      ['eligibleStudents', 'Eligible students now'],
      ['participants', 'All participants'],
      ['eligibleParticipants', 'Eligible participants now'],
      ['participationRate', 'Participation rate'],
    ],
  },
};
