import {handleCommand} from "./ComandHandler";

export function addjiraCommand(program) {
    program
        .command('jira-test')
        .description('simple test for jira')
        .option('-c, --create-mr', 'Automatically create a merge request in GitLab')
        .option('-t, --task <task-id>', 'Jira task id')
        .action(handleCommand);
}
