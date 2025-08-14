-- 手动初始化Umami数据库脚本
-- 在您的MySQL中执行此脚本来初始化表结构

USE butp;

-- 用户表
CREATE TABLE IF NOT EXISTS account (
    user_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    username VARCHAR(255) NOT NULL,
    password VARCHAR(60) NOT NULL,
    email VARCHAR(320),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY account_username_key (username),
    UNIQUE KEY account_email_key (email)
);

-- 网站表
CREATE TABLE IF NOT EXISTS website (
    website_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(500),
    share_id VARCHAR(50),
    rev_id INTEGER NOT NULL DEFAULT 0,
    user_id VARCHAR(36),
    team_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (website_id),
    KEY website_user_id_idx (user_id),
    KEY website_team_id_idx (team_id),
    KEY website_share_id_idx (share_id),
    KEY website_created_at_idx (created_at),
    CONSTRAINT website_user_id_fkey FOREIGN KEY (user_id) REFERENCES account (user_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 会话表
CREATE TABLE IF NOT EXISTS session (
    session_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    hostname VARCHAR(100),
    browser VARCHAR(20),
    os VARCHAR(20),
    device VARCHAR(20),
    screen VARCHAR(11),
    language VARCHAR(35),
    country CHAR(2),
    subdivision1 CHAR(3),
    subdivision2 CHAR(3),
    city VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    KEY session_created_at_idx (created_at),
    KEY session_website_id_idx (website_id),
    CONSTRAINT session_website_id_fkey FOREIGN KEY (website_id) REFERENCES website (website_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 网站事件表
CREATE TABLE IF NOT EXISTS website_event (
    event_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    url_path VARCHAR(500) NOT NULL,
    url_query VARCHAR(1024),
    referrer_path VARCHAR(500),
    referrer_query VARCHAR(1024),
    referrer_domain VARCHAR(500),
    page_title VARCHAR(500),
    event_type INTEGER NOT NULL DEFAULT 1,
    event_name VARCHAR(50),
    PRIMARY KEY (event_id),
    KEY website_event_created_at_idx (created_at),
    KEY website_event_session_id_idx (session_id),
    KEY website_event_website_id_idx (website_id),
    KEY website_event_website_id_created_at_idx (website_id, created_at),
    KEY website_event_website_id_session_id_created_at_idx (website_id, session_id, created_at),
    CONSTRAINT website_event_session_id_fkey FOREIGN KEY (session_id) REFERENCES session (session_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT website_event_website_id_fkey FOREIGN KEY (website_id) REFERENCES website (website_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 事件数据表
CREATE TABLE IF NOT EXISTS event_data (
    event_data_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    url_path VARCHAR(500) NOT NULL,
    event_name VARCHAR(50) NOT NULL,
    data_key VARCHAR(500) NOT NULL,
    string_value VARCHAR(500),
    number_value DECIMAL(19,4),
    date_value TIMESTAMP,
    data_type INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_data_id),
    KEY event_data_created_at_idx (created_at),
    KEY event_data_website_id_idx (website_id),
    KEY event_data_website_id_created_at_idx (website_id, created_at),
    CONSTRAINT event_data_event_id_fkey FOREIGN KEY (event_id) REFERENCES website_event (event_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT event_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES session (session_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT event_data_website_id_fkey FOREIGN KEY (website_id) REFERENCES website (website_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 报告表
CREATE TABLE IF NOT EXISTS report (
    report_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    website_id VARCHAR(36) NOT NULL,
    type VARCHAR(200) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    parameters JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    KEY report_user_id_idx (user_id),
    KEY report_website_id_idx (website_id),
    KEY report_type_idx (type),
    KEY report_name_idx (name),
    CONSTRAINT report_user_id_fkey FOREIGN KEY (user_id) REFERENCES account (user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT report_website_id_fkey FOREIGN KEY (website_id) REFERENCES website (website_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 团队表
CREATE TABLE IF NOT EXISTS team (
    team_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL,
    access_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id),
    UNIQUE KEY team_access_code_key (access_code)
);

-- 团队用户表
CREATE TABLE IF NOT EXISTS team_user (
    team_user_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_user_id),
    UNIQUE KEY team_user_team_id_user_id_key (team_id, user_id),
    KEY team_user_team_id_idx (team_id),
    KEY team_user_user_id_idx (user_id),
    CONSTRAINT team_user_team_id_fkey FOREIGN KEY (team_id) REFERENCES team (team_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT team_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES account (user_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 团队网站表
CREATE TABLE IF NOT EXISTS team_website (
    team_website_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    team_id VARCHAR(36) NOT NULL,
    website_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_website_id),
    UNIQUE KEY team_website_team_id_website_id_key (team_id, website_id),
    KEY team_website_team_id_idx (team_id),
    KEY team_website_website_id_idx (website_id),
    CONSTRAINT team_website_team_id_fkey FOREIGN KEY (team_id) REFERENCES team (team_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT team_website_website_id_fkey FOREIGN KEY (website_id) REFERENCES website (website_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 插入默认管理员用户
INSERT INTO account (user_id, username, password, is_admin) VALUES 
(UUID(), 'admin', '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcYAl.8YVHW', true)
ON DUPLICATE KEY UPDATE username = username;

-- 验证安装
SELECT 'Tables created successfully!' as message;
SELECT COUNT(*) as admin_users FROM account WHERE is_admin = true;
SHOW TABLES; 