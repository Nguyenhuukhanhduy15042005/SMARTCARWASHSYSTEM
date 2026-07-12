// Back-end/routes/user.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { sql, poolPromise } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

// HEAD (main): Lấy thông tin cá nhân của người dùng hiện tại (dùng token)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId).query(`
        SELECT UserID, FullName, Email, PhoneNumber, RoleID
        FROM [USER]
        WHERE UserID = @userId
      `);
    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }
    const profile = result.recordset[0];
    if (profile.PhoneNumber && profile.PhoneNumber.startsWith("G-")) {
      profile.PhoneNumber = "";
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// HEAD (main): Cập nhật thông tin cá nhân của người dùng hiện tại (dùng token)
router.put("/me", verifyToken, async (req, res) => {
  const { fullName, phone, email, newPassword } = req.body;

  // Xác thực định dạng số điện thoại ở backend
  if (!phone) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập số điện thoại liên hệ!" });
  }
  const phoneRegex = /^(0[35789])[0-9]{8}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message:
        "Số điện thoại không hợp lệ! Định dạng đúng gồm 10 chữ số di động Việt Nam.",
    });
  }

  try {
    const pool = await poolPromise;

    const checkDuplicate = await pool
      .request()
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("userId", sql.Int, req.user.userId).query(`
        SELECT UserID, RoleID FROM [USER]
        WHERE (PhoneNumber = @phone OR Email = @email)
        AND UserID != @userId
      `);

    if (checkDuplicate.recordset.length > 0) {
      console.log("checkDuplicate.recordset:", checkDuplicate.recordset);
      const hasNonGuest = checkDuplicate.recordset.some((u) => u.RoleID !== 4);
      if (hasNonGuest) {
        return res.status(400).json({
          message: "Email hoặc Số điện thoại đã được người khác sử dụng!",
        });
      }

      // Ghép toàn bộ tài khoản vãng lai trùng lặp (RoleID = 4)
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const dupUser of checkDuplicate.recordset) {
          const request = transaction.request();
          request.input("userId", sql.Int, req.user.userId);
          request.input("dupUserId", sql.Int, dupUser.UserID);

          // 1. Chuyển BOOKING
          await request.query(`
            UPDATE BOOKING 
            SET CustomerID = @userId 
            WHERE CustomerID = @dupUserId
          `);

          // 2. Chuyển VEHICLE
          await request.query(`
            UPDATE VEHICLE 
            SET UserID = @userId 
            WHERE UserID = @dupUserId
          `);

          // 3. Chuyển SURVEY
          await request.query(`
            UPDATE SURVEY 
            SET UserID = @userId 
            WHERE UserID = @dupUserId
          `);

          // 4. Xóa MEMBER_PROFILE của khách vãng lai nếu có
          await request.query(`
            DELETE FROM MEMBER_PROFILE 
            WHERE UserID = @dupUserId
          `);

          // 5. Xóa USER khách vãng lai
          await request.query(`
            DELETE FROM [USER] 
            WHERE UserID = @dupUserId
          `);
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        return res
          .status(500)
          .json({ message: "Lỗi ghép tài khoản vãng lai: " + err.message });
      }
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool
        .request()
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .input("password", sql.NVarChar, hashedPassword)
        .input("userId", sql.Int, req.user.userId).query(`
          UPDATE [USER]
          SET FullName = @fullName, PhoneNumber = @phone, Email = @email, Password = @password
          WHERE UserID = @userId
        `);
    } else {
      await pool
        .request()
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .input("userId", sql.Int, req.user.userId).query(`
          UPDATE [USER]
          SET FullName = @fullName, PhoneNumber = @phone, Email = @email
          WHERE UserID = @userId
        `);
    }

    res.json({ message: "Cập nhật thông tin thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// HEAD (main): Lấy danh sách toàn bộ người dùng kèm theo tên vai trò (chỉ Admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1) {
    return res
      .status(403)
      .json({ message: "Chỉ admin mới được xem danh sách người dùng!" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT 
          u.UserID AS id, 
          u.FullName AS name, 
          u.Email AS email, 
          u.PhoneNumber AS phone, 
          u.RoleID AS roleId,
          COALESCE(r.RoleName, 'MEMBER') AS roleName
        FROM [USER] u
        LEFT JOIN [ROLE] r ON u.RoleID = r.RoleID
        ORDER BY u.UserID DESC
      `);

    const users = result.recordset.map((u) => {
      if (u.phone && u.phone.startsWith("G-")) {
        u.phone = "";
      }
      return u;
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// PUT /api/users/:userId/role
// Cập nhật vai trò người dùng (Chỉ Admin)
router.put("/:userId/role", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1) {
    return res
      .status(403)
      .json({ message: "Chỉ admin mới được thực hiện hành động này!" });
  }

  const userId = parseInt(req.params.userId, 10);
  const { roleId } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({ message: "UserID không hợp lệ!" });
  }

  if (roleId === undefined || isNaN(parseInt(roleId, 10))) {
    return res.status(400).json({ message: "Vai trò không hợp lệ!" });
  }

  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("roleId", sql.Int, roleId)
      .query("UPDATE [USER] SET RoleID = @roleId WHERE UserID = @userId");

    res.json({ message: "Cập nhật vai trò thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// booking-Customer: Lấy thông tin cá nhân (Profile & Loyalty points & Tier)
router.get("/profile", async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.query.userId || 12; // Mặc định userId = 12 cho mục đích test trực tiếp

    const result = await pool.request().input("userId", sql.Int, userId).query(`
                SELECT 
                    u.UserID, 
                    u.FullName, 
                    u.PhoneNumber, 
                    u.Email,
                    COALESCE(mp.CurrentPoints, 0) AS CurrentPoints, 
                    COALESCE(mp.AccumulatedPoints, 0) AS AccumulatedPoints, 
                    COALESCE(lt.TierName, N'Bronze') AS TierName, 
                    COALESCE(lt.DiscountRate, 0) AS DiscountRate
                FROM [USER] u
                LEFT JOIN MEMBER_PROFILE mp ON u.UserID = mp.UserID
                LEFT JOIN LOYALTY_TIER lt ON mp.TierID = lt.TierID
                WHERE u.UserID = @userId
            `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }
    const profile = result.recordset[0];
    if (profile.PhoneNumber && profile.PhoneNumber.startsWith("G-")) {
      profile.PhoneNumber = "";
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const FullName =
      req.body.FullName !== undefined ? req.body.FullName : req.body.fullName;
    const Email =
      req.body.Email !== undefined ? req.body.Email : req.body.email;
    const PhoneNumber =
      req.body.PhoneNumber !== undefined
        ? req.body.PhoneNumber
        : req.body.phoneNumber !== undefined
          ? req.body.phoneNumber
          : req.body.phone;
    const UserID = req.body.UserID || req.body.userId || 12;

    const pool = await poolPromise;

    // Fetch current user data to fallback if not provided
    const userRes = await pool
      .request()
      .input("userId", sql.Int, UserID)
      .query(
        "SELECT FullName, Email, PhoneNumber FROM [USER] WHERE UserID = @userId",
      );

    if (userRes.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    const currentUser = userRes.recordset[0];
    const finalFullName =
      FullName !== undefined && FullName !== null
        ? FullName
        : currentUser.FullName;
    const finalEmail =
      Email !== undefined && Email !== null ? Email : currentUser.Email;
    const finalPhoneNumber =
      PhoneNumber !== undefined && PhoneNumber !== null
        ? PhoneNumber
        : currentUser.PhoneNumber;

    await pool
      .request()
      .input("userId", sql.Int, UserID)
      .input("fullName", sql.NVarChar, finalFullName)
      .input("email", sql.NVarChar, finalEmail)
      .input("phoneNumber", sql.NVarChar, finalPhoneNumber).query(`
        UPDATE [USER]
        SET FullName = @fullName, Email = @email, PhoneNumber = @phoneNumber
        WHERE UserID = @userId
      `);
    res.json({ message: "Cập nhật thông tin cá nhân thành công!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/members
// Lấy danh sách toàn bộ thành viên kèm theo thông tin hạng thành viên và tích điểm (Admin & Staff)
router.get("/members", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1 && req.user.roleId !== 2) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền thực hiện hành động này!" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        u.UserID AS id, 
        u.FullName AS name, 
        u.PhoneNumber AS phone, 
        u.Email AS email,
        COALESCE(mp.CurrentPoints, 0) AS currentPoints, 
        COALESCE(mp.AccumulatedPoints, 0) AS accumulatedPoints, 
        COALESCE(lt.TierID, 1) AS tierId,
        COALESCE(lt.TierName, N'Bronze') AS tierName, 
        COALESCE(lt.DiscountRate, 0) AS discountRate
      FROM [USER] u
      LEFT JOIN [ROLE] r ON u.RoleID = r.RoleID
      LEFT JOIN MEMBER_PROFILE mp ON u.UserID = mp.UserID
      LEFT JOIN LOYALTY_TIER lt ON mp.TierID = lt.TierID
      WHERE u.RoleID = 3 OR u.RoleID IS NULL OR r.RoleName = 'MEMBER'
      ORDER BY u.FullName ASC
    `);

    const members = result.recordset.map((m) => {
      if (m.phone && m.phone.startsWith("G-")) {
        m.phone = "";
      }
      return m;
    });

    res.json(members);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// PUT /api/users/members/:userId/tier
// Cập nhật hạng thành viên và tích điểm của khách hàng (Admin & Staff)
router.put("/members/:userId/tier", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1 && req.user.roleId !== 2) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền thực hiện hành động này!" });
  }

  const userId = parseInt(req.params.userId, 10);
  const { currentPoints, accumulatedPoints, tierId } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({ message: "UserID không hợp lệ!" });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra xem đã có bản ghi MEMBER_PROFILE chưa
    const profileCheck = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT UserID FROM MEMBER_PROFILE WHERE UserID = @userId");

    if (profileCheck.recordset.length === 0) {
      // Nếu chưa có, tiến hành INSERT
      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("tierId", sql.Int, tierId || 1)
        .input("currentPoints", sql.Int, currentPoints || 0)
        .input("accumulatedPoints", sql.Int, accumulatedPoints || 0).query(`
          INSERT INTO MEMBER_PROFILE (UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate)
          VALUES (@userId, @tierId, @currentPoints, @accumulatedPoints, GETDATE())
        `);
    } else {
      // Nếu đã có, tiến hành UPDATE
      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("tierId", sql.Int, tierId)
        .input("currentPoints", sql.Int, currentPoints)
        .input("accumulatedPoints", sql.Int, accumulatedPoints).query(`
          UPDATE MEMBER_PROFILE
          SET TierID = @tierId,
              CurrentPoints = @currentPoints,
              AccumulatedPoints = @accumulatedPoints
          WHERE UserID = @userId
        `);
    }

    res.json({ message: "Cập nhật hạng thành viên thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// GET /api/users/tiers
// Lấy danh sách toàn bộ các hạng (Tiers) cấu hình sẵn
router.get("/tiers", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT * FROM LOYALTY_TIER ORDER BY RequiredPoints ASC");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// DELETE /api/users/:userId
// Xóa tài khoản hệ thống (Chỉ Admin)
router.delete("/:userId", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1) {
    return res
      .status(403)
      .json({ message: "Chỉ admin mới được thực hiện hành động này!" });
  }

  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "UserID không hợp lệ!" });
  }

  if (userId === req.user.userId) {
    return res
      .status(400)
      .json({ message: "Bạn không thể tự xóa tài khoản của chính mình!" });
  }

  try {
    const pool = await poolPromise;

    // Check if user exists
    const userCheck = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT UserID, RoleID FROM [USER] WHERE UserID = @userId");

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = transaction.request();
      request.input("userId", sql.Int, userId);

      // 1. Delete LOYALTY_TRANSACTION (to release reference to BOOKING)
      await request.query(
        "DELETE FROM LOYALTY_TRANSACTION WHERE UserID = @userId",
      );

      // 2. Delete payments belonging to the user's bookings
      await request.query(`
        DELETE FROM PAYMENT 
        WHERE BookingID IN (SELECT BookingID FROM BOOKING WHERE CustomerID = @userId)
      `);

      // 3. Delete booking details
      await request.query(`
        DELETE FROM BOOKING_DETAIL 
        WHERE BookingID IN (SELECT BookingID FROM BOOKING WHERE CustomerID = @userId)
      `);

      // 3b. Delete feedbacks belonging to the user's bookings
      await request.query(`
        DELETE FROM FEEDBACK 
        WHERE BookingID IN (SELECT BookingID FROM BOOKING WHERE CustomerID = @userId)
      `);

      // 4. Delete bookings (to release reference to MEMBER_PROMOTION)
      await request.query("DELETE FROM BOOKING WHERE CustomerID = @userId");

      // 5. Delete MEMBER_PROMOTION (wallet)
      await request.query(
        "DELETE FROM MEMBER_PROMOTION WHERE UserID = @userId",
      );

      // 6. Delete MEMBER_PROFILE
      await request.query("DELETE FROM MEMBER_PROFILE WHERE UserID = @userId");

      // 7. Delete SURVEY
      await request.query("DELETE FROM SURVEY WHERE UserID = @userId");

      // 8. Delete VEHICLE
      await request.query("DELETE FROM VEHICLE WHERE UserID = @userId");

      // 8b. Delete NOTIFICATION
      await request.query("DELETE FROM NOTIFICATION WHERE UserID = @userId");

      // 9. Finally delete [USER]
      await request.query("DELETE FROM [USER] WHERE UserID = @userId");

      await transaction.commit();
      res.json({ message: "Xóa tài khoản thành công!" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Lỗi khi xóa tài khoản:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi xóa tài khoản: " + err.message });
  }
});

module.exports = router;
