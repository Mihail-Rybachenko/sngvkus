import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';
import {
  resolveElementKey,
  fetchHairNorm,
  classifyAgainstRef,
} from '../hairNorms.js';

export const analysisRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const SUBJECT_PROFILES = {
  male_0_4: { sex: 'male', ageMin: 0, ageMax: 4, label: 'Мальчики/мужчины 0-4' },
  female_0_4: { sex: 'female', ageMin: 0, ageMax: 4, label: 'Девочки/женщины 0-4' },
  male_5_11: { sex: 'male', ageMin: 5, ageMax: 11, label: 'Мальчики 5-11' },
  female_5_11: { sex: 'female', ageMin: 5, ageMax: 11, label: 'Девочки 5-11' },
  male_12_17: { sex: 'male', ageMin: 12, ageMax: 17, label: 'Мальчики 12-17' },
  female_12_17: { sex: 'female', ageMin: 12, ageMax: 17, label: 'Девочки 12-17' },
  male_18_plus: { sex: 'male', ageMin: 18, ageMax: 120, label: 'Мужчины 18+' },
  female_18_plus: { sex: 'female', ageMin: 18, ageMax: 120, label: 'Женщины 18+' },
};

function resolveProfile(input) {
  const key = String(input || '').trim();
  const p = SUBJECT_PROFILES[key];
  if (!p) return null;
  return { key, ...p, ageMid: Math.floor((p.ageMin + p.ageMax) / 2) };
}

function buildAnalysisResponse({ id, file_name, uploaded_at, subject_age, subject_sex, subject_profile_key, elements }) {
  const deficiencies = elements
    .filter((el) => el.balance_status === 'deficit' || el.deficiency)
    .map((el) => {
      const r = `${el.name}: ${Number(el.value).toFixed(4)} ${el.unit} (референс ${Number(el.ref_min).toFixed(4)}–${Number(el.ref_max).toFixed(4)} ${el.unit})`;
      return el.consequence_text ? `${r}. ${el.consequence_text}` : r;
    });

  const surpluses = elements
    .filter((el) => el.balance_status === 'surplus')
    .map((el) => {
      const r = `${el.name}: ${Number(el.value).toFixed(4)} ${el.unit} (референс ${Number(el.ref_min).toFixed(4)}–${Number(el.ref_max).toFixed(4)} ${el.unit})`;
      return el.consequence_text ? `${r}. ${el.consequence_text}` : r;
    });

  return {
    id: String(id),
    fileName: file_name,
    uploadedAt: new Date(uploaded_at).toISOString(),
    subjectAge: subject_age != null ? Number(subject_age) : null,
    subjectSex: subject_sex || null,
    subjectProfile: subject_profile_key || null,
    elements: elements.map((e) => ({
      name: e.name,
      elementKey: resolveElementKey(e.name) || null,
      value: Number(e.value),
      norm: Number(e.norm),
      refMin: e.ref_min != null ? Number(e.ref_min) : null,
      refMax: e.ref_max != null ? Number(e.ref_max) : null,
      unit: e.unit,
      deficiency: !!e.deficiency,
      surplus: e.balance_status === 'surplus',
      balanceStatus: e.balance_status || (e.deficiency ? 'deficit' : 'normal'),
      consequenceText: e.consequence_text || null,
    })),
    deficiencies,
    surpluses,
    charts: [
      {
        type: 'bar',
        labels: elements.map((e) => e.name),
        values: elements.map((e) => Number(e.value)),
        title: 'Значения микроэлементов',
      },
    ],
  };
}

