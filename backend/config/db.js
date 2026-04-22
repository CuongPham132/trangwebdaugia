const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 5000,  // Connection timeout: 5s
    requestTimeout: 10000,    // Query timeout: 10s
  },
  pool: {
    min: 1,
    max: 10,
  },
};

// Hàm kết nối DB
const connectDB = async () => {
  try {
    // Use sql.connect for global connection pool
    console.log('🔌 Connecting to SQL Server:', {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
    });
    
    await sql.connect(config);
    console.log('✅ Connected to SQL Server');
    
    // Test connection
    const result = await sql.query`SELECT 1 as test`;
    console.log('✅ DB test query successful:', result.recordset);
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
    console.error('❌ Full error:', err);
    throw err;
  }
};

module.exports = { sql, connectDB };