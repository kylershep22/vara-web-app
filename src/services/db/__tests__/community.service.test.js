import { listGroups, listPosts } from '../community.service';
import { db } from '../../../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

jest.mock('../../../firebase', () => ({
  db: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn()
}));

const mockGroupId = 'group123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Community Service', () => {
  it('should list groups', async () => {
    const mockData = [{ id: '1', data: () => ({ name: 'Group 1' }) }];
    getDocs.mockResolvedValue({ docs: mockData });

    const groups = await listGroups();

    expect(collection).toHaveBeenCalledWith(db, 'groups');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
    expect(groups).toEqual([{ id: '1', name: 'Group 1' }]);
  });

  it('should list posts', async () => {
    const mockData = [{ id: '1', data: () => ({ content: 'Post 1' }) }];
    getDocs.mockResolvedValue({ docs: mockData });

    const posts = await listPosts(mockGroupId);

    expect(collection).toHaveBeenCalledWith(db, 'posts');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
    expect(posts).toEqual([{ id: '1', content: 'Post 1' }]);
  });
});
