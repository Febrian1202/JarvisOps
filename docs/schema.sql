-- =========================================================
-- JARVIS OPS
-- IT SERVICE MANAGEMENT SYSTEM
-- ERD v1.3 (Final Report Attachment)
-- Target: MySQL / DrawDB
-- =========================================================
-- =========================================================
-- 1. ROLES
-- =========================================================
CREATE TABLE
    roles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 2. DEPARTMENTS
-- =========================================================
CREATE TABLE
    departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 3. USERS
-- =========================================================
CREATE TABLE
    users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role_id BIGINT UNSIGNED NOT NULL,
        department_id BIGINT UNSIGNED NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id),
        CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
    );

-- =========================================================
-- 4. EMPLOYEE PROFILES
-- =========================================================
CREATE TABLE
    employee_profiles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        employee_code VARCHAR(50) NOT NULL UNIQUE,
        phone VARCHAR(30),
        position VARCHAR(100),
        hire_date DATE,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_employee_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

-- =========================================================
-- ASSET MANAGEMENT
-- =========================================================
-- =========================================================
-- 5. ASSETS
-- =========================================================
CREATE TABLE
    assets (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asset_tag VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(150) UNIQUE,
        purchase_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'available',
        notes TEXT,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 6. ASSET ASSIGNMENTS
-- =========================================================
CREATE TABLE
    asset_assignments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asset_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        assigned_at TIMESTAMP NOT NULL,
        released_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_asset_assignments_asset FOREIGN KEY (asset_id) REFERENCES assets (id),
        CONSTRAINT fk_asset_assignments_user FOREIGN KEY (user_id) REFERENCES users (id)
    );

-- =========================================================
-- 7. ASSET HISTORIES
-- =========================================================
CREATE TABLE
    asset_histories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asset_id BIGINT UNSIGNED NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        action_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NULL,
        CONSTRAINT fk_asset_histories_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
    );

-- =========================================================
-- TICKETING
-- =========================================================
-- =========================================================
-- 8. TICKET CATEGORIES
-- =========================================================
CREATE TABLE
    ticket_categories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 9. TICKET PRIORITIES
-- =========================================================
CREATE TABLE
    ticket_priorities (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        level INT UNSIGNED NULL UNIQUE,
        -- SLA target in minutes
        sla_minutes INT UNSIGNED NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 10. TICKET STATUSES
-- =========================================================
CREATE TABLE
    ticket_statuses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
        is_final BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 11. TICKETS
-- =========================================================
CREATE TABLE
    tickets (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(30) NOT NULL UNIQUE,
        category_id BIGINT UNSIGNED NOT NULL,
        priority_id BIGINT UNSIGNED NOT NULL,
        status_id BIGINT UNSIGNED NOT NULL,
        -- User who reported the ticket
        reporter_id BIGINT UNSIGNED NOT NULL,
        -- Technician handling the ticket
        technician_id BIGINT UNSIGNED NULL,
        -- Department associated with the ticket
        department_id BIGINT UNSIGNED NULL,
        -- Asset associated with the ticket
        asset_id BIGINT UNSIGNED NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        -- Snapshot SLA values
        -- so historical tickets are not affected
        -- when priority SLA configuration changes.
        sla_duration_minutes INT UNSIGNED NOT NULL,
        sla_deadline TIMESTAMP NOT NULL,
        resolved_at TIMESTAMP NULL,
        closed_at TIMESTAMP NULL,
        sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
        sla_breached_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES ticket_categories (id),
        CONSTRAINT fk_tickets_priority FOREIGN KEY (priority_id) REFERENCES ticket_priorities (id),
        CONSTRAINT fk_tickets_status FOREIGN KEY (status_id) REFERENCES ticket_statuses (id),
        CONSTRAINT fk_tickets_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
        CONSTRAINT fk_tickets_technician FOREIGN KEY (technician_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_tickets_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
        CONSTRAINT fk_tickets_asset FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE SET NULL
    );

-- =========================================================
-- 12. TICKET COMMENTS
-- =========================================================
CREATE TABLE
    ticket_comments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ticket_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_ticket_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        CONSTRAINT fk_ticket_comments_user FOREIGN KEY (user_id) REFERENCES users (id)
    );

-- =========================================================
-- 13. TICKET ATTACHMENTS
-- =========================================================
CREATE TABLE
    ticket_attachments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ticket_id BIGINT UNSIGNED NOT NULL,
        uploaded_by BIGINT UNSIGNED NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT UNSIGNED NOT NULL,
        storage_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP NULL,
        CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        CONSTRAINT fk_ticket_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users (id)
    );

