# Page snapshot

```yaml
- generic [ref=e4]:
  - img [ref=e6]
  - heading "TOTEM" [level=3] [ref=e16]
  - paragraph [ref=e17]: Household Management
  - alert [ref=e18]: User not found.
  - generic [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - text: Email Address
        - generic [ref=e22]: "*"
      - textbox "Email Address" [ref=e24]: mike_1_1769878722280@test.com
    - generic [ref=e25]:
      - generic [ref=e26]:
        - text: Password
        - generic [ref=e27]: "*"
      - textbox "Password" [ref=e29]: Password123!
    - generic [ref=e31]:
      - checkbox "Remember me" [ref=e34] [cursor=pointer]
      - generic [ref=e35]: Remember me
    - button "Log In" [ref=e36] [cursor=pointer]
    - paragraph [ref=e37]:
      - text: Need an account?
      - link "Create Household" [ref=e38] [cursor=pointer]:
        - /url: /register
```