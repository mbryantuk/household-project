const { uploadFile, deleteFile, getFileLocation } = require('../../services/storage');
const fs = require('fs');
const path = require('path');

describe('File Storage Service (Local Driver)', () => {
  const testHhId = 999;
  const testFileName = 'test-file.txt';
  const testContent = Buffer.from('Hearthstone storage test content');

  it('should upload a file to the local filesystem', async () => {
    const key = await uploadFile(testHhId, testFileName, testContent, 'text/plain');
    expect(key).toBe(`household-${testHhId}/${testFileName}`);

    const location = getFileLocation(key);
    expect(fs.existsSync(location)).toBe(true);
    expect(fs.readFileSync(location).toString()).toBe('Hearthstone storage test content');
  });

  it('should delete a file from the local filesystem', async () => {
    const key = `household-${testHhId}/${testFileName}`;
    await deleteFile(key);

    const location = getFileLocation(key);
    expect(fs.existsSync(location)).toBe(false);
  });
});
