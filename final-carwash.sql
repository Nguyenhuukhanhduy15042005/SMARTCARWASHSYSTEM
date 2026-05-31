-- ============================================================
-- DATABASE SCHEMA - SQL Server (T-SQL) - FINAL STANDARDIZED
-- ============================================================

-- ============================================================
-- 1. ROLE
-- ============================================================
CREATE TABLE [ROLE] (
    RoleID      INT             NOT NULL IDENTITY(1,1),
    RoleName    NVARCHAR(50)    NOT NULL UNIQUE, -- 'ADMIN', 'STAFF', 'MEMBER', 'GUEST'
    CONSTRAINT PK_ROLE PRIMARY KEY (RoleID)
);

-- ============================================================
-- 2. LOYALTY_TIER
-- ============================================================
CREATE TABLE LOYALTY_TIER (
    TierID          INT             NOT NULL IDENTITY(1,1),
    TierName        NVARCHAR(100)   NOT NULL,
    RequiredPoints  INT             NOT NULL DEFAULT 0,
    DiscountRate    DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    BookingWindow   INT,
    CONSTRAINT PK_LOYALTY_TIER PRIMARY KEY (TierID)
);

-- ============================================================
-- 3. [USER]
-- ============================================================
CREATE TABLE [USER] (
    UserID      INT             NOT NULL IDENTITY(1,1),
    FullName    NVARCHAR(255)   NOT NULL,
    PhoneNumber NVARCHAR(20)    NOT NULL UNIQUE, 
    Password    NVARCHAR(255)   NULL,     -- NULL nếu là GUEST tạo nhanh tại quầy
    RoleID      INT             NOT NULL, 
    CONSTRAINT PK_USER PRIMARY KEY (UserID),
    CONSTRAINT FK_USER_ROLE FOREIGN KEY (RoleID) REFERENCES [ROLE] (RoleID)
);

-- ============================================================
-- 4. MEMBER_PROFILE (Quan hệ 1-1 mở rộng từ [USER])
-- ============================================================
CREATE TABLE MEMBER_PROFILE (
    UserID             INT          NOT NULL, -- Vừa là PK vừa là FK nối sang [USER]
    TierID             INT          NOT NULL,
    CurrentPoints      INT          NOT NULL DEFAULT 0,
    AccumulatedPoints  INT          NOT NULL DEFAULT 0,
    JoinDate           DATETIME     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_MEMBER_PROFILE PRIMARY KEY (UserID),
    CONSTRAINT FK_MEMPROFILE_USER 
        FOREIGN KEY (UserID) REFERENCES [USER] (UserID) ON DELETE CASCADE,
    CONSTRAINT FK_MEMPROFILE_TIER 
        FOREIGN KEY (TierID) REFERENCES LOYALTY_TIER (TierID)
);

-- ============================================================
-- 5. SERVICE
-- ============================================================
CREATE TABLE SERVICE (
    ServiceID               INT             NOT NULL IDENTITY(1,1),
    ServiceName             NVARCHAR(255)   NOT NULL,
    BasePrice               DECIMAL(12,2)   NOT NULL,
    ApplicableVehicleType   NVARCHAR(100), -- 'CAR' hoặc 'BIKE'
    CONSTRAINT PK_SERVICE PRIMARY KEY (ServiceID)
);

-- ============================================================
-- 6. MACHINE
-- ============================================================
CREATE TABLE MACHINE (
    MachineID   INT             NOT NULL IDENTITY(1,1),
    MachineName NVARCHAR(255)   NOT NULL,
    MachineType NVARCHAR(100),             -- 'CAR_WASHER' hoặc 'BIKE_WASHER'
    Status      TINYINT         NOT NULL DEFAULT 1, -- 1: Idle, 2: Operating, 3: Maintenance
    CONSTRAINT PK_MACHINE PRIMARY KEY (MachineID)
);

-- ============================================================
-- 7. PROMOTION
-- ============================================================
CREATE TABLE PROMOTION (
    PromotionID     INT             NOT NULL IDENTITY(1,1),
    PromoName       NVARCHAR(255)   NOT NULL,
    DiscountPercent DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    EndDate         DATETIME,
    CONSTRAINT PK_PROMOTION PRIMARY KEY (PromotionID)
);

-- ============================================================
-- 8. MEMBER_PROMOTION (Ví chứa Voucher - Cần tạo trước để BOOKING tham chiếu)
-- ============================================================
CREATE TABLE MEMBER_PROMOTION (
    MemberPromoID   INT         NOT NULL IDENTITY(1,1),
    UserID          INT         NOT NULL, -- Trỏ về UserID của Member sở hữu mã
    PromotionID     INT         NOT NULL,
    IsUsed          BIT         NOT NULL DEFAULT 0,
    AcquiredDate    DATETIME    NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_MEMBER_PROMOTION PRIMARY KEY (MemberPromoID),
    CONSTRAINT FK_MEMPROMO_USER
        FOREIGN KEY (UserID)      REFERENCES MEMBER_PROFILE (UserID),
    CONSTRAINT FK_MEMPROMO_PROMO
        FOREIGN KEY (PromotionID) REFERENCES PROMOTION (PromotionID)
);

