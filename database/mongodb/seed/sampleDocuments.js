// Fictional process data only; the seed service verifies MySQL drive/author references first.
export function recruitmentSample(placementDriveId, updatedBy) {
  return {
    placementDriveId,
    updatedBy,
    schemaVersion: 1,
    rounds: [
      {
        roundNumber: 1,
        roundName: 'Aptitude assessment',
        roundType: 'assessment',
        mode: 'online',
        scheduledAt: new Date('2030-11-15T09:30:00Z'),
        details: { durationMinutes: 60, platform: 'College lab' },
      },
      {
        roundNumber: 2,
        roundName: 'Technical interview',
        roundType: 'interview',
        mode: 'offline',
        scheduledAt: null,
        details: { venue: 'Example Seminar Hall' },
      },
    ],
    requiredDocuments: ['College ID Card', 'Academic Transcripts'],
    additionalRequirements: {
      instructions: 'Bring the informational checklist to the venue.',
    },
  };
}
export function announcementSample(relatedDriveId, createdBy) {
  return {
    title: 'Sample recruitment briefing',
    body: 'Fictional announcement for the database demonstration.',
    status: 'draft',
    priority: 'normal',
    audience: { type: 'all', branchIds: [] },
    relatedDriveId,
    links: [],
    isPinned: false,
    publishedAt: null,
    expiresAt: null,
    createdBy,
  };
}
