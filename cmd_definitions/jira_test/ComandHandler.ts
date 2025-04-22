import JiraClient from 'jira-client';
import dotenv from 'dotenv';
import { TemplateAnalyzer } from './TemplateAnalyzer';
import { CodeGenerator } from './CodeGenerator';
import { GitLabManager } from './GitLabManager';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const jira = new JiraClient({
    host: process.env.JIRA_BASE_URL,
    protocol: 'https',
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_TOKEN,
    apiVersion: '2',
    strictSSL: true
});

const templateAnalyzer = new TemplateAnalyzer();
const codeGenerator = new CodeGenerator();
const gitLabManager = new GitLabManager();

export async function handleCommand(options: any) {
    try {
        const taskId = options.task;
        if (!taskId) {
            console.error('Please provide a task ID using -t or --task option');
            return;
        }
        console.log(options);

        console.log(`Fetching JIRA ticket: ${taskId}`);
        const issue = await jira.findIssue(taskId);
        
        console.log('\n=== JIRA TICKET DETAILS ===');
        console.log(`Key: ${issue.key}`);
        console.log(`Summary: ${issue.fields.summary}`);
        console.log(`Status: ${issue.fields.status.name}`);
        console.log('\nDescription:');
        console.log(issue.fields.description || 'No description available');
        
        // Analyze the ticket description for template information
        if (issue.fields.description) {
            console.log('\n=== TEMPLATE ANALYSIS ===');
            console.log('Analyzing template requirements...');
            const templateAnalysis = await templateAnalyzer.analyzeTicketDescription(issue.fields.description, issue.key);
            
            console.log('\n--- Template Information ---');
            console.log(`Template Name: ${templateAnalysis.templateName}`);
            console.log('Variables:');
            templateAnalysis.variables.forEach(variable => console.log(`  - ${variable}`));
            console.log(`Description: ${templateAnalysis.description}`);
            
            console.log('\n--- Git Information ---');
            console.log(`Branch Name: ${templateAnalysis.branchName}`);
            console.log(`Commit Message: ${templateAnalysis.commitMessage}`);
            
            console.log('\n--- Merge Request Information ---');
            console.log(`Title: ${templateAnalysis.mergeRequestTitle}`);
            console.log('Description:');
            console.log(templateAnalysis.mergeRequestDescription);
            
            // Generate the HTML email template
            console.log('\n=== GENERATING EMAIL TEMPLATE ===');
            console.log('Generating HTML code...');
            const htmlCode = await codeGenerator.generateEmailTemplate(
                templateAnalysis.templateName,
                templateAnalysis.description,
                templateAnalysis.variables
            );
            
            // Save the template locally for reference
            const templatesDir = path.join(process.cwd(), 'templates');
            if (!fs.existsSync(templatesDir)) {
                fs.mkdirSync(templatesDir, { recursive: true });
            }
            
            const fileName = `${templateAnalysis.templateName}.html`;
            const filePath = path.join(templatesDir, fileName);
            fs.writeFileSync(filePath, htmlCode);
            
            console.log(`\nTemplate saved locally to: ${filePath}`);
            
            // Create merge request in GitLab
            if (options.createMr) {
                console.log('\n=== CREATING MERGE REQUEST ===');
                await gitLabManager.createTemplateAndMergeRequest(
                    templateAnalysis.templateName,
                    htmlCode,
                    {
                        title: templateAnalysis.mergeRequestTitle,
                        description: templateAnalysis.mergeRequestDescription,
                        branchName: templateAnalysis.branchName,
                        commitMessage: templateAnalysis.commitMessage
                    }
                );
            } else {
                console.log('\n=== NEXT STEPS ===');
                console.log('1. Create a new branch:');
                console.log(`   git checkout -b ${templateAnalysis.branchName}`);
                console.log('2. Review the generated template');
                console.log('3. Commit your changes:');
                console.log(`   git commit -m "${templateAnalysis.commitMessage}"`);
                console.log('4. Push your branch:');
                console.log(`   git push origin ${templateAnalysis.branchName}`);
                console.log('5. Create a merge request with the title and description provided above');
                console.log('\nOr run with --create-mr flag to automatically create the merge request');
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}