function mapRowsToElements(data) {
  const normalize = (s) =>
    (s ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_]/gu, '');

  const synonyms = {
    name: new Set(['name', 'element', 'microelement', 'микроэлемент', 'элемент', 'показатель', 'наименование']),
    value: new Set(['value', 'val', 'result', 'значение', 'факт', 'уровень', 'результат']),
    norm: new Set(['norm', 'normal', 'reference', 'норма', 'референс', 'эталон', 'min', 'минимум']),
    unit: new Set(['unit', 'units', 'ед', 'единица', 'едизмерения', 'ед_измерения', 'единицы', 'изм']),
  };

  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  const keyByKind = { name: null, value: null, norm: null, unit: null };

  for (const k of keys) {
    const nk = normalize(k);
    for (const kind of Object.keys(keyByKind)) {
      if (keyByKind[kind]) continue;
      if (synonyms[kind].has(nk)) keyByKind[kind] = k;
    }
  }

  if (!keyByKind.name || !keyByKind.value) {
    if (keys.length >= 3) {
      keyByKind.name = keyByKind.name || keys[0];
      keyByKind.value = keyByKind.value || keys[1];
      keyByKind.unit = keyByKind.unit || keys[2];
    } else if (keys.length >= 4) {
      keyByKind.name = keyByKind.name || keys[0];
      keyByKind.value = keyByKind.value || keys[1];
      keyByKind.norm = keyByKind.norm || keys[2];
      keyByKind.unit = keyByKind.unit || keys[3];
    } else {
      throw httpError(
        400,
        'Не удалось распознать колонки CSV. Нужны: название и значение; единицы — третья колонка (или заголовки по-русски).'
      );
    }
  }

  return data
    .map((row) => {
      const name = (row[keyByKind.name] ?? '').toString().trim();
      const value = Number.parseFloat((row[keyByKind.value] ?? '').toString().replace(',', '.')) || 0;
      const unit = keyByKind.unit ? (row[keyByKind.unit] ?? '').toString().trim() : '';
      const normCsv = keyByKind.norm
        ? Number.parseFloat((row[keyByKind.norm] ?? '').toString().replace(',', '.'))
        : null;
      return { name, value, unit, normCsv: Number.isFinite(normCsv) ? normCsv : null };
    })
    .filter((r) => r.name || r.unit || r.value);
}

function parseCsvRows(csvText) {
  const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (results.errors?.length) {
    throw httpError(400, 'Ошибка парсинга CSV', results.errors);
  }
  const data = results.data || [];
  if (!data.length) throw httpError(400, 'CSV файл пуст');
  return mapRowsToElements(data);
}

function parseXlsxRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) throw httpError(400, 'XLSX файл пуст: нет листов');
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!data.length) throw httpError(400, 'XLSX файл пуст');
  return mapRowsToElements(data);
}

function parseXmlSpreadsheetRows(buffer) {
  const xmlText = buffer.toString('utf8');
  const wb = XLSX.read(xmlText, { type: 'string' });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) throw httpError(400, 'XML/XLML файл пуст: нет листов');
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!data.length) throw httpError(400, 'XML/XLML файл пуст');
  return mapRowsToElements(data);
}

function parseUploadedRows(file) {
  const fileName = String(file.originalname || '').toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseXlsxRows(file.buffer);
  }
  if (fileName.endsWith('.xlml') || fileName.endsWith('.xml')) {
    return parseXmlSpreadsheetRows(file.buffer);
  }
  // default: try as text-delimited (csv/tsv/txt)
  const text = file.buffer.toString('utf8');
  return parseCsvRows(text);
}

