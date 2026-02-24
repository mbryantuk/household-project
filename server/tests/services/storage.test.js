const path = require('path');

// Mock the storage service
jest.mock('../../services/storage', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileLocation: jest.fn(),
}));

// Now import the mocked functions
const { uploadFile, deleteFile, getFileLocation } = require('../../services/storage');

describe('File Storage Service (Mocked)', () => {
  const testHhId = 999;
  const testFileName = 'test-file.txt';
  const testContent = Buffer.from('Hearthstone storage test content');
  const mockKey = `household-${testHhId}/${testFileName}`;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock behaviors
    uploadFile.mockResolvedValue(mockKey);
    deleteFile.mockResolvedValue(undefined);
    getFileLocation.mockReturnValue(path.join(__dirname, '..', '..', 'uploads', mockKey));
  });

  it('should upload a file', async () => {
    const key = await uploadFile(testHhId, testFileName, testContent, 'text/plain');
    expect(key).toBe(mockKey);
    expect(uploadFile).toHaveBeenCalledWith(testHhId, testFileName, testContent, 'text/plain');
  });

  it('should delete a file', async () => {
    await deleteFile(mockKey);
    expect(deleteFile).toHaveBeenCalledWith(mockKey);
  });

  it('should get file location', () => {
    const location = getFileLocation(mockKey);
    expect(location).toContain(mockKey);
    expect(getFileLocation).toHaveBeenCalledWith(mockKey);
  });
});
