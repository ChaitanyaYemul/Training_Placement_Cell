import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../../../backend/src/services/eligibilityService.js';
const drive = {
  minCgpa: 7,
  maxActiveBacklogs: 0,
  eligibleGraduationYear: 2030,
};
const academic = {
  cgpa: 7,
  activeBacklogs: 0,
  graduationYear: 2030,
  branchId: 1,
};
describe('BR-05 deterministic eligibility display', () => {
  it('accepts equality at every boundary', () => {
    expect(evaluateEligibility(drive, academic, [{ id: 1 }])).toEqual({
      eligible: true,
      failedCriteria: [],
    });
  });
  for (const [patch, reason] of [
    [{ cgpa: 6.99 }, 'MIN_CGPA'],
    [{ activeBacklogs: 1 }, 'BACKLOGS'],
    [{ graduationYear: 2029 }, 'GRADUATION_YEAR'],
    [{ branchId: 2 }, 'BRANCH'],
  ])
    it('explains ' + reason, () => {
      expect(
        evaluateEligibility(drive, { ...academic, ...patch }, [{ id: 1 }]),
      ).toEqual({ eligible: false, failedCriteria: [reason] });
    });
  it('never treats missing academics as eligible', () => {
    expect(evaluateEligibility(drive, null, [{ id: 1 }]).eligible).toBe(false);
  });
});
