// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Initialize Firebase test environment
const testEnv = initializeTestEnvironment({
  projectId: 'demo-test',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
    host: 'localhost',
    port: 8080,
  },
});

global.beforeEach(async () => {
  await testEnv.clearFirestore();
});

global.afterAll(async () => {
  await testEnv.cleanup();
});
