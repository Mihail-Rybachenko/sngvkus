-- Опциональные параметры конструктора рецептуры (тип, база, термообработка и т.д.) для упаковки и отчётов
ALTER TABLE recipes
  ADD COLUMN constructor_json TEXT NULL
  AFTER trts021_compliant;
