/** HTTP adaptation only: services own authorization-dependent rules and all business decisions. */
export function endpoint(
  action,
  { status = 200, paginated = false, envelope = false } = {},
) {
  return async (req, res) => {
    const result = await action(
      req.user,
      req.validated?.params || {},
      req.validated?.body,
      req.validated?.query,
    );
    if (status === 204) return res.status(204).end();
    res.status(status).json({
      success: true,
      ...(paginated || envelope ? result : { data: result }),
    });
  };
}
