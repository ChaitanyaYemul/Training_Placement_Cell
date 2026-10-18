import { resourceRepository } from './resourceRepository.js';
export function catalogRepositories(pool) {
  const companies = resourceRepository(pool, 'companies'),
    postings = resourceRepository(pool, 'job_postings');
  companies.listVisible = async (user, query) => {
    const clauses = [],
      values = [];
    if (user.role === 'student') clauses.push('r.is_active = 1');
    else if (query.isActive !== undefined) {
      clauses.push('r.is_active = ?');
      values.push(query.isActive);
    }
    return companies.list(query, clauses, values);
  };
  postings.listVisible = async (user, companyId, query, postingId) => {
    const clauses = ['r.company_id = ?'],
      values = [companyId];
    if (postingId) {
      clauses.push('r.id = ?');
      values.push(postingId);
    }
    if (user.role === 'student')
      clauses.push(
        "r.is_active = 1 AND EXISTS (SELECT 1 FROM placement_drives AS d WHERE d.job_posting_id = r.id AND d.status IN ('published','completed','cancelled'))",
      );
    else if (query.isActive !== undefined) {
      clauses.push('r.is_active = ?');
      values.push(query.isActive);
    }
    return postings.list(query, clauses, values);
  };
  return { companies, postings };
}
