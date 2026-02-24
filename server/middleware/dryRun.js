/**
 * DRY RUN MIDDLEWARE
 * Standardizes the pattern for dry-run capabilities across the API.
 * If the 'x-dry-run' header is present and true, req.isDryRun is set.
 * Controllers should check this flag and, if true, perform validation
 * and return a success response without actually committing to the database.
 */
const dryRun = (req, res, next) => {
  if (req.headers['x-dry-run'] === 'true') {
    req.isDryRun = true;
  }
  next();
};

module.exports = dryRun;
