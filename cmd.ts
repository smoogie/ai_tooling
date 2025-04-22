import {addtestCommand} from "./cmd_definitions/test_command/AddCommand";
import {addjiraCommand} from "./cmd_definitions/jira_test/AddCommand";
import {Command} from "commander";
const program = new Command();

program.version('1.0.0');

addtestCommand(program);
addjiraCommand(program);
program.parse();
