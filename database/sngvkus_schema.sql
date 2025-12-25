-- ============================================================================
-- База данных для системы SngVkus
-- Платформа для создания персонализированных продуктов питания
-- ============================================================================

-- Создание базы данных
CREATE DATABASE IF NOT EXISTS sngvkus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sngvkus;

-- ============================================================================
-- ТАБЛИЦА: users (Пользователи)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'expert', 'coordinator') NOT NULL,
    name VARCHAR(255),
    team VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: projects (Проекты)
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status ENUM('draft', 'analysis', 'recipe', 'packaging', 'presentation', 'expert_review', 'completed') NOT NULL DEFAULT 'draft',
    student_id INT NOT NULL,
    expert_id INT NULL,
    coordinator_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_expert (expert_id),
    INDEX idx_coordinator (coordinator_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: analysis_data (Данные анализа CSV)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analysis_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: micro_elements (Микроэлементы из анализа)
-- ============================================================================
CREATE TABLE IF NOT EXISTS micro_elements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    norm DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    deficiency BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (analysis_id) REFERENCES analysis_data(id) ON DELETE CASCADE,
    INDEX idx_analysis (analysis_id),
    INDEX idx_deficiency (deficiency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: analysis_deficiencies (Дефицитные элементы)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analysis_deficiencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (analysis_id) REFERENCES analysis_data(id) ON DELETE CASCADE,
    INDEX idx_analysis (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: premixes (Премиксы для обогащения)
-- ============================================================================
CREATE TABLE IF NOT EXISTS premixes (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: premix_composition (Состав премиксов)
-- ============================================================================
CREATE TABLE IF NOT EXISTS premix_composition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    premix_id VARCHAR(20) NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (premix_id) REFERENCES premixes(id) ON DELETE CASCADE,
    INDEX idx_premix (premix_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: recipes (Рецептуры)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    product_type ENUM('chips', 'flakes', 'snacks', 'crackers') NOT NULL,
    calories DECIMAL(10, 2) NOT NULL,
    proteins DECIMAL(10, 2) NOT NULL,
    fats DECIMAL(10, 2) NOT NULL,
    carbohydrates DECIMAL(10, 2) NOT NULL,
    trts021_compliant BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_product_type (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: recipe_premixes (Связь рецептур и премиксов)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipe_premixes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    premix_id VARCHAR(20) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (premix_id) REFERENCES premixes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_recipe_premix (recipe_id, premix_id),
    INDEX idx_recipe (recipe_id),
    INDEX idx_premix (premix_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: recipe_microelements (Микроэлементы в рецептуре)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipe_microelements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe (recipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: recipe_compliance_issues (Проблемы соответствия ТР ТС 021/2011)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipe_compliance_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    issue_text TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe (recipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: packaging_designs (Дизайны упаковки)
-- ============================================================================
CREATE TABLE IF NOT EXISTS packaging_designs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    canvas_data LONGTEXT NOT NULL COMMENT 'JSON данные для Fabric.js',
    exported_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: presentations (Презентации)
-- ============================================================================
CREATE TABLE IF NOT EXISTS presentations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    slides_data LONGTEXT NOT NULL COMMENT 'JSON данные слайдов',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: comments (Комментарии)
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    author_id INT NOT NULL,
    text TEXT NOT NULL,
    type ENUM('expert', 'coordinator', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_author (author_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ТАБЛИЦА: notifications (Уведомления)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    project_id INT NOT NULL,
    type ENUM('project_created', 'expert_review', 'recipe_approved', 'recipe_rejected', 'project_approved') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    INDEX idx_read (is_read),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ВСТАВКА БАЗОВЫХ ДАННЫХ: Премиксы
-- ============================================================================

-- Премикс железо
INSERT INTO premixes (id, name, price) VALUES 
('premix-iron', 'Премикс железо', 150.00);

INSERT INTO premix_composition (premix_id, element_name, value) VALUES
('premix-iron', 'железо', 15.0),
('premix-iron', 'витамин_C', 10.0);

-- Премикс цинк
INSERT INTO premixes (id, name, price) VALUES 
('premix-zinc', 'Премикс цинк', 180.00);

INSERT INTO premix_composition (premix_id, element_name, value) VALUES
('premix-zinc', 'цинк', 12.0),
('premix-zinc', 'витамин_A', 5.0);

-- Премикс кальций
INSERT INTO premixes (id, name, price) VALUES 
('premix-calcium', 'Премикс кальций', 200.00);

INSERT INTO premix_composition (premix_id, element_name, value) VALUES
('premix-calcium', 'кальций', 1200.0),
('premix-calcium', 'витамин_D', 8.0);

-- Премикс магний
INSERT INTO premixes (id, name, price) VALUES 
('premix-magnesium', 'Премикс магний', 170.00);

INSERT INTO premix_composition (premix_id, element_name, value) VALUES
('premix-magnesium', 'магний', 450.0),
('premix-magnesium', 'витамин_B6', 6.0);

-- Комплексный премикс
INSERT INTO premixes (id, name, price) VALUES 
('premix-complex', 'Комплексный премикс', 350.00);

INSERT INTO premix_composition (premix_id, element_name, value) VALUES
('premix-complex', 'железо', 8.0),
('premix-complex', 'цинк', 6.0),
('premix-complex', 'кальций', 600.0),
('premix-complex', 'магний', 200.0),
('premix-complex', 'витамин_C', 15.0),
('premix-complex', 'витамин_D', 5.0);

-- ============================================================================
-- КОНЕЦ СКРИПТА
-- ============================================================================

