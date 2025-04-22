import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class CodeGenerator {
    private static readonly CODE_GENERATION_PROMPT = `You are an expert HTML email template developer. Your task is to create a professional, responsive HTML email template based on the provided information.

Template Name: {{templateName}}
Description: {{description}}

Variables to include in the template:
{{variables}}

Requirements:
1. Create a complete, standalone HTML email template
2. Use responsive design principles for compatibility across email clients
3. Include all the specified variables using the format {{variable_name}}
4. Use inline CSS for maximum email client compatibility
5. Include a fallback font stack
6. Ensure the template is mobile-friendly
7. Use tables for layout structure (email best practice)
8. Include proper DOCTYPE and meta tags
9. Add comments to explain the structure of the template
10. Make the design clean, professional, and modern

Please provide ONLY the complete HTML code without any explanations or markdown formatting.`;

    private anthropic: Anthropic;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || '',
        });
    }

    public async generateEmailTemplate(
        templateName: string,
        description: string,
        variables: string[]
    ): Promise<string> {
        try {
            // Format the variables list for the prompt
            const variablesList = variables.map(variable => `- ${variable}`).join('\n');
            
            // Replace placeholders in the prompt
            const prompt = CodeGenerator.CODE_GENERATION_PROMPT
                .replace('{{templateName}}', templateName)
                .replace('{{description}}', description)
                .replace('{{variables}}', variablesList);
            
            // Generate the code using Claude
            const message = await this.anthropic.messages.create({
                model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
                max_tokens: 4000,
                temperature: 0.2,
                system: "You are an expert HTML email template developer. Provide only the HTML code without any explanations or markdown formatting.",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });
            
            // Extract the generated code from the response
            // Check if the content is a text block
            if (message.content[0].type === 'text') {
                const generatedCode = message.content[0].text;
                // Clean up the response to ensure it's valid HTML
                return this.cleanGeneratedCode(generatedCode);
            } else {
                throw new Error('Unexpected response format from Anthropic API');
            }
        } catch (error) {
            console.error('Error generating email template:', error);
            throw error;
        }
    }
    
    private cleanGeneratedCode(code: string): string {
        // Remove any markdown code block indicators
        let cleaned = code.replace(/```html\n?/g, '').replace(/```\n?/g, '');
        
        // Remove any leading/trailing whitespace
        cleaned = cleaned.trim();
        
        // If the response starts with a backtick, remove it
        if (cleaned.startsWith('`')) {
            cleaned = cleaned.substring(1);
        }
        
        // If the response ends with a backtick, remove it
        if (cleaned.endsWith('`')) {
            cleaned = cleaned.substring(0, cleaned.length - 1);
        }
        
        return cleaned.trim();
    }
} 