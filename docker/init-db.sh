#!/usr/bin/env bash
set -euo pipefail

# 1. Tự động tìm đường dẫn sqlcmd (V17, V18 hoặc Path đều chạy được)
if [ -f "/opt/mssql-tools18/bin/sqlcmd" ]; then
    SQLCMD_BIN="/opt/mssql-tools18/bin/sqlcmd"
elif [ -f "/opt/mssql-tools/bin/sqlcmd" ]; then
    SQLCMD_BIN="/opt/mssql-tools/bin/sqlcmd"
else
    SQLCMD_BIN="sqlcmd"
fi

echo "Using sqlcmd at: $SQLCMD_BIN"

# 2. Đợi SQL Server khởi động
echo "Waiting for SQL Server..."
for i in {1..50}; do
    # Thêm tham số -C (Trust Server Certificate) để tránh lỗi SSL ở bản v18
    if "$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" -C >/dev/null 2>&1; then
        echo "SQL Server is ready."
        break
    fi
    echo "Still waiting for SQL Server... ($i/50)"
    sleep 3
done

# 3. Tạo User auction_user và Database (Nếu chưa có)
echo "Creating User and Database..."
"$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '$DB_NAME') CREATE DATABASE [$DB_NAME];
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '$DB_USER') 
    CREATE LOGIN [$DB_USER] WITH PASSWORD = '$DB_PASSWORD';
GO
USE [$DB_NAME];
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$DB_USER')
    CREATE USER [$DB_USER] FOR LOGIN [$DB_USER];
ALTER ROLE db_owner ADD MEMBER [$DB_USER];"

# 4. Chạy lần lượt các file SQL theo thứ tự chuẩn
# Hỗ trợ cả 2 kiểu tên file:
# - Không prefix: dau_gia.sql
# - Có prefix:    01_dau_gia.sql
ORDERED_BASE_FILES=("dau_gia.sql" "ADD_TRANSACTION_FEATURES.sql" "FIX_sp_PayOrder.sql" "MIGRATION_ADD_VERSION_COLUMN.sql")

for BASE_FILE in "${ORDERED_BASE_FILES[@]}"; do
    PREFIXED_FILE=""
    case "$BASE_FILE" in
        "dau_gia.sql") PREFIXED_FILE="01_dau_gia.sql" ;;
        "ADD_TRANSACTION_FEATURES.sql") PREFIXED_FILE="02_ADD_TRANSACTION_FEATURES.sql" ;;
        "FIX_sp_PayOrder.sql") PREFIXED_FILE="03_FIX_sp_PayOrder.sql" ;;
        "MIGRATION_ADD_VERSION_COLUMN.sql") PREFIXED_FILE="04_MIGRATION_ADD_VERSION_COLUMN.sql" ;;
    esac

    RESOLVED_FILE=""
    if [ -n "$PREFIXED_FILE" ] && [ -f "/scripts/$PREFIXED_FILE" ]; then
        RESOLVED_FILE="/scripts/$PREFIXED_FILE"
    elif [ -f "/scripts/$BASE_FILE" ]; then
        RESOLVED_FILE="/scripts/$BASE_FILE"
    fi

    if [ -n "$RESOLVED_FILE" ]; then
        echo "Running: $(basename "$RESOLVED_FILE")..."
        "$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -d "$DB_NAME" -i "$RESOLVED_FILE" -C
    else
        echo "Error: Missing required SQL file for $BASE_FILE"
        echo "Expected one of: /scripts/$BASE_FILE or /scripts/$PREFIXED_FILE"
        exit 1
    fi
done

# 5. Verify schema quan trọng đã được tạo
PRODUCT_TABLE_EXISTS=$("$SQLCMD_BIN" -S db -U sa -P "$MSSQL_SA_PASSWORD" -d "$DB_NAME" -C -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.tables WHERE name='product';")

if [ "${PRODUCT_TABLE_EXISTS:-0}" -lt 1 ]; then
    echo "Error: table 'product' was not created. Database initialization failed."
    exit 1
fi

echo "✅ All scripts executed successfully and required tables verified!"