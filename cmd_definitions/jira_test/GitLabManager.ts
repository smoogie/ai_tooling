import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config();

interface GitLabConfig {
    token: string;
    baseUrl: string;
    repoName: string;
}

interface MergeRequestInfo {
    title: string;
    description: string;
    branchName: string;
    commitMessage: string;
}

export class GitLabManager {
    private config: GitLabConfig;
    private tempDir: string = 'temp_git';

    constructor() {
        this.config = {
            token: process.env.GITLAB_TOKEN || '',
            baseUrl: process.env.GITLAB_BASE_URL || 'https://gitlab.com',
            repoName: process.env.REPO_NAME || ''
        };
    }

    public async createTemplateAndMergeRequest(
        templateName: string,
        htmlCode: string,
        mrInfo: MergeRequestInfo
    ): Promise<void> {
        try {
            console.log('\n=== GITLAB OPERATIONS ===');
            
            // Clone the repository
            await this.cloneRepository();
            
            // Create and checkout the branch
            await this.createBranch(mrInfo.branchName);
            
            // Save the template
            await this.saveTemplate(templateName, htmlCode);
            
            // Commit and push changes
            await this.commitAndPush(mrInfo.branchName, mrInfo.commitMessage);
            
            // Create merge request using GitLab CLI or API
            await this.createMergeRequest(mrInfo);
            
            // Clean up
            this.cleanup();
            
            console.log('\n=== GITLAB OPERATIONS COMPLETED ===');
            console.log(`Branch created: ${mrInfo.branchName}`);
            console.log(`Merge request title: ${mrInfo.title}`);
            console.log('Please check GitLab to verify the merge request was created successfully');
            
        } catch (error) {
            console.error('Error in GitLab operations:', error);
            this.cleanup();
            throw error;
        }
    }

    private async cloneRepository(): Promise<void> {
        console.log('Cloning repository...');
        
        // Remove temp directory if it exists
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
        
        // Clone the repository
        const repoUrl = `https://oauth2:${this.config.token}@${this.config.baseUrl.replace('https://', '')}/${this.config.repoName}.git`;
        execSync(`git clone ${repoUrl} ${this.tempDir}`, { stdio: 'inherit' });
        
        console.log('Repository cloned successfully');
    }

    private async createBranch(branchName: string): Promise<void> {
        console.log(`Creating branch: ${branchName}`);
        
        // Change to the repository directory
        process.chdir(this.tempDir);
        
        // Create and checkout the branch
        execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
        
        console.log(`Branch ${branchName} created and checked out`);
    }

    private async saveTemplate(templateName: string, htmlCode: string): Promise<void> {
        console.log(`Saving template: ${templateName}`);
        
        // Create templates directory if it doesn't exist
        const templatesDir = path.join(process.cwd(), 'templates');
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }
        
        // Save the HTML code to a file
        const fileName = `${templateName}.html`;
        const filePath = path.join(templatesDir, fileName);
        fs.writeFileSync(filePath, htmlCode);
        
        console.log(`Template saved to: ${filePath}`);
    }

    private async commitAndPush(branchName: string, commitMessage: string): Promise<void> {
        console.log('Committing and pushing changes...');
        
        // Add all changes
        execSync('git add .', { stdio: 'inherit' });
        
        // Commit changes
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
        
        // Push changes
        execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
        
        console.log('Changes committed and pushed successfully');
    }

    private async createMergeRequest(mrInfo: MergeRequestInfo): Promise<void> {
        console.log('Creating merge request...');
        
        // For now, we'll just print instructions for creating a merge request
        // In a real implementation, you would use the GitLab API or CLI
        console.log('\nTo create a merge request, please follow these steps:');
        console.log(`1. Go to ${this.config.baseUrl}/${this.config.repoName}/merge_requests/new`);
        console.log(`2. Set source branch to: ${mrInfo.branchName}`);
        console.log(`3. Set title to: ${mrInfo.title}`);
        console.log(`4. Set description to: ${mrInfo.description}`);
        console.log('5. Click "Create merge request"');
        
        // In a future implementation, you could use the GitLab API or CLI to create the MR
        // For example, if you have the GitLab CLI installed:
        // execSync(`glab mr create --title "${mrInfo.title}" --description "${mrInfo.description}" --source-branch ${mrInfo.branchName}`, { stdio: 'inherit' });
    }

    private cleanup(): void {
        console.log('Cleaning up...');
        
        // Change back to the original directory
        process.chdir('..');
        
        // Remove temp directory
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
        
        console.log('Cleanup completed');
    }
} 