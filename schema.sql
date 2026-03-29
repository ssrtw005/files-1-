-- =====================================================
-- САЛОН КРАСОТЫ — SQL СХЕМА ДЛЯ SUPABASE (PostgreSQL)
-- =====================================================

-- Список специализаций мастеров
CREATE TABLE specializations (
    id_spec     SERIAL PRIMARY KEY,
    name_spec   VARCHAR(50) NOT NULL
);

-- Список видов услуг
CREATE TABLE service_types (
    id_vid      SERIAL PRIMARY KEY,
    name_vid    VARCHAR(50) NOT NULL
);

-- Дни недели
CREATE TABLE weekdays (
    id_day      SERIAL PRIMARY KEY,
    day_name    VARCHAR(11) NOT NULL
);

-- Мастера
CREATE TABLE masters (
    id_master   SERIAL PRIMARY KEY,
    fio_master  VARCHAR(100) NOT NULL,
    id_spec     INTEGER REFERENCES specializations(id_spec),
    tel_master  VARCHAR(15),
    email_master VARCHAR(50),
    year_start  INTEGER
);

-- Клиенты / пользователи
CREATE TABLE clients (
    id_client       SERIAL PRIMARY KEY,
    fio_client      VARCHAR(100) NOT NULL,
    email_client    VARCHAR(50) UNIQUE NOT NULL,
    password_user   VARCHAR(255) NOT NULL,
    tel_client      VARCHAR(15),
    role            VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'admin', 'master'))
);

-- Прайс-лист услуг
CREATE TABLE services (
    id_service      SERIAL PRIMARY KEY,
    name_service    VARCHAR(100) NOT NULL,
    id_vid          INTEGER REFERENCES service_types(id_vid),
    duration        INTEGER NOT NULL,  -- минуты
    price_service   NUMERIC(8,2) NOT NULL,
    description     VARCHAR(100)
);

-- График работы мастеров
CREATE TABLE work_schedule (
    id_gr       SERIAL PRIMARY KEY,
    id_master   INTEGER REFERENCES masters(id_master),
    id_day      INTEGER REFERENCES weekdays(id_day),
    time_start  TIME NOT NULL,
    time_end    TIME NOT NULL
);

-- Записи (заявки клиентов)
CREATE TABLE records (
    id_record       SERIAL PRIMARY KEY,
    id_zayav        INTEGER UNIQUE NOT NULL,
    date_zayav      DATE NOT NULL DEFAULT CURRENT_DATE,
    id_client       INTEGER REFERENCES clients(id_client),
    id_service      INTEGER REFERENCES services(id_service),
    id_master       INTEGER REFERENCES masters(id_master),
    date_service    DATE NOT NULL,
    time_service    TIME NOT NULL,
    comment         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- =====================================================
-- ИНДЕКСЫ
-- =====================================================
CREATE INDEX idx_records_client    ON records(id_client);
CREATE INDEX idx_records_master    ON records(id_master);
CREATE INDEX idx_records_date      ON records(date_service);
CREATE INDEX idx_records_service   ON records(id_service);
CREATE INDEX idx_schedule_master   ON work_schedule(id_master);

-- =====================================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- =====================================================

INSERT INTO specializations (name_spec) VALUES
    ('Парикмахер'), ('Мастер маникюра'), ('Косметолог'), ('Визажист'), ('Массажист');

INSERT INTO service_types (name_vid) VALUES
    ('Волосы'), ('Ногти'), ('Лицо'), ('Тело'), ('Макияж');

INSERT INTO weekdays (day_name) VALUES
    ('Понедельник'), ('Вторник'), ('Среда'), ('Четверг'), ('Пятница'), ('Суббота'), ('Воскресенье');

INSERT INTO masters (fio_master, id_spec, tel_master, email_master, year_start) VALUES
    ('Иванова Мария Сергеевна',   1, '+79001112233', 'ivanova@salon.ru',   2018),
    ('Петрова Анна Николаевна',   2, '+79002223344', 'petrova@salon.ru',   2020),
    ('Сидорова Елена Павловна',   3, '+79003334455', 'sidorova@salon.ru',  2017),
    ('Кузнецова Ольга Игоревна',  4, '+79004445566', 'kuznecova@salon.ru', 2021),
    ('Морозова Татьяна Юрьевна',  5, '+79005556677', 'morozova@salon.ru',  2019);

INSERT INTO clients (fio_client, email_client, password_user, tel_client, role) VALUES
    ('Администратор Системы',   'admin@salon.ru',   '$2b$10$examplehash1', '+79000000001', 'admin'),
    ('Козлова Ирина Васильевна','kozlova@mail.ru',  '$2b$10$examplehash2', '+79111222333', 'client'),
    ('Новикова Дарья Андреевна','novikova@mail.ru', '$2b$10$examplehash3', '+79222333444', 'client');

INSERT INTO services (name_service, id_vid, duration, price_service, description) VALUES
    ('Стрижка женская',        1, 60,  1800.00, 'Стрижка с укладкой'),
    ('Окрашивание волос',      1, 120, 4500.00, 'Однотонное окрашивание'),
    ('Маникюр классический',   2, 60,  1200.00, 'Обрезной маникюр без покрытия'),
    ('Маникюр с гель-лаком',   2, 90,  2000.00, 'Маникюр с покрытием гель-лак'),
    ('Чистка лица',            3, 60,  2500.00, 'Механическая чистка'),
    ('Мезотерапия',            3, 45,  3800.00, 'Инъекционная мезотерапия'),
    ('Вечерний макияж',        5, 60,  2200.00, 'Макияж для особых случаев'),
    ('Массаж спины',           4, 60,  2800.00, 'Классический массаж спины');

INSERT INTO work_schedule (id_master, id_day, time_start, time_end) VALUES
    (1, 1, '09:00', '18:00'), (1, 2, '09:00', '18:00'), (1, 3, '09:00', '18:00'),
    (1, 4, '09:00', '18:00'), (1, 5, '09:00', '17:00'),
    (2, 1, '10:00', '19:00'), (2, 3, '10:00', '19:00'), (2, 5, '10:00', '19:00'),
    (2, 6, '10:00', '17:00'),
    (3, 2, '09:00', '18:00'), (3, 4, '09:00', '18:00'), (3, 6, '10:00', '16:00'),
    (4, 1, '11:00', '20:00'), (4, 3, '11:00', '20:00'), (4, 5, '11:00', '20:00'),
    (5, 2, '09:00', '17:00'), (5, 4, '09:00', '17:00'), (5, 6, '09:00', '15:00');

INSERT INTO records (id_zayav, date_zayav, id_client, id_service, id_master, date_service, time_service, comment, status) VALUES
    (1, '2025-03-01', 2, 1, 1, '2025-03-05', '10:00', NULL,          'completed'),
    (2, '2025-03-10', 3, 3, 2, '2025-03-12', '14:00', 'Аллергия на лак', 'completed'),
    (3, '2025-03-15', 2, 5, 3, '2025-03-20', '11:00', NULL,          'completed'),
    (4, '2025-03-20', 3, 7, 4, '2025-03-25', '16:00', NULL,          'completed'),
    (5, '2025-03-25', 2, 2, 1, '2025-04-01', '09:00', 'Тёплый блонд', 'confirmed');

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS) для отчётов
-- =====================================================

