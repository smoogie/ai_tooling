import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Gitlab } from '@gitbeaker/rest';

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
    private gitlab: InstanceType<typeof Gitlab>;
    private defaultBranch: string = 'main'; // Default to 'main', will be updated if needed

    constructor() {
        // Validate required environment variables
        if (!process.env.GITLAB_TOKEN) {
            throw new Error('GITLAB_TOKEN environment variable is required');
        }
        
        if (!process.env.REPO_NAME) {
            throw new Error('REPO_NAME environment variable is required');
        }
        
        this.config = {
            token: process.env.GITLAB_TOKEN,
            baseUrl: process.env.GITLAB_BASE_URL || 'https://gitlab.com',
            repoName: process.env.REPO_NAME
        };
        
        console.log(`Initializing GitLab client with base URL: ${this.config.baseUrl}`);
        console.log(`Target repository: ${this.config.repoName}`);
        
        this.gitlab = new Gitlab({
            host: this.config.baseUrl,
            token: this.config.token
        });
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
            
            // Detect the default branch
            await this.detectDefaultBranch();
            
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

    private async detectDefaultBranch(): Promise<void> {
        console.log('Detecting default branch...');
        
        try {
            // First try to get the default branch from the remote
            const result = execSync('git remote show origin', { cwd: this.tempDir }).toString();
            const match = result.match(/HEAD branch: (.*)/);
            
            if (match && match[1]) {
                this.defaultBranch = match[1].trim();
                console.log(`Default branch detected: ${this.defaultBranch}`);
                return;
            }
            
            // If that fails, try to determine from local branches
            const branches = execSync('git branch -a', { cwd: this.tempDir }).toString();
            
            // Check for main branch
            if (branches.includes('remotes/origin/main')) {
                this.defaultBranch = 'main';
                console.log('Default branch set to: main');
                return;
            }
            
            // Check for master branch
            if (branches.includes('remotes/origin/master')) {
                this.defaultBranch = 'master';
                console.log('Default branch set to: master');
                return;
            }
            
            // If we can't determine, log a warning but continue with default
            console.log('Warning: Could not determine default branch, using "main" as fallback');
            
        } catch (error) {
            console.error('Error detecting default branch:', error);
            console.log('Using default branch: main');
        }
    }

    private async cloneRepository(): Promise<void> {
        console.log('Cloning repository...');
        
        try {
            // Remove temp directory if it exists
            if (fs.existsSync(this.tempDir)) {
                console.log(`Removing existing temp directory: ${this.tempDir}`);
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            }
            
            // Construct the repository URL
            const repoUrl = `https://oauth2:${this.config.token}@${this.config.baseUrl.replace('https://', '')}/${this.config.repoName}.git`;
            console.log(`Cloning from: ${this.config.baseUrl}/${this.config.repoName}`);
            
            // Clone the repository
            execSync(`git clone ${repoUrl} ${this.tempDir}`, { stdio: 'inherit' });
            
            console.log('Repository cloned successfully');
        } catch (error) {
            console.error('Error cloning repository:', error);
            throw new Error(`Failed to clone repository: ${error.message}. Please check your GITLAB_TOKEN and REPO_NAME.`);
        }
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
        
        try {
            // Get the project ID - try multiple approaches
            let project;
            
            // First try: Direct project lookup by path
            try {
                console.log(`Looking up project directly: ${this.config.repoName}`);
                project = await this.gitlab.Projects.show(this.config.repoName);
                console.log(`Project found directly: ${project.name} (ID: ${project.id})`);
                
                // Update default branch from project info if available
                if (project.default_branch) {
                    this.defaultBranch = project.default_branch;
                    console.log(`Default branch from project: ${this.defaultBranch}`);
                }
            } catch (directError) {
                console.log(`Direct lookup failed: ${directError.message}`);
                
                // Second try: Search for projects and find by path
                console.log(`Searching for projects with name: ${this.config.repoName}`);
                const projects = await this.gitlab.Projects.all({
                    search: this.config.repoName.split('/').pop() || this.config.repoName,
                    membership: true,
                    perPage: 100
                });
                
                // Try to find the exact match first
                project = projects.find(p => p.path_with_namespace === this.config.repoName);
                
                // If no exact match, try to find a partial match
                if (!project) {
                    const repoNameParts = this.config.repoName.split('/');
                    const lastPart = repoNameParts[repoNameParts.length - 1];
                    
                    project = projects.find(p => 
                        p.path_with_namespace === this.config.repoName || 
                        p.path === lastPart || 
                        p.name === lastPart
                    );
                }
                
                if (project) {
                    console.log(`Project found via search: ${project.name} (ID: ${project.id})`);
                    
                    // Update default branch from project info if available
                    if (project.default_branch) {
                        this.defaultBranch = project.default_branch;
                        console.log(`Default branch from project: ${this.defaultBranch}`);
                    }
                }
            }
            
            if (!project) {
                throw new Error(`Project ${this.config.repoName} not found. Please check your GITLAB_TOKEN and REPO_NAME environment variables.`);
            }

            // Create the merge request
            console.log(`Creating merge request for project ID: ${project.id} targeting branch: ${this.defaultBranch}`);
            const mergeRequest = await this.gitlab.MergeRequests.create(
                project.id,
                mrInfo.branchName,
                this.defaultBranch,
                mrInfo.title,
                {
                    description: mrInfo.description,
                    removeSourceBranch: true
                }
            );

            console.log(`Merge request created successfully!`);
            console.log(`URL: ${mergeRequest.web_url}`);
            
        } catch (error) {
            console.error('Error creating merge request:', error);
            throw error;
        }
    }

    private cleanup(): void {
        console.log('Cleaning up...');
        
        try {
            // Change back to the original directory
            process.chdir('..');
            
            // Remove temp directory
            if (fs.existsSync(this.tempDir)) {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            }
            
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }
}
