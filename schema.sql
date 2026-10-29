CREATE DATABASE IF NOT EXISTS student_portal;
USE student_portal;

CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO students (student_id, name, department, email) VALUES
('CU001', 'Aarav Sharma', 'CSE-AIML', 'aarav@example.com'),
('CU002', 'Simran Kaur', 'CSE', 'simran@example.com'),
('CU003', 'Rahul Verma', 'IT', 'rahul@example.com')
ON DUPLICATE KEY UPDATE name=VALUES(name), department=VALUES(department), email=VALUES(email);
