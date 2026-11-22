-- MediBook sample data. Run after schema.sql.
-- Upcoming appointments use dates relative to CURDATE() so the data stays
-- in the future whenever the seed is run (needed for stats and refund demos).

USE medibook;

INSERT INTO patients (patient_id, full_name, email, phone) VALUES
  (1,  'Ama Mensah',     'ama@mail.com',     '0244-111-222'),
  (2,  'Kojo Owusu',     'kojo@mail.com',    '0555-333-444'),
  (3,  'Efua Asante',    'efua@mail.com',    '0201-555-666'),
  (4,  'Yaw Darko',      'yaw@mail.com',     '0277-123-456'),
  (5,  'Akosua Boadu',   'akosua@mail.com',  '0243-987-654'),
  (6,  'Kwesi Appiah',   'kwesi@mail.com',   '0501-222-333'),
  (7,  'Abena Ofori',    'abena@mail.com',   '0266-444-555'),
  (8,  'Kofi Tetteh',    'kofi@mail.com',    '0208-666-777'),
  (9,  'Adwoa Sarpong',  'adwoa@mail.com',   '0549-888-999'),
  (10, 'Nana Agyeman',   'nana@mail.com',    '0233-101-202'),
  (11, 'Esi Quaye',      'esi@mail.com',     '0571-303-404'),
  (12, 'Kwame Antwi',    'kwame@mail.com',   '0245-505-606');

INSERT INTO doctors (doctor_id, full_name, email, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Boateng',  'boateng@medibook.clinic',  'Dermatology',      150.00, 'R-12'),
  (2, 'Dr. Adjei',    'adjei@medibook.clinic',    'Paediatrics',      100.00, 'R-03'),
  (3, 'Dr. Amponsah', 'amponsah@medibook.clinic', 'Cardiology',       200.00, 'R-15'),
  -- Doctor with zero appointments (must still appear in the doctors report).
  (4, 'Dr. Owusu-Ansah', 'owusuansah@medibook.clinic', 'General Practice', 80.00, 'R-07');

-- Historical records migrated from the original spreadsheet (AP-001..AP-003).
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, booked_at) VALUES
  (1, 1, '2026-08-10 09:00:00', 150.00, '2026-07-01 10:00:00'),
  (2, 1, '2026-08-10 09:30:00', 120.00, '2026-07-02 10:00:00'),
  (1, 2, '2026-08-15 10:00:00', 100.00, '2026-07-03 10:00:00');

-- A past cancellation kept for refund history: cancelled 26 hours ahead -> 50% refund.
INSERT INTO appointments
  (patient_id, doctor_id, appt_datetime, amount_paid, booked_at, status, cancelled_at, refund_amount)
VALUES
  (3, 2, '2026-09-01 11:00:00', 100.00, '2026-08-20 09:00:00',
   'CANCELLED', '2026-08-31 09:00:00', 50.00);

-- Near-cap day: Dr. Boateng has 11 of 12 slots booked three days from now
-- (09:00 to 14:00). One slot left, so the next booking fills the day and the
-- one after that is offered the waitlist. 11/12 = 91.7% also makes it a busy day.
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
  (1,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:00:00'), 150.00),
  (2,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:30:00'), 150.00),
  (3,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '10:00:00'), 150.00),
  (4,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '10:30:00'), 150.00),
  (5,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '11:00:00'), 150.00),
  (6,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '11:30:00'), 150.00),
  (7,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '12:00:00'), 150.00),
  (8,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '12:30:00'), 150.00),
  (9,  1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '13:00:00'), 150.00),
  (10, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '13:30:00'), 150.00),
  (11, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '14:00:00'), 150.00);

-- Other upcoming appointments, spread so each refund tier can be demonstrated:
-- tomorrow (< 24h or 24-48h notice), in 2 days, and in 5 days (> 48h notice).
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
  (12, 3, TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '10:00:00'), 200.00),
  (5,  2, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '09:00:00'), 100.00),
  (2,  3, TIMESTAMP(CURDATE() + INTERVAL 5 DAY, '14:30:00'), 200.00);
