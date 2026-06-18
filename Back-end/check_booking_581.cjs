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
    
    console.log("Booking #581 details:");
    let res = await pool.request().input("id", sql.Int, 581).query(`
      SELECT b.*, u.FullName, u.PhoneNumber 
      FROM BOOKING b
      JOIN [USER] u ON b.CustomerID = u.UserID
      WHERE b.BookingID = @id
    `);
    console.table(res.recordset);

    if (res.recordset.length > 0) {
      const customerId = res.recordset[0].CustomerID;
      console.log(`Customer #${customerId} profile & tier:`);
      let res2 = await pool.request().input("userId", sql.Int, customerId).query(`
        SELECT mp.*, lt.TierName, lt.DiscountRate
        FROM MEMBER_PROFILE mp
        LEFT JOIN LOYALTY_TIER lt ON mp.TierID = lt.TierID
        WHERE mp.UserID = @userId
      `);
      console.table(res2.recordset);
    }

    await sql.close();
  } catch (err) {
    console.error("Database query failed:", err.message);
  }
}

main();
