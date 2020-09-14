import memory, { Z80MemoryError } from '../lib/z80/z80-memory';
import cpu, { Z80FlagMasks as masks } from '../lib/z80/z80-cpu';
import backplane from '../lib/z80/z80-backplane';

import fs from 'fs';

class ApplicationError extends Error {};

class Application {
  constructor(romMap) {
    [ this.mainboard, this.proc, this.mem ] = this.build_cpu();
    this.registerRoms(romMap);
  }

  run() {
    while (! this.isHalted()) {
      this.mainboard.clock();
      // this.report();
    }
  }

  report() {
    this.print8('a');
    this.print8('f');
    this.printHl(['b', 'c']);
    this.printHl(['d', 'e']);
    this.printHl(['h', 'l']);
    this.print16('sp');
    this.print16('pc');
    this.print16Composite('ix');
    this.print16Composite('iy');
    this.print8('i');
    this.print8('r');
  }

  print8(r) {
    console.log(`${r}: ${this.hex8(this.proc.registers[r])}`);
  }

  printHl([h, l]) {
    const hVal = this.hex8(this.proc.registers[h]);
    const lVal = this.hex8(this.proc.registers[l]);
    const hlVal = this.hex16(this.proc[`${h}${l}`]);
    console.log(`${h}: ${hVal} ${l}: ${lVal} ${h}${l}: ${hlVal}`)
  }

  print16(r) {
    console.log(`${r}: ${this.hex16(this.proc.registers[r])}`);
  }

  print16Composite(r) {
    console.log(`${r}: ${this.hex16(this.proc[r])}`);
  }

  hex8(value) {
    return ("00" + value.toString(16)).slice(-2);
  }

  hex16(value) {
    return ("0000" + value.toString(16)).slice(-4);
  }

  isHalted() {
    return this.proc.halted && !this.proc.interruptsEnabled;
  }

  build_cpu() {
    const mainboard = new backplane();
    const proc = new cpu();
    const mem = new memory(0x10000);

    mainboard.registerDevice(proc);
    mainboard.mapAddress(0, mem);
    proc.useTStates(false);

    return [mainboard, proc, mem];
  }

  registerRoms(romMap) {
    romMap.forEach(([file, addr]) => {
      const rom = this.loadFile(file);
      this.mem.load(addr, rom);
    })
  }

  loadFile(path) {
    return fs.readFileSync(path);
  }
}

const main = (args) => {
  if (args.length % 2 === 1) {
    throw new ApplicationError("arguments must be pairs of files and addresses");
  }

  const roms = [];
  for (let i = 0; i < args.length; i += 2) {
    const file = args[i];
    const addr = Number(args[i + 1]);
    roms.push([file, addr]);
  }

  const runner = new Application(roms);
  runner.run();
  runner.report();
};

try {
  main(process.argv.slice(2))
} catch (e) {
  if (e instanceof ApplicationError) {
    console.log(e.message);
  } else {
    throw e;
  }
}