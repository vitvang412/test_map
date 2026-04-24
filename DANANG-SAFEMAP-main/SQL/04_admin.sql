-- 04_seed_admin.sql
USE DaNangSafeMap;
INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive)
VALUES (
    'Nguyễn Thanh Hằng', 
    'hang290806@danang.gov.vn', 
    '$2a$12$JPDmarWajaDUEfNYbQfEReNrUfmqKUFn6OIK3UsR3jrbJPMjIF6Lu', 
    'Admin', 
    TRUE
);