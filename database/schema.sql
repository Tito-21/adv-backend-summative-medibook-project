-- MediBook clinic appointment system: schema (3NF, 3 tables).
-- Safe to re-run: drops and recreates the tables.

CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medibook;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;

CREATE TABLE patients (
  patient_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_patients       PRIMARY KEY (patient_id),
  CONSTRAINT uq_patients_email UNIQUE (email),
  CONSTRAINT chk_patients_email CHECK (email LIKE '%@%.%')
) ENGINE = InnoDB;

CREATE TABLE doctors (
  doctor_id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(100)  NOT NULL,
  email             VARCHAR(255)  NOT NULL,
  specialty         VARCHAR(100)  NOT NULL,
  consultation_fee  DECIMAL(8,2)  NOT NULL,
  room              VARCHAR(10)   NOT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_doctors        PRIMARY KEY (doctor_id),
  CONSTRAINT uq_doctors_email  UNIQUE (email),
  CONSTRAINT uq_doctors_room   UNIQUE (room),
  CONSTRAINT chk_doctors_email CHECK (email LIKE '%@%.%'),
  CONSTRAINT chk_doctors_fee   CHECK (consultation_fee >= 0)
) ENGINE = InnoDB;

CREATE TABLE appointments (
  appointment_id  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  patient_id      INT UNSIGNED  NOT NULL,
  doctor_id       INT UNSIGNED  NOT NULL,
  appt_datetime   DATETIME      NOT NULL,
  amount_paid     DECIMAL(8,2)  NOT NULL,
  status          ENUM('BOOKED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
  booked_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at    DATETIME      NULL,
  refund_amount   DECIMAL(8,2)  NULL,

  -- Holds the slot only while the appointment is active. Cancelled rows become
  -- NULL here, and a UNIQUE index allows many NULLs, so a cancelled slot can be
  -- booked again while the cancelled row is kept for refund history.
  active_slot     DATETIME GENERATED ALWAYS AS
                    (IF(status = 'BOOKED', appt_datetime, NULL)) STORED,

  CONSTRAINT pk_appointments PRIMARY KEY (appointment_id),

  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
    REFERENCES patients (patient_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors (doctor_id) ON DELETE RESTRICT,

  -- UQ1: a doctor cannot have two active appointments at the same date/time.
  CONSTRAINT uq_doctor_active_slot  UNIQUE (doctor_id, active_slot),
  -- UQ2: a patient cannot hold two active appointments at the same date/time.
  CONSTRAINT uq_patient_active_slot UNIQUE (patient_id, active_slot),

  CONSTRAINT chk_appt_slot_boundary
    CHECK (MINUTE(appt_datetime) IN (0, 30) AND SECOND(appt_datetime) = 0),
  CONSTRAINT chk_appt_working_hours
    CHECK (TIME(appt_datetime) BETWEEN '09:00:00' AND '16:30:00'),
  CONSTRAINT chk_appt_amount_paid
    CHECK (amount_paid >= 0),
  CONSTRAINT chk_appt_refund_range
    CHECK (refund_amount IS NULL OR refund_amount BETWEEN 0 AND amount_paid),
  CONSTRAINT chk_appt_status_consistency
    CHECK (
      (status = 'BOOKED'    AND cancelled_at IS NULL     AND refund_amount IS NULL) OR
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND refund_amount IS NOT NULL)
    )
) ENGINE = InnoDB;
