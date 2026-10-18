export function evaluateEligibility(drive, academic, branches) {
  const failedCriteria = [];
  if (
    academic?.cgpa == null ||
    drive.minCgpa == null ||
    academic.cgpa < drive.minCgpa
  )
    failedCriteria.push('MIN_CGPA');
  if (
    academic?.activeBacklogs == null ||
    drive.maxActiveBacklogs == null ||
    academic.activeBacklogs > drive.maxActiveBacklogs
  )
    failedCriteria.push('BACKLOGS');
  if (
    !academic?.graduationYear ||
    academic.graduationYear !== drive.eligibleGraduationYear
  )
    failedCriteria.push('GRADUATION_YEAR');
  if (!branches.some((branch) => branch.id === academic?.branchId))
    failedCriteria.push('BRANCH');
  return { eligible: failedCriteria.length === 0, failedCriteria };
}
