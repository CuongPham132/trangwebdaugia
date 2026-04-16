#!/usr/bin/env bash
set -euo pipefail

SQLCMD_BIN=""
if [ -x "/opt/mssql-tools18/bin/sqlcmd" ]; then
  SQLCMD_BIN="/opt/mssql-tools18/bin/sqlcmd"
elif [ -x "/opt/mssql-tools/bin/sqlcmd" ]; then
  SQLCMD_BIN="/opt/mssql-tools/bin/sqlcmd"
else
  echo "sqlcmd not found in expected locations"
  exit 1
fi

TARGET_DB_NAME="${DB_NAME:-dau_gia}"

echo "Waiting for SQL Server to accept connections..."
for i in {1..40}; do
  if "$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" >/dev/null 2>&1; then
    echo "SQL Server is ready."
    break
  fi
  echo "SQL Server not ready yet ($i/40), retrying..."
  sleep 3
done

EXISTING_DB_ID=$("$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -h -1 -W -Q "SET NOCOUNT ON; SELECT DB_ID(N'${TARGET_DB_NAME}')" | tr -d '[:space:]')
if [ -n "$EXISTING_DB_ID" ] && [ "$EXISTING_DB_ID" != "NULL" ]; then
  echo "Database ${TARGET_DB_NAME} already exists. Skipping initialization script."
  exit 0
fi

echo "Running database script dau_gia.sql..."
"$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -i /scripts/dau_gia.sql

echo "Database initialization completed."
