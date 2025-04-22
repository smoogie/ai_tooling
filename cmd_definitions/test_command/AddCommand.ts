import {handleCommand} from "./ComandHandler";

export function addtestCommand(program) {
    program
        .command('test')
        .description('simple test of commandline')
        .action(handleCommand);
}
