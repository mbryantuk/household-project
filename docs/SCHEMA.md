# Database Schema Reference

Hearthstone uses a **Hybrid Multi-Tenant Architecture** to balance global management with total tenant data privacy.

---

## 1. Global Registry (PostgreSQL)

The Global Registry handles identity, cross-household access, and system-wide orchestration.

```mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : "has"
    USERS ||--o{ PASSKEYS : "registered"
    USERS ||--o{ USER_HOUSEHOLDS : "belongs to"
    HOUSEHOLDS ||--o{ USER_HOUSEHOLDS : "contains"

    USERS {
        serial id PK
        text email UK
        text password_hash
        integer default_household_id
        integer last_household_id
        text theme
        text mode
        boolean mfa_enabled
        timestamp deleted_at
    }

    HOUSEHOLDS {
        serial id PK
        text name
        text currency
        text enabled_modules
        timestamp deleted_at
    }

    USER_HOUSEHOLDS {
        integer user_id FK
        integer household_id FK
        text role
        boolean is_active
    }

    USER_SESSIONS {
        text id PK
        integer user_id FK
        text device_info
        timestamp expires_at
        boolean is_revoked
    }
```

---

## 2. Tenant Database (SQLite)

Each household has its own isolated `.db` file. This diagram represents the structure repeated for every tenant.

```mermaid
erDiagram
    MEMBERS ||--o{ RECURRING_COSTS : "pays"
    MEMBERS ||--o{ FINANCE_INCOME : "earns"
    MEMBERS ||--o{ MEAL_PLANS : "assigned"

    VEHICLES ||--o{ VEHICLE_SERVICES : "serviced"
    VEHICLES ||--o{ RECURRING_COSTS : "linked"

    ASSETS ||--o{ RECURRING_COSTS : "linked"

    FINANCE_SAVINGS ||--o{ FINANCE_SAVINGS_POTS : "contains"

    MEMBERS {
        integer id PK
        text name
        text type "adult/child/pet"
        text dob "Encrypted"
    }

    ASSETS {
        integer id PK
        text name
        real purchase_value
        real replacement_cost
        date warranty_expiry
    }

    VEHICLES {
        integer id PK
        text make
        text model
        text registration "Encrypted"
        date mot_due
    }

    RECURRING_COSTS {
        integer id PK
        text category_id "mortgage/utility/sub"
        real amount
        text frequency
        text object_type "vehicle/asset/member"
        integer object_id
    }

    FINANCE_INCOME {
        integer id PK
        integer member_id FK
        real amount
        text frequency
        boolean nearest_working_day
    }
```

---

## 3. Data Protection Strategy

### Encrypted Fields (AES-256-GCM)

The following fields are encrypted at the application layer before being written to disk:

- **MEMBERS:** `dob`, `will_details`, `life_insurance_provider`.
- **VEHICLES:** `registration`.
- **ASSETS:** `serial_number`.
- **FINANCE_CURRENT_ACCOUNTS:** `account_number`, `sort_code`.

### Soft Deletes (Item 94)

Core entities include a `deleted_at` timestamp. Queries filter for `NULL` to prevent data loss while maintaining referential integrity for historical financial calculations.

### Postgres Enums (Item 95)

Status and Role columns in the Global Registry use native PostgreSQL `ENUM` types to prevent invalid state transitions.

- `system_role`: `['admin', 'user']`
- `user_role`: `['admin', 'member', 'viewer']`
- `theme_mode`: `['light', 'dark', 'system']`