-- ============================================================
-- 9. BOOKING (Đã bổ sung Khóa ngoại nối sang Ví Voucher của khách)
-- ============================================================
CREATE TABLE BOOKING (
    BookingID       INT             NOT NULL IDENTITY(1,1),
    CustomerID      INT             NOT NULL, -- Trỏ thẳng về [USER] (Đáp ứng cả Guest và Member)
    MemberPromoID   INT             NULL,     -- KHÓA NGOẠI MỚI BỔ SUNG (Cho phép NULL nếu không áp mã)
    BookingDate     DATETIME        NOT NULL DEFAULT GETDATE(),
    CheckInTime     DATETIME,
    VehicleType     NVARCHAR(100),
    LicensePlate    NVARCHAR(20),
    TotalPrice      DECIMAL(12,2),
    FinalPrice      DECIMAL(12,2),
    Status          TINYINT         NOT NULL DEFAULT 1, -- 1: Created, 2: Checked-In, 3: In Progress, 4: Completed, 5: Cancelled
    CONSTRAINT PK_BOOKING PRIMARY KEY (BookingID),
    CONSTRAINT FK_BOOKING_CUSTOMER
        FOREIGN KEY (CustomerID)    REFERENCES [USER] (UserID),
    CONSTRAINT FK_BOOKING_MEMBERPROMO
        FOREIGN KEY (MemberPromoID) REFERENCES MEMBER_PROMOTION (MemberPromoID)
);

-- ============================================================
-- 10. BOOKING_DETAIL
-- ============================================================
CREATE TABLE BOOKING_DETAIL (
    DetailID        INT             NOT NULL IDENTITY(1,1),
    BookingID       INT             NOT NULL,
    ServiceID       INT             NOT NULL,
    MachineID       INT,
    PriceAtBooking  DECIMAL(12,2),
    CONSTRAINT PK_BOOKING_DETAIL PRIMARY KEY (DetailID),
    CONSTRAINT FK_BKDETAIL_BOOKING
        FOREIGN KEY (BookingID)  REFERENCES BOOKING (BookingID) ON DELETE CASCADE,
    CONSTRAINT FK_BKDETAIL_SERVICE
        FOREIGN KEY (ServiceID)  REFERENCES SERVICE (ServiceID),
    CONSTRAINT FK_BKDETAIL_MACHINE
        FOREIGN KEY (MachineID)  REFERENCES MACHINE (MachineID)
);

-- ============================================================
-- 11. PAYMENT
-- ============================================================
CREATE TABLE PAYMENT (
    PaymentID       INT             NOT NULL IDENTITY(1,1),
    BookingID       INT             NOT NULL,
    PaymentMethod   NVARCHAR(100), -- 'CASH', 'MOMO', 'BANK'
    Amount          DECIMAL(12,2)   NOT NULL,
    PaidAt          DATETIME,
    CONSTRAINT PK_PAYMENT PRIMARY KEY (PaymentID),
    CONSTRAINT FK_PAYMENT_BOOKING
        FOREIGN KEY (BookingID) REFERENCES BOOKING (BookingID) ON DELETE CASCADE
);

-- ============================================================
-- 12. FEEDBACK
-- ============================================================
CREATE TABLE FEEDBACK (
    FeedbackID  INT             NOT NULL IDENTITY(1,1),
    BookingID   INT             NOT NULL,
    Rating      INT             CHECK (Rating BETWEEN 1 AND 5),
    Comment     NVARCHAR(1000),
    CreatedDate DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_FEEDBACK PRIMARY KEY (FeedbackID),
    CONSTRAINT FK_FEEDBACK_BOOKING
        FOREIGN KEY (BookingID) REFERENCES BOOKING (BookingID) ON DELETE CASCADE
);

-- ============================================================
-- 13. LOYALTY_TRANSACTION
-- ============================================================
CREATE TABLE LOYALTY_TRANSACTION (
    TransactionID   INT             NOT NULL IDENTITY(1,1),
    UserID          INT             NOT NULL, -- Trỏ về UserID của Member có phát sinh điểm
    BookingID       INT,
    TransactionType NVARCHAR(50),             -- 'EARN' hoặc 'REDEEM'
    Points          INT             NOT NULL,
    CreatedDate     DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_LOYALTY_TRANSACTION PRIMARY KEY (TransactionID),
    CONSTRAINT FK_LOYALTYTX_USER
        FOREIGN KEY (UserID)    REFERENCES MEMBER_PROFILE (UserID),
    CONSTRAINT FK_LOYALTYTX_BOOKING
        FOREIGN KEY (BookingID) REFERENCES BOOKING (BookingID)
);

-- ============================================================
-- 14. MAINTENANCE
-- ============================================================
CREATE TABLE MAINTENANCE (
    MaintenanceID   INT             NOT NULL IDENTITY(1,1),
    MachineID       INT             NOT NULL,
    OperatorID      INT             NOT NULL, -- Trỏ về UserID của STAFF hoặc ADMIN
    Description     NVARCHAR(1000),
    MaintenanceDate DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_MAINTENANCE PRIMARY KEY (MaintenanceID),
    CONSTRAINT FK_MAINTENANCE_MACHINE
        FOREIGN KEY (MachineID)  REFERENCES MACHINE (MachineID),
    CONSTRAINT FK_MAINTENANCE_OPERATOR
        FOREIGN KEY (OperatorID) REFERENCES [USER] (UserID)
);

-- ============================================================
-- 15. SURVEY
-- ============================================================
CREATE TABLE SURVEY (
    SurveyID                INT             NOT NULL IDENTITY(1,1),
    UserID                  INT,
    CustomerSatisfaction    INT,
    UsageFrequency          NVARCHAR(100),
    PreferredFeature        NVARCHAR(255),
    SubmittedAt             DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_SURVEY PRIMARY KEY (SurveyID),
    CONSTRAINT FK_SURVEY_USER
        FOREIGN KEY (UserID) REFERENCES [USER] (UserID) ON DELETE SET NULL
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
