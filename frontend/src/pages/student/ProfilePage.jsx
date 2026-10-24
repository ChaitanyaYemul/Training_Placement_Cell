import { useResource, useResourceMutation } from '../../hooks/useResource.js';
import { useToast } from '../../context/toastContext.js';
import { PageHeader, QueryState } from '../../components/ui.jsx';
import ResourceForm from '../../components/ResourceForm.jsx';
import AcademicForm from './AcademicForm.jsx';
import { profileFields } from '../../services/formSpecs.js';
export default function ProfilePage() {
  const profile = useResource('/students/me');
  const branches = useResource('/branches');
  const records = useResource('/students/me/academic-records');
  const toast = useToast();
  const mutation = useResourceMutation([
    '/students/me',
    '/placement-drives',
    '/announcements',
  ]);
  const row = profile.data?.data;
  const missing = row
    ? [
        ['fullName', 'name'],
        ['enrollmentNumber', 'enrollment number'],
        ['branchId', 'branch'],
        ['graduationYear', 'graduation year'],
      ]
        .filter(([key]) => !row[key])
        .map(([, label]) => label)
    : [];
  return (
    <>
      <PageHeader
        title="My profile"
        description="Keep your personal and academic information up to date."
      />
      <QueryState query={profile}>
        <QueryState query={branches}>
          <QueryState query={records}>
            <p className="notice mb-6">
              {missing.length || !records.data?.data?.length
                ? `To complete your profile, add: ${[...missing, ...(!records.data?.data?.length ? ['at least one semester record'] : [])].join(', ')}.`
                : 'Your profile has the required personal and academic information.'}
            </p>
            <ResourceForm
              fields={profileFields}
              initial={row}
              branches={branches.data?.data}
              pending={mutation.isPending}
              error={mutation.error}
              onSave={async (body) => {
                await mutation.mutateAsync({
                  path: '/students/me',
                  method: 'patch',
                  body,
                });
                toast('Profile saved. Eligibility will refresh.');
              }}
            />
            <h2 className="mt-10 mb-5 text-xl font-semibold">
              Academic records
            </h2>
            <AcademicForm initial={records.data?.data || []} />
          </QueryState>
        </QueryState>
      </QueryState>
    </>
  );
}
