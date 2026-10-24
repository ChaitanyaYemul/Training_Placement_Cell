import DriveActions from '../admin/DriveActions.jsx';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import {
  Button,
  PageHeader,
  QueryState,
  StatusBadge,
} from '../../components/ui.jsx';
import RecruitmentView from '../../components/RecruitmentView.jsx';
import { formatDate } from '../../utils/dates.js';
const reasons = {
  MIN_CGPA: 'Minimum CGPA',
  BACKLOGS: 'Active backlog limit',
  BRANCH: 'Eligible branch',
  GRADUATION_YEAR: 'Graduation year',
};
export default function DrivePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const path = `/placement-drives/${id}`;
  const query = useResource(path, undefined, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
  const row = query.data?.data;
  const posting = useResource(row ? `/job-postings/${row.jobPostingId}` : null);
  return (
    <QueryState query={query}>
      <PageHeader title={row?.title} description={row?.description}>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Refresh drive
        </Button>
      </PageHeader>
      {row && (
        <>
          <div className="panel space-y-3">
            <StatusBadge>{row.status}</StatusBadge>
            <p>
              <strong>Registration deadline:</strong>{' '}
              {formatDate(row.registrationDeadline)}
            </p>
            <p>
              <strong>Drive date:</strong> {formatDate(row.driveDate)}
            </p>
            <p>
              <strong>Eligible branches:</strong>{' '}
              {row.eligibleBranches.map((b) => b.name).join(', ') ||
                'Not configured'}
            </p>
            <p>
              <strong>Criteria:</strong> CGPA {row.minCgpa ?? 'TBD'} · Backlogs
              ≤ {row.maxActiveBacklogs ?? 'TBD'} · Class of{' '}
              {row.eligibleGraduationYear ?? 'TBD'}
            </p>
            <QueryState query={posting}>
              <p>
                <strong>Job:</strong> {posting.data?.data?.title} ·{' '}
                <Link
                  className="text-link"
                  to={`/${user.role}/companies/${posting.data?.data?.companyId}`}
                >
                  View company & job
                </Link>
              </p>
            </QueryState>
            {!admin && (
              <div className="notice">
                <p>
                  {row.hasApplied
                    ? 'You have an application for this drive.'
                    : row.myEligibility?.eligible
                      ? 'You meet the academic eligibility criteria.'
                      : 'Academic eligibility criteria not met or records incomplete.'}
                </p>
                {row.myEligibility?.failedCriteria?.length > 0 && (
                  <p>
                    Review:{' '}
                    {row.myEligibility.failedCriteria
                      .map((r) => reasons[r] || r)
                      .join(', ')}
                    .
                  </p>
                )}
                <p className="mt-2 text-sm">
                  Application submission and withdrawal will be available in a
                  later phase.
                </p>
              </div>
            )}
          </div>
          {admin && <DriveActions id={id} row={row} />}
          <RecruitmentView
            recruitment={row.recruitment}
            warnings={query.data.warnings}
          />
        </>
      )}
    </QueryState>
  );
}