analysisRouter.post('/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const file = req.file;
    const projectIdRaw = req.body?.projectId;
    const subjectAgeRaw = req.body?.subjectAge ?? req.body?.patientAge;
    const subjectSexRaw = req.body?.subjectSex ?? req.body?.patientSex;
    const subjectProfileRaw = req.body?.subjectProfile;

    if (!file) throw httpError(400, 'file is required');
    const projectId = Number(projectIdRaw);
    if (!Number.isFinite(projectId)) throw httpError(400, 'projectId is required');

    let subjectAge;
    let subjectSex;
    let subjectProfileKey = null;
    const profile = resolveProfile(subjectProfileRaw);
    if (profile) {
      subjectAge = profile.ageMid;
      subjectSex = profile.sex;
      subjectProfileKey = profile.key;
    } else {
      const parsedAge = Number(subjectAgeRaw);
      if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        throw httpError(400, 'Укажите профиль subjectProfile или возраст subjectAge (0–120)');
      }
      const sex = String(subjectSexRaw || '').trim().toLowerCase();
      if (['male', 'm', 'муж', 'мужской'].includes(sex) || sex === 'м') subjectSex = 'male';
      else if (['female', 'f', 'жен', 'женский'].includes(sex) || sex === 'ж') subjectSex = 'female';
      else throw httpError(400, 'Укажите пол subjectSex: male или female (либо мужской / женский)');
      subjectAge = parsedAge;
    }

    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const [[p]] = await pool.query(
      'SELECT id, status, student_id, expert_id, coordinator_id FROM projects WHERE id = :projectId',
      { projectId }
    );
    if (!p) throw httpError(404, 'Project not found');
    if (
      !['draft', 'analysis', 'recipe', 'packaging', 'presentation', 'expert_review'].includes(p.status || '')
    ) {
      throw httpError(400, 'Анализ недоступен на текущем этапе проекта');
    }
    const allowed =
      role === 'coordinator' ||
      (role === 'student' && p.student_id === userId) ||
      role === 'expert';
    if (!allowed) throw httpError(403, 'Forbidden');

    const rows = parseUploadedRows(file);

    const seen = new Set();
    const elements = [];
    const KEY_ORDER = ['copper', 'sodium', 'potassium', 'zinc', 'selenium', 'iron'];
    for (const row of rows) {
      const key = resolveElementKey(row.name);
      if (!key) {
        throw httpError(
          400,
          `Неизвестный показатель «${row.name}». Поддерживаются: медь, натрий, калий, цинк, селен, железо (латинские имена тоже).`
        );
      }
      if (seen.has(key)) throw httpError(400, `Показатель «${row.name}» повторяется в файле`);
      seen.add(key);

      const normRow = await fetchHairNorm(pool, key, subjectSex, subjectAge);
      if (!normRow) {
        throw httpError(
          400,
          `Нет референсного интервала в справочнике для «${row.name}», пол=${subjectSex}, возраст=${subjectAge}. Проверьте миграцию hair_micro_norms.`
        );
      }

      const refMin = Number(normRow.ref_min);
      const refMax = Number(normRow.ref_max);
      const balanceStatus = classifyAgainstRef(row.value, refMin, refMax);
      const deficiency = balanceStatus === 'deficit';
      const normMid = (refMin + refMax) / 2;
      const unit = row.unit || normRow.unit || 'мкг/г';
      let consequenceText = null;
      if (balanceStatus === 'deficit') consequenceText = normRow.deficit_text;
      else if (balanceStatus === 'surplus') consequenceText = normRow.surplus_text;

      elements.push({
        _sortKey: key,
        name: normRow.element_label_ru || row.name,
        value: row.value,
        norm: normMid,
        ref_min: refMin,
        ref_max: refMax,
        unit,
        deficiency,
        balance_status: balanceStatus,
        consequence_text: consequenceText,
      });
    }

    elements.sort((a, b) => KEY_ORDER.indexOf(a._sortKey) - KEY_ORDER.indexOf(b._sortKey));
    for (const el of elements) delete el._sortKey;

    const [analysisRes] = await pool.query(
      'INSERT INTO analysis_data (project_id, file_name, subject_age, subject_sex, subject_profile_key) VALUES (:project_id, :file_name, :subject_age, :subject_sex, :subject_profile_key)',
      {
        project_id: projectId,
        file_name: file.originalname,
        subject_age: subjectAge,
        subject_sex: subjectSex,
        subject_profile_key: subjectProfileKey,
      }
    );
    const analysisId = analysisRes.insertId;

    for (const el of elements) {
      await pool.query(
        `INSERT INTO micro_elements (analysis_id, name, value, norm, ref_min, ref_max, unit, deficiency, balance_status, consequence_text)
         VALUES (:analysis_id, :name, :value, :norm, :ref_min, :ref_max, :unit, :deficiency, :balance_status, :consequence_text)`,
        {
          analysis_id: analysisId,
          name: el.name,
          value: el.value,
          norm: el.norm,
          ref_min: el.ref_min,
          ref_max: el.ref_max,
          unit: el.unit,
          deficiency: el.deficiency ? 1 : 0,
          balance_status: el.balance_status,
          consequence_text: el.consequence_text,
        }
      );
      if (el.balance_status === 'deficit') {
        await pool.query(
          'INSERT INTO analysis_deficiencies (analysis_id, element_name) VALUES (:analysis_id, :element_name)',
          { analysis_id: analysisId, element_name: el.name }
        );
      }
      if (el.balance_status === 'surplus') {
        await pool.query(
          'INSERT INTO analysis_surplus (analysis_id, element_name) VALUES (:analysis_id, :element_name)',
          { analysis_id: analysisId, element_name: el.name }
        );
      }
    }

    await pool.query('UPDATE projects SET status = :status WHERE id = :projectId', {
      status: 'recipe',
      projectId,
    });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    await createNotifications(pool, {
      userIds: [studentId, expertId, coordinatorId].filter(Boolean),
      projectId,
      type: 'project_created',
      message: 'Загружен анализ волос (референсы по полу и возрасту). Проект готов к этапу рецептуры.',
    });

    const [[analysisRow]] = await pool.query(
      'SELECT id, file_name, uploaded_at, subject_age, subject_sex, subject_profile_key FROM analysis_data WHERE id = :analysisId',
      { analysisId }
    );

    res.status(201).json(
      buildAnalysisResponse({
        id: analysisRow.id,
        file_name: analysisRow.file_name,
        uploaded_at: analysisRow.uploaded_at,
        subject_age: analysisRow.subject_age,
        subject_sex: analysisRow.subject_sex,
        subject_profile_key: analysisRow.subject_profile_key,
        elements,
      })
    );
  } catch (e) {
    next(e);
  }
});

