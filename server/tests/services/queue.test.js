const { addJob, mainQueue } = require('../../services/queue');

describe('Background Job Queue (BullMQ)', () => {
  afterAll(async () => {
    await mainQueue.close();
  });

  it('should add a job to the queue', async () => {
    const job = await addJob('TEST_JOB', { householdId: 99, data: 'test' });
    expect(job.id).toBeDefined();
    expect(job.name).toBe('TEST_JOB');
    expect(job.data.householdId).toBe(99);
  });

  it('should handle jobs without householdId with a warning', async () => {
    const job = await addJob('TEST_NO_ID', { data: 'test' });
    expect(job.id).toBeDefined();
  });
});
