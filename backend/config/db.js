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
  },
};

// Hàm kết nối DB
const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log('✅ Connected to SQL Server');
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
  }
};

module.exports = { sql, connectDB };