-- В-01: Запись (детальная информация)
CREATE VIEW v_record_detail AS
SELECT
    r.id_record,
    r.id_zayav,
    r.date_zayav,
    c.fio_client,
    c.tel_client,
    s.name_service,
    m.fio_master,
    r.date_service,
    r.time_service,
    r.comment,
    r.status,
    s.price_service
FROM records r
JOIN clients  c ON r.id_client  = c.id_client
JOIN services s ON r.id_service = s.id_service
JOIN masters  m ON r.id_master  = m.id_master;

-- В-02: Отчёт по выполненным работам мастера за период
CREATE VIEW v_master_report AS
SELECT
    m.fio_master,
    r.date_service,
    r.time_service,
    c.fio_client,
    s.name_service,
    s.price_service
FROM records r
JOIN masters  m ON r.id_master  = m.id_master
JOIN clients  c ON r.id_client  = c.id_client
JOIN services s ON r.id_service = s.id_service
WHERE r.status = 'completed';

-- В-03: Список услуг клиента за период
CREATE VIEW v_client_services AS
SELECT
    c.fio_client,
    r.date_service,
    r.time_service,
    s.name_service,
    m.fio_master,
    s.price_service
FROM records r
JOIN clients  c ON r.id_client  = c.id_client
JOIN services s ON r.id_service = s.id_service
JOIN masters  m ON r.id_master  = m.id_master
WHERE r.status = 'completed';

-- В-04: Отчёт по выполненной услуге за период
CREATE VIEW v_service_report AS
SELECT
    s.name_service,
    r.date_service,
    r.time_service,
    c.fio_client,
    m.fio_master
FROM records r
JOIN services s ON r.id_service = s.id_service
JOIN clients  c ON r.id_client  = c.id_client
JOIN masters  m ON r.id_master  = m.id_master
WHERE r.status = 'completed';

-- В-05: Прайс-лист по виду услуги
CREATE VIEW v_price_list AS
SELECT
    s.name_service,
    st.name_vid,
    s.duration,
    s.price_service,
    s.description
FROM services s
JOIN service_types st ON s.id_vid = st.id_vid
ORDER BY st.name_vid, s.name_service;

-- В-06: Журнал записи мастера
CREATE VIEW v_master_journal AS
SELECT
    m.fio_master,
    r.date_service,
    r.time_service,
    c.fio_client,
    c.tel_client,
    s.name_service,
    r.status
FROM records r
JOIN masters  m ON r.id_master  = m.id_master
JOIN clients  c ON r.id_client  = c.id_client
JOIN services s ON r.id_service = s.id_service;

-- =====================================================
-- RLS (Row Level Security) — базовые политики Supabase
-- =====================================================
ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Публичное чтение услуг и мастеров
CREATE POLICY "public_read_services" ON services FOR SELECT USING (true);
CREATE POLICY "public_read_masters"  ON masters  FOR SELECT USING (true);
CREATE POLICY "public_read_service_types" ON service_types FOR SELECT USING (true);
CREATE POLICY "public_read_specializations" ON specializations FOR SELECT USING (true);
CREATE POLICY "public_read_weekdays" ON weekdays FOR SELECT USING (true);
CREATE POLICY "public_read_schedule" ON work_schedule FOR SELECT USING (true);
