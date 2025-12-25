# Инструкция по установке базы данных SngVkus

## Требования

- MySQL 5.7+ или MariaDB 10.2+
- Права на создание баз данных и таблиц

## Быстрая установка

### Вариант 1: Через командную строку

```bash
# Войдите в MySQL
mysql -u root -p

# Или выполните скрипт напрямую
mysql -u root -p < database/sngvkus_schema.sql
```

### Вариант 2: Через MySQL Workbench

1. Откройте MySQL Workbench
2. Подключитесь к серверу MySQL
3. File → Open SQL Script → выберите `database/sngvkus_schema.sql`
4. Выполните скрипт (Execute или F5)

### Вариант 3: Через phpMyAdmin

1. Откройте phpMyAdmin
2. Перейдите на вкладку "SQL"
3. Скопируйте содержимое файла `database/sngvkus_schema.sql`
4. Вставьте в текстовое поле и нажмите "Выполнить"

## Проверка установки

После выполнения скрипта проверьте, что база данных создана:

```sql
SHOW DATABASES LIKE 'sngvkus';
USE sngvkus;
SHOW TABLES;
```

Должны быть созданы следующие таблицы:
- users
- projects
- analysis_data
- micro_elements
- analysis_deficiencies
- premixes
- premix_composition
- recipes
- recipe_premixes
- recipe_microelements
- recipe_compliance_issues
- packaging_designs
- presentations
- comments
- notifications

## Проверка предустановленных данных

```sql
USE sngvkus;
SELECT * FROM premixes;
SELECT * FROM premix_composition;
```

Должно быть 5 премиксов с их составами.

## Настройка пользователя базы данных (опционально)

Для продакшена рекомендуется создать отдельного пользователя:

```sql
-- Создать пользователя
CREATE USER 'sngvkus_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Выдать права на базу данных
GRANT ALL PRIVILEGES ON sngvkus.* TO 'sngvkus_user'@'localhost';

-- Применить изменения
FLUSH PRIVILEGES;
```

## Подключение из приложения

Используйте следующие параметры подключения:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sngvkus
DB_USER=root  # или sngvkus_user
DB_PASSWORD=your_password
```

## Удаление базы данных

Если нужно удалить базу данных и начать заново:

```sql
DROP DATABASE IF EXISTS sngvkus;
```

Затем выполните скрипт установки снова.

## Примечания

- Скрипт использует `UUID()` для генерации ID в примерах. В MySQL 8.0+ эта функция доступна по умолчанию.
- Для MySQL 5.7 может потребоваться установка плагина `uuid` или использование альтернативных методов генерации UUID.
- Все таблицы используют кодировку `utf8mb4` для поддержки эмодзи и специальных символов.
- Внешние ключи настроены с каскадным удалением для связанных данных.

