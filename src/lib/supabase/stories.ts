import { supabaseServer, supabaseAdmin } from './server';
import type { Story, StoryView, User } from '@/lib/data';

/**
 * Create a new story
 */
export async function createStory(
  userId: string,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<{ story: Story | null; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { story: null, error: 'Supabase server not initialized' };
    }

    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabaseServer
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, user_id, media_url, media_type, created_at, expires_at')
      .single();

    if (error || !data) {
      return { story: null, error: error?.message || 'Failed to create story' };
    }

    return {
      story: {
        id: data.id,
        userId: data.user_id,
        mediaUrl: data.media_url,
        mediaType: data.media_type as 'image' | 'video',
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
      },
      error: null,
    };
  } catch (error: any) {
    return { story: null, error: error.message || 'Failed to create story' };
  }
}

/**
 * Get active stories for a user (non-expired)
 */
export async function getUserStories(userId: string): Promise<{ stories: Story[]; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { stories: [], error: 'Supabase server not initialized' };
    }

    const { data, error } = await supabaseServer
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { stories: [], error: error?.message || 'Failed to fetch stories' };
    }

    const stories: Story[] = data.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      mediaType: story.media_type as 'image' | 'video',
      createdAt: new Date(story.created_at),
      expiresAt: new Date(story.expires_at),
    }));

    return { stories, error: null };
  } catch (error: any) {
    return { stories: [], error: error.message || 'Failed to fetch stories' };
  }
}

/**
 * Get all active stories from users (for feed)
 */
export async function getAllActiveStories(
  currentUserId: string
): Promise<{ stories: Story[]; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { stories: [], error: 'Supabase admin not initialized' };
    }

    // Get all non-expired stories
    const { data, error } = await supabaseAdmin
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching stories:', error);
      return { stories: [], error: error?.message || 'Failed to fetch stories' };
    }

    if (data.length === 0) {
      return { stories: [], error: null };
    }

    // Get unique user IDs from stories
    const userIds = [...new Set(data.map((s: any) => s.user_id))];
    
    // Fetch users separately
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, avatar_url, nickname')
        .in('id', userIds);

      if (!usersError && usersData) {
        usersData.forEach((user: any) => {
          usersMap[user.id] = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar_url || undefined,
            nickname: user.nickname || undefined,
          };
        });
      }
    }

    // Get story views for current user to check which stories were viewed
    const storyIds = data.map((s: any) => s.id);
    let viewedStoryIds: Set<string> = new Set();
    
    if (storyIds.length > 0) {
      const { data: viewsData } = await supabaseAdmin
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', currentUserId)
        .in('story_id', storyIds);

      if (viewsData) {
        viewedStoryIds = new Set(viewsData.map((v: any) => v.story_id));
      }
    }

    // Get view counts for each story
    const viewCountsMap: Record<string, number> = {};
    if (storyIds.length > 0) {
      const { data: viewCountsData } = await supabaseAdmin
        .from('story_views')
        .select('story_id')
        .in('story_id', storyIds);

      if (viewCountsData) {
        viewCountsData.forEach((v: any) => {
          viewCountsMap[v.story_id] = (viewCountsMap[v.story_id] || 0) + 1;
        });
      }
    }

    const stories: Story[] = data.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      mediaType: story.media_type as 'image' | 'video',
      createdAt: new Date(story.created_at),
      expiresAt: new Date(story.expires_at),
      user: usersMap[story.user_id],
      viewCount: viewCountsMap[story.id] || 0,
      isViewed: viewedStoryIds.has(story.id),
    }));

    return { stories, error: null };
  } catch (error: any) {
    return { stories: [], error: error.message || 'Failed to fetch stories' };
  }
}

/**
 * Mark a story as viewed
 */
export async function markStoryAsViewed(
  storyId: string,
  viewerId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { success: false, error: 'Supabase server not initialized' };
    }

    // Check if already viewed
    const { data: existing } = await supabaseServer
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', viewerId)
      .single();

    if (existing) {
      return { success: true, error: null }; // Already viewed
    }

    const { error } = await supabaseServer.from('story_views').insert({
      story_id: storyId,
      viewer_id: viewerId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mark story as viewed' };
  }
}

/**
 * Delete a story
 */
export async function deleteStory(storyId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { success: false, error: 'Supabase server not initialized' };
    }

    const { error } = await supabaseServer
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userId); // Ensure user can only delete their own stories

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete story' };
  }
}

/**
 * Get stories grouped by user
 */
export async function getStoriesByUser(
  currentUserId: string
): Promise<{ storiesByUser: Record<string, Story[]>; error: string | null }> {
  try {
    const { stories, error } = await getAllActiveStories(currentUserId);

    if (error) {
      return { storiesByUser: {}, error };
    }

    // Group stories by user
    const storiesByUser: Record<string, Story[]> = {};
    stories.forEach((story) => {
      if (!storiesByUser[story.userId]) {
        storiesByUser[story.userId] = [];
      }
      storiesByUser[story.userId].push(story);
    });

    // Sort stories within each user by creation date (newest first)
    Object.keys(storiesByUser).forEach((userId) => {
      storiesByUser[userId].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });

    return { storiesByUser, error: null };
  } catch (error: any) {
    return { storiesByUser: {}, error: error.message || 'Failed to group stories by user' };
  }
}