-- =========================================================
-- 14. TICKET HISTORIES
-- =========================================================
CREATE TABLE
    ticket_histories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ticket_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        field_changed VARCHAR(100) NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        created_at TIMESTAMP NULL,
        CONSTRAINT fk_ticket_histories_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        CONSTRAINT fk_ticket_histories_user FOREIGN KEY (user_id) REFERENCES users (id)
    );

-- =========================================================
-- KNOWLEDGE BASE
-- =========================================================
-- =========================================================
-- 15. KNOWLEDGE CATEGORIES
-- =========================================================
CREATE TABLE
    knowledge_categories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL
    );

-- =========================================================
-- 16. KNOWLEDGE ARTICLES
-- =========================================================
CREATE TABLE
    knowledge_articles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_id BIGINT UNSIGNED NOT NULL,
        author_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(200) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content LONGTEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        view_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_knowledge_articles_category FOREIGN KEY (category_id) REFERENCES knowledge_categories (id),
        CONSTRAINT fk_knowledge_articles_author FOREIGN KEY (author_id) REFERENCES users (id)
    );

-- =========================================================
-- NOTIFICATIONS & AUDIT
-- =========================================================
-- =========================================================
-- 17. NOTIFICATIONS
-- =========================================================
CREATE TABLE
    notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(100) NOT NULL,
        data JSON NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

-- =========================================================
-- 18. AUDIT LOGS
-- =========================================================
CREATE TABLE
    audit_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        -- Nullable because user may eventually be deleted
        user_id BIGINT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        module_id BIGINT UNSIGNED NULL,
        description VARCHAR(500) NULL,
        old_data JSON NULL,
        new_data JSON NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NULL,
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX idx_users_role ON users (role_id);

CREATE INDEX idx_users_department ON users (department_id);

CREATE INDEX idx_users_status ON users (status);

CREATE INDEX idx_assets_status ON assets (status);

CREATE INDEX idx_assets_name ON assets (name);

CREATE INDEX idx_asset_assignments_user ON asset_assignments (user_id);

CREATE INDEX idx_asset_assignments_asset ON asset_assignments (asset_id);

CREATE INDEX idx_tickets_status ON tickets (status_id);

CREATE INDEX idx_tickets_priority ON tickets (priority_id);

CREATE INDEX idx_tickets_category ON tickets (category_id);

CREATE INDEX idx_tickets_reporter ON tickets (reporter_id);

CREATE INDEX idx_tickets_technician ON tickets (technician_id);

CREATE INDEX idx_tickets_department ON tickets (department_id);

CREATE INDEX idx_tickets_asset ON tickets (asset_id);

CREATE INDEX idx_tickets_title ON tickets (title);

CREATE INDEX idx_tickets_sla_deadline ON tickets (sla_deadline);

CREATE INDEX idx_tickets_status_technician ON tickets (status_id, technician_id);

CREATE INDEX idx_tickets_sla ON tickets (sla_breached, sla_deadline);

CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

CREATE INDEX idx_audit_logs_module ON audit_logs (module, module_id);

CREATE INDEX idx_knowledge_articles_title ON knowledge_articles (title);

CREATE INDEX idx_knowledge_articles_status ON knowledge_articles (status);