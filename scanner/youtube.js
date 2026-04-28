const { google } = require('googleapis');
const config = require('./config');

/**
 * Search YouTube for candidate pirated videos.
 * @param {string} query - Search query (e.g., "goal highlights free")
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} - Array of video result objects
 */
async function searchYouTube(query, maxResults = config.MAX_RESULTS) {
  if (!config.YOUTUBE_API_KEY) {
    console.warn('⚠️  No YouTube API key configured. Using mock results.');
    return getMockResults(query);
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: config.YOUTUBE_API_KEY,
    });

    console.log(`🔍 Searching YouTube for: "${query}" (max ${maxResults} results)`);

    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      order: 'date',
    });

    const results = response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    console.log(`   Found ${results.length} results`);
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.channelTitle}] ${r.title}`);
    });

    return results;
  } catch (err) {
    console.error('❌ YouTube API error:', err.message);
    
    if (err.message.includes('quota')) {
      console.warn('   API quota exceeded. Using mock results for demo.');
      return getMockResults(query);
    }
    
    throw err;
  }
}

/**
 * Search YouTube by specific video ID (for demo reliability).
 * @param {string} videoId - Known YouTube video ID
 * @returns {Promise<Object|null>} - Video details or null
 */
async function getVideoDetails(videoId) {
  if (!config.YOUTUBE_API_KEY) {
    console.warn('⚠️  No YouTube API key. Returning basic details.');
    return {
      videoId,
      title: `Video ${videoId}`,
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: 'Unknown',
      publishedAt: new Date().toISOString(),
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: config.YOUTUBE_API_KEY,
    });

    const response = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
    });

    if (response.data.items.length === 0) return null;

    const item = response.data.items[0];
    return {
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    };
  } catch (err) {
    console.error('❌ YouTube API error:', err.message);
    return null;
  }
}

/**
 * Generate mock results for demo/testing without API key.
 */
function getMockResults(query) {
  console.log('📋 Using mock YouTube results for demonstration');
  return [
    {
      videoId: 'mock_video_001',
      title: `${query} - Full Match Replay FREE`,
      description: 'Watch the full match replay here. No copyright.',
      thumbnail: 'https://via.placeholder.com/480x360/1a1a2e/e94560?text=Pirated+Video',
      channelTitle: 'FreeSportsHD',
      publishedAt: new Date().toISOString(),
      url: 'https://www.youtube.com/watch?v=mock_video_001',
    },
    {
      videoId: 'mock_video_002',
      title: `${query} - Best Goals Compilation`,
      description: 'All the best goals from the match.',
      thumbnail: 'https://via.placeholder.com/480x360/16213e/0f3460?text=Suspect+Video',
      channelTitle: 'GoalHighlights',
      publishedAt: new Date().toISOString(),
      url: 'https://www.youtube.com/watch?v=mock_video_002',
    },
  ];
}

module.exports = { searchYouTube, getVideoDetails };
