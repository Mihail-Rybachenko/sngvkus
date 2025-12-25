-- ============================================================================
-- ПРИМЕРЫ ЗАПРОСОВ ДЛЯ БАЗЫ ДАННЫХ SngVkus
-- ============================================================================

USE sngvkus;

-- ============================================================================
-- 1. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

-- Создание студента
INSERT INTO users (email, password_hash, role, name, team) VALUES
('student@example.com', '$2y$10$example_hash', 'student', 'Иван Иванов', 'Команда А');

-- Создание эксперта
INSERT INTO users (email, password_hash, role, name) VALUES
('expert@example.com', '$2y$10$example_hash', 'expert', 'Мария Петрова');

-- Создание координатора
INSERT INTO users (email, password_hash, role, name) VALUES
('coordinator@example.com', '$2y$10$example_hash', 'coordinator', 'Алексей Сидоров');

-- ============================================================================
-- 2. СОЗДАНИЕ ПРОЕКТА
-- ============================================================================

-- Получить ID студента
SET @student_id = (SELECT id FROM users WHERE email = 'student@example.com' LIMIT 1);

-- Создать проект
INSERT INTO projects (name, status, student_id) VALUES
('Здоровые чипсы с железом', 'draft', @student_id);

-- ============================================================================
-- 3. ДОБАВЛЕНИЕ АНАЛИЗА ДАННЫХ
-- ============================================================================

-- Получить ID проекта
SET @project_id = (SELECT id FROM projects WHERE name = 'Здоровые чипсы с железом' LIMIT 1);

-- Создать запись анализа
INSERT INTO analysis_data (project_id, file_name) VALUES
(@project_id, 'analysis_2024.csv');
SET @analysis_id = LAST_INSERT_ID();

-- Добавить микроэлементы
INSERT INTO micro_elements (analysis_id, name, value, norm, unit, deficiency) VALUES
(@analysis_id, 'Железо', 12.5, 15.0, 'мг/кг', TRUE),
(@analysis_id, 'Цинк', 8.2, 10.0, 'мг/кг', TRUE),
(@analysis_id, 'Кальций', 850.0, 1000.0, 'мг/кг', TRUE),
(@analysis_id, 'Магний', 400.0, 400.0, 'мг/кг', FALSE);

-- Добавить дефицитные элементы
INSERT INTO analysis_deficiencies (analysis_id, element_name) VALUES
(@analysis_id, 'Железо'),
(@analysis_id, 'Цинк'),
(@analysis_id, 'Кальций');

-- Обновить статус проекта
UPDATE projects SET status = 'analysis' WHERE id = @project_id;

-- ============================================================================
-- 4. СОЗДАНИЕ РЕЦЕПТУРЫ
-- ============================================================================

-- Создать рецептуру
INSERT INTO recipes (project_id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant) VALUES
(@project_id, 'chips', 520.0, 6.0, 30.0, 58.0, FALSE);
SET @recipe_id = LAST_INSERT_ID();

-- Добавить премиксы к рецептуре
INSERT INTO recipe_premixes (recipe_id, premix_id) VALUES
(@recipe_id, 'premix-iron'),
(@recipe_id, 'premix-zinc');

-- Добавить микроэлементы рецептуры
INSERT INTO recipe_microelements (recipe_id, element_name, value) VALUES
(@recipe_id, 'железо', 15.0),
(@recipe_id, 'цинк', 12.0),
(@recipe_id, 'витамин_C', 10.0),
(@recipe_id, 'витамин_A', 5.0);

-- Добавить проблемы соответствия
INSERT INTO recipe_compliance_issues (recipe_id, issue_text) VALUES
(@recipe_id, 'Железо: 15.00 мг/кг на верхней границе нормы');

-- Обновить статус проекта
UPDATE projects SET status = 'recipe' WHERE id = @project_id;

-- ============================================================================
-- 5. СОЗДАНИЕ ДИЗАЙНА УПАКОВКИ
-- ============================================================================

INSERT INTO packaging_designs (project_id, template_id, canvas_data) VALUES
(@project_id, 'template-1', '{"objects": [], "background": "#4CAF50"}');

-- Обновить статус проекта
UPDATE projects SET status = 'packaging' WHERE id = @project_id;

-- ============================================================================
-- 6. СОЗДАНИЕ ПРЕЗЕНТАЦИИ
-- ============================================================================

INSERT INTO presentations (project_id, template_id, slides_data) VALUES
(@project_id, 'demo-day', '{"slides": [{"title": "Проект", "content": "..."}]}');

-- Обновить статус проекта
UPDATE projects SET status = 'presentation' WHERE id = @project_id;

-- ============================================================================
-- 7. НАЗНАЧЕНИЕ ЭКСПЕРТА И ПЕРЕХОД НА ЭКСПЕРТИЗУ
-- ============================================================================

