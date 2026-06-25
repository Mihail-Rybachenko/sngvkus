import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';

export const recipesRouter = Router();

/** null = ещё не проверяли; после первого запроса к БД кэшируется */
let recipesConstructorJsonColumn = null;

async function recipesHasConstructorJsonColumn(pool) {
  if (recipesConstructorJsonColumn !== null) return recipesConstructorJsonColumn;
  try {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'recipes'
         AND COLUMN_NAME = 'constructor_json'`
    );
    recipesConstructorJsonColumn = Number(row?.cnt) > 0;
  } catch {
    recipesConstructorJsonColumn = false;
  }
  return recipesConstructorJsonColumn;
}

function stringifyConstructorFromBody(body) {
  const ctor =
    body.recipeConstructor && typeof body.recipeConstructor === 'object' && !Array.isArray(body.recipeConstructor)
      ? body.recipeConstructor
      : Object.prototype.hasOwnProperty.call(body, 'constructor') &&
          body.constructor &&
          typeof body.constructor === 'object' &&
          !Array.isArray(body.constructor)
        ? body.constructor
        : null;
  return ctor ? JSON.stringify(ctor) : null;
}

async function getRecipeByProject(pool, projectId) {
  const hasCtor = await recipesHasConstructorJsonColumn(pool);
  const ctorSelect = hasCtor ? ', constructor_json' : '';
  const [[recipe]] = await pool.query(
    `SELECT id, project_id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant${ctorSelect}, created_at, updated_at
     FROM recipes
     WHERE project_id = :projectId
     ORDER BY id DESC
     LIMIT 1`,
    { projectId }
  );
  return recipe || null;
}

async function recipeDto(pool, recipeRow) {
  const [premixRows] = await pool.query(
    `SELECT p.id, p.name, p.price
     FROM recipe_premixes rp
     JOIN premixes p ON p.id = rp.premix_id
     WHERE rp.recipe_id = :recipeId
     ORDER BY p.name ASC`,
    { recipeId: recipeRow.id }
  );

  const [compositionRows] = premixRows.length
    ? await pool.query(
        `SELECT premix_id, element_name, value
         FROM premix_composition
         WHERE premix_id IN (${premixRows.map(() => '?').join(',')})
         ORDER BY premix_id ASC, id ASC`,
        premixRows.map((p) => p.id)
      )
    : [[], []];

  const compositionByPremix = new Map();
  for (const r of compositionRows) {
    if (!compositionByPremix.has(r.premix_id)) compositionByPremix.set(r.premix_id, {});
    compositionByPremix.get(r.premix_id)[r.element_name] = Number(r.value);
  }

  const [microRows] = await pool.query(
    'SELECT element_name, value FROM recipe_microelements WHERE recipe_id = :recipeId ORDER BY id ASC',
    { recipeId: recipeRow.id }
  );
  const microelements = {};
  for (const r of microRows) microelements[r.element_name] = Number(r.value);

  const [issueRows] = await pool.query(
    'SELECT issue_text FROM recipe_compliance_issues WHERE recipe_id = :recipeId ORDER BY id ASC',
    { recipeId: recipeRow.id }
  );

  let constructor = null;
  if (recipeRow.constructor_json) {
    try {
      constructor = JSON.parse(recipeRow.constructor_json);
    } catch {
      constructor = null;
    }
  }

  return {
    id: String(recipeRow.id),
    productType: recipeRow.product_type,
    constructor,
    premixes: premixRows.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      composition: compositionByPremix.get(p.id) || {},
    })),
    nutritionalValue: {
      calories: Number(recipeRow.calories),
      proteins: Number(recipeRow.proteins),
      fats: Number(recipeRow.fats),
      carbohydrates: Number(recipeRow.carbohydrates),
      microelements,
    },
    compliance: {
      trts021: !!recipeRow.trts021_compliant,
      issues: issueRows.map((x) => x.issue_text),
    },
  };
}

// Get recipe by project
recipesRouter.get('/projects/:projectId/recipe', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: false });

    const recipe = await getRecipeByProject(pool, projectId);
    if (!recipe) throw httpError(404, 'Recipe not found');
    res.json(await recipeDto(pool, recipe));
  } catch (e) {
    next(e);
  }
});

// Create or replace recipe by project
recipesRouter.put('/projects/:projectId/recipe', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });
    if (req.auth.role === 'expert') {
      throw httpError(403, 'Рецептуру сохраняют студент или координатор');
    }
    if (!['analysis', 'recipe'].includes(project.status || '')) {
      throw httpError(400, 'Этап рецептуры пока недоступен');
    }

    const [[analysisExists]] = await pool.query(
      'SELECT id FROM analysis_data WHERE project_id=:projectId LIMIT 1',
      { projectId }
    );
    if (!analysisExists) throw httpError(400, 'Сначала выполните этап анализа данных');

    const body = req.body || {};
    const productType = body.productType;
    const nv = body.nutritionalValue || {};
    const compliance = body.compliance || {};
    const premixIds = Array.isArray(body.premixIds) ? body.premixIds : (body.premixes?.map((p) => p.id) ?? []);
    const microelements = nv.microelements && typeof nv.microelements === 'object' ? nv.microelements : {};
    const issues = Array.isArray(compliance.issues) ? compliance.issues : [];
    const constructor = stringifyConstructorFromBody(body);
    const hasCtorCol = await recipesHasConstructorJsonColumn(pool);

    if (!productType) throw httpError(400, 'productType is required');
    for (const k of ['calories', 'proteins', 'fats', 'carbohydrates']) {
      if (typeof nv[k] !== 'number') throw httpError(400, `${k} must be a number`);
    }

    // Upsert: if exists -> update, else insert
    const existing = await getRecipeByProject(pool, projectId);
    let recipeId;
    if (existing) {
      recipeId = existing.id;
      if (hasCtorCol) {
        await pool.query(
          `UPDATE recipes
           SET product_type=:product_type, calories=:calories, proteins=:proteins, fats=:fats, carbohydrates=:carbohydrates, trts021_compliant=:trts021, constructor_json=:constructor_json
           WHERE id=:id`,
          {
            id: recipeId,
            product_type: productType,
            calories: nv.calories,
            proteins: nv.proteins,
            fats: nv.fats,
            carbohydrates: nv.carbohydrates,
            trts021: compliance.trts021 ? 1 : 0,
            constructor_json: constructor,
          }
        );
      } else {
        await pool.query(
          `UPDATE recipes
           SET product_type=:product_type, calories=:calories, proteins=:proteins, fats=:fats, carbohydrates=:carbohydrates, trts021_compliant=:trts021
           WHERE id=:id`,
          {
            id: recipeId,
            product_type: productType,
            calories: nv.calories,
            proteins: nv.proteins,
            fats: nv.fats,
            carbohydrates: nv.carbohydrates,
            trts021: compliance.trts021 ? 1 : 0,
          }
        );
      }
      // Clear relations to re-insert
      await pool.query('DELETE FROM recipe_premixes WHERE recipe_id=:recipeId', { recipeId });
      await pool.query('DELETE FROM recipe_microelements WHERE recipe_id=:recipeId', { recipeId });
      await pool.query('DELETE FROM recipe_compliance_issues WHERE recipe_id=:recipeId', { recipeId });
    } else {
      const [ins] = hasCtorCol
        ? await pool.query(
            `INSERT INTO recipes (project_id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant, constructor_json)
             VALUES (:project_id,:product_type,:calories,:proteins,:fats,:carbohydrates,:trts021,:constructor_json)`,
            {
              project_id: projectId,
              product_type: productType,
              calories: nv.calories,
              proteins: nv.proteins,
              fats: nv.fats,
              carbohydrates: nv.carbohydrates,
              trts021: compliance.trts021 ? 1 : 0,
              constructor_json: constructor,
            }
          )
        : await pool.query(
            `INSERT INTO recipes (project_id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant)
             VALUES (:project_id,:product_type,:calories,:proteins,:fats,:carbohydrates,:trts021)`,
            {
              project_id: projectId,
              product_type: productType,
              calories: nv.calories,
              proteins: nv.proteins,
              fats: nv.fats,
              carbohydrates: nv.carbohydrates,
              trts021: compliance.trts021 ? 1 : 0,
            }
          );
      recipeId = ins.insertId;
    }

    // Insert premixes
    for (const premixId of premixIds) {
      if (!premixId) continue;
      await pool.query(
        'INSERT INTO recipe_premixes (recipe_id, premix_id) VALUES (:recipe_id, :premix_id)',
        { recipe_id: recipeId, premix_id: premixId }
      );
    }

    // Insert microelements
    for (const [element_name, value] of Object.entries(microelements)) {
      await pool.query(
        'INSERT INTO recipe_microelements (recipe_id, element_name, value) VALUES (:recipe_id,:element_name,:value)',
        { recipe_id: recipeId, element_name, value: Number(value) || 0 }
      );
    }

    // Insert issues
    for (const issue_text of issues) {
      if (!issue_text) continue;
      await pool.query(
        'INSERT INTO recipe_compliance_issues (recipe_id, issue_text) VALUES (:recipe_id,:issue_text)',
        { recipe_id: recipeId, issue_text: String(issue_text) }
      );
    }

    // Move status forward if needed
    await pool.query('UPDATE projects SET status = :status WHERE id = :projectId AND status IN (\'analysis\',\'draft\')', {
      status: 'recipe',
      projectId,
    });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    await createNotifications(pool, {
      userIds: [studentId, expertId, coordinatorId].filter(Boolean),
      projectId,
      type: 'expert_review',
      message: 'Рецептура сохранена.',
    });

    const ctorSel = hasCtorCol ? ', constructor_json' : '';
    const [[saved]] = await pool.query(
      `SELECT id, project_id, product_type, calories, proteins, fats, carbohydrates, trts021_compliant${ctorSel}, created_at, updated_at FROM recipes WHERE id=:id`,
      { id: recipeId }
    );

    res.json(await recipeDto(pool, saved));
  } catch (e) {
    next(e);
  }
});

