const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "12345",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_DATABASE || "SMARTCARWASHSYSTEM",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  try {
    const pool = await sql.connect(dbConfig);
    
    console.log("Listing all triggers in database:");
    let res = await pool.request().query(`
      SELECT name, OBJECT_NAME(parent_id) AS parent_table, is_disabled 
      FROM sys.triggers
    `);
    console.table(res.recordset);

    for (const trigger of res.recordset) {
      console.log(`\nTrigger SQL Definition for [${trigger.name}]:`);
      let resDef = await pool.request().input("name", sql.NVarChar, trigger.name).query(`
        SELECT definition 
        FROM sys.sql_modules 
        WHERE object_id = OBJECT_ID(@name)
      `);
      if (resDef.recordset.length > 0) {
        console.log(resDef.recordset[0].definition);
      }
    }

    await sql.close();
  } catch (err) {
    console.error("Database query failed:", err.message);
  }
}

main();
