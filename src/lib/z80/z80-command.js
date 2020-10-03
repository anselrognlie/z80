class Z80Command {
  constructor(tStates, command) {
    this.tStates = tStates;
    this.command = command;
  }

  tick() {
    this.tStates -= 1;
  }

  isReady() {
    return (this.tStates === 0);
  }

  apply() {
    this.command.call();
  }
}

export default Z80Command;
