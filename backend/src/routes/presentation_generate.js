import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';

export const presentationGenerateRouter = Router();

function slide(id, title, content, type = 'content') {
  return { id, title, content, type };
}

presentationGenerateRouter.post('/projects/:projectId/presentation/generate', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });
    if (!['packaging', 'presentation', 'expert_review', 'completed'].includes(project.status || '')) {
      throw httpError(400, 'Генерация презентации пока недоступна');
    }

    const [[packagingExists]] = await pool.query(
      'SELECT id FROM packaging_designs WHERE project_id=:projectId LIMIT 1',
      { projectId }
    );
    if (!packagingExists) throw httpError(400, 'Сначала выполните этап упаковки');

    const [[projRow]] = await pool.query(
      `SELECT p.id, p.name, p.status,
              s.name as student_name, s.email as student_email,
              e.name as expert_name, e.email as expert_email
       FROM projects p
       JOIN users s ON s.id = p.student_id
       LEFT JOIN users e ON e.id = p.expert_id
       WHERE p.id=:projectId`,
      { projectId }
    );

    const [[analysisRow]] = await pool.query(
      'SELECT id, file_name, uploaded_at FROM analysis_data WHERE project_id=:projectId ORDER BY id DESC LIMIT 1',
      { projectId }
    );
    const [defRows] = analysisRow
      ? await pool.query(
          'SELECT element_name FROM analysis_deficiencies WHERE analysis_id=:analysisId ORDER BY id ASC',
          { analysisId: analysisRow.id }
        )
      : [[], []];

    const [[recipeRow]] = await pool.query(
      `SELECT id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant
       FROM recipes WHERE project_id=:projectId ORDER BY id DESC LIMIT 1`,
      { projectId }
    );
    const [premixRows] = recipeRow
      ? await pool.query(
          `SELECT p.name
           FROM recipe_premixes rp
           JOIN premixes p ON p.id = rp.premix_id
           WHERE rp.recipe_id=:recipeId
           ORDER BY p.name ASC`,
          { recipeId: recipeRow.id }
        )
      : [[], []];

    const slides = [
      slide(
        'slide-1',
        projRow?.name || `Проект ${projectId}`,
        [
          'Персонализированное питание: от микроэлементного анализа до готовой рецептуры, макета упаковки и презентации в одном проекте.',
          `Исполнитель: ${projRow?.student_name || projRow?.student_email || '—'}${projRow?.expert_name ? `; куратор: ${projRow.expert_name}` : ''}.`,
        ],
        'title'
      ),
      slide('slide-2', 'Проблема', [
        'Дефициты железа, цинка, кальция и других микроэлементов на фоне типичного рациона встречаются у разных возрастных групп и влияют на самочувствие, иммунитет и концентрацию внимания.',
        'Покупателю сложно сопоставить «свой» микроэлементный статус с конкретным продуктом на полке: составы массовых брендов не персонализированы.',
        'Цикл «анализ → рецептура → этикетка → питч» часто размазан по разным сервисам и специалистам, что удлиняет вывод концепции на рынок.',
      ]),
      slide('slide-3', 'Решение платформы', [
        'Единый сценарий: загрузка анализа, расчёт дефицитов и избытков, подбор премиксов, расчёт КБЖУ, оформление лицевой и оборотной стороны упаковки, генерация презентации.',
        'Шаблоны упаковки и типовые проверки по ТР ТС 021/2011 снижают рутину на ранних этапах и делают проект воспроизводимым.',
        'Все артефакты хранятся в карточке проекта — удобно для отчётности перед куратором, инвестором или производством.',
      ]),
      slide(
        'slide-4',
        'Результаты анализа',
        analysisRow
          ? [
              `Загруженный файл: ${analysisRow.file_name}; дата загрузки: ${new Date(analysisRow.uploaded_at).toLocaleString('ru-RU')}.`,
              defRows.length
                ? `Выявлены дефициты по элементам: ${defRows.map((d) => d.element_name).join(', ')} — далее в рецептуре учитывается обогащение и формулировки на обороте.`
                : 'Явных дефицитов по загруженным данным не зафиксировано; при необходимости уточните состав файла или повторите расчёт.',
              'Графики и таблицы в интерфейсе анализа помогают объяснить выбор направления обогащения и доз премиксов.',
            ]
          : [
              'Файл анализа в проекте отсутствует: для полноценной истории загрузите CSV/данные анализа на этапе «Анализ данных».',
              'После загрузки система выделит дефициты и предложит связку с рецептурой и текстом на упаковке.',
            ]
      ),
      slide(
        'slide-5',
        'Рецептура и состав',
        recipeRow
          ? [
              `Тип продукта: ${recipeRow.product_type}; энергетическая ценность и КБЖУ: ${Number(recipeRow.calories)} ккал; белки ${Number(recipeRow.proteins)} г; жиры ${Number(recipeRow.fats)} г; углеводы ${Number(recipeRow.carbohydrates)} г.`,
              `Премиксы в рецепте: ${premixRows.length ? premixRows.map((p) => p.name).join(', ') : 'не указаны — при необходимости добавьте в конструкторе рецепта'}.`,
              `Соответствие основным требованиям ТР ТС 021/2011: ${recipeRow.trts021_compliant ? 'отмечено как соответствующее' : 'есть замечания — доработайте состав или маркировку до финализации'}.`,
            ]
          : [
              'Рецептура в проекте ещё не сохранена: сформируйте продукт в конструкторе рецепта, чтобы на слайде отразились КБЖУ и премиксы.',
            ]
      ),
      slide('slide-6', 'Упаковка и коммуникация', [
        'Двусторонний редактор: лицевая сторона под «витрину» и бренд, оборот — состав, пищевая ценность и обогащение по данным анализа.',
        'Экспорт в PNG/PDF и подстановка макета в первый слайд презентации сохраняют визуальную связку между дизайном и питчем.',
        'Готовый макет можно использовать в переговорах с ритейлом и производством как единый визуальный якорь продукта.',
      ]),
      slide('slide-7', 'Рынок и каналы', [
        'Целевые сегменты: семьи с детьми, аудитория ЗОЖ, спорт и образование — там, где важны понятные нутриентные обоснования и доверие к составу.',
        'Каналы: маркетплейсы, специализированный ритейл, B2B в школы и фитнес, корпоративные программы здоровья.',
        'Персонализированная история (анализ → продукт) отстраивает концепцию от массовых снеков без привязки к микроэлементному профилю.',
      ]),
      slide('slide-8', 'Дорожная карта', [
        'Пилот: ограниченная партия или фокус-группа, проверка вкуса, читаемости этикетки и восприятия бренда.',
        'Регуляторная и производственная валидация: уточнение спецификаций, MOQ, сроков годности и контрольных норм.',
        'Масштабирование: расширение линейки вкусов и форматов на той же платформе анализа и рецептурных расчётов.',
      ], 'conclusion'),
    ];

    const templateId = (req.body?.templateId && String(req.body.templateId)) || 'template-8';

    const slides_data = JSON.stringify(slides);

    const [[existing]] = await pool.query(
      'SELECT id FROM presentations WHERE project_id=:projectId ORDER BY id DESC LIMIT 1',
      { projectId }
    );
    let id;
    if (existing) {
      id = existing.id;
      await pool.query('UPDATE presentations SET template_id=:template_id, slides_data=:slides_data WHERE id=:id', {
        id,
        template_id: templateId,
        slides_data,
      });
    } else {
      const [ins] = await pool.query(
        'INSERT INTO presentations (project_id, template_id, slides_data) VALUES (:project_id,:template_id,:slides_data)',
        { project_id: projectId, template_id: templateId, slides_data }
      );
      id = ins.insertId;
    }

    await pool.query('UPDATE projects SET status=:status WHERE id=:projectId AND status IN (\'packaging\',\'presentation\')', {
      status: 'presentation',
      projectId,
    });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    await createNotifications(pool, {
      userIds: [studentId, expertId, coordinatorId].filter(Boolean),
      projectId,
      type: 'expert_review',
      message: 'Презентация сгенерирована.',
    });

    res.json({ id: String(id), templateId, slides });
  } catch (e) {
    next(e);
  }
});

