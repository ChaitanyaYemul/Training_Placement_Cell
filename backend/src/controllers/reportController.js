/** Shape the report as a JSON envelope or a downloadable CSV attachment. */
export function reportController(service, name) {
  return async (req, res) => {
    const query = req.validated.query;
    const result = await service.get(name, query);
    if (query.format === 'csv') {
      res.set(
        'Content-Disposition',
        `attachment; filename="placement-${name}.csv"`,
      );
      res.type('text/csv').send(result);
    } else res.json({ success: true, ...result });
  };
}
