import Groq from 'groq-sdk';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

// Initialize Groq client
// As with Turso, placing the API key in the frontend is insecure for production,
// but works for this pure frontend PWA prototype.
export const groq = apiKey ? new Groq({ apiKey, dangerouslyAllowBrowser: true }) : null;

export async function askStylist(prompt, wardrobeContext) {
  if (!groq) {
    console.warn("Groq API not configured. Returning fallback response.");
    return null;
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are People & Co., an expert personal fashion AI. Keep your style advice punchy, modern, and highly actionable. Format your specific outfit suggestions clearly."
        },
        {
          role: "user",
          content: `Context of user's wardrobe: ${JSON.stringify(wardrobeContext)}. \n\nUser Question: ${prompt}`
        }
      ],
      model: "llama-3.1-8b-instant", // Using a faster, capable model instead of the heavy 70b
      temperature: 0.7,
      max_tokens: 512,
    });
    
    return response.choices[0]?.message?.content || "I couldn't generate advice right now.";
  } catch (error) {
    console.error("Groq AI Error:", error);
    return "Sorry, I ran into an error generating your style advice. Please check your API key.";
  }
}

