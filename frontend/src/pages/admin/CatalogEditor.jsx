import { useNavigate, useParams } from 'react-router-dom';
import { useResource, useResourceMutation } from '../../hooks/useResource.js';
import ResourceForm from '../../components/ResourceForm.jsx';
import { PageHeader, QueryState } from '../../components/ui.jsx';
import {
  companyFields,
  postingFields,
  driveFields,
} from '../../services/formSpecs.js';
import { useToast } from '../../context/toastContext.js';
export default function CatalogEditor({ kind, create = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const resource =
    kind === 'company'
      ? 'companies'
      : kind === 'posting'
        ? 'job-postings'
        : 'placement-drives';
  const path = create
    ? kind === 'posting'
      ? `/companies/${id}/job-postings`
      : `/${resource}`
    : `/${resource}/${id}`;
  const query = useResource(create ? null : path, undefined, {
    refetchOnWindowFocus: false,
  });
  const branches = useResource('/branches', undefined, {
    enabled: kind === 'drive',
  });
  const mutation = useResourceMutation([
    `/${resource}`,
    path,
    ...(kind === 'posting'
      ? [`/companies/${id}/job-postings`, '/companies']
      : []),
    '/placement-drives',
  ]);
  const fields =
    kind === 'company'
      ? companyFields
      : kind === 'posting'
        ? postingFields
        : driveFields;
  async function save(body) {
    const result = await mutation.mutateAsync({
      path,
      method: create ? 'post' : 'patch',
      body,
    });
    toast('Saved successfully.');
    navigate(
      kind === 'drive'
        ? `/admin/drives/${result.data.id}`
        : kind === 'company'
          ? `/admin/companies/${result.data.id}`
          : `/admin/companies/${result.data.companyId}`,
      { replace: true },
    );
  }
  const form = (
    <ResourceForm
      key={path}
      fields={fields}
      initial={
        create
          ? {}
          : {
              ...query.data?.data,
              eligibleBranchIds: query.data?.data?.eligibleBranches?.map(
                (b) => b.id,
              ),
            }
      }
      branches={branches.data?.data}
      onSave={save}
      pending={mutation.isPending}
      error={mutation.error}
    />
  );
  return (
    <>
      <PageHeader
        title={`${create ? 'Create' : 'Edit'} ${kind === 'posting' ? 'job posting' : kind === 'drive' ? 'placement drive' : 'company'}`}
        description={
          kind === 'drive'
            ? 'Drives start as drafts. Configure rounds and eligibility before publishing.'
            : undefined
        }
      />
      {!create ? (
        <QueryState query={query}>
          {kind === 'drive' ? (
            <QueryState query={branches}>{form}</QueryState>
          ) : (
            form
          )}
        </QueryState>
      ) : kind === 'drive' ? (
        <QueryState query={branches}>{form}</QueryState>
      ) : (
        form
      )}
    </>
  );
}
