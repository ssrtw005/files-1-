// =====================================================
// САЛОН КРАСОТЫ — Node.js / Express Backend
// =====================================================
// Установка: npm install express @supabase/supabase-js bcryptjs jsonwebtoken cors dotenv
// Запуск:    node server.js

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// --- Supabase клиент ---
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY   // service_role key — серверный, НЕ публичный!
);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.static('public'));    // фронтенд в папке public/

// =====================================================
// MIDDLEWARE — проверка JWT
// =====================================================
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Нет токена' });
    const token = header.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Недействительный токен' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
    next();
}

// =====================================================
// АВТОРИЗАЦИЯ
// =====================================================

// POST /api/auth/register — регистрация клиента
app.post('/api/auth/register', async (req, res) => {
    const { fio_client, email_client, password, tel_client } = req.body;
    if (!fio_client || !email_client || !password)
        return res.status(400).json({ error: 'Заполните все обязательные поля' });

    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
        .from('clients')
        .insert({ fio_client, email_client, password_user: hash, tel_client, role: 'client' })
        .select('id_client, fio_client, email_client, role')
        .single();

    if (error) return res.status(400).json({ error: 'Email уже используется' });
    const token = jwt.sign({ id: data.id_client, role: data.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: data });
});

// POST /api/auth/login — вход
app.post('/api/auth/login', async (req, res) => {
    const { email_client, password } = req.body;
    const { data: user } = await supabase
        .from('clients')
        .select('*')
        .eq('email_client', email_client)
        .single();

    if (!user || !(await bcrypt.compare(password, user.password_user)))
        return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign({ id: user.id_client, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_user, ...safeUser } = user;
    res.json({ token, user: safeUser });
});

// =====================================================
// УСЛУГИ
// =====================================================

// GET /api/services — все услуги с видами
app.get('/api/services', async (req, res) => {
    const { data, error } = await supabase
        .from('services')
        .select('*, service_types(name_vid)')
        .order('name_service');
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// GET /api/services/by-type?vid=Ногти — фильтр по виду (В-05 прайс-лист)
app.get('/api/services/by-type', async (req, res) => {
    const { vid } = req.query;
    let query = supabase.from('v_price_list').select('*');
    if (vid) query = query.eq('name_vid', vid);
    const { data, error } = await query.order('name_service');
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// POST /api/services — добавить услугу (admin)
app.post('/api/services', authMiddleware, adminOnly, async (req, res) => {
    const { name_service, id_vid, duration, price_service, description } = req.body;
    const { data, error } = await supabase
        .from('services')
        .insert({ name_service, id_vid, duration, price_service, description })
        .select().single();
    if (error) return res.status(400).json({ error });
    res.json(data);
});

// PUT /api/services/:id — изменить услугу (admin)
app.put('/api/services/:id', authMiddleware, adminOnly, async (req, res) => {
    const { data, error } = await supabase
        .from('services')
        .update(req.body)
        .eq('id_service', req.params.id)
        .select().single();
    if (error) return res.status(400).json({ error });
    res.json(data);
});

// DELETE /api/services/:id — удалить услугу (admin)
app.delete('/api/services/:id', authMiddleware, adminOnly, async (req, res) => {
    await supabase.from('services').delete().eq('id_service', req.params.id);
    res.json({ success: true });
});

// =====================================================
// МАСТЕРА
// =====================================================

// GET /api/masters — все мастера со специализацией
app.get('/api/masters', async (req, res) => {
    const { data, error } = await supabase
        .from('masters')
        .select('*, specializations(name_spec)')
        .order('fio_master');
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// GET /api/masters/:id/schedule — расписание мастера
app.get('/api/masters/:id/schedule', async (req, res) => {
    const { data, error } = await supabase
        .from('work_schedule')
        .select('*, weekdays(day_name)')
        .eq('id_master', req.params.id)
        .order('id_day');
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// POST/PUT/DELETE мастеров (admin)
app.post('/api/masters', authMiddleware, adminOnly, async (req, res) => {
    const { data, error } = await supabase.from('masters').insert(req.body).select().single();
    if (error) return res.status(400).json({ error });
    res.json(data);
});
app.put('/api/masters/:id', authMiddleware, adminOnly, async (req, res) => {
    const { data, error } = await supabase.from('masters').update(req.body).eq('id_master', req.params.id).select().single();
    if (error) return res.status(400).json({ error });
    res.json(data);
});

// =====================================================
// ЗАПИСИ
// =====================================================

// GET /api/records — все записи (admin) / свои записи (client)
app.get('/api/records', authMiddleware, async (req, res) => {
    let query = supabase.from('v_record_detail').select('*');
    if (req.user.role === 'client') query = query.eq('id_client', req.user.id);   // клиент видит только свои
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query.order('date_service', { ascending: false });
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// GET /api/records/:id — детальная запись (В-01)
app.get('/api/records/:id', authMiddleware, async (req, res) => {
    const { data, error } = await supabase
        .from('v_record_detail')
        .select('*')
        .eq('id_record', req.params.id)
        .single();
    if (error || !data) return res.status(404).json({ error: 'Запись не найдена' });
    if (req.user.role === 'client' && data.id_client !== req.user.id)
        return res.status(403).json({ error: 'Нет доступа' });
    res.json(data);
});

// POST /api/records — создать заявку на запись (Вх-08)
app.post('/api/records', authMiddleware, async (req, res) => {
    const { id_service, id_master, date_service, time_service, comment } = req.body;

    // Генерируем номер заявки
    const { count } = await supabase.from('records').select('*', { count: 'exact', head: true });
    const id_zayav = (count || 0) + 1;

    const { data, error } = await supabase
        .from('records')
        .insert({
            id_zayav,
            id_client: req.user.id,
            id_service, id_master,
            date_service, time_service,
            comment,
            status: 'pending'
        })
        .select().single();

    if (error) return res.status(400).json({ error });
    res.json(data);
});

// PATCH /api/records/:id/time — изменить время (admin)
app.patch('/api/records/:id/time', authMiddleware, adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('records')
    .update({ time_service: req.body.time_service })
    .eq('id_record', req.params.id)
    .select().single();
  if (error) return res.status(400).json({ error });
  res.json(data);
});

// PATCH /api/records/:id/status — изменить статус (admin/master)
app.patch('/api/records/:id/status', authMiddleware, async (req, res) => {
    if (req.user.role === 'client') return res.status(403).json({ error: 'Нет доступа' });
    const { data, error } = await supabase
        .from('records')
        .update({ status: req.body.status })
        .eq('id_record', req.params.id)
        .select().single();
    if (error) return res.status(400).json({ error });
    res.json(data);
});

// =====================================================
// ОТЧЁТЫ (В-02..В-06)
// =====================================================

// GET /api/reports/master?fio=...&from=...&to=... — В-02 Отчёт по мастеру
app.get('/api/reports/master', authMiddleware, adminOnly, async (req, res) => {
    const { fio, from, to } = req.query;
    let query = supabase.from('v_master_report').select('*');
    if (fio)  query = query.ilike('fio_master', `%${fio}%`);
    if (from) query = query.gte('date_service', from);
    if (to)   query = query.lte('date_service', to);
    const { data, error } = await query.order('date_service');
    if (error) return res.status(500).json({ error });
    // Итого
    const total = data.reduce((sum, r) => sum + Number(r.price_service), 0);
    res.json({ records: data, total });
});

// GET /api/reports/client?fio=...&from=...&to=... — В-03 Список услуг клиента
app.get('/api/reports/client', authMiddleware, adminOnly, async (req, res) => {
    const { fio, from, to } = req.query;
    let query = supabase.from('v_client_services').select('*');
    if (fio)  query = query.ilike('fio_client', `%${fio}%`);
    if (from) query = query.gte('date_service', from);
    if (to)   query = query.lte('date_service', to);
    const { data, error } = await query.order('date_service');
    if (error) return res.status(500).json({ error });
    const total = data.reduce((sum, r) => sum + Number(r.price_service), 0);
    res.json({ records: data, total });
});

// GET /api/reports/service?name=...&from=...&to=... — В-04 Отчёт по услуге
app.get('/api/reports/service', authMiddleware, adminOnly, async (req, res) => {
    const { name, from, to } = req.query;
    let query = supabase.from('v_service_report').select('*');
    if (name) query = query.ilike('name_service', `%${name}%`);
    if (from) query = query.gte('date_service', from);
    if (to)   query = query.lte('date_service', to);
    const { data, error } = await query.order('date_service');
    if (error) return res.status(500).json({ error });
    res.json({ records: data });
});

// GET /api/reports/journal?fio=...&date=... — В-06 Журнал записи мастера
app.get('/api/reports/journal', authMiddleware, async (req, res) => {
    const { fio, date } = req.query;
    let query = supabase.from('v_master_journal').select('*');
    if (fio)  query = query.ilike('fio_master', `%${fio}%`);
    if (date) query = query.eq('date_service', date);
    const { data, error } = await query.order('time_service');
    if (error) return res.status(500).json({ error });
    res.json(data);
});

// =====================================================
// СПРАВОЧНИКИ
// =====================================================
// GET /api/clients — список клиентов (admin)
app.get('/api/clients', authMiddleware, adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id_client, fio_client, email_client, tel_client, role')
    .order('fio_client');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// POST /api/records/admin — создать запись от имени админа
app.post('/api/records/admin', authMiddleware, adminOnly, async (req, res) => {
  const { id_client, id_service, id_master, date_service, time_service, comment } = req.body;
  const { count } = await supabase.from('records').select('*', { count: 'exact', head: true });
  const id_zayav = (count || 0) + 1;
  const { data, error } = await supabase
    .from('records')
    .insert({ id_zayav, id_client, id_service, id_master, date_service, time_service, comment, status: 'confirmed' })
    .select().single();
  if (error) return res.status(400).json({ error });
  res.json(data);
});
app.get('/api/service-types',    async (_, res) => { const { data } = await supabase.from('service_types').select('*');    res.json(data); });
app.get('/api/specializations',  async (_, res) => { const { data } = await supabase.from('specializations').select('*');  res.json(data); });
app.get('/api/weekdays',         async (_, res) => { const { data } = await supabase.from('weekdays').select('*');         res.json(data); });

// =====================================================
app.listen(PORT, () => console.log(`🌸 Сервер запущен на http://localhost:${PORT}`));
