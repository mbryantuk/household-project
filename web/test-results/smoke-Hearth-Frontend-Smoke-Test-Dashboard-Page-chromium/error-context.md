# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - heading "Hearthstone" [level=2] [ref=e5]
    - generic [ref=e6]:
      - generic [ref=e8]:
        - textbox "Email" [ref=e10]: mbryantuk@gmail.com
        - textbox "Password" [ref=e12]: Password123!
        - link "Forgot Password?" [ref=e14] [cursor=pointer]:
          - /url: /forgot-password
        - generic [ref=e15]: "Failed query: select \"id\", \"email\", \"username\", \"password_hash\", \"system_role\", \"default_household_id\", \"last_household_id\", \"is_test\", \"is_active\", \"is_beta\", \"mfa_enabled\", \"mfa_secret\", \"current_challenge\", \"reset_token\", \"reset_token_expires\", \"version\", \"first_name\", \"last_name\", \"avatar\", \"dashboard_layout\", \"sticky_note\", \"budget_settings\", \"theme\", \"custom_theme\", \"mode\", \"created_at\", \"updated_at\", \"deleted_at\" from \"users\" where (\"users\".\"email\" ilike $1 or \"users\".\"username\" = $2) limit $3 params: mbryantuk@gmail.com,mbryantuk@gmail.com,1"
        - button "Login" [ref=e16] [cursor=pointer]
        - separator [ref=e17]: or
        - button "Login with Passkey" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
          - text: Login with Passkey
      - generic [ref=e22]:
        - text: Don't have an account?
        - link "Create Household" [ref=e23] [cursor=pointer]:
          - /url: /register
  - region "Notifications alt+T"
```