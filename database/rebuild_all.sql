-- Полная пересборка БД sngvkus (с удалением всех таблиц через DROP DATABASE)
-- Запускать из корня проекта:
-- mysql -u root -p < database/rebuild_all.sql
-- или в mysql-клиенте: SOURCE database/rebuild_all.sql;

DROP DATABASE IF EXISTS sngvkus;
CREATE DATABASE sngvkus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sngvkus;

-- Базовая схема (все таблицы проекта + базовые данные)
SOURCE database/sngvkus_schema.sql;

-- Миграция анализа волос:
-- - subject_profile_key
-- - актуальные интервалы по полу/возрасту
-- - интерпретации дефицита/избытка
SOURCE database/migration_hair_micro_norms.sql;

-- На случай повторных запусков оставляем актуальный справочник только из миграции
TRUNCATE TABLE hair_micro_norms;
SOURCE database/migration_hair_micro_norms.sql;
