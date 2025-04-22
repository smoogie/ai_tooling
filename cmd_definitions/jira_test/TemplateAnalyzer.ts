import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

interface TemplateAnalysis {
    templateName: string;  // in snake_case
    variables: string[];   // list of variables needed for the template
    description: string;   // short description of the template
    mergeRequestTitle: string; // title for the merge request
    mergeRequestDescription: string; // description for the merge request
    branchName: string; // branch name starting with ticket ID followed by short description with hyphens
    commitMessage: string; // commit message for the changes
}

export class TemplateAnalyzer {
    private static readonly ANALYSIS_PROMPT = `Analyze the following JIRA ticket description and extract template information.
Please provide the response in the following JSON format:
{
    "templateName": "snake_case_name",
    "variables": ["variable1", "variable2", ...],
    "description": "Short description of what this template is for",
    "mergeRequestTitle": "Title for the merge request",
    "mergeRequestDescription": "Detailed description for the merge request",
    "branchName": "TICKET-ID-short-branch-name",
    "commitMessage": "Commit message for the changes"
}

Rules:
1. templateName should be in snake_case and descriptive of the template's purpose
2. variables should be a list of all variables that need to be filled in the template
3. description should be a concise explanation of what this template is used for
4. mergeRequestTitle should be clear and descriptive of the changes
5. mergeRequestDescription should include details about what was changed and why
6. branchName should start with the ticket ID followed by a short description, all in lowercase with hyphens (e.g., "PROJ-123-add-user-authentication")
7. commitMessage should be a concise summary of the changes
8. Response must be valid JSON
9. Only include the JSON response, no additional text
10. Do not include any markdown formatting or backticks in the response

Ticket Key: {{TICKET_KEY}}

Ticket Description to Analyze:
`;

    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-pro' });
    }

    private cleanJsonResponse(text: string): string {
        // Remove any markdown code block indicators
        let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
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

    public async analyzeTicketDescription(description: string, ticketKey: string): Promise<TemplateAnalysis> {
        try {
            const prompt = TemplateAnalyzer.ANALYSIS_PROMPT
                .replace('{{TICKET_KEY}}', ticketKey) + description;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean and parse the JSON response
            const cleanedText = this.cleanJsonResponse(text);
            console.log('Cleaned response:', cleanedText); // Debug log
            
            try {
                const analysis: TemplateAnalysis = JSON.parse(cleanedText);
                
                // Validate the response
                if (!analysis.templateName || !analysis.variables || !analysis.description || 
                    !analysis.mergeRequestTitle || !analysis.mergeRequestDescription || 
                    !analysis.branchName || !analysis.commitMessage) {
                    throw new Error('Invalid template analysis response: missing required fields');
                }

                // Ensure the branch name starts with the ticket key
                if (!analysis.branchName.toLowerCase().startsWith(ticketKey.toLowerCase())) {
                    analysis.branchName = `${ticketKey.toLowerCase()}-${analysis.branchName.toLowerCase()}`;
                }

                return analysis;
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Raw response:', text);
                throw new Error('Failed to parse template analysis response as JSON');
            }
        } catch (error) {
            console.error('Error analyzing template:', error);
            throw error;
        }
    }
} 