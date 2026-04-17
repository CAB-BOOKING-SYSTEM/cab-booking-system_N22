import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
})
// Test kết nối khi khởi tạo pool
pool.on('connect', () => {
  console.log('✅ Database connected successfully!')
})
 
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err)
})
 
// Test kết nối ngay lập tức
try {
  const result = await pool.query('SELECT NOW()')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║          ✅ DATABASE CONNECTION SUCCESSFUL             ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`📋 Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
  console.log(`👤 User: ${process.env.DB_USER}`)
  console.log(`🕐 Server time: ${result.rows[0].now}`)
  console.log('╔════════════════════════════════════════════════════════╝')
} catch (error) {
  console.error('╔════════════════════════════════════════════════════════╗')
  console.error('║        ❌ DATABASE CONNECTION FAILED                  ║')
  console.error('╚════════════════════════════════════════════════════════╝')
  console.error('Error:', error.message)
  process.exit(1)
}
 
export default pool
