require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    console.log('');
    console.log('🔄 Testing PostgreSQL Connection...');
    console.log('=====================================');
    console.log('Configuration:');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Port:', process.env.DB_PORT);
    console.log('   Database:', process.env.DB_DATABASE);
    console.log('   Username:', process.env.DB_USERNAME);
    console.log('   SSL:', process.env.DB_SSL);
    console.log('=====================================');
    console.log('');

    console.log('⏳ Connecting to database...');
    await client.connect();
    console.log('✅ Connection Success!');
    console.log('');

    // Test query
    const result = await client.query('SELECT NOW() as time, version()');
    console.log('📊 Server Information:');
    console.log('   Server Time:', result.rows[0].time);
    console.log('   PostgreSQL:', result.rows[0].version.split(',')[0]);
    console.log('');

    // Check database
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log('💾 Connection Details:');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);
    console.log('');

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tables Status:');
    if (tables.rows.length === 0) {
      console.log('   ⚠️  No tables found');
      console.log('   ℹ️  Tables will be auto-created when backend starts');
    } else {
      console.log('   ✅ Found', tables.rows.length, 'existing tables:');
      tables.rows.forEach(row => console.log('      -', row.table_name));
    }
    console.log('');

    await client.end();
    
    console.log('=====================================');
    console.log('✅ Test Complete!');
    console.log('=====================================');
    console.log('');
    console.log('Next step: npm run start:dev');
    console.log('');
    
  } catch (err) {
    console.error('');
    console.error('=====================================');
    console.error('❌ Connection Failed!');
    console.error('=====================================');
    console.error('');
    console.error('Error Message:', err.message);
    console.error('');
    
    if (err.message.includes('password authentication failed')) {
      console.error('💡 Solution:');
      console.error('   Check DB_USERNAME and DB_PASSWORD in .env file');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.error('💡 Solution:');
      console.error('   Check DB_HOST and DB_PORT in .env file');
    } else if (err.message.includes('database') && err.message.includes('does not exist')) {
      console.error('💡 Solution:');
      console.error('   Create database "iot_monitoring" in pgAdmin first');
    }
    
    console.error('');
    process.exit(1);
  }
}

testConnection();