analysisRouter.get('/project/:projectId/latest', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const [[p]] = await pool.query(
      'SELECT id, student_id, expert_id FROM projects WHERE id = :projectId',
      { projectId }
    );
    if (!p) throw httpError(404, 'Project not found');
    const allowed =
      role === 'coordinator' ||
      (role === 'student' && p.student_id === userId) ||
      role === 'expert';
    if (!allowed) throw httpError(403, 'Forbidden');

    const [[analysisRow]] = await pool.query(
      `SELECT id, file_name, uploaded_at, subject_age, subject_sex, subject_profile_key
       FROM analysis_data
       WHERE project_id = :projectId
       ORDER BY id DESC
       LIMIT 1`,
      { projectId }
    );
    if (!analysisRow) throw httpError(404, 'Analysis not found');

    const [elementRows] = await pool.query(
      `SELECT name, value, norm, ref_min, ref_max, unit, deficiency, balance_status, consequence_text
       FROM micro_elements WHERE analysis_id = :analysisId ORDER BY id ASC`,
      { analysisId: analysisRow.id }
    );

    res.json(
      buildAnalysisResponse({
        id: analysisRow.id,
        file_name: analysisRow.file_name,
        uploaded_at: analysisRow.uploaded_at,
        subject_age: analysisRow.subject_age,
        subject_sex: analysisRow.subject_sex,
        subject_profile_key: analysisRow.subject_profile_key,
        elements: elementRows,
      })
    );
  } catch (e) {
    next(e);
  }
});

analysisRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const analysisId = Number(req.params.id);
    if (!Number.isFinite(analysisId)) throw httpError(400, 'Invalid analysis id');

    const [[analysisRow]] = await pool.query(
      'SELECT id, project_id, file_name, uploaded_at, subject_age, subject_sex, subject_profile_key FROM analysis_data WHERE id = :analysisId',
      { analysisId }
    );
    if (!analysisRow) throw httpError(404, 'Analysis not found');

    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const [[p]] = await pool.query(
      'SELECT id, student_id, expert_id FROM projects WHERE id = :projectId',
      { projectId: analysisRow.project_id }
    );
    const allowed =
      role === 'coordinator' ||
      (role === 'student' && p.student_id === userId) ||
      role === 'expert';
    if (!allowed) throw httpError(403, 'Forbidden');

    const [elementRows] = await pool.query(
      `SELECT name, value, norm, ref_min, ref_max, unit, deficiency, balance_status, consequence_text
       FROM micro_elements WHERE analysis_id = :analysisId ORDER BY id ASC`,
      { analysisId }
    );

    const elements = elementRows.map((r) => ({
      name: r.name,
      value: r.value,
      norm: r.norm,
      ref_min: r.ref_min,
      ref_max: r.ref_max,
      unit: r.unit,
      deficiency: !!r.deficiency,
      balance_status: r.balance_status || (r.deficiency ? 'deficit' : 'normal'),
      consequence_text: r.consequence_text,
    }));

    res.json(
      buildAnalysisResponse({
        id: analysisRow.id,
        file_name: analysisRow.file_name,
        uploaded_at: analysisRow.uploaded_at,
        subject_age: analysisRow.subject_age,
        subject_sex: analysisRow.subject_sex,
        subject_profile_key: analysisRow.subject_profile_key,
        elements,
      })
    );
  } catch (e) {
    next(e);
  }
});
