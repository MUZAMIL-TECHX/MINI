const { cmd } = require("../inconnuboy");
const yts = require("yt-search");
const axios = require("axios");

// --- Helper Functions ---

function normalizeYouTubeUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
  return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

/**
 * Fetch Video Link (Jawad-Tech API)
 */
async function fetchVideoData(url) {
  try {
    // Aapki specific API endpoint use ho rahi hai
    const apiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);
    
    // API Response structure ke mutabiq data extract karna
    if (data.status && data.result) {
        return data.result.mp4; // Direct MP4 link
    }
    return null;
  } catch (e) {
    console.error("API Error:", e.message);
    return null;
  }
}

// --- MAIN AUTO VIDEO DOWNLOAD COMMAND ---

cmd(
  {
    pattern: "video",
    alias: ["mp4", "ytv", "vdl"],
    react: "🎥",
    desc: "Auto Download YouTube Video via Jawad-Tech API.",
    category: "download",
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply, prefix }) => {
    try {
      if (!q) return reply(`❓ Usage: \`${prefix}video <name/link>\``);

      // Search Start Reaction
      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      // Step 1: Search or Identify URL
      let ytdata;
      const url = normalizeYouTubeUrl(q);
      if (url) {
        const results = await yts({ videoId: url.split('v=')[1] });
        ytdata = results;
      } else {
        const search = await yts(q);
        if (!search.videos.length) return reply("❌ No results found!");
        ytdata = search.videos[0];
      }

      // Metadata Notification
      const infoMsg = `📥 *Downloading Video...*\n\n📌 *Title:* ${ytdata.title}\n⏱️ *Duration:* ${ytdata.timestamp}\n\n> © Powered by Jawad-Tech API`;
      
      await conn.sendMessage(from, { 
        image: { url: ytdata.thumbnail || ytdata.image }, 
        caption: infoMsg 
      }, { quoted: mek });

      // Step 2: Fetch and Send Video
      const videoUrl = await fetchVideoData(ytdata.url);

      if (videoUrl) {
        await conn.sendMessage(from, { 
          video: { url: videoUrl }, 
          caption: `✅ *${ytdata.title}*\n\n> © KAMRAN-MD` 
        }, { quoted: mek });
        
        // Success Reaction
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
      } else {
        reply("❌ Sorry, I couldn't download the video from this API.");
      }

    } catch (e) {
      console.error(e);
      reply("⚠️ System Error: Video processing failed.");
    }
  }
);

