jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(() => 'KVKFKRJTJ5YFMND7'),
    keyuri: jest.fn(() => 'otpauth://totp/Totem:test@test.com?secret=KVKFKRJTJ5YFMND7&issuer=Totem'),
    verify: jest.fn(() => true)
  }
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,fake-qr-code'))
}));