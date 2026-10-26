import { formatDate } from '../utils/dates.js';
export default function RecruitmentView({ recruitment, warnings = [] }) {
  return (
    <section className="panel mt-6">
      <h2 className="mb-5 text-xl font-semibold">
        Recruitment timeline & checklist
      </h2>
      {warnings.map((warning) => (
        <p key={warning.code} role="status" className="notice">
          {warning.code === 'RECRUITMENT_DATA_UNAVAILABLE'
            ? 'Recruitment information is temporarily unavailable. Drive information is still available. Try refreshing shortly.'
            : 'Recruitment information has not been configured yet.'}
        </p>
      ))}
      {!recruitment && !warnings.length && (
        <p>No recruitment process configured.</p>
      )}
      {recruitment && (
        <>
          <ol className="space-y-5">
            {recruitment.rounds.map((round) => (
              <li
                key={round.roundNumber}
                className="border-l-2 border-sky-200 pl-5"
              >
                <h3 className="font-semibold">
                  {round.roundNumber}. {round.roundName}
                </h3>
                <p className="text-sm text-slate-500">
                  {round.roundType.replaceAll('_', ' ')} · {round.mode} ·{' '}
                  {formatDate(round.scheduledAt)}
                </p>
                <p className="whitespace-pre-wrap">{round.description}</p>
                {Object.keys(round.details || {}).length > 0 && (
                  <dl className="mt-2 text-sm">
                    {Object.entries(round.details).map(([key, value]) => (
                      <div key={key}>
                        <dt className="inline font-semibold">{key}: </dt>
                        <dd className="inline break-words">
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ol>
          <h3 className="mt-6 font-semibold">Documents to prepare</h3>
          <p className="mb-3 text-sm text-slate-500">
            Informational checklist. Documents are not uploaded here.
          </p>
          <ul className="list-inside list-disc">
            {recruitment.requiredDocuments.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
          {Object.keys(recruitment.additionalRequirements || {}).length > 0 && (
            <details className="mt-4">
              <summary>Additional requirements</summary>
              <pre className="whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(recruitment.additionalRequirements, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </section>
  );
}
