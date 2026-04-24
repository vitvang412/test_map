-- 03_create_indexes.sql
USE DaNangSafeMap;

CREATE INDEX idx_users_email    ON Users(Email);
CREATE INDEX idx_users_googleid ON Users(GoogleId);
CREATE INDEX idx_users_role     ON Users(Role);