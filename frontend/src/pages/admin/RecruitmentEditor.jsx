import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useResource } from '../../hooks/useResource.js';
import { PageHeader, QueryState } from '../../components/ui.jsx';
import RecruitmentForm from './RecruitmentForm.jsx';
export default function RecruitmentEditor() {
  const { id } = useParams();
  const [revision, setRevision] = useState(0);
  const query = useResource(`/placement-drives/${id}/rounds`, undefined, {
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <PageHeader
        title="Rounds & schedule"
        description="Save the complete recruitment plan. A published drive must retain at least one round."
      />
      <QueryState query={query}>
        <RecruitmentForm
          key={`${id}-${revision}`}
          id={id}
          initial={query.data?.data}
          reload={async () => {
            const result = await query.refetch();
            if (result.isSuccess) setRevision((value) => value + 1);
          }}
        />
      </QueryState>
    </>
  );
}
