import { getProfile, upsertProfile, patchProfile } from '../profiles.service';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Profiles Service', () => {
  it('should get a profile', async () => {
    const profile = await getProfile('user1');
    expect(profile).toBeNull();
  });

  it('should upsert a profile', async () => {
    const profile = await upsertProfile('user1', { name: 'John Doe' });
    expect(profile).toHaveProperty('id');
    expect(profile.name).toBe('John Doe');
  });

  it('should patch a profile', async () => {
    const profile = await upsertProfile('user1', { name: 'John Doe' });
    const patchedProfile = await patchProfile('user1', { name: 'Jane Doe' });
    expect(patchedProfile.name).toBe('Jane Doe');
  });

  it('should handle missing document error', async () => {
    await expect(getProfile('nonexistent')).resolves.toBeNull();
  });
});
