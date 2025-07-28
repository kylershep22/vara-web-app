import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import CreateGroupModal from './CreateGroupModal';
import { db, auth } from '../../firebase';
import {
  collection,
  addDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Lock, 
  Globe, 
  Star,
  TrendingUp,
  UserPlus,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

const CommunityPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('discover'); // discover, my-groups, trending
  const [filterType, setFilterType] = useState('all'); // all, public, private, accountability
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const [userVisibility, setUserVisibility] = useState('public'); // public, friends, private
  const user = auth.currentUser;

  // Real-time listener for Firestore group documents
  useEffect(() => {
    let groupQuery = collection(db, 'groups');

    if (activeTab === 'my-groups' && user) {
      groupQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
    } else if (activeTab === 'trending') {
      groupQuery = query(
        collection(db, 'groups'),
        where('isPublic', '==', true),
        orderBy('memberCount', 'desc')
      );
    }

    const unsubscribe = onSnapshot(groupQuery, (snapshot) => {
      const fetchedGroups = snapshot.docs.map((doc) => ({
        groupsID: doc.id,
        ...doc.data(),
        memberCount: doc.data().members?.length || 0
      }));
      setGroups(fetchedGroups);
    });

    return () => unsubscribe();
  }, [activeTab, user]);

  // Filter and search groups
  useEffect(() => {
    let filtered = groups;

    if (searchTerm) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(group => {
        switch (filterType) {
          case 'public':
            return group.isPublic === true;
          case 'private':
            return group.isPublic === false;
          case 'accountability':
            return group.category === 'accountability';
          default:
            return true;
        }
      });
    }

    setFilteredGroups(filtered);
  }, [groups, searchTerm, filterType]);

  // Create group and auto-create chat document
  const handleCreateGroup = async (groupData) => {
    try {
      if (!user) return;

      const groupRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        memberCount: 1,
        lastActivity: serverTimestamp(),
        isPublic: groupData.isPublic ?? true,
        category: groupData.category ?? 'general'
      });

      await setDoc(doc(db, 'chats', groupRef.id), {
        chatId: groupRef.id,
        groupId: groupRef.id,
        participants: [user.uid],
        isGroupChat: true,
        lastMessage: null,
        createdAt: serverTimestamp()
      });

      setShowModal(false);
    } catch (error) {
      console.error('Error creating group and chat:', error);
    }
  };

  // Toggle group membership
  const handleJoinLeave = async (groupId, isMember) => {
    try {
      if (!user) return;

      const groupRef = doc(db, 'groups', groupId);

      if (isMember) {
        await updateDoc(groupRef, {
          members: arrayRemove(user.uid),
          memberCount: groups.find(g => g.groupsID === groupId)?.memberCount - 1 || 0
        });
      } else {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid),
          memberCount: (groups.find(g => g.groupsID === groupId)?.memberCount || 0) + 1
        });
      }
    } catch (error) {
      console.error('Failed to update group membership:', error);
    }
  };

  const tabs = [
    { id: 'discover', label: 'Discover', icon: Globe },
    { id: 'my-groups', label: 'My Groups', icon: Users },
    { id: 'trending', label: 'Trending', icon: TrendingUp }
  ];

  const filterOptions = [
    { id: 'all', label: 'All Groups' },
    { id: 'public', label: 'Public' },
    { id: 'private', label: 'Private' },
    { id: 'accountability', label: 'Accountability' }
  ];

  const GroupCard = ({ group }) => {
    const isMember = group.members?.includes(user?.uid);
    const isCreator = group.createdBy === user?.uid;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{group.emoji || '🌱'}</div>
            <div>
              <Link
                to={`/group/${group.groupsID}/forum`}  // ✅ now points to GroupForumPage
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {group.name}
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {group.isPublic ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                <span>{group.isPublic ? 'Public' : 'Private'}</span>
                {group.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{group.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isCreator && (
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {group.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{group.memberCount} members</span>
            </div>
            {group.lastActivity && (
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>Active recently</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleJoinLeave(group.groupsID, isMember)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isMember
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isMember ? 'Leave' : 'Join'}
          </button>
          <Link
            to={`/group/${group.groupsID}/forum`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View
          </Link>
        </div>
      </div>
    );
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
            <p className="text-gray-600">
              Connect with others on your wellness journey through groups, accountability partners, and shared experiences.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowVisibilitySettings(!showVisibilitySettings)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {userVisibility === 'public' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm font-medium capitalize">{userVisibility}</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>
        </div>

        {/* Visibility Settings Dropdown */}
        {showVisibilitySettings && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Visibility Settings</h3>
            <div className="space-y-2">
              {['public', 'friends', 'private'].map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={option}
                    checked={userVisibility === option}
                    onChange={(e) => setUserVisibility(e.target.value)}
                    className="text-emerald-600"
                  />
                  <span className="capitalize font-medium">{option}</span>
                  <span className="text-sm text-gray-500">
                    {option === 'public' && '- Visible to everyone'}
                    {option === 'friends' && '- Visible to connections only'}
                    {option === 'private' && '- Hidden from others'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {filterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {/* Quick Actions */}
        {activeTab === 'discover' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-xl">
              <UserPlus className="w-6 h-6 mb-2" />
              <h3 className="font-semibold mb-1">Find Accountability Partner</h3>
              <p className="text-sm opacity-90">Connect with someone who shares your goals</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
              <MessageCircle className="w-6 h-6 mb-2" />
              <h3 className="font-semibold mb-1">Join Live Chat</h3>
              <p className="text-sm opacity-90">Participate in real-time discussions</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
              <Settings className="w-6 h-6 mb-2" />
              <h3 className="font-semibold mb-1">Create Custom Group</h3>
              <p className="text-sm opacity-90">Build your own wellness community</p>
            </div>
          </div>
        )}

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <GroupCard key={group.groupsID} group={group} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No groups found' : 'No groups yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search or filters'
                : activeTab === 'my-groups'
                ? "You haven't joined any groups yet"
                : 'Be the first to create a group in this community'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Create First Group
              </button>
            )}
          </div>
        )}

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateGroup}
        />
      </div>
    </SidebarLayout>
  );
};

export default CommunityPage;




