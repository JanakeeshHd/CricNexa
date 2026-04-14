import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateBallCommentary = async (matchInfo, ballDetails) => {
  const { teamA, teamB, scoreA, scoreB, currentInnings } = matchInfo;
  const { runs, isWicket, isWide, isNoBall, batsman, bowler } = ballDetails;

  const prompt = `
    You are a cricket commentator. Generate a short, exciting, and professional commentary (max 15 words) for a single ball in a cricket match between ${teamA} and ${teamB}.
    
    Match Status: ${teamA} ${scoreA.runs}/${scoreA.wickets} (${scoreA.overs} ov), ${teamB} ${scoreB.runs}/${scoreB.wickets} (${scoreB.overs} ov).
    Current Innings: ${currentInnings}.
    
    Ball Outcome:
    - Batsman: ${batsman || 'The batsman'}
    - Bowler: ${bowler || 'The bowler'}
    - Runs: ${runs}
    - Wicket: ${isWicket ? 'Yes' : 'No'}
    - Extra: ${isWide ? 'Wide' : isNoBall ? 'No Ball' : 'None'}
    
    Provide only the commentary text. Include emojis if appropriate.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI Commentary Error:", error);
    // Fallback commentary
    if (isWicket) return "⚡ Wicket! A massive blow for the batting side!";
    if (runs >= 4) return `🔥 What a shot! ${runs === 6 ? 'Six' : 'Four'} runs!`;
    return `A solid delivery by ${bowler || 'the bowler'}. ${runs} run(s) taken.`;
  }
};

export const getMatchInsights = async (matchData, balls) => {
  const prompt = `
    Analyze this cricket match and provide a short summary of insights (max 50 words).
    Teams: ${matchData.teamA} vs ${matchData.teamB}.
    Current Score: ${matchData.teamA} ${matchData.scoreA.runs}/${matchData.scoreA.wickets} vs ${matchData.teamB} ${matchData.scoreB.runs}/${matchData.scoreB.wickets}.
    Last 5 balls: ${balls.slice(0, 5).map(b => `${b.runs} runs${b.isWicket ? ' (WICKET)' : ''}`).join(', ')}.
    
    Predict the winner and highlight a key moment or player.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "The match is evenly poised. Expect a thrilling finish!";
  }
};
