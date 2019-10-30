const helmet = require('helmet');
const uuid_v4 = require('uuid');
module.exports = function csp(app) {
  app.use((req, res, next) => {
    res.locals.nonce = Buffer.from(uuid_v4()).toString('base64');
    next();
  });

  const nonce = (req, res) => `'nonce-${res.locals.nonce}'`;

  const whiteList = ['https://*.ridi.io', 'https://*.ridibooks.com'];

  const scriptSrc = [nonce, "'strict-dynamic'", "'self'", ...whiteList];
  const styleSrc = ["'self'", "'unsafe-inline'", ...whiteList];

  if (process.env.NODE_ENV !== 'production') {
    scriptSrc.push("'unsafe-eval'");
  } else {
    // styleSrc.push(nonce);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          baseUri: ["'none'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", 'https://*.amazonaws.com', ...whiteList],
          frameSrc: ['staticxx.facebook.com', 'connect.facebook.net'],
          styleSrc,
          scriptSrc,
          connectSrc: [
            "'self'",
            'sentry.io',
            'www.google-analytics.com',
            'stats.g.doubleclick.net',
            'www.facebook.com',
            'https://*.amazonaws.com',
            ...whiteList,
          ],
          reportUri: `https://sentry.io/api/1402572/security/?sentry_key=a0a997382844435fa6c89803ef6ce8e5&sentry_environment=${process.env.NODE_ENV};`,
        },
      },
    }),
  );
};
