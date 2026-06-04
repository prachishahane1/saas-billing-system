-- ==========================================
-- SaaS Billing System MySQL Database Schema
-- ==========================================

CREATE DATABASE IF NOT EXISTS saas_billing_system;
USE saas_billing_system;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    organization_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, ORGANIZATION_ADMIN, USER
    organization_id BIGINT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL
);

-- 3. Plans
CREATE TABLE IF NOT EXISTS plans (
    plan_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- Free, Starter, Pro, Enterprise
    price DOUBLE NOT NULL,
    duration VARCHAR(50) NOT NULL, -- monthly, yearly
    features TEXT,
    created_at DATETIME NOT NULL
);

-- 4. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    trial_end_date DATE,
    end_date DATE,
    renewal_date DATE,
    status VARCHAR(50) NOT NULL, -- ACTIVE, EXPIRED, CANCELLED, TRIAL, PENDING
    billing_cycle VARCHAR(50) NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON DELETE CASCADE
);

-- 5. Payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    payment_date DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED, PENDING, REFUNDED
    currency VARCHAR(10) NOT NULL, -- USD, INR
    transaction_id VARCHAR(255),
    payment_gateway VARCHAR(50) NOT NULL, -- STRIPE, PAYPAL, RAZORPAY
    failure_reason VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);

-- 6. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    payment_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    generated_date DATETIME NOT NULL,
    invoice_status VARCHAR(50) NOT NULL, -- PAID, UNPAID, VOID
    invoice_number VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);

-- 7. Payment Logs
CREATE TABLE IF NOT EXISTS payment_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL, -- INITIATED, SUCCESS, FAILED, REFUNDED
    message VARCHAR(255),
    created_at DATETIME NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
);

-- ==========================================
-- Default Data Seeding
-- ==========================================

-- Seed default pricing plans
INSERT INTO plans (plan_name, plan_type, price, duration, features, created_at)
VALUES 
('Basic Sandbox', 'Free', 0.00, 'monthly', '14-day free trial, API sandbox credentials, 100 requests/mo', NOW()),
('Developer Core', 'Starter', 19.99, 'monthly', 'Premium sandbox, 1000 requests/mo, Basic analytics, email support', NOW()),
('Business Suite', 'Pro', 49.00, 'monthly', 'Unlimited requests/mo, Custom metrics dashboard, Priority SSL, 24/7 Phone support', NOW())
ON DUPLICATE KEY UPDATE plan_name=plan_name;

-- Seed default super admin user (password is 'admin123' encoded via BCrypt)
-- Hash for 'admin123' is '$2a$10$o.cZtD3n.8/h6j.D.Mv9.egUuP272Dq6LpYqS8DqFqE7L33.yKReK'
INSERT INTO users (name, email, password, role, organization_id, status, created_at)
VALUES 
('Super System Administrator', 'superadmin@apexflow.com', '$2a$10$o.cZtD3n.8/h6j.D.Mv9.egUuP272Dq6LpYqS8DqFqE7L33.yKReK', 'SUPER_ADMIN', NULL, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE name=name;
