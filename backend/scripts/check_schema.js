import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ayush_fhir',
    user: 'postgres',
    password: 'hardik999'
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'doctors'
            ORDER BY ordinal_position
        `);

        console.log('Doctors table schema:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
