const { cmd } = require("../inconnuboy");
const yts = require("yt-search");
const axios = require("axios");

// --- Helper Functions ---

function normalizeYouTubeUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
  return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

/**
 * Fetch Audio Link (Aswin-Sparky Koyeb API)
 */
async function fetchAudioData(url) {
  try {
    // Aapki di hui specific API endpoint
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);
    
    // API response check: data.status aur data.data.url ke mutabiq
    if (data.status && data.data && data.data.url) {
        return data.data.url;
    }
    return null;
  } catch (e) {
    console.error("Audio API Error:", e.message);
    return null;
  }
}

// --- MAIN AUTO AUDIO DOWNLOAD COMMAND ---

cmd(
  {
    pattern: "song",
    alias: ["audio", "mp3", "play"],
    react: "🎶",
    desc: "Auto Download YouTube Audio via Koyeb API.",
    category: "download",
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply, prefix }) => {
    try {
      if (!q) return reply(`❓ Usage: \`${prefix}song <name/link>\``);

      // Reaction for search start
      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      // Step 1: Search for the video/audio
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

      // Metadata information
      const infoMsg = `🎧 *AUDIO DOWNLOADER* 🎧\n\n📌 *Title:* ${ytdata.title}\n⏱️ *Duration:* ${ytdata.timestamp}\n\n> 📥 *Uploading MP3, please wait...*`;
      
      await conn.sendMessage(from, { 
        image: { url: ytdata.thumbnail || ytdata.image }, 
        caption: infoMsg 
      }, { quoted: mek });

      // Step 2: Fetch MP3 link from API
      const audioUrl = await fetchAudioData(ytdata.url);

      if (audioUrl) {
        // Step 3: Send Audio File
        await conn.sendMessage(from, { 
          audio: { url: audioUrl }, 
          mimetype: "audio/mpeg",
          fileName: `${ytdata.title}.mp3`
        }, { quoted: mek });
        
        // Success Reaction
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
      } else {
        reply("❌ Could not retrieve audio from the API. Please try another link.");
      }

    } catch (e) {
      console.error(e);
      reply("⚠️ System Error: Audio processing failed.");
    }
  }
);

