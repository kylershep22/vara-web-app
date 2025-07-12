import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../../firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import SidebarLayout from '../../components/layout/SidebarLayout';

const GroupPage = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', body: '' });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);

  const user = auth.currentUser;

  // 🔄 Fetch group info
  useEffect(() => {
    const fetchGroup = async () => {
      const docRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setGroup({ groupsID: snapshot.id, ...snapshot.data() });
      }
    };
    fetchGroup();
  }, [groupId]);

  // 🔄 Listen for posts in this group
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'groupPosts'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        postId: doc.id,
        ...doc.data(),
      }));
      setPosts(fetchedPosts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => unsubscribe();
  }, [groupId]);

  // ✅ Handle new post
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim()) return;

    try {
      await addDoc(collection(db, 'groupPosts'), {
        ...newPost,
        groupId,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewPost({ title: '', body: '' });
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  // ✅ Handle invite by email
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', inviteEmail.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setInviteStatus('No user found with that email.');
        return;
      }

      const invitedUser = snapshot.docs[0];
      const targetUserId = invitedUser.id;

      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        type: 'group_invite',
        groupId,
        from: user.uid,
        email: inviteEmail.trim(),
        read: false,
        createdAt: serverTimestamp(),
      });

      setInviteStatus('✅ Invitation sent!');
      setInviteEmail('');
    } catch (error) {
      console.error('Error sending invite:', error);
      setInviteStatus('❌ Something went wrong. Try again.');
    }
  };

  if (!group) return <SidebarLayout><div className="p-6">Loading group...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">{group.emoji || '🌿'} {group.name}</h1>
        <p className="text-gray-600 mb-2">{group.description}</p>
        <div className="text-sm text-gray-500 mb-6">
          Category: <span className="font-semibold">{group.category}</span> |{' '}
          Members: <span className="font-semibold">{group.members?.length || 0}</span>
        </div>

        {/* ✅ Invite Form */}
        <div className="mb-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Invite a Member</h2>
          <form onSubmit={handleInvite} className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="border border-gray-300 rounded-md p-2 w-full md:w-auto"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
            >
              Send Invite
            </button>
          </form>
          {inviteStatus && (
            <p className="text-sm mt-2 text-gray-600">{inviteStatus}</p>
          )}
        </div>

        {/* 📝 New Post Form */}
        <form onSubmit={handlePost} className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Post title"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            className="w-full border border-gray-300 p-2 rounded-md"
            required
          />
          <textarea
            placeholder="Write something..."
            value={newPost.body}
            onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
            className="w-full border border-gray-300 p-2 rounded-md"
            rows={4}
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Post
          </button>
        </form>

        {/* 📬 Posts List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.postId}
              className="border border-gray-200 bg-white rounded-lg p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
              <p className="text-sm text-gray-700">{post.body}</p>
              <div className="text-xs text-gray-400 mt-2">
                Posted on {post.createdAt?.toDate().toLocaleString()}
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-gray-500 text-sm">
              No posts yet — be the first to share something!
            </p>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default GroupPage;
