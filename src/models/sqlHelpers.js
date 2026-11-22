/**
 * Builds "col1 = ?, col2 = ?" plus its values for a partial UPDATE.
 * Column names come only from the allowedColumns whitelist (never from user
 * input), and every value goes through a ? placeholder.
 */
function buildSetClause(fields, allowedColumns) {
  const columns = allowedColumns.filter((column) => fields[column] !== undefined);
  return {
    clause: columns.map((column) => `${column} = ?`).join(', '),
    values: columns.map((column) => fields[column]),
  };
}

module.exports = { buildSetClause };
