import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Categorization endpoint
app.post('/api/categorize', async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid input. Expected an array of items.' 
            });
        }

        // Rate limiting - max 50 items
        if (items.length > 50) {
            return res.status(400).json({ 
                error: 'Too many items. Maximum 50 items allowed.' 
            });
        }

        const prompt = `You are a niche categorization expert. Analyze these items and categorize each into one of three categories:

**SKILLS** - Things the person can do, has been paid for, or could monetize. Look for: abilities, expertise, professional experience, teachable knowledge.

**INTERESTS** - Topics they're passionate about, hobbies, things they'd read about for fun, cultural preferences, personal fascinations.

**OPPORTUNITIES** - Market trends, growing industries, unsolved problems, emerging technologies, underserved needs, business gaps.

Items to categorize:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "skills": ["item1", "item2"],
  "interests": ["item3", "item4"],
  "opportunities": ["item5", "item6"]
}

Rules:
- Every item MUST be categorized into exactly one category
- Use the EXACT text from the original items
- If unsure, default to "interests"
- Be smart about context (e.g., "helping startups grow" = skill, "startup culture" = interest)`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Parse Claude's response
        const responseText = message.content[0].text;
        
        // Extract JSON from response (in case Claude adds any wrapper text)
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from response');
        }

        const categorized = JSON.parse(jsonMatch[0]);

        // Validate response structure
        if (!categorized.skills || !categorized.interests || !categorized.opportunities) {
            throw new Error('Invalid response structure from AI');
        }

        res.json({
            success: true,
            data: categorized,
            metadata: {
                totalItems: items.length,
                skillsCount: categorized.skills.length,
                interestsCount: categorized.interests.length,
                opportunitiesCount: categorized.opportunities.length
            }
        });

    } catch (error) {
        console.error('Categorization error:', error);
        
        res.status(500).json({ 
            error: 'Failed to categorize items',
            message: error.message 
        });
    }
});

// Idea generation endpoint
app.post('/api/generate-ideas', async (req, res) => {
    try {
        const { skill, interest, opportunity } = req.body;

        if (!skill || !interest || !opportunity) {
            return res.status(400).json({ 
                error: 'Missing required fields: skill, interest, opportunity' 
            });
        }

        const prompt = `You are a niche business idea generator. Given this unique intersection:

Skill: ${skill}
Interest: ${interest}
Opportunity: ${opportunity}

Generate 3 concrete, actionable business ideas:

1. PHYSICAL PRODUCT: A tangible product someone could make/sell
2. DIGITAL PRODUCT: An app, course, content, software, or digital asset
3. SERVICE: A consulting, coaching, or service-based offering

Make each idea:
- SPECIFIC (not generic like "create a course")
- ACTIONABLE (something they could start this month)
- MARKETABLE (has a clear target customer)

Format as JSON:
{
  "physical": "one sentence idea",
  "digital": "one sentence idea",
  "service": "one sentence idea"
}

Only return the JSON, no explanation.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from response');
        }

        const ideas = JSON.parse(jsonMatch[0]);

        res.json({
            success: true,
            data: ideas
        });

    } catch (error) {
        console.error('Idea generation error:', error);
        
        res.status(500).json({ 
            error: 'Failed to generate ideas',
            message: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   NICHE GENERATOR API                  ║
║   Running on port ${PORT}                ║
╚════════════════════════════════════════╝
    `);
});
