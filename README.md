# AI Tooling

A command-line tool for automating JIRA ticket analysis and GitLab merge request creation.

## Overview

This tool analyzes JIRA tickets to extract template information, generates HTML email templates, and optionally creates GitLab merge requests with the generated code. It uses AI (Google's Gemini and Anthropic's Claude) to analyze ticket descriptions and generate appropriate templates.

## Features

- JIRA ticket analysis using AI
- HTML email template generation
- Automatic GitLab merge request creation
- Support for different GitLab default branches (main/master)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Copy the example environment file and update with your credentials:
   ```bash
   cp .env.example .env
   ```

## Environment Variables

Update the `.env` file with your credentials:

```
# JIRA Configuration
JIRA_BASE_URL=https://your-jira-instance.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_TOKEN=your-jira-api-token

# GitLab Configuration
GITLAB_TOKEN=your-gitlab-personal-access-token
GITLAB_BASE_URL=https://gitlab.com
REPO_NAME=your-org/your-repo

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
```

## Usage

### JIRA Ticket Analysis and Template Generation

Analyze a JIRA ticket and generate a template:

```bash
bun cmd.ts jira-test -t PLT-91124
```

This will:
1. Fetch the JIRA ticket details
2. Analyze the ticket description using AI
3. Generate an HTML email template
4. Save the template locally
5. Provide instructions for creating a merge request

### Create Merge Request Automatically

To automatically create a GitLab merge request:

```bash
bun cmd.ts jira-test -c -t PLT-91124
```

This will:
1. Perform all the steps above
2. Clone the GitLab repository
3. Create a new branch
4. Add the generated template
5. Commit and push the changes
6. Create a merge request

## Available Commands

- `jira-test`: Analyze JIRA tickets and generate templates
  - `-t, --task <task-id>`: JIRA task ID (required)
  - `-c, --create-mr`: Automatically create a merge request in GitLab

## Development

The project is structured as follows:
- `cmd_definitions/`: Command definitions and handlers
- `templates/`: Generated templates are saved here
- `cmd.ts`: Main entry point for the CLI

## Requirements

- Bun runtime
- JIRA account with API access
- GitLab account with API access
- Google Gemini API key
- Anthropic Claude API key