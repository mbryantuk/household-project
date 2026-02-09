# Database Schema Reference

Totem uses a **Hybrid Multi-Tenant Database Architecture**. 
*   **Global Registry (`global.db`):** Manages users, authentication, system configuration, and the directory of households.
*   **Tenant Databases (`household-{id}.db`):** Each household has its own isolated SQLite database containing its private data (members, assets, finance, etc.).

---

## 1. Global Registry (`global.db`)

Shared system-wide data.

| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`users`** | Global user accounts (SSO). | `id`, `email`, `password_hash`, `default_household_id`, `budget_settings`, `theme`, `custom_theme` |
| **`households`** | Directory of all tenant workspaces. | `id`, `name`, `currency`, `enabled_modules`, `nightly_version_filter`, `metadata_schema` |
| **`user_households`** | Many-to-Many link between Users and Households. | `user_id`, `household_id`, `role` (admin/member/viewer) |
| **`version_history`** | System deployment log. | `version`, `comment`, `created_at` |
| **`test_results`** | Storage for automated nightly test reports. | `suite_name`, `passes`, `fails`, `report_json`, `version` |

---

## 2. Tenant Database (`household-{id}.db`)

Private data, completely isolated per household.

### Core Entities
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`members`** | People and Pets in the household. | `id`, `name`, `type` (adult/child/pet), `dob` (Encrypted), `will_details` (Encrypted) |
| **`dates`** | Unified calendar events (birthdays, holidays, tasks). | `date`, `type`, `recurrence`, `parent_type`, `parent_id` |
| **`house_details`** | Property metadata and config. | `property_type`, `wifi_password`, `emergency_contacts` |

### Assets & Inventory
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`assets`** | Physical items (Electronics, Furniture). | `purchase_value`, `replacement_cost`, `warranty_expiry`, `serial_number` (Encrypted) |
| **`vehicles`** | Cars, Bikes, etc. | `make`, `model`, `vin` (Encrypted), `mot_due`, `tax_due`, `purchase_value` |
| **`vehicle_services`** | Service history log. | `vehicle_id`, `cost`, `mileage`, `description` |

### Financial Core
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`finance_income`** | Salary and income streams. | `amount`, `frequency`, `member_id`, `bank_account_id` |
| **`finance_current_accounts`** | Bank accounts. | `bank_name`, `account_number` (Encrypted), `current_balance` |
| **`finance_savings`** | Savings accounts. | `interest_rate`, `current_balance`, `goal_target` |
| **`finance_savings_pots`** | Sub-divisions of savings (e.g., "Holiday Fund"). | `target_amount`, `current_amount` |
| **`finance_investments`** | Stocks, Crypto, Bonds. | `symbol`, `units`, `current_value` |
| **`finance_pensions`** | Retirement pots. | `provider`, `current_value`, `monthly_contribution` |
| **`finance_credit_cards`** | Credit liabilities. | `limit`, `balance`, `apr` |
| **`recurring_costs`** | **Centralized Bill/Sub Register.** Replaces legacy tables. | `category_id` (utility, mortgage, sub), `amount`, `frequency`, `object_type` (linked asset/vehicle) |
| **`finance_budget_progress`** | Tracking for monthly budget execution. | `cycle_start`, `item_key`, `actual_amount`, `is_paid` |
| **`finance_budget_cycles`** | Snapshot of monthly budget closure. | `cycle_start`, `actual_pay`, `current_balance` |

### Meal Planning
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`meals`** | Library of recipes/meals. | `name`, `category`, `last_prepared` |
| **`meal_plans`** | Weekly schedule assignments. | `date`, `meal_id`, `member_id` |

---

## Key Relationships
*   **Ownership:** Most tables link to `members(id)` to show who owns an asset or account.
*   **Recurring Costs:** The `recurring_costs` table is polymorphic. It can link to a `vehicle` (tax/insurance), an `asset` (insurance), or exist independently (Netflix subscription).
*   **Calendar:** The `dates` table acts as a cache for some events, but `recurring_costs` are dynamically projected onto the calendar view at runtime.
