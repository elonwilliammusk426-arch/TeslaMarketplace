const helmet = require('helmet');
function securityMiddleware(app) { app.disable('x-powered-by'); app.use(helmet()); }
function requireConfiguredDatabase(req,res,next) { if (process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL) return res.status(503).json({error:'Service is not configured for production'}); next(); }
module.exports={securityMiddleware,requireConfiguredDatabase};
