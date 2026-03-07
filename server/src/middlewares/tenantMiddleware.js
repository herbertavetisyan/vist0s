export const tenantMiddleware = (req, res, next) => {
    // Ensure the tenantId exists either on the user or the partner
    const tenantId = req.user?.tenantId || req.partner?.tenantId;

    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant Context Missing' });
    }

    // Attach tenantId to req for downstream use
    req.tenantId = tenantId;
    next();
};
