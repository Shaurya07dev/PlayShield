const { v4: uuidv4 } = require('uuid');
const { db, admin } = require('./firebase-admin');

async function seedData() {
  console.log('🌱 Seeding target queue with dummy data for Demo...');

  const mocks = [
    {
      candidateVideoUrl: "https://youtube.com/watch?v=hx8x8f7d",
      candidateTitle: "FULL MATCH HIGHLIGHTS - FREE HD [NO COPYRIGHT]",
      candidateThumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=480&q=80",
      candidateChannel: "SportsLiveStreamHD",
      matchConfidence: 0.98,
      phashDistance: 2,
      audioSimilarity: 0.96,
      riskScore: 98,
      status: 'pending_review'
    },
    {
      candidateVideoUrl: "https://youtube.com/watch?v=bb4h9kds",
      candidateTitle: "C. Ronaldo Last Minute Goal - Alternative Angle",
      candidateThumbnail: "https://images.unsplash.com/photo-1518605368461-1ee7e53794fa?w=480&q=80",
      candidateChannel: "Football Fanatics",
      matchConfidence: 0.85,
      phashDistance: 12,
      audioSimilarity: 0.76,
      riskScore: 85,
      status: 'pending_review'
    },
    {
      candidateVideoUrl: "https://youtube.com/watch?v=mjd2332s",
      candidateTitle: "IPL 2026 Crazy Catch - Must Watch!!",
      candidateThumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=480&q=80",
      candidateChannel: "Cricket Hub Daily",
      matchConfidence: 0.65,
      phashDistance: 22,
      audioSimilarity: 0.45,
      riskScore: 65,
      status: 'pending_review'
    }
  ];

  for (const mock of mocks) {
    const alertId = uuidv4();
    await db.collection('alerts').doc(alertId).set({
      alertId,
      assetId: uuidv4(), // Mock asset ID
      ...mock,
      detectedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Injected Record: ${mock.candidateTitle}`);
  }

  console.log('\n🎯 Done! Your Dashboard should now display 3 active targets.');
  process.exit(0);
}

seedData().catch(console.error);