SET @expert_id = (SELECT id FROM users WHERE email = 'expert@example.com' LIMIT 1);

UPDATE projects 
SET expert_id = @expert_id, status = 'expert_review' 
WHERE id = @project_id;

-- ============================================================================
-- 8. ДОБАВЛЕНИЕ КОММЕНТАРИЯ ЭКСПЕРТА
-- ============================================================================

INSERT INTO comments (project_id, author_id, text, type) VALUES
(@project_id, @expert_id, 'Рецептура соответствует требованиям. Одобрено.', 'expert');

-- ============================================================================
-- 9. ОДОБРЕНИЕ ПРОЕКТА
-- ============================================================================

-- Обновить статус на завершен
UPDATE projects SET status = 'completed' WHERE id = @project_id;

-- Создать уведомление для студента
INSERT INTO notifications (user_id, project_id, type, message) VALUES
(@student_id, @project_id, 'project_approved', 'Ваш проект "Здоровые чипсы с железом" одобрен!');

-- ============================================================================
-- 10. ПОЛУЧЕНИЕ ДАННЫХ ПРОЕКТА С ВСЕМИ СВЯЗЯМИ
-- ============================================================================

SELECT 
    p.id,
    p.name,
    p.status,
    s.name AS student_name,
    s.email AS student_email,
    e.name AS expert_name,
    c.name AS coordinator_name,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN users s ON p.student_id = s.id
LEFT JOIN users e ON p.expert_id = e.id
LEFT JOIN users c ON p.coordinator_id = c.id
WHERE p.id = @project_id;

-- Получить анализ данных проекта
SELECT 
    ad.id,
    ad.file_name,
    ad.uploaded_at,
    COUNT(me.id) AS elements_count,
    COUNT(ad2.id) AS deficiencies_count
FROM analysis_data ad
LEFT JOIN micro_elements me ON ad.id = me.analysis_id
LEFT JOIN analysis_deficiencies ad2 ON ad.id = ad2.analysis_id
WHERE ad.project_id = @project_id
GROUP BY ad.id;

-- Получить рецептуру проекта
SELECT 
    r.id,
    r.product_type,
    r.calories,
    r.proteins,
    r.fats,
    r.carbohydrates,
    r.trts021_compliant,
    GROUP_CONCAT(p.name) AS premixes
FROM recipes r
LEFT JOIN recipe_premixes rp ON r.id = rp.recipe_id
LEFT JOIN premixes p ON rp.premix_id = p.id
WHERE r.project_id = @project_id
GROUP BY r.id;

-- Получить комментарии проекта
SELECT 
    c.id,
    c.text,
    c.type,
    c.created_at,
    u.name AS author_name,
    u.role AS author_role
FROM comments c
JOIN users u ON c.author_id = u.id
WHERE c.project_id = @project_id
ORDER BY c.created_at DESC;

-- ============================================================================
-- 11. ПОЛУЧЕНИЕ ПРОЕКТОВ ПО РОЛИ ПОЛЬЗОВАТЕЛЯ
-- ============================================================================

-- Проекты студента
SELECT * FROM projects WHERE student_id = @student_id;

-- Проекты на экспертизе (для эксперта)
SELECT * FROM projects 
WHERE status = 'expert_review' 
AND expert_id = @expert_id;

-- Все проекты (для координатора)
SELECT * FROM projects ORDER BY created_at DESC;

-- ============================================================================
-- 12. ПОЛУЧЕНИЕ УВЕДОМЛЕНИЙ
-- ============================================================================

SELECT 
    n.id,
    n.type,
    n.message,
    n.is_read,
    n.created_at,
    p.name AS project_name
FROM notifications n
JOIN projects p ON n.project_id = p.id
WHERE n.user_id = @student_id
ORDER BY n.created_at DESC;

-- Отметить уведомление как прочитанное
UPDATE notifications SET is_read = TRUE WHERE id = @notification_id;

-- ============================================================================
-- 13. СТАТИСТИКА
-- ============================================================================

-- Количество проектов по статусам
SELECT status, COUNT(*) AS count 
FROM projects 
GROUP BY status;

-- Количество проектов по типам продуктов
SELECT r.product_type, COUNT(*) AS count 
FROM recipes r 
GROUP BY r.product_type;

-- Средняя пищевая ценность по типам продуктов
SELECT 
    product_type,
    AVG(calories) AS avg_calories,
    AVG(proteins) AS avg_proteins,
    AVG(fats) AS avg_fats,
    AVG(carbohydrates) AS avg_carbohydrates
FROM recipes
GROUP BY product_type;

-- ============================================================================
-- КОНЕЦ ПРИМЕРОВ
-- ============================================================================

