-- ============================================
-- Plateforme Intelligente - Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS plateforme_comptable
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plateforme_comptable;

-- USERS & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'expert', 'assistant', 'client') DEFAULT 'assistant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    siret VARCHAR(14),
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(200),
    annual_revenue DECIMAL(15, 2),
    sector VARCHAR(100),
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('active', 'inactive', 'prospect') DEFAULT 'active',
    notes TEXT,
    assigned_expert_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_expert_id) REFERENCES users(id) ON DELETE SET NULL
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('creation', 'development', 'audit', 'consulting', 'other'),
    status ENUM('draft', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    risk_score DECIMAL(5, 2),
    estimated_budget DECIMAL(15, 2),
    start_date DATE,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    file_path VARCHAR(500) NOT NULL,
    category ENUM('financial', 'legal', 'administrative', 'report', 'other'),
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- AI GENERATED CONTENT
CREATE TABLE IF NOT EXISTS ai_business_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    content JSON NOT NULL,
    generated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);
