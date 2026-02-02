# Page snapshot

```yaml
- generic [ref=e4]:
  - img [ref=e6]
  - heading "TOTEM" [level=3] [ref=e16]
  - generic [ref=e17]: Household Management
  - alert [ref=e18]: Registration successful! Please login.
  - generic [ref=e19]:
    - heading "Sign In" [level=4] [ref=e20]
    - paragraph [ref=e21]: Use your Totem account
    - generic [ref=e22]:
      - generic [ref=e23]:
        - text: Email Address
        - generic [ref=e24]: "*"
      - generic [ref=e25]:
        - img [ref=e27]
        - textbox "Email Address" [active] [ref=e29]:
          - /placeholder: name@example.com
          - text: mike_1_1769985848025@test.com
    - generic [ref=e30]:
      - generic [ref=e31]:
        - checkbox "Remember me" [ref=e34] [cursor=pointer]
        - generic [ref=e35]: Remember me
      - link "Create Account" [ref=e36] [cursor=pointer]:
        - /url: /register
    - button "Next" [ref=e37] [cursor=pointer]
  - generic [ref=e39]: © 2026 Totem Household Systems. All rights reserved.
```