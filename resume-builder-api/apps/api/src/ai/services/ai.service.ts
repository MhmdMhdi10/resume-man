import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ImprovedDescription {
  original: string;
  improved: string;
}

export interface ExtractedSkill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'tool';
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://inference.api.nscale.com/v1';
  private readonly defaultModel = 'meta-llama/Llama-3.3-70B-Instruct';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('NSCALE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('NSCALE_API_KEY not configured');
    }
  }

  private async chat(prompt: string, model?: string): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: model || this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    let content = response.data.choices[0].message.content;
    
    // Strip <think>...</think> tags from Qwen models that include reasoning
    if (content.includes('</think>')) {
      content = content.split('</think>').pop()?.trim() || content;
    }
    
    return content;
  }

  async improveDescription(description: string, role: string, company: string, model?: string, customPrompt?: string): Promise<string> {
    this.logger.debug(`Improving description for ${role} at ${company} using model ${model || this.defaultModel}`);

    const customInstructions = customPrompt ? `\n\nAdditional instructions from user: ${customPrompt}` : '';

    const prompt = `You are a professional resume writer. Improve the following work experience description to make it more impactful, professional, and suitable for a resume. 

Role: ${role}
Company: ${company}
Original Description: ${description}

Guidelines:
- Use action verbs at the beginning of sentences
- Quantify achievements where possible (use realistic estimates if needed)
- Keep it concise but impactful
- Focus on accomplishments rather than just duties
- Use professional language
- Keep the same general meaning but make it more compelling
- Return ONLY the improved description text, nothing else
- Keep it to 2-4 sentences maximum${customInstructions}`;

    try {
      const improvedText = await this.chat(prompt, model);
      this.logger.debug(`Description improved successfully`);
      return improvedText.trim();
    } catch (error) {
      this.logger.error(`Failed to improve description: ${error}`);
      throw error;
    }
  }

  async improveAllDescriptions(
    experiences: Array<{ id: string; role: string; company: string; description: string }>,
    model?: string,
    customPrompt?: string
  ): Promise<Array<{ id: string; improvedDescription: string }>> {
    const results: Array<{ id: string; improvedDescription: string }> = [];

    for (const exp of experiences) {
      if (exp.description && exp.description.trim()) {
        try {
          const improved = await this.improveDescription(exp.description, exp.role, exp.company, model, customPrompt);
          results.push({ id: exp.id, improvedDescription: improved });
        } catch (error) {
          this.logger.warn(`Failed to improve description for ${exp.id}, keeping original`);
          results.push({ id: exp.id, improvedDescription: exp.description });
        }
      }
    }

    return results;
  }

  private extractJsonArray(text: string): string {
    // Try to find JSON array in the response - match from first [ to last ]
    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return text.substring(startIdx, endIdx + 1);
    }
    return text;
  }

  async extractSkillsFromExperiences(
    experiences: Array<{ role: string; company: string; description: string; achievements?: string[] }>,
    model?: string,
    customPrompt?: string
  ): Promise<ExtractedSkill[]> {
    // Force use of Llama model for JSON extraction - it follows instructions better
    const jsonModel = 'meta-llama/Llama-3.3-70B-Instruct';
    this.logger.debug(`Extracting skills from experiences using model ${jsonModel}`);

    const experienceText = experiences.map(exp => {
      const achievementsText = exp.achievements?.length ? `\nAchievements: ${exp.achievements.join(', ')}` : '';
      return `Role: ${exp.role} at ${exp.company}\nDescription: ${exp.description || 'N/A'}${achievementsText}`;
    }).join('\n\n');

    const customInstructions = customPrompt ? `\nUser instructions: ${customPrompt}` : '';

    const prompt = `You are a JSON generator. Extract skills from work experiences and output ONLY a valid JSON array. No explanations, no markdown, just the array.

INPUT:
${experienceText}
${customInstructions}

OUTPUT FORMAT (return ONLY this, starting with [ and ending with ]):
[{"name":"SkillName","category":"technical|soft|language|tool","proficiencyLevel":"beginner|intermediate|advanced|expert"}]

Extract 10-15 relevant skills. Start your response with [ immediately:`;

    try {
      const responseText = await this.chat(prompt, jsonModel);
      this.logger.debug(`Raw AI response for skills: ${responseText.substring(0, 300)}...`);
      
      // Clean up the response - remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      
      // Try to extract JSON array from the response
      jsonText = this.extractJsonArray(jsonText);
      this.logger.debug(`Extracted JSON: ${jsonText.substring(0, 200)}...`);

      const skills = JSON.parse(jsonText) as ExtractedSkill[];
      this.logger.debug(`Extracted ${skills.length} skills`);
      return skills;
    } catch (error) {
      this.logger.error(`Failed to extract skills: ${error}`);
      throw error;
    }
  }
}
