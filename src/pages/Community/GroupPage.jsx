import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import SidebarLayout from '../../components/layout/SidebarLayout';
import {
  Users,
  Globe,
  Lock,
  MessageSquare,
  MessageCircle,
  Settings,
  UserPlus,
  LogOut,
  Info,
  Hash,
  ArrowLeft,
  Send,
  Target,
  Zap,
  Trophy,
  Flame,
  Sparkles,
  Leaf,
  Brain,
  Activity,
  Coffee,
  Book,
  Dumbbell,
  Apple,
  Moon,
  Sun,
  Wind,
  Droplet,
  CheckCircle2,
  Heart,
  Smile,
  Music,
  Star,
  X,
  Trash2,
  Edit2,
  Save,
  UserMinus
} from 'lucide-react';

const GroupPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuth();
  const toast = useToast();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('feed'); // feed | members | about
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState('edit'); // edit | members | danger

  // Helper to normalize group data
  const normalizeGroup = (raw, id) => {
    const members = Array.isArray(raw?.members) ? raw.members : [];
    // Convert type to isPublic if isPublic doesn't exist
    const isPublic =
      typeof raw?.isPublic === "boolean"
        ? raw.isPublic
        : (raw?.type || "").toLowerCase() === "public";

    return {
      id,
      ...raw,
      isPublic,
      members,
      memberCount:
        typeof raw?.memberCount === "number" ? raw.memberCount : members.length
    };
  };

  // Fetch group info
  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const docRef = doc(db, 'groups', groupId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          // Use normalizeGroup to ensure isPublic is set correctly
          const normalizedGroup = normalizeGroup(snapshot.data(), snapshot.id);
          setGroup(normalizedGroup);
        } else {
          toast?.error('Group not found');
          navigate('/community');
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast?.error('Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]); // Only re-run when groupId changes

  // Listen for posts in this group (using 'posts' collection, not 'groupPosts')
  useEffect(() => {
    if (!groupId) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(fetchedPosts.sort((a, b) => {
        const aTime = a.timestamp?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.timestamp?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      }));
    });

    return () => unsubscribe();
  }, [groupId]);

  // Fetch member details
  useEffect(() => {
    if (!group?.members) return;

    const fetchMembers = async () => {
      const memberPromises = group.members.map(async (memberId) => {
        const userDoc = await getDoc(doc(db, 'users', memberId));
        if (userDoc.exists()) {
          return { id: userDoc.id, ...userDoc.data() };
        }
        return null;
      });

      const membersData = await Promise.all(memberPromises);
      setMembers(membersData.filter(Boolean));
    };

    fetchMembers();
  }, [group]);

  // Handle new post
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user?.uid) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        content: newPostContent,
        groupId,
        authorId: user.uid,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
      });

      setNewPostContent('');
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error adding post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle join group
  const handleJoinGroup = async () => {
    if (!user?.uid || !groupId) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(user.uid),
        memberCount: (group.memberCount || 0) + 1
      });
      toast.success('Successfully joined the group!');
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!user?.uid || !groupId) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(user.uid),
        memberCount: Math.max((group.memberCount || 1) - 1, 0)
      });
      toast.info('You left the group');
      navigate('/community');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getColorClass = (color) => {
    const colors = {
      emerald: 'from-teal-medium to-evergreen-teal',
      blue: 'from-blue-400 to-blue-600',
      purple: 'from-purple-400 to-purple-600',
      pink: 'from-pink-400 to-pink-600',
      orange: 'from-orange-400 to-orange-600',
      indigo: 'from-indigo-400 to-indigo-600'
    };
    return colors[color] || colors.emerald;
  };

  const renderGroupIcon = (iconName, className = "w-10 h-10 text-evergreen-teal") => {
    const iconMap = {
      Users, Target, Trophy, Flame, Heart, Star, Zap, Sparkles,
      Leaf, Brain, Activity, Dumbbell, Apple, Coffee, Moon, Sun,
      Wind, Droplet, MessageCircle, Book, CheckCircle2, Smile, Music, Globe
    };

    const IconComponent = iconMap[iconName] || Users;
    return <IconComponent className={className} />;
  };

  // Handle remove member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(memberId),
        memberCount: Math.max((group.memberCount || 1) - 1, 1) // Keep at least 1 (creator)
      });
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    if (!window.confirm('This will permanently delete all posts and data. Continue?')) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId));
      toast.success('Group deleted successfully');
      navigate('/community');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (!isAuthReady || loading) {
    return (
      <SidebarLayout>
        <div className="p-vara-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-dew-sage-light rounded w-1/3"></div>
            <div className="h-4 bg-dew-sage-light rounded w-2/3"></div>
            <div className="h-32 bg-dew-sage-light rounded"></div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!group) return null;

  const isMember = group.members?.includes(user?.uid);
  // Check all possible owner field names for backwards compatibility
  const isCreator = group.createdBy === user?.uid ||
                    group.ownerId === user?.uid ||
                    group.creatorId === user?.uid;

  // Manage Group Modal Component
  const ManageGroupModal = () => {
    const [editForm, setEditForm] = useState({
      name: group.name || '',
      description: group.description || '',
      icon: group.icon || 'Users',
      category: group.category || 'general',
      color: group.color || 'emerald',
      isPublic: group.isPublic ?? true
    });
    const [isSaving, setIsSaving] = useState(false);

    const icons = [
      { name: 'Users', component: Users },
      { name: 'Target', component: Target },
      { name: 'Trophy', component: Trophy },
      { name: 'Flame', component: Flame },
      { name: 'Heart', component: Heart },
      { name: 'Star', component: Star },
      { name: 'Zap', component: Zap },
      { name: 'Sparkles', component: Sparkles },
      { name: 'Leaf', component: Leaf },
      { name: 'Brain', component: Brain },
      { name: 'Activity', component: Activity },
      { name: 'Dumbbell', component: Dumbbell },
      { name: 'Apple', component: Apple },
      { name: 'Coffee', component: Coffee },
      { name: 'Moon', component: Moon },
      { name: 'Sun', component: Sun },
      { name: 'Wind', component: Wind },
      { name: 'Droplet', component: Droplet },
      { name: 'MessageCircle', component: MessageCircle },
      { name: 'Book', component: Book },
      { name: 'CheckCircle2', component: CheckCircle2 },
      { name: 'Smile', component: Smile },
      { name: 'Music', component: Music },
      { name: 'Globe', component: Globe }
    ];

    const colors = [
      { value: 'emerald', label: 'Teal', class: 'from-teal-medium to-evergreen-teal' },
      { value: 'blue', label: 'Blue', class: 'from-blue-400 to-blue-600' },
      { value: 'purple', label: 'Purple', class: 'from-purple-400 to-purple-600' },
      { value: 'pink', label: 'Pink', class: 'from-pink-400 to-pink-600' },
      { value: 'orange', label: 'Orange', class: 'from-orange-400 to-orange-600' },
      { value: 'indigo', label: 'Indigo', class: 'from-indigo-400 to-indigo-600' }
    ];

    const handleSaveChanges = async () => {
      setIsSaving(true);
      try {
        // Ensure both isPublic and type fields are synchronized
        const updateData = {
          ...editForm,
          type: editForm.isPublic ? 'public' : 'private' // Keep type in sync
        };
        await updateDoc(doc(db, 'groups', groupId), updateData);

        // Update local state with normalized group data
        const updatedGroup = normalizeGroup({ ...group, ...updateData }, groupId);
        setGroup(updatedGroup);

        toast.success('Group updated successfully!');
        setShowManageModal(false);
      } catch (error) {
        console.error('Error updating group:', error);
        toast.error('Failed to update group');
      } finally {
        setIsSaving(false);
      }
    };

    if (!showManageModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-vara-base">
        <div className="bg-white rounded-vara-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-vara-lg border-b">
            <h2 className="text-vara-xl font-bold text-soft-charcoal">Manage Group</h2>
            <button
              onClick={() => setShowManageModal(false)}
              className="p-2 hover:bg-dew-sage-light rounded-vara-md transition-colors"
            >
              <X className="w-5 h-5 text-muted-sage-gray" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-vara-lg pt-4">
            <div className="flex gap-1 bg-dew-sage-light p-1 rounded-vara-md w-fit">
              {[
                { id: 'edit', label: 'Edit Group', icon: Edit2 },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'danger', label: 'Danger Zone', icon: Trash2 }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setManageTab(tab.id)}
                    className={`flex items-center gap-vara-sm px-vara-base py-2 rounded-md text-vara-sm font-medium transition-all ${
                      manageTab === tab.id
                        ? 'bg-white shadow-vara-sm text-evergreen-teal'
                        : 'text-muted-sage-gray hover:text-soft-charcoal'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-vara-lg">
            {/* Edit Tab */}
            {manageTab === 'edit' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                  />
                </div>

                <div>
                  <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                  />
                </div>

                <div>
                  <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Icon</label>
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-vara-sm">
                    {icons.map((icon) => {
                      const IconComponent = icon.component;
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, icon: icon.name })}
                          className={`p-3 rounded-vara-md border-2 transition-all hover:scale-105 ${
                            editForm.icon === icon.name
                              ? 'border-evergreen-teal bg-teal-light'
                              : 'border-divider hover:border-divider'
                          }`}
                        >
                          <IconComponent className={`w-6 h-6 ${editForm.icon === icon.name ? 'text-evergreen-teal' : 'text-muted-sage-gray'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Color</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-vara-sm">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, color: color.value })}
                        className={`h-12 rounded-vara-md bg-gradient-to-br ${color.class} transition-all ${
                          editForm.color === color.value ? 'ring-4 ring-offset-2 ring-silver-sage' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-vara-base p-vara-base bg-mist-white rounded-vara-md">
                  <label className="flex items-center gap-vara-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                      className="w-4 h-4 text-evergreen-teal rounded focus:ring-evergreen-teal"
                    />
                    <div>
                      <span className="text-vara-sm font-medium text-soft-charcoal">Public Group</span>
                      <p className="text-vara-xs text-muted-sage-gray">Anyone can find and join this group</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full py-2.5 px-vara-base bg-evergreen-teal text-white font-medium rounded-vara-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-vara-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Members Tab */}
            {manageTab === 'members' && (
              <div className="space-y-4">
                <p className="text-vara-sm text-muted-sage-gray">{members.length} total members</p>
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-mist-white rounded-vara-md">
                    <div className="flex items-center gap-vara-md">
                      <img
                        src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'User')}&background=10b981&color=fff`}
                        alt={member.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-soft-charcoal">{member.displayName || member.name}</p>
                        <p className="text-vara-sm text-muted-sage-gray">{member.email}</p>
                      </div>
                    </div>
                    {(member.id === group.createdBy || member.id === group.ownerId || member.id === group.creatorId) ? (
                      <span className="px-3 py-1 bg-teal-light text-evergreen-teal text-vara-sm font-medium rounded-full">
                        Creator
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-vara-md transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Danger Zone Tab */}
            {manageTab === 'danger' && (
              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-vara-md p-vara-base">
                  <h3 className="text-vara-lg font-bold text-red-900 mb-2">Delete Group</h3>
                  <p className="text-vara-sm text-red-700 mb-vara-base">
                    Once you delete this group, there is no going back. This will permanently delete all posts, members, and data associated with this group.
                  </p>
                  <button
                    onClick={handleDeleteGroup}
                    className="flex items-center gap-vara-sm px-vara-base py-2 bg-red-600 text-white font-medium rounded-vara-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarLayout>
      {showManageModal && <ManageGroupModal />}
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={`bg-gradient-to-br ${getColorClass(group.color)} p-8 rounded-b-3xl shadow-vara-lg mb-vara-lg`}>
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-vara-sm text-white/90 hover:text-white mb-vara-base transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-vara-sm">Back to Community</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-vara-base">
              <div className="w-20 h-20 bg-white rounded-vara-lg flex items-center justify-center shadow-vara-lg">
                {renderGroupIcon(group.icon || group.emoji, "w-10 h-10 text-evergreen-teal")}
              </div>
              <div className="text-white">
                <h1 className="text-vara-2xl font-bold mb-2">{group.name}</h1>
                <div className="flex items-center gap-vara-base text-vara-sm opacity-90">
                  <span className="flex items-center gap-1">
                    {group.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {group.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.memberCount || group.members?.length || 0} members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-vara-sm">
              {!isMember ? (
                <button
                  onClick={handleJoinGroup}
                  className="bg-white text-evergreen-teal px-vara-base py-2 rounded-vara-md font-medium hover:bg-teal-light transition-colors shadow-vara-md flex items-center gap-vara-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Join Group
                </button>
              ) : (
                <>
                  {isCreator && (
                    <button
                      onClick={() => setShowManageModal(true)}
                      className="bg-white/20 backdrop-blur text-white px-vara-base py-2 rounded-vara-md font-medium hover:bg-white/30 transition-colors flex items-center gap-vara-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Manage
                    </button>
                  )}
                  {!isCreator && (
                    <button
                      onClick={handleLeaveGroup}
                      className="bg-white/20 backdrop-blur text-white px-vara-base py-2 rounded-vara-md font-medium hover:bg-red-500 hover:bg-opacity-20 transition-colors flex items-center gap-vara-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-vara-lg mb-vara-lg">
          <div className="flex items-center gap-1 bg-dew-sage-light p-1 rounded-vara-lg w-fit">
            {[
              { id: 'feed', label: 'Feed', icon: MessageSquare },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'about', label: 'About', icon: Info }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-md text-vara-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-evergreen-teal shadow-vara-sm'
                      : 'text-muted-sage-gray hover:text-soft-charcoal'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-vara-lg pb-6">
          {/* Feed Tab */}
          {activeTab === 'feed' && (
            <div className="space-y-6">
              {/* Post Composer */}
              {isMember && (
                <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                  <form onSubmit={handlePost} className="space-y-3">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share something with the group..."
                      rows={3}
                      className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal resize-none"
                    />
                    <div className="flex items-center justify-between gap-vara-base">
                      <p className="text-vara-xs text-muted-sage-gray">
                        Posts are reviewed by automated moderation.
                      </p>
                      <button
                        type="submit"
                        disabled={!newPostContent.trim() || isPosting}
                        className="flex items-center gap-vara-sm px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {isPosting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Posts List */}
              <div className="space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => {
                    const author = members.find(m => m.id === post.authorId);
                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base"
                      >
                        <div className="flex items-center gap-vara-md mb-3">
                          <img
                            src={author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.displayName || 'User')}&background=10b981&color=fff`}
                            alt={author?.displayName || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-soft-charcoal">{author?.displayName || 'Anonymous'}</p>
                            <p className="text-vara-sm text-muted-sage-gray">{formatTimeAgo(post.timestamp || post.createdAt)}</p>
                          </div>
                        </div>
                        <p className="text-soft-charcoal whitespace-pre-wrap leading-relaxed">{post.content}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 bg-mist-white rounded-vara-lg">
                    <MessageSquare className="w-12 h-12 text-muted-sage-gray mx-auto mb-3" />
                    <p className="text-muted-sage-gray mb-2">No posts yet</p>
                    <p className="text-vara-sm text-muted-sage-gray">Be the first to share something!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg">
              <h3 className="text-vara-lg font-bold text-soft-charcoal mb-vara-base">Members ({members.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-vara-md p-3 rounded-vara-lg hover:bg-mist-white transition-colors">
                    <img
                      src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || member.name || 'User')}&background=10b981&color=fff`}
                      alt={member.displayName || member.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-soft-charcoal">{member.displayName || member.name || 'Anonymous'}</p>
                      <p className="text-vara-sm text-muted-sage-gray">{member.email}</p>
                    </div>
                    {(member.id === group.createdBy || member.id === group.ownerId || member.id === group.creatorId) && (
                      <span className="px-2 py-1 bg-teal-light text-evergreen-teal text-vara-xs font-medium rounded-full">
                        Creator
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg space-y-6">
              <div>
                <h3 className="text-vara-lg font-bold text-soft-charcoal mb-2">About</h3>
                <p className="text-soft-charcoal leading-relaxed">{group.description}</p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-vara-lg font-bold text-soft-charcoal mb-3">Category</h3>
                <span className="inline-block px-3 py-1 bg-dew-sage-light text-soft-charcoal rounded-full text-vara-sm">
                  {group.category || 'General'}
                </span>
              </div>

              {group.tags && group.tags.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-vara-lg font-bold text-soft-charcoal mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-vara-sm">
                    {group.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-light text-evergreen-teal rounded-full text-vara-sm"
                      >
                        <Hash className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-vara-lg font-bold text-soft-charcoal mb-3">Details</h3>
                <div className="space-y-2 text-vara-sm text-muted-sage-gray">
                  <p>Created: {group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</p>
                  <p>Privacy: {group.isPublic ? 'Public - Anyone can join' : 'Private - Invite only'}</p>
                  <p>Members: {group.memberCount || group.members?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default GroupPage;
