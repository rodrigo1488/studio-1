import { supabaseAdmin } from './server';

export type StoryReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

export interface StoryReaction {
  id: string;
  storyId: string;
  userId: string;
  reactionType: StoryReactionType;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

/**
 * Add or update a reaction to a story
 */
export async function addStoryReaction(
  storyId: string,
  userId: string,
  reactionType: StoryReactionType
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin not initialized' };
    }

    const { error } = await supabaseAdmin
      .from('story_reactions')
      .upsert(
        {
          story_id: storyId,
          user_id: userId,
          reaction_type: reactionType,
        },
        {
          onConflict: 'story_id,user_id',
        }
      );

    if (error) {
      console.error('Error adding story reaction:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add reaction' };
  }
}

/**
 * Remove a reaction from a story
 */
export async function removeStoryReaction(
  storyId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin not initialized' };
    }

    const { error } = await supabaseAdmin
      .from('story_reactions')
      .delete()
      .eq('story_id', storyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing story reaction:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove reaction' };
  }
}

/**
 * Get reactions for a story
 */
export async function getStoryReactions(storyId: string): Promise<{
  reactions: StoryReaction[];
  error: string | null;
}> {
  try {
    if (!supabaseAdmin) {
      return { reactions: [], error: 'Supabase admin not initialized' };
    }

    const { data, error } = await supabaseAdmin
      .from('story_reactions')
      .select('id, story_id, user_id, reaction_type, created_at')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { reactions: [], error: error?.message || 'Failed to fetch reactions' };
    }

    // Get user data for reactions
    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds);

      if (usersData) {
        usersData.forEach((user: any) => {
          usersMap[user.id] = {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatar_url || undefined,
          };
        });
      }
    }

    const reactions: StoryReaction[] = data.map((r: any) => ({
      id: r.id,
      storyId: r.story_id,
      userId: r.user_id,
      reactionType: r.reaction_type as StoryReactionType,
      createdAt: new Date(r.created_at),
      user: usersMap[r.user_id],
    }));

    return { reactions, error: null };
  } catch (error: any) {
    return { reactions: [], error: error.message || 'Failed to fetch reactions' };
  }
}

/**
 * Get reaction counts by type for a story
 */
export async function getStoryReactionCounts(storyId: string): Promise<{
  counts: Record<StoryReactionType, number>;
  total: number;
  error: string | null;
}> {
  try {
    const { reactions, error } = await getStoryReactions(storyId);

    if (error) {
      return { counts: {} as Record<StoryReactionType, number>, total: 0, error };
    }

    const counts: Record<StoryReactionType, number> = {
      like: 0,
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };

    reactions.forEach((reaction) => {
      counts[reaction.reactionType] = (counts[reaction.reactionType] || 0) + 1;
    });

    return {
      counts,
      total: reactions.length,
      error: null,
    };
  } catch (error: any) {
    return { counts: {} as Record<StoryReactionType, number>, total: 0, error: error.message };
  }
}

