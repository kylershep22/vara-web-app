// src/components/dashboard/CommunityHighlights.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Flame, Target, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommunityHighlights = ({ timeView = 'weekly' }) => {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHighlights();
  }, [timeView]);

  const fetchHighlights = async () => {
    setLoading(true);
    try {
      // Calculate date range based on time view
      const now = new Date();
      let startDate = new Date();

      switch (timeView) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Query posts marked as public wins
      const postsQuery = query(
        collection(db, 'posts'),
        where('isPublicWin', '==', true),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(postsQuery);

      // Fetch user data for each post
      const postsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const post = { id: doc.id, ...doc.data() };

          // Get user info
          try {
            const userDoc = await getDocs(
              query(collection(db, 'users'), where('__name__', '==', post.userId), limit(1))
            );

            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              post.userName = userData.displayName || 'Anonymous';
              post.userAvatar = userData.avatar || null;
            } else {
              post.userName = 'Anonymous';
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            post.userName = 'Anonymous';
          }

          return post;
        })
      );

      setHighlights(postsData);
    } catch (error) {
      console.error('Error fetching community highlights:', error);
      // Fallback to empty array on error
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (category) => {
    switch (category) {
      case 'puzzle':
        return <Sparkles size={16} className="text-purple-600" />;
      case 'focus':
        return <Target size={16} className="text-blue-600" />;
      case 'routine':
        return <Flame size={16} className="text-orange-600" />;
      default:
        return <Trophy size={16} className="text-yellow-600" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-dew-sage-light rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="mx-auto mb-2 text-muted-sage-gray/60" size={48} />
        <p className="text-muted-sage-gray font-medium">No community wins yet</p>
        <p className="text-sm text-muted-sage-gray/60 mt-1">
          Be the first to share your achievements!
        </p>
        <button
          onClick={() => navigate('/community')}
          className="mt-4 px-4 py-2 rounded-lg bg-evergreen-teal text-white hover:opacity-90 transition-colors text-sm font-medium"
        >
          Go to Community
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {highlights.map(highlight => (
        <div
          key={highlight.id}
          className="p-4 rounded-lg border border-divider hover:border-evergreen-teal/30 hover:shadow-sm transition-all cursor-pointer bg-gradient-to-br from-white to-dew-sage-light/50"
          onClick={() => navigate('/community')}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
              {getIconForCategory(highlight.winCategory)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-soft-charcoal">
                  {highlight.userName}
                </span>
                <span className="text-xs text-muted-sage-gray/60">
                  {formatTimeAgo(highlight.createdAt)}
                </span>
              </div>

              <p className="text-sm text-soft-charcoal line-clamp-2">
                {highlight.content}
              </p>

              {/* Engagement stats */}
              {(highlight.likes?.length > 0 || highlight.comments?.length > 0) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-sage-gray">
                  {highlight.likes?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-red-500">❤️</span>
                      {highlight.likes.length}
                    </span>
                  )}
                  {highlight.comments?.length > 0 && (
                    <span className="flex items-center gap-1">
                      💬 {highlight.comments.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Celebrate button */}
            <button
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add celebrate/like functionality
                console.log('Celebrate clicked for:', highlight.id);
              }}
            >
              🎉 Celebrate
            </button>
          </div>
        </div>
      ))}

      {/* View More */}
      <button
        onClick={() => navigate('/community')}
        className="w-full py-2 text-sm text-evergreen-teal hover:opacity-90 font-medium transition-colors"
      >
        View All Community Highlights →
      </button>
    </div>
  );
};

export default CommunityHighlights